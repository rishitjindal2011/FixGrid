import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  PENDING_PAYOUT_STATUSES,
  type BookingStatus,
  type PayoutStatus,
} from "@/lib/types/marketplace";

/**
 * Payout reads — money leaving the platform.
 *
 * The escrow figure alongside each shop is the point of this screen. A shop
 * asking "where is my money" is usually not owed a payout at all: the funds are
 * held against completed jobs whose warranty window has not closed. Showing the
 * held amount next to the payable one answers that without anyone opening the
 * bookings table.
 */

export interface PayoutRowView {
  id: string;
  status: PayoutStatus;
  amountPence: number;
  currency: string;
  providerPayoutId: string | null;
  scheduledFor: string | null;
  paidAt: string | null;
  createdAt: string;
  shopId: string;
  shopName: string;
  payoutEmail: string | null;
}

interface PayoutJoinRow {
  id: string;
  fixer_id: string;
  status: PayoutStatus;
  amount: number;
  currency: string;
  provider_payout_id: string | null;
  scheduled_for: string | null;
  paid_at: string | null;
  created_at: string;
  fixer_profiles: {
    id: string;
    shop_name: string;
    payout_email: string | null;
  } | null;
}

const PAYOUT_COLUMNS = `
  id, fixer_id, status, amount, currency, provider_payout_id,
  scheduled_for, paid_at, created_at,
  fixer_profiles!payouts_fixer_fkey ( id, shop_name, payout_email )
`;

export async function listPayouts(
  options: { status?: PayoutStatus | "pending" | "all"; q?: string } = {},
): Promise<PayoutRowView[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("payouts")
    .select(PAYOUT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);

  if (options.status && options.status !== "all" && options.status !== "pending") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.returns<PayoutJoinRow[]>();

  if (error) {
    console.error("[payouts] list failed", error.message);
    return [];
  }

  let views: PayoutRowView[] = (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    amountPence: row.amount,
    currency: row.currency,
    providerPayoutId: row.provider_payout_id,
    scheduledFor: row.scheduled_for,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    shopId: row.fixer_id,
    shopName: row.fixer_profiles?.shop_name ?? "Unknown shop",
    payoutEmail: row.fixer_profiles?.payout_email ?? null,
  }));

  if (options.status === "pending") {
    views = views.filter((view) => PENDING_PAYOUT_STATUSES.includes(view.status));
  }

  const needle = options.q?.trim().toLowerCase();
  if (needle) {
    views = views.filter((view) =>
      [view.shopName, view.payoutEmail, view.providerPayoutId]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }

  // Scheduled first — those are the ones needing action.
  const rank = (status: PayoutStatus) =>
    status === "scheduled" ? 0 : status === "in_transit" ? 1 : status === "failed" ? 2 : 3;

  return views.sort((a, b) => rank(a.status) - rank(b.status));
}

export interface PayoutSummary {
  scheduledPence: number;
  inTransitPence: number;
  paidThisMonthPence: number;
  failedCount: number;
  /** Completed jobs whose warranty window has not closed — money not yet due. */
  inEscrowPence: number;
}

export async function getPayoutSummary(now: Date = new Date()): Promise<PayoutSummary> {
  const empty: PayoutSummary = {
    scheduledPence: 0,
    inTransitPence: 0,
    paidThisMonthPence: 0,
    failedCount: 0,
    inEscrowPence: 0,
  };

  const supabase = createAdminClient();

  const [payoutsResult, escrowResult] = await Promise.all([
    supabase
      .from("payouts")
      .select("status, amount, paid_at")
      .limit(2000)
      .returns<Array<{ status: PayoutStatus; amount: number; paid_at: string | null }>>(),
    supabase
      .from("bookings")
      .select("status, final_amount, quoted_amount, platform_fee, warranty_expires_at")
      .eq("status", "completed")
      .limit(2000)
      .returns<
        Array<{
          status: BookingStatus;
          final_amount: number | null;
          quoted_amount: number | null;
          platform_fee: number;
          warranty_expires_at: string | null;
        }>
      >(),
  ]);

  if (payoutsResult.error) {
    console.error("[payouts] summary failed", payoutsResult.error.message);
  }
  if (escrowResult.error) {
    console.error("[payouts] escrow failed", escrowResult.error.message);
  }

  const summary = { ...empty };

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  for (const row of payoutsResult.data ?? []) {
    if (row.status === "scheduled") summary.scheduledPence += row.amount;
    else if (row.status === "in_transit") summary.inTransitPence += row.amount;
    else if (row.status === "failed") summary.failedCount += 1;
    else if (row.status === "paid" && row.paid_at && row.paid_at >= monthStart) {
      summary.paidThisMonthPence += row.amount;
    }
  }

  // Net of the platform fee: escrow is what the shop will receive, not what the
  // customer paid.
  for (const booking of escrowResult.data ?? []) {
    if (!booking.warranty_expires_at) continue;
    if (new Date(booking.warranty_expires_at).getTime() <= now.getTime()) continue;

    const gross = booking.final_amount ?? booking.quoted_amount ?? 0;
    summary.inEscrowPence += Math.max(0, gross - booking.platform_fee);
  }

  return summary;
}
