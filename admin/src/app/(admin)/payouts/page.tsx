import Link from "next/link";
import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { PayoutActions } from "@/components/admin/payout-actions";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canAdminister, getSession } from "@/lib/auth/session";
import { getPayoutSummary, listPayouts } from "@/lib/queries/payouts";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import { PAYOUT_STATUS_LABELS, type PayoutStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payouts",
  robots: { index: false, follow: false },
};

const TABS: { key: PayoutStatus | "pending" | "all"; label: string }[] = [
  { key: "pending", label: "Outstanding" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "all", label: "All" },
];

function statusVariant(status: PayoutStatus): "neutral" | "verified" | "signal" | "danger" {
  if (status === "paid") return "verified";
  if (status === "failed") return "danger";
  if (status === "scheduled") return "signal";
  return "neutral";
}

/**
 * The payout ledger.
 *
 * Rendered as cards rather than a table because each outstanding row carries a
 * two-step confirmation form, and a form inside a table cell collapses badly on
 * a narrow screen — which is exactly where a mis-tap is most likely.
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;

  const status = TABS.some((tab) => tab.key === params.status)
    ? (params.status as PayoutStatus | "pending" | "all")
    : "pending";
  const q = (params.q ?? "").trim();

  const [payouts, summary, session] = await Promise.all([
    listPayouts({ status, q }),
    getPayoutSummary(),
    getSession(),
  ]);

  const canPay = session !== null && canAdminister(session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Payouts"
        description="Money owed to shops, and money already sent."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Scheduled"
          value={formatMoney(summary.scheduledPence)}
          tone={summary.scheduledPence > 0 ? "signal" : "neutral"}
          hint="Due now"
        />
        <StatTile label="In transit" value={formatMoney(summary.inTransitPence)} />
        <StatTile
          label="Held in escrow"
          value={formatMoney(summary.inEscrowPence)}
          hint="Warranty windows still open — not yet due"
        />
        <StatTile
          label="Paid this month"
          value={formatMoney(summary.paidThisMonthPence)}
          tone="verdigris"
        />
      </div>

      {summary.failedCount > 0 ? (
        <p className="rounded-machined border border-rust/30 bg-rust-wash px-4 py-3 text-sm text-enamel">
          {summary.failedCount} payout{summary.failedCount === 1 ? " has" : "s have"} failed and
          the shop has not been paid.{" "}
          <Link href="/payouts?status=failed" className="text-rust underline">
            Review them
          </Link>
          .
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Filter payouts" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const search = new URLSearchParams();
            search.set("status", tab.key);
            if (q) search.set("q", q);

            return (
              <Link
                key={tab.key}
                href={`/payouts?${search.toString()}`}
                aria-current={tab.key === status ? "page" : undefined}
                className={cn(
                  "rounded-machined px-3 py-1.5 font-display text-xs uppercase tracking-wide transition-colors",
                  tab.key === status
                    ? "bg-enamel text-bench"
                    : "text-steel hover:bg-bench hover:text-enamel",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="flex flex-col gap-1">
            <label htmlFor="payout-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="payout-search"
              name="q"
              defaultValue={q}
              placeholder="Shop or reference"
              className="w-full sm:w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {payouts.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={q ? "Nothing matches that" : "No payouts"}
          description={
            q
              ? "Clear the search to see the whole ledger."
              : status === "pending"
                ? "Nothing is owed right now. Payouts are created as warranty windows close on completed jobs."
                : "Nothing in this state yet."
          }
          action={
            q ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/payouts?status=${status}`}>Clear search</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {payouts.map((payout) => {
            const actionable = payout.status === "scheduled" || payout.status === "in_transit";

            return (
              <li
                key={payout.id}
                className="flex flex-col gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <Link
                      href={`/experts/${payout.shopId}`}
                      className="font-display text-sm uppercase tracking-wide text-enamel hover:text-signal"
                    >
                      {payout.shopName}
                    </Link>
                    <span className="font-mono text-xs text-steel">
                      {payout.payoutEmail ?? "No payout email on file"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg text-enamel">
                      {formatMoney(payout.amountPence, payout.currency)}
                    </span>
                    <Badge variant={statusVariant(payout.status)}>
                      {PAYOUT_STATUS_LABELS[payout.status]}
                    </Badge>
                  </div>
                </div>

                <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-steel">
                  <div className="flex gap-2">
                    <dt className="text-steel-soft">Created</dt>
                    <dd>{formatRelative(payout.createdAt)}</dd>
                  </div>
                  {payout.scheduledFor ? (
                    <div className="flex gap-2">
                      <dt className="text-steel-soft">Scheduled</dt>
                      <dd>{formatDateTime(payout.scheduledFor)}</dd>
                    </div>
                  ) : null}
                  {payout.paidAt ? (
                    <div className="flex gap-2">
                      <dt className="text-steel-soft">Paid</dt>
                      <dd>{formatDateTime(payout.paidAt)}</dd>
                    </div>
                  ) : null}
                  {payout.providerPayoutId ? (
                    <div className="flex gap-2">
                      <dt className="text-steel-soft">Reference</dt>
                      <dd className="break-all">{payout.providerPayoutId}</dd>
                    </div>
                  ) : null}
                </dl>

                {actionable && canPay ? (
                  <PayoutActions
                    payoutId={payout.id}
                    shopName={payout.shopName}
                    amountPence={payout.amountPence}
                    currency={payout.currency}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!canPay ? (
        <p className="text-xs text-steel">
          Marking payouts paid or failed is owner-only. You can read the ledger.
        </p>
      ) : null}
    </div>
  );
}
