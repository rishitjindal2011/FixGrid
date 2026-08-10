import Link from "next/link";
import type { Metadata } from "next";
import { Inbox, ShieldCheck } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getClaimCounts, listClaims, type ClaimRow } from "@/lib/queries/claims";
import { formatRelative } from "@/lib/format";
import type { ClaimStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Claims",
  robots: { index: false, follow: false },
};

const TABS: { key: ClaimStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_VARIANT: Record<ClaimStatus, "neutral" | "verified" | "signal" | "danger"> = {
  pending: "signal",
  approved: "verified",
  rejected: "danger",
  withdrawn: "neutral",
};

/**
 * The claim queue.
 *
 * This is the screen the whole marketplace waits on. Nothing else in the product
 * can set `fixer_profiles.owner_id`, so until a claim is approved here no expert
 * owns a shop, no shop can accept a booking, and every expert dashboard renders
 * its "claim your shop" screen instead. The pending count is therefore the most
 * important number in the admin panel, and it gets signal treatment when it is
 * not zero.
 */
export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;

  const status = TABS.some((tab) => tab.key === params.status)
    ? (params.status as ClaimStatus | "all")
    : "pending";
  const q = (params.q ?? "").trim();

  const [claims, counts] = await Promise.all([listClaims({ status, q }), getClaimCounts()]);

  const columns: DataColumn<ClaimRow>[] = [
    {
      key: "shop",
      header: "Shop",
      cell: (row) => (
        <Link href={`/claims/${row.id}`} className="flex flex-col text-enamel hover:text-signal">
          <span className="font-medium">{row.shopName}</span>
          <span className="text-xs text-steel">{row.shopAddress}</span>
        </Link>
      ),
    },
    {
      key: "claimant",
      header: "Claimant",
      hideOnMobile: true,
      cell: (row) => (
        <span className="flex flex-col">
          <span className="text-enamel">{row.claimantName}</span>
          {row.contactPhone ? (
            <span className="font-mono text-xs text-steel">{row.contactPhone}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "owned",
      header: "Shop",
      hideOnMobile: true,
      // Three states worth telling apart before opening the claim. A hidden
      // shop is a brand-new submission nobody has vetted; an owned one means
      // approving hands a live listing to a different account.
      cell: (row) =>
        row.shopIsHidden ? (
          <Badge variant="signal">New submission</Badge>
        ) : row.shopOwnerId ? (
          <Badge variant="danger">Already owned</Badge>
        ) : (
          <span className="text-steel-soft">Unclaimed</span>
        ),
    },
    {
      key: "submitted",
      header: "Submitted",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs text-steel">{formatRelative(row.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Shop claims"
        description="Approving a claim is what gives a shop its owner. Nothing else in the product can do it."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Pending"
          value={String(counts.pending)}
          tone={counts.pending > 0 ? "signal" : "neutral"}
          hint={counts.pending > 0 ? "Shops waiting to trade" : "Nothing waiting"}
          href="/claims?status=pending"
        />
        <StatTile
          label="Approved"
          value={String(counts.approved)}
          tone="verdigris"
          href="/claims?status=approved"
        />
        <StatTile
          label="Rejected"
          value={String(counts.rejected)}
          href="/claims?status=rejected"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Filter claims" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const active = tab.key === status;
            const search = new URLSearchParams();
            search.set("status", tab.key);
            if (q) search.set("q", q);

            return (
              <Link
                key={tab.key}
                href={`/claims?${search.toString()}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-machined px-3 py-1.5 font-display text-xs uppercase tracking-wide transition-colors",
                  active ? "bg-enamel text-bench" : "text-steel hover:bg-bench hover:text-enamel",
                )}
              >
                {tab.label}
                <span className="ml-1.5 font-mono text-[0.7rem] opacity-70">
                  {counts[tab.key]}
                </span>
              </Link>
            );
          })}
        </nav>

        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="flex flex-col gap-1">
            <label htmlFor="claim-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="claim-search"
              name="q"
              defaultValue={q}
              placeholder="Shop, claimant or phone"
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
        rows={claims}
        getRowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={q ? Inbox : ShieldCheck}
            title={q ? "Nothing matches that search" : `No ${status === "all" ? "" : status} claims`}
            description={
              q
                ? "Clear the search to see the whole queue."
                : status === "pending"
                  ? "Nothing is waiting on a decision. Shops appear here when someone claims them from the expert dashboard."
                  : "Nothing in this state yet."
            }
            action={
              q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/claims?status=${status}`}>Clear search</Link>
                </Button>
              ) : null
            }
          />
        }
      />

      {session && session.role === "viewer" ? (
        <p className="text-xs text-steel">
          You have viewer access — you can read the queue but not decide claims.
        </p>
      ) : null}
    </div>
  );
}
