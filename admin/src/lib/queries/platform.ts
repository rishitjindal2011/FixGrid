import "server-only";

import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  CAPTURED_PAYMENT_STATUSES,
  CLAIM_STATUS_LABELS,
  OPEN_DISPUTE_STATUSES,
  PAYOUT_STATUS_LABELS,
  PENDING_PAYOUT_STATUSES,
  type BookingStatus,
} from "@/lib/types/marketplace";

/**
 * Platform-wide reads for the overview.
 *
 * Two rules govern every function in this file, and both exist because of the
 * same fact: **the marketplace migration may not have been run.** Every table
 * except `users`, `fixer_profiles` and `seo_admins` can be absent, and a
 * missing relation comes back from PostgREST as an ordinary error object, not a
 * thrown exception.
 *
 *   1. Every read catches its own error, reports it with `console.error`, and
 *      returns `[]`/`0`/`null`. An operations console that 500s on a table that
 *      does not exist yet is far harder to diagnose than one that renders its
 *      empty states and says so.
 *
 *   2. Nothing here throws. Callers render, unconditionally.
 *
 * On query shape: counts use `{ count: "exact", head: true }`, which runs the
 * COUNT server-side and transfers no rows at all. Anything that needs a *sum*
 * has no such option — `@supabase/supabase-js` cannot express `sum(amount)`
 * without a SQL function, and no such function exists in the migration — so
 * those scan rows and add them up in JS, bounded by `SCAN_LIMIT`. See
 * `PlatformStats.volumeTruncated`.
 */

/**
 * Ceiling on any query that has to add up a column client-side.
 *
 * Chosen to be far above a plausible early-stage row count and far below
 * anything that would hurt a serverless function's memory. When a table passes
 * it the headline count stays exact (it comes from a server-side COUNT) and the
 * sum is reported as a floor, flagged by `volumeTruncated`.
 *
 * The real fix is a `platform_stats()` SQL function returning one row of
 * aggregates. That belongs in a migration, which this app does not own.
 */
const SCAN_LIMIT = 5000;

export interface PlatformStats {
  /** Rows in `public.users`. Every signed-up account, expert owners included. */
  customers: number;
  shops: number;
  verifiedShops: number;
  pendingClaims: number;

  /** Every status, always present, zero-filled. Safe to index without a guard. */
  bookingsByStatus: Record<BookingStatus, number>;
  /** Exact, from a server-side COUNT — never affected by `SCAN_LIMIT`. */
  totalBookings: number;

  /** Pence, gross, over captured and partially-refunded payments. */
  grossVolume: number;
  /** Pence, the platform's cut of the same set. */
  platformFees: number;
  /** True when a sum hit `SCAN_LIMIT` and is a floor rather than a total. */
  volumeTruncated: boolean;

  openDisputes: number;
  payoutsPending: number;
  /** Pence owed to shops and not yet landed. */
  payoutsPendingAmount: number;
  /** Payouts the provider rejected. Money owed that nobody is chasing. */
  failedPayouts: number;
}

/** Every count zero, every sum zero. What an un-migrated database renders. */
function emptyStats(): PlatformStats {
  const bookingsByStatus = Object.fromEntries(
    BOOKING_STATUSES.map((status) => [status, 0]),
  ) as Record<BookingStatus, number>;

  return {
    customers: 0,
    shops: 0,
    verifiedShops: 0,
    pendingClaims: 0,
    bookingsByStatus,
    totalBookings: 0,
    grossVolume: 0,
    platformFees: 0,
    volumeTruncated: false,
    openDisputes: 0,
    payoutsPending: 0,
    payoutsPendingAmount: 0,
    failedPayouts: 0,
  };
}

/**
 * One head-count, degrading to 0.
 *
 * `head: true` means PostgREST runs the COUNT and returns no body, so this
 * costs one round trip and no rows regardless of table size.
 */
async function countRows(
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string,
): Promise<number> {
  const { count, error } = await run();
  if (error) {
    console.error(`[platform] ${label} count failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

/* ── The individual passes ────────────────────────────────────────────────
   One function per table rather than one per number, so `getPlatformStats`
   below is a single `Promise.all` and the whole dashboard costs one wave of
   round trips instead of a waterfall. */

async function readShops(supabase: AdminClient): Promise<{ shops: number; verified: number }> {
  /*
   * Two head-counts on one table rather than scanning `verified` for every row.
   * It is two queries for two numbers, which the one-pass rule argues against —
   * but both must be exact, and a COUNT transfers nothing while a scan
   * transfers one row per shop and would be capped by `SCAN_LIMIT`. Exactness
   * wins on a number an operator uses to judge directory coverage.
   */
  const [shops, verified] = await Promise.all([
    countRows(
      () => supabase.from("fixer_profiles").select("id", { count: "exact", head: true }),
      "shops",
    ),
    countRows(
      () =>
        supabase
          .from("fixer_profiles")
          .select("id", { count: "exact", head: true })
          .eq("verified", true),
      "verified shops",
    ),
  ]);

  return { shops, verified };
}

/**
 * Bookings, in one pass.
 *
 * `count: "exact"` rides along with the row scan, so `total` is a real COUNT
 * over the whole table even when the breakdown below it is capped. That split
 * matters: the headline "12,400 bookings" is the number an operator quotes, and
 * it stays right forever; the per-status breakdown is a shape they read at a
 * glance, and a capped shape is still the right shape.
 */
async function readBookings(supabase: AdminClient): Promise<{
  byStatus: Record<BookingStatus, number>;
  total: number;
  truncated: boolean;
}> {
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<
    BookingStatus,
    number
  >;

  const { data, count, error } = await supabase
    .from("bookings")
    .select("status", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);

  if (error) {
    console.error("[platform] bookings pass failed:", error.message);
    return { byStatus, total: 0, truncated: false };
  }

  const rows = data ?? [];
  for (const row of rows) {
    // A status Postgres has but this build's enum does not would land here as a
    // key that isn't in `byStatus`. Skip rather than create it: a stray key
    // would break `Record<BookingStatus, number>`'s promise to every caller.
    if (row.status in byStatus) byStatus[row.status] += 1;
  }

  const total = count ?? rows.length;
  return { byStatus, total, truncated: total > rows.length };
}

/**
 * Payments, in one pass: gross volume and the platform's fee come from the same
 * rows, so reading them twice would be two scans for one answer.
 */
async function readVolume(
  supabase: AdminClient,
): Promise<{ gross: number; fees: number; truncated: boolean }> {
  const { data, count, error } = await supabase
    .from("payments")
    .select("amount, platform_fee", { count: "exact" })
    .in("status", [...CAPTURED_PAYMENT_STATUSES])
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);

  if (error) {
    console.error("[platform] payments pass failed:", error.message);
    return { gross: 0, fees: 0, truncated: false };
  }

  const rows = data ?? [];
  let gross = 0;
  let fees = 0;
  for (const row of rows) {
    gross += row.amount ?? 0;
    fees += row.platform_fee ?? 0;
  }

  return { gross, fees, truncated: (count ?? rows.length) > rows.length };
}

/**
 * Payouts, in one pass over everything that is not `paid`.
 *
 * Scheduled, in-transit and failed together are a small working set by
 * definition — a payout leaves it the moment the money lands — so the scan is
 * bounded in practice as well as by `SCAN_LIMIT`.
 */
async function readPayouts(supabase: AdminClient): Promise<{
  pending: number;
  pendingAmount: number;
  failed: number;
}> {
  const { data, error } = await supabase
    .from("payouts")
    .select("status, amount")
    .in("status", [...PENDING_PAYOUT_STATUSES, "failed"])
    .limit(SCAN_LIMIT);

  if (error) {
    console.error("[platform] payouts pass failed:", error.message);
    return { pending: 0, pendingAmount: 0, failed: 0 };
  }

  let pending = 0;
  let pendingAmount = 0;
  let failed = 0;

  for (const row of data ?? []) {
    if (row.status === "failed") {
      failed += 1;
      continue;
    }
    pending += 1;
    pendingAmount += row.amount ?? 0;
  }

  return { pending, pendingAmount, failed };
}

/**
 * Every headline number on the overview, in one wave of parallel queries.
 *
 * Not cached and not `unstable_cache`d: a stale operations dashboard is
 * actively harmful. You approve a claim, come back, and the badge still says
 * three pending. Callers should pair this with `export const dynamic =
 * "force-dynamic"`.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  let supabase: AdminClient;
  try {
    supabase = createAdminClient();
  } catch (error) {
    // Missing env vars. Render the console rather than a stack trace — the
    // operator can then read the empty states and go fix `.env.local`.
    console.error("[platform] admin client unavailable:", (error as Error).message);
    return emptyStats();
  }

  const [customers, shopCounts, pendingClaims, bookings, volume, openDisputes, payouts] =
    await Promise.all([
      countRows(() => supabase.from("users").select("id", { count: "exact", head: true }), "users"),
      readShops(supabase),
      countRows(
        () =>
          supabase
            .from("shop_claims")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        "pending claims",
      ),
      readBookings(supabase),
      readVolume(supabase),
      countRows(
        () =>
          supabase
            .from("disputes")
            .select("id", { count: "exact", head: true })
            .in("status", [...OPEN_DISPUTE_STATUSES]),
        "open disputes",
      ),
      readPayouts(supabase),
    ]);

  return {
    customers,
    shops: shopCounts.shops,
    verifiedShops: shopCounts.verified,
    pendingClaims,
    bookingsByStatus: bookings.byStatus,
    totalBookings: bookings.total,
    grossVolume: volume.gross,
    platformFees: volume.fees,
    volumeTruncated: bookings.truncated || volume.truncated,
    openDisputes,
    payoutsPending: payouts.pending,
    payoutsPendingAmount: payouts.pendingAmount,
    failedPayouts: payouts.failed,
  };
}

/**
 * Just the pending-claim count, for the sidebar badge.
 *
 * Separate from `getPlatformStats` on purpose: the badge renders in the layout,
 * on *every* page, and pulling the full stats object there would run the whole
 * dashboard's query wave behind every navigation in the app.
 */
export async function getPendingClaimCount(): Promise<number> {
  try {
    const supabase = createAdminClient();
    return await countRows(
      () =>
        supabase
          .from("shop_claims")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      "pending claims (badge)",
    );
  } catch (error) {
    console.error("[platform] claim badge unavailable:", (error as Error).message);
    return 0;
  }
}

/* ── Recent activity ──────────────────────────────────────────────────────── */

export type ActivityKind = "booking" | "claim" | "dispute" | "payout";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Short, scannable. The thing that happened. */
  title: string;
  /**
   * Optional second line. Always human-readable — statuses go through their
   * label record here rather than at the call site, so a raw `in_progress`
   * can never reach the screen from one page that forgot to map it.
   */
  detail: string | null;
  href: string;
  /** ISO timestamp. Already sorted descending by the time a caller sees it. */
  at: string;
  /** True when this row is waiting on an admin, so the UI can mark it signal. */
  needsAttention: boolean;
}

/**
 * A merged, newest-first feed across the four tables an operator cares about.
 *
 * Merged in JS rather than in SQL because a `union all` across four tables
 * needs a database view, and this app cannot add one. Each table is asked for
 * its own newest `limit` rows and the union is re-sorted here — over-fetching
 * by at most `4 × limit` rows to get a correct global ordering, which at these
 * sizes is cheaper than the round trip it would save.
 *
 * Any table that is missing contributes nothing and logs; the feed still
 * renders from whatever survived.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  let supabase: AdminClient;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error("[platform] activity unavailable:", (error as Error).message);
    return [];
  }

  const [bookings, claims, disputes, payouts] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, reference, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("shop_claims")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("disputes")
      .select("id, status, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("payouts")
      .select("id, status, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [];

  if (bookings.error) {
    console.error("[platform] activity bookings failed:", bookings.error.message);
  } else {
    for (const row of bookings.data ?? []) {
      items.push({
        id: `booking:${row.id}`,
        kind: "booking",
        title: `Booking ${row.reference}`,
        detail: BOOKING_STATUS_LABELS[row.status] ?? row.status,
        href: `/bookings/${row.id}`,
        at: row.created_at,
        needsAttention: row.status === "disputed",
      });
    }
  }

  if (claims.error) {
    console.error("[platform] activity claims failed:", claims.error.message);
  } else {
    for (const row of claims.data ?? []) {
      items.push({
        id: `claim:${row.id}`,
        kind: "claim",
        title: "Shop claim submitted",
        detail: CLAIM_STATUS_LABELS[row.status] ?? row.status,
        href: `/claims/${row.id}`,
        at: row.created_at,
        needsAttention: row.status === "pending",
      });
    }
  }

  if (disputes.error) {
    console.error("[platform] activity disputes failed:", disputes.error.message);
  } else {
    for (const row of disputes.data ?? []) {
      items.push({
        id: `dispute:${row.id}`,
        kind: "dispute",
        title: "Dispute raised",
        detail: row.reason,
        href: `/disputes/${row.id}`,
        at: row.created_at,
        needsAttention: row.status !== "resolved" && row.status !== "withdrawn",
      });
    }
  }

  if (payouts.error) {
    console.error("[platform] activity payouts failed:", payouts.error.message);
  } else {
    for (const row of payouts.data ?? []) {
      items.push({
        id: `payout:${row.id}`,
        kind: "payout",
        title: row.status === "failed" ? "Payout failed" : "Payout created",
        detail: PAYOUT_STATUS_LABELS[row.status] ?? row.status,
        href: `/payouts/${row.id}`,
        at: row.created_at,
        needsAttention: row.status === "failed",
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
