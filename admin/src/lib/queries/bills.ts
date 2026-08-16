import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The bill queue.
 *
 * Bills are the one thing in this console that pays money *out* — approving one
 * credits the shop 5% — so the list carries everything a reviewer needs to decide
 * without opening another screen: what the shop billed, what the job itself came
 * to, and what the rebate would be. A reviewer who has to go and look up the
 * booking amount elsewhere is a reviewer who will stop checking it.
 */

export type BillStatus = "pending" | "approved" | "rejected";

export interface BillRow {
  id: string;
  bookingId: string;
  bookingReference: string;
  shopId: string;
  shopName: string;
  /** What the shop billed, in paise. */
  amountMinor: number;
  /** The job's own final amount. The cap is computed against this. */
  jobMinor: number | null;
  currency: string;
  status: BillStatus;
  /** What was actually credited. Null until approved. */
  rebateMinor: number | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface BillJoinRow {
  id: string;
  booking_id: string;
  fixer_id: string;
  amount_minor: number;
  currency: string;
  status: BillStatus;
  rebate_minor: number | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  bookings: { reference: string; final_amount: number | null } | null;
  fixer_profiles: { shop_name: string } | null;
}

/** 5%, matching `REBATE_PERCENT` in `admin/src/lib/actions/admin.ts`. */
const REBATE_PERCENT = 5;

/**
 * What approving a bill would pay.
 *
 * Duplicates the calculation in `approveBill` deliberately, and the duplication is
 * the point: this is what the reviewer is shown *before* deciding, and the action
 * recomputes it from the row at decision time. If the two ever disagree the
 * action's answer is the one that pays, so a divergence is visible as a surprise
 * on screen rather than as a silent overpayment.
 */
export function projectedRebate(amountMinor: number, jobMinor: number | null): number {
  const basis = Math.min(amountMinor, jobMinor ?? amountMinor);
  return Math.floor((basis * REBATE_PERCENT) / 100);
}

export async function listBills(options: {
  status?: BillStatus | "all";
} = {}): Promise<BillRow[]> {
  const status = options.status ?? "pending";

  let query = createAdminClient()
    .from("shop_bills")
    .select(
      `id, booking_id, fixer_id, amount_minor, currency, status, rebate_minor,
       review_note, created_at, reviewed_at,
       bookings!inner ( reference, final_amount ),
       fixer_profiles!inner ( shop_name )`,
    )
    // Oldest first: this is a queue, and a shop waiting on its rebate is waiting
    // on money. Newest-first would bury the one that has waited longest.
    .order("created_at", { ascending: true })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query.returns<BillJoinRow[]>();

  if (error) {
    console.error("[admin] bill list failed", { code: error.code, message: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    bookingReference: row.bookings?.reference ?? "—",
    shopId: row.fixer_id,
    shopName: row.fixer_profiles?.shop_name ?? "Unknown shop",
    amountMinor: row.amount_minor,
    jobMinor: row.bookings?.final_amount ?? null,
    currency: row.currency,
    status: row.status,
    rebateMinor: row.rebate_minor,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }));
}

export async function getBillCounts(): Promise<Record<BillStatus | "all", number>> {
  const empty = { pending: 0, approved: 0, rejected: 0, all: 0 };

  const { data, error } = await createAdminClient()
    .from("shop_bills")
    .select("status")
    .returns<{ status: BillStatus }[]>();

  if (error) {
    console.error("[admin] bill counts failed", error.message);
    return empty;
  }

  return (data ?? []).reduce(
    (counts, row) => {
      counts[row.status] += 1;
      counts.all += 1;
      return counts;
    },
    { ...empty },
  );
}
