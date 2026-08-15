import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The wallet: how money moves without a payment gateway.
 *
 * Every balance in the system is the sum of that party's `ledger_entries`, and
 * `wallets.balance_minor` is a trigger-maintained cache of that sum — the same
 * arrangement `rating_avg` has on `fixer_profiles`. Nothing in this module writes
 * a balance; it posts ledger entries and lets the database do the arithmetic.
 *
 * **Reads use the caller's own client, writes use the service role.** The RLS
 * policy `owner reads own wallet` means a read cannot see somebody else's
 * balance even if this module asked for it. Writes have no choice: `post_ledger`
 * is `security definer` with EXECUTE revoked from `anon` and `authenticated`
 * precisely so a signed-in user cannot credit themselves, which leaves the
 * service role as the only caller. Every function below that spends or credits
 * therefore has to establish authorisation *itself* before it is called — there
 * is no policy underneath to catch a mistake.
 *
 * **Movements are balanced or they are refused.** `post_ledger` sums the legs and
 * raises `22003` unless they come to zero. A fee is not "the customer loses ₹100",
 * it is "the customer −₹100, the platform +₹100". The platform wallet is the
 * counterparty for everything entering or leaving the system, and it is the only
 * wallet allowed to go negative.
 */

/** Owner of a wallet. `platform` is the house, and always the nil uuid. */
export type WalletKind = "user" | "shop" | "platform";

/** The house wallet's owner id. Matches the seeded row in the migration. */
export const PLATFORM_OWNER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Ledger vocabulary. `kind` is a text column rather than an enum, so this type is
 * the only thing keeping the vocabulary honest — widen it here, not at call sites.
 */
export type LedgerKind =
  | "charge"
  | "fee"
  | "refund"
  | "payout"
  | "adjustment"
  | "topup"
  | "rebate"
  | "subscription"
  | "enrollment"
  | "enrollment_refund"
  | "extra_request";

export interface LedgerLeg {
  kind: LedgerKind;
  /** Signed minor units — paise. Debits are negative. */
  amount: number;
  walletKind: WalletKind;
  walletOwner: string;
  bookingId?: string | null;
  memo?: string | null;
}

export type MoneyResult = { ok: true } | { ok: false; error: string };

/* ── Reads ────────────────────────────────────────────────────────────────── */

export interface WalletSummary {
  balanceMinor: number;
  currency: string;
}

const EMPTY_WALLET: WalletSummary = { balanceMinor: 0, currency: "INR" };

/**
 * A party's balance, read as the signed-in user.
 *
 * Returns a zero balance rather than null when no wallet row exists: wallets are
 * created lazily on first movement, so "no row" and "no money" are the same state
 * and a caller should not have to tell them apart.
 */
export async function getWallet(
  kind: WalletKind,
  ownerId: string,
): Promise<WalletSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wallets")
    .select("balance_minor, currency")
    .eq("owner_kind", kind)
    .eq("owner_id", ownerId)
    .maybeSingle<{ balance_minor: number; currency: string }>();

  if (error) {
    // A wallet that will not load must not take the billing page down with it.
    console.error("[wallet] balance read failed", { kind, code: error.code });
    return EMPTY_WALLET;
  }

  if (!data) return EMPTY_WALLET;

  return { balanceMinor: data.balance_minor, currency: data.currency };
}

export interface LedgerLine {
  id: string;
  kind: string;
  amountMinor: number;
  currency: string;
  memo: string | null;
  bookingId: string | null;
  createdAt: string;
}

/** A party's statement, newest first. RLS scopes it to wallets they own. */
export async function listLedger(
  kind: WalletKind,
  ownerId: string,
  limit = 50,
): Promise<LedgerLine[]> {
  const supabase = await createClient();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("owner_kind", kind)
    .eq("owner_id", ownerId)
    .maybeSingle<{ id: string }>();

  if (!wallet) return [];

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("id, kind, amount, currency, memo, booking_id, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      {
        id: string;
        kind: string;
        amount: number;
        currency: string;
        memo: string | null;
        booking_id: string | null;
        created_at: string;
      }[]
    >();

  if (error) {
    console.error("[wallet] statement read failed", { kind, code: error.code });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    amountMinor: row.amount,
    currency: row.currency,
    memo: row.memo,
    bookingId: row.booking_id,
    createdAt: row.created_at,
  }));
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

/**
 * Postgres error codes from a money movement, as sentences.
 *
 * `22003` carries two distinct meanings from `post_ledger` — an overdraft and an
 * unbalanced set of legs — and they are told apart by the message rather than the
 * code. The distinction matters: one is a person who needs to top up, the other
 * is a bug in the caller that must not be reported as the user's fault.
 */
function explainMoney(
  code: string | undefined,
  message: string | undefined,
  fallback: string,
): string {
  if (code === "22003") {
    if ((message ?? "").includes("does not balance")) {
      // Never the user's problem. Surfaced as a generic failure and logged loudly.
      return "That payment could not be completed. Nothing has been charged.";
    }
    return "There isn't enough in your balance for that. Top up and try again.";
  }

  switch (code) {
    case "42501":
      return "That payment could not be authorised.";
    case "23503":
      return "That booking or account no longer exists.";
    case "42883":
    case "PGRST202":
      return "The payment system is not set up on this database yet.";
    default:
      return fallback;
  }
}

/**
 * Post a balanced movement. All legs commit, or none do.
 *
 * Returns rather than throws, so the server actions that call it keep their
 * "return, never throw" convention — a thrown error inside a form action loses
 * the message the person needed to read.
 */
export async function postLedger(
  legs: readonly LedgerLeg[],
  fallbackError = "That payment could not be completed.",
): Promise<MoneyResult> {
  if (legs.length === 0) return { ok: true };

  const total = legs.reduce((sum, leg) => sum + leg.amount, 0);
  if (total !== 0) {
    // Caught here as well as in the database. Reaching Postgres with an
    // unbalanced movement is a programming error, and the stack is more useful
    // in our logs than the constraint violation is.
    console.error("[wallet] refusing unbalanced movement", { total, legs });
    return { ok: false, error: fallbackError };
  }

  const admin = createAdminClient();

  const { error } = await admin.rpc("post_ledger", {
    p_entries: legs.map((leg) => ({
      kind: leg.kind,
      amount: leg.amount,
      wallet_kind: leg.walletKind,
      wallet_owner: leg.walletOwner,
      booking_id: leg.bookingId ?? null,
      memo: leg.memo ?? null,
    })),
  } as never);

  if (error) {
    console.error("[wallet] movement failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, error: explainMoney(error.code, error.message, fallbackError) };
  }

  return { ok: true };
}

/**
 * Take money from a party and give it to the platform.
 *
 * The caller must already have established that this party is the signed-in one:
 * there is no RLS beneath this, because the service role is the only role that
 * may post to the ledger at all.
 */
export async function chargeToPlatform(options: {
  kind: LedgerKind;
  amountMinor: number;
  from: { kind: WalletKind; ownerId: string };
  bookingId?: string | null;
  memo?: string;
  fallbackError?: string;
}): Promise<MoneyResult> {
  const { kind, amountMinor, from, bookingId, memo, fallbackError } = options;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    console.error("[wallet] refusing non-positive charge", { amountMinor, kind });
    return { ok: false, error: fallbackError ?? "That amount is not valid." };
  }

  return postLedger(
    [
      {
        kind,
        amount: -amountMinor,
        walletKind: from.kind,
        walletOwner: from.ownerId,
        bookingId,
        memo,
      },
      {
        kind,
        amount: amountMinor,
        walletKind: "platform",
        walletOwner: PLATFORM_OWNER_ID,
        bookingId,
        memo,
      },
    ],
    fallbackError,
  );
}

/**
 * Give money from the platform to a party — a rebate, a refund, a top-up.
 *
 * The platform wallet is allowed to go negative precisely so this can always
 * succeed: the house funds these from outside the system, and refusing a refund
 * because our own balance is low would strand the person owed it.
 */
export async function creditFromPlatform(options: {
  kind: LedgerKind;
  amountMinor: number;
  to: { kind: WalletKind; ownerId: string };
  bookingId?: string | null;
  memo?: string;
  fallbackError?: string;
}): Promise<MoneyResult> {
  const { kind, amountMinor, to, bookingId, memo, fallbackError } = options;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    console.error("[wallet] refusing non-positive credit", { amountMinor, kind });
    return { ok: false, error: fallbackError ?? "That amount is not valid." };
  }

  return postLedger(
    [
      {
        kind,
        amount: -amountMinor,
        walletKind: "platform",
        walletOwner: PLATFORM_OWNER_ID,
        bookingId,
        memo,
      },
      {
        kind,
        amount: amountMinor,
        walletKind: to.kind,
        walletOwner: to.ownerId,
        bookingId,
        memo,
      },
    ],
    fallbackError,
  );
}
