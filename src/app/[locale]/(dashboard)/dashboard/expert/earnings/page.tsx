import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Banknote, Receipt, Wallet, Wrench } from "lucide-react";

import { EarningsSummary } from "@/components/dashboard/expert/earnings-summary";
import { RevenueChart } from "@/components/dashboard/expert/revenue-chart";
import {
  PayoutsTable,
  TransactionsTable,
} from "@/components/dashboard/expert/transactions-table";
import { WithdrawDialog } from "@/components/dashboard/expert/withdraw-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import {
  getExpertStats,
  listExpertBookings,
  listExpertEarnings,
  listPayouts,
  listTransactions,
} from "@/lib/dashboard/expert";
import { createClient } from "@/lib/supabase/server";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Earnings",
  robots: { index: false, follow: false },
};

/** A year of bars is enough to see a season without becoming a smear. */
const CHART_MONTHS = 12;

/**
 * What the shop has earned, what is still held, and what has been paid out.
 *
 * Six reads in one `Promise.all`. They have no interdependency, and six
 * sequential awaits would be six serialised round-trips for one screen. `now` is
 * captured once and threaded into both the stats and the earnings buckets, so
 * the "in escrow" tile and the chart underneath it cannot disagree about which
 * warranty windows are still open — the one inconsistency a page about money
 * cannot afford.
 *
 * `listExpertBookings` is here for one column: `payments` hangs off the booking
 * and has no customer of its own, so the transaction table's names are stitched
 * in from bookings the shop can already see. It degrades to `[]` like every
 * other read, and the column falls back to a dash.
 */
export default async function ExpertEarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/earnings");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this is a narrowing step rather than a second query.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();

  const [stats, earnings, transactions, payouts, bookings, payoutEmail] = await Promise.all([
    getExpertStats(shop.id, now),
    listExpertEarnings(shop.id, {
      months: CHART_MONTHS,
      timezone: shop.timezone,
      now,
    }),
    listTransactions(shop.id),
    listPayouts(shop.id),
    listExpertBookings(shop.id, { limit: 200 }),
    getPayoutDestination(shop.id),
  ]);

  // `listExpertEarnings` emits every month in the window, oldest first, so the
  // last bucket is the month in progress by construction. Deriving it here
  // rather than re-formatting `now` in the shop's zone keeps the chart's idea of
  // "this month" identical to the one the buckets were built with.
  const currentMonth = earnings[earnings.length - 1]?.month ?? "";

  // The stats carry no currency of their own — they are folds over rows that may
  // in principle mix currencies. Taking the newest ledger row's makes the tiles
  // agree with the tables beneath them, and GBP is the schema default.
  const currency = transactions[0]?.currency ?? payouts[0]?.currency ?? "INR";

  const customerNames = new Map(
    bookings.flatMap((booking) =>
      booking.customer ? [[booking.id, booking.customer.display_name] as const] : [],
    ),
  );

  const tradedEver =
    earnings.some((bucket) => bucket.grossPence > 0) ||
    transactions.length > 0 ||
    payouts.length > 0 ||
    stats.inWarrantyHoldPence > 0 ||
    stats.availableForPayoutPence > 0;

  const summary = (
    <EarningsSummary
      earnings={earnings}
      stats={stats}
      currency={currency}
      withdraw={
        <WithdrawDialog
          fixerId={shop.id}
          availablePence={stats.availableForPayoutPence}
          currency={currency}
          payoutEmail={payoutEmail}
        />
      }
    />
  );

  const header = (
    <PageHeader
      eyebrow="Money"
      title="Earnings"
      description="What customers have paid, what is still held against their warranties, and everything that has been paid out to you."
    />
  );

  // A shop that has never finished a job gets one clear panel instead of four
  // empty tables. The figures above it are still rendered — honest zeros read as
  // a working screen, where hiding them reads as something that failed to load.
  if (!tradedEver) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {summary}
        <FirstEarningsPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {summary}

      <section>
        <SectionHeader title="Revenue" />
        <RevenueChart data={earnings} currency={currency} currentMonth={currentMonth} />
      </section>

      <section>
        <SectionHeader
          title="Transactions"
          action={
            transactions.length > 0 ? (
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {pluralize(transactions.length, "payment")}
              </span>
            ) : null
          }
        />

        {transactions.length > 0 ? (
          <TransactionsTable
            transactions={transactions}
            customerNames={customerNames}
            timezone={shop.timezone}
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="No card payments yet"
            description="Individual charges appear here once card payments are switched on — each with its gross, the platform fee and what reaches you. Your monthly totals above are drawn from completed jobs and are already up to date."
          />
        )}
      </section>

      <section>
        <SectionHeader title="Payout history" />

        {payouts.length > 0 ? (
          <PayoutsTable payouts={payouts} timezone={shop.timezone} />
        ) : (
          <EmptyState
            icon={Wallet}
            title="Nothing paid out yet"
            description="Every withdrawal you request is listed here with its status, from scheduled through to settled."
          />
        )}
      </section>
    </div>
  );
}

/**
 * The zero state: how money gets from a repair to a bank account.
 *
 * Three steps rather than a dashed box, because a new shop's question is not
 * "where are my earnings" but "how does this work" — and the answer is short
 * enough to print. Numbered in mono, like every other measured thing here.
 */
function FirstEarningsPanel() {
  const steps = [
    {
      title: "List what you fix",
      body: "Services carry the price and the warranty length, and both are stamped onto every booking that follows.",
    },
    {
      title: "Finish the job",
      body: "Marking a repair complete records the money as earned and starts the customer's warranty window.",
    },
    {
      title: "Get paid",
      body: "When that window closes the funds release, and you can withdraw them to your payout email.",
    },
  ];

  return (
    <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
        How you get paid
      </h2>
      <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
        Nothing has been earned yet. Here is the whole route, start to finish.
      </p>

      <ol className="grid gap-3 pt-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-machined border border-hairline bg-bench-sunk/40 p-4"
          >
            <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="pt-2 font-display text-base uppercase tracking-wide text-enamel">
              {step.title}
            </p>
            <p className="pt-1.5 text-sm leading-relaxed text-steel">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 pt-5">
        <Button asChild variant="primary" size="sm">
          <Link href="/dashboard/expert/services">
            <Wrench aria-hidden />
            Set up your services
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/expert/profile">
            <Banknote aria-hidden />
            Add payout details
          </Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Where a payout would land, or null when the shop has not set one.
 *
 * Read here rather than from `expert.ts` because it is a settings field, not a
 * money figure, and this is the only screen that needs it. `payout_email` is
 * added by `001_marketplace.sql`, so before that migration it fails with 42703
 * (undefined_column) — which for this screen is the same answer as "not
 * configured", and the withdraw control renders its link to the profile page
 * either way.
 */
async function getPayoutDestination(fixerId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("payout_email")
    .eq("id", fixerId)
    .maybeSingle<{ payout_email: string | null }>();

  if (error) {
    console.error("[dashboard] payout destination read failed", error.message);
    return null;
  }

  return data?.payout_email ?? null;
}
