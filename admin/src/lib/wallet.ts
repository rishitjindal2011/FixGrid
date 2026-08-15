import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wallet reads and credits for the operations console.
 *
 * A near-copy of the consumer app's `src/lib/wallet/server.ts`, kept separate for
 * the reason `admin/src/lib/format.ts` states at its head: the apps are separate
 * npm projects with no shared package. Only the two operations this console
 * actually performs are here — read a balance, and put money in. The console
 * never spends on anyone's behalf.
 *
 * Everything runs through the service role because admins have no Supabase
 * identity at all. There is therefore no RLS underneath these calls, and the
 * session/role check in the action that calls them is the entire gate.
 */

export type WalletKind = "user" | "shop" | "platform";

/** The house wallet's owner id. Matches the seeded row in the migration. */
export const PLATFORM_OWNER_ID = "00000000-0000-0000-0000-000000000000";

export interface WalletBalance {
  balanceMinor: number;
  currency: string;
}

/**
 * A party's balance, or a zero.
 *
 * Wallets are created lazily on first movement, so "no row" and "no money" are
 * the same state and the console should not have to distinguish them.
 */
export async function getWalletBalance(
  kind: WalletKind,
  ownerId: string,
): Promise<WalletBalance> {
  const { data, error } = await createAdminClient()
    .from("wallets")
    .select("balance_minor, currency")
    .eq("owner_kind", kind)
    .eq("owner_id", ownerId)
    .maybeSingle<{ balance_minor: number; currency: string }>();

  if (error) {
    console.error("[admin/wallet] balance read failed", { kind, code: error.code });
    return { balanceMinor: 0, currency: "INR" };
  }

  return data
    ? { balanceMinor: data.balance_minor, currency: data.currency }
    : { balanceMinor: 0, currency: "INR" };
}

export type CreditResult = { ok: true } | { ok: false; error: string };

/**
 * Put money into a party's balance, funded by the platform wallet.
 *
 * This is what stands in for a payment gateway: there is no card rail, so the
 * console is where funds enter the system. The platform wallet goes correspondingly
 * negative, which is intentional — it is the house, and its balance is the running
 * total of what we have put in minus what we have taken in fees.
 *
 * Both legs go through `post_ledger`, so the movement is one statement and cannot
 * half-commit.
 */
export async function creditWallet(options: {
  kind: "topup" | "rebate" | "refund" | "enrollment_refund" | "adjustment";
  amountMinor: number;
  to: { kind: WalletKind; ownerId: string };
  memo?: string;
}): Promise<CreditResult> {
  const { kind, amountMinor, to, memo } = options;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, error: "Enter an amount above zero." };
  }

  const { error } = await createAdminClient().rpc("post_ledger", {
    p_entries: [
      {
        kind,
        amount: -amountMinor,
        wallet_kind: "platform",
        wallet_owner: PLATFORM_OWNER_ID,
        memo: memo ?? null,
      },
      {
        kind,
        amount: amountMinor,
        wallet_kind: to.kind,
        wallet_owner: to.ownerId,
        memo: memo ?? null,
      },
    ],
  } as never);

  if (error) {
    console.error("[admin/wallet] credit failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (error.code === "42883" || error.code === "PGRST202") {
      return {
        ok: false,
        error: "The wallet migration has not been applied to this database yet.",
      };
    }

    return { ok: false, error: "That credit could not be posted." };
  }

  return { ok: true };
}
