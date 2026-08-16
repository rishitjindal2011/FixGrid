import Link from "next/link";
import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { BillActions } from "@/components/admin/bill-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { getBillCounts, listBills, projectedRebate, type BillStatus } from "@/lib/queries/bills";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bills",
  robots: { index: false, follow: false },
};

const TABS: { key: BillStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_VARIANT: Record<BillStatus, "neutral" | "verified" | "signal" | "danger"> = {
  pending: "signal",
  approved: "verified",
  rejected: "danger",
};

/**
 * The bill queue — the only screen in this console that pays money outward.
 *
 * Every row carries all three figures the decision needs: what the shop billed,
 * what the job itself came to, and what the rebate would be. A reviewer who has to
 * open the booking to find the second number is a reviewer who will stop checking
 * it, and the gap between billed and job total is exactly where an inflated bill
 * shows up.
 *
 * Oldest first, because a shop waiting here is waiting on money.
 */
export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = TABS.some((tab) => tab.key === params.status)
    ? (params.status as BillStatus | "all")
    : "pending";

  const [bills, counts, session] = await Promise.all([
    listBills({ status }),
    getBillCounts(),
    getSession(),
  ]);

  // Deciding a bill is editor-level, matching claims and disputes. The actions
  // re-check for themselves; hiding the buttons just avoids offering a viewer
  // something that will refuse.
  const canDecide = session !== null && session.role !== "viewer";

  const pendingValue = bills
    .filter((bill) => bill.status === "pending")
    .reduce((sum, bill) => sum + projectedRebate(bill.amountMinor, bill.jobMinor), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Money out"
        title="Bills"
        description="Shops file a bill when a job is finished. Approving one pays them 5% of it, capped at the job's own total."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Awaiting review"
          value={String(counts.pending)}
          hint="Shops waiting on a rebate"
        />
        <StatTile
          label="Rebate owed"
          value={formatMoney(pendingValue)}
          hint="If everything pending is approved"
        />
        <StatTile label="Decided" value={String(counts.approved + counts.rejected)} />
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/bills?status=${tab.key}`}
            aria-current={status === tab.key ? "page" : undefined}
            className={cn(
              "rounded-machined border px-3 py-1.5 text-sm transition-colors",
              status === tab.key
                ? "border-enamel bg-enamel text-chalk"
                : "border-hairline bg-chalk text-steel hover:border-steel-soft",
            )}
          >
            {tab.label}
            <span className="pl-1.5 font-mono text-xs tabular-nums opacity-70">
              {counts[tab.key]}
            </span>
          </Link>
        ))}
      </nav>

      {bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={status === "pending" ? "No bills waiting" : "Nothing here"}
          description={
            status === "pending"
              ? "When a shop finishes a job and files its bill, it lands here for checking before the 5% is paid."
              : "No bills with that status."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {bills.map((bill) => {
            const rebate = projectedRebate(bill.amountMinor, bill.jobMinor);
            const capped = bill.jobMinor !== null && bill.jobMinor < bill.amountMinor;

            return (
              <li
                key={bill.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/experts/${bill.shopId}`}
                      className="truncate text-sm text-enamel hover:text-signal"
                    >
                      {bill.shopName}
                    </Link>
                    <Link
                      href={`/bookings/${encodeURIComponent(bill.bookingReference)}`}
                      className="font-mono text-xs uppercase tracking-wide text-steel hover:text-signal"
                    >
                      {bill.bookingReference}
                    </Link>
                    <Badge variant={STATUS_VARIANT[bill.status]}>{bill.status}</Badge>
                    {capped ? <Badge variant="danger">over job total</Badge> : null}
                  </p>

                  <p className="pt-1 text-xs text-steel">
                    Billed{" "}
                    <span className="font-mono tabular-nums text-enamel">
                      {formatMoney(bill.amountMinor, bill.currency)}
                    </span>
                    {" · job "}
                    <span className="font-mono tabular-nums text-enamel">
                      {bill.jobMinor === null ? "—" : formatMoney(bill.jobMinor, bill.currency)}
                    </span>
                    {" · filed "}
                    {formatRelative(bill.createdAt)}
                  </p>

                  {bill.reviewNote ? (
                    <p className="pt-1 text-xs italic leading-relaxed text-steel">
                      {bill.reviewNote}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="eyebrow text-steel">
                      {bill.status === "approved" ? "Paid" : "Rebate"}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-enamel">
                      {formatMoney(
                        bill.status === "approved" ? (bill.rebateMinor ?? 0) : rebate,
                        bill.currency,
                      )}
                    </p>
                  </div>

                  {bill.status === "pending" && canDecide ? (
                    <BillActions
                      billId={bill.id}
                      shopName={bill.shopName}
                      bookingReference={bill.bookingReference}
                      amountMinor={bill.amountMinor}
                      jobMinor={bill.jobMinor}
                      projectedRebateMinor={rebate}
                      currency={bill.currency}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
