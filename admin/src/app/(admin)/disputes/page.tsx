import Link from "next/link";
import type { Metadata } from "next";
import { Scale } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDisputeSummary, listDisputes, type DisputeRowView } from "@/lib/queries/disputes";
import { formatMoney, formatRelative } from "@/lib/format";
import {
  DISPUTE_STATUS_LABELS,
  OPEN_DISPUTE_STATUSES,
  type DisputeStatus,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

const TABS: { key: DisputeStatus | "open" | "all"; label: string }[] = [
  { key: "open", label: "Unresolved" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function statusVariant(status: DisputeStatus): "neutral" | "verified" | "signal" | "danger" {
  if (status === "resolved") return "verified";
  if (status === "withdrawn") return "neutral";
  if (status === "open") return "danger";
  return "signal";
}

/**
 * The adjudication queue.
 *
 * Unresolved first and oldest first: an open dispute is a customer's money held
 * and a shop's payout blocked, and both get worse with time. The refunded total
 * is on the page because it is the number that says what adjudication has
 * actually cost, which nothing else on the platform reports.
 */
export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;

  const status = TABS.some((tab) => tab.key === params.status)
    ? (params.status as DisputeStatus | "open" | "all")
    : "open";
  const q = (params.q ?? "").trim();

  const [disputes, summary] = await Promise.all([
    listDisputes({ status, q }),
    getDisputeSummary(),
  ]);

  const columns: DataColumn<DisputeRowView>[] = [
    {
      key: "reference",
      header: "Booking",
      cell: (row) => (
        <Link href={`/disputes/${row.id}`} className="flex flex-col hover:text-signal">
          <span className="font-mono text-xs text-enamel">{row.reference || "—"}</span>
          <span className="text-xs text-steel">{row.shopName}</span>
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      hideOnMobile: true,
      cell: (row) => (
        <Link href={`/customers/${row.customerId}`} className="text-enamel hover:text-signal">
          {row.customerName}
        </Link>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      hideOnMobile: true,
      cell: (row) => (
        <span className="line-clamp-2 max-w-sm text-sm text-steel">{row.reason}</span>
      ),
    },
    {
      key: "raised",
      header: "Raised",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs text-steel">{formatRelative(row.createdAt)}</span>
      ),
    },
    {
      key: "refund",
      header: "Refund",
      align: "right",
      hideOnMobile: true,
      cell: (row) =>
        row.refundPence !== null ? (
          <span className="font-mono text-enamel">
            {formatMoney(row.refundPence, row.currency)}
          </span>
        ) : (
          <span className="text-steel-soft">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      cell: (row) => (
        <Badge variant={statusVariant(row.status)}>{DISPUTE_STATUS_LABELS[row.status]}</Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Warranty claims"
        description="Where a claim is decided. Every resolution is final and both parties are told."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label="Unresolved"
          value={String(summary.open)}
          tone={summary.open > 0 ? "signal" : "neutral"}
          href="/disputes?status=open"
        />
        <StatTile label="Awaiting a party" value={String(summary.awaiting)} />
        <StatTile label="Resolved" value={String(summary.resolved)} tone="verdigris" />
        <StatTile
          label="Refunded"
          value={formatMoney(summary.refundedPence)}
          hint="Total across all resolutions"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Filter claims" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const search = new URLSearchParams();
            search.set("status", tab.key);
            if (q) search.set("q", q);

            return (
              <Link
                key={tab.key}
                href={`/disputes?${search.toString()}`}
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
            <label htmlFor="dispute-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="dispute-search"
              name="q"
              defaultValue={q}
              placeholder="Reference, customer or shop"
              className="w-full sm:w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      <DataTable
        columns={columns}
        rows={disputes}
        getRowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={Scale}
            title={q ? "Nothing matches that" : "No claims"}
            description={
              q
                ? "Clear the search to see the whole queue."
                : status === "open"
                  ? "Nothing is waiting on a decision. Claims arrive when a customer opens one inside their warranty window."
                  : "Nothing in this state yet."
            }
            action={
              q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/disputes?status=${status}`}>Clear search</Link>
                </Button>
              ) : null
            }
          />
        }
      />

      {/* Referenced so the shared constant stays the single definition of "open". */}
      <p className="sr-only">
        Unresolved covers {OPEN_DISPUTE_STATUSES.map((s) => DISPUTE_STATUS_LABELS[s]).join(", ")}.
      </p>
    </div>
  );
}
