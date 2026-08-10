import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { CAPTURED_PAYMENT_STATUSES } from "@/lib/types/marketplace";

export type TimeSeriesPoint = {
  date: string;
  customers: number;
  experts: number;
  gmv: number;
  fees: number;
};

// We will fetch up to 30 days of history for real-time graphs.
const SCAN_LIMIT = 5000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The UTC calendar day an instant falls in, as `YYYY-MM-DD`.
 *
 * Every bucket key on this chart goes through here, which is the point: the
 * first version built the buckets from `setDate()` (local) and keyed the rows
 * off `created_at.split("T")[0]` (UTC). Under BST those disagree for an hour
 * each night, so a signup at 00:30 local landed in a bucket that did not exist
 * and vanished from the chart. One clock, used for both sides.
 *
 * `slice` rather than `split(...)[0]`: an index into a split is
 * `string | undefined`, and the compiler is right to say so.
 */
function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export async function getTimeSeriesData(days: number = 30): Promise<TimeSeriesPoint[]> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    // Missing service-role key. The chart is decoration on a page that has
    // other content, so it degrades to empty rather than taking the page down —
    // but silently returning [] once cost an afternoon, so it says why.
    console.error("[analytics] no admin client", error);
    return [];
  }

  // Anchored to midnight UTC so the window is a whole number of calendar days
  // and the oldest bucket is complete rather than a partial day.
  const todayStart = new Date(`${utcDay(new Date().toISOString())}T00:00:00.000Z`);
  const cutoffStr = new Date(todayStart.getTime() - (days - 1) * DAY_MS).toISOString();

  const [usersRes, shopsRes, paymentsRes] = await Promise.all([
    supabase
      .from("users")
      .select("created_at")
      .gte("created_at", cutoffStr)
      .limit(SCAN_LIMIT),
    supabase
      .from("fixer_profiles")
      .select("created_at")
      .gte("created_at", cutoffStr)
      .limit(SCAN_LIMIT),
    supabase
      .from("payments")
      .select("amount, platform_fee, created_at")
      .in("status", [...CAPTURED_PAYMENT_STATUSES])
      .gte("created_at", cutoffStr)
      .limit(SCAN_LIMIT),
  ]);

  const rawUsers = usersRes.data ?? [];
  const rawShops = shopsRes.data ?? [];
  const rawPayments = paymentsRes.data ?? [];

  // Every day in the window exists as a bucket up front, so a quiet day plots
  // as a zero instead of disappearing and letting the line skip over it.
  const grouped = new Map<string, TimeSeriesPoint>();

  for (let i = 0; i < days; i++) {
    const date = utcDay(new Date(todayStart.getTime() - i * DAY_MS).toISOString());
    grouped.set(date, { date, customers: 0, experts: 0, gmv: 0, fees: 0 });
  }

  for (const user of rawUsers) {
    const bucket = grouped.get(utcDay(user.created_at));
    if (bucket) bucket.customers += 1;
  }

  for (const shop of rawShops) {
    const bucket = grouped.get(utcDay(shop.created_at));
    if (bucket) bucket.experts += 1;
  }

  for (const payment of rawPayments) {
    const bucket = grouped.get(utcDay(payment.created_at));
    if (!bucket) continue;
    bucket.gmv += payment.amount ?? 0;
    bucket.fees += payment.platform_fee ?? 0;
  }

  // Lexicographic sort is chronological for `YYYY-MM-DD`, and needs no Date
  // parsing to get there.
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}
