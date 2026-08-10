import Link from "next/link";
import type { Metadata } from "next";
import { Store } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listExperts, type ExpertFilters, type ExpertRow } from "@/lib/queries/experts";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Experts",
  robots: { index: false, follow: false },
};

const SORTS: { key: NonNullable<ExpertFilters["sort"]>; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "revenue", label: "Revenue" },
  { key: "bookings", label: "Jobs" },
  { key: "rating", label: "Rating" },
];

function isSort(value: string | undefined): value is NonNullable<ExpertFilters["sort"]> {
  return SORTS.some((sort) => sort.key === value);
}

function isYesNo(value: string | undefined): value is "yes" | "no" {
  return value === "yes" || value === "no";
}

/**
 * Every shop on the platform.
 *
 * The column worth looking at first is "Owner". An unclaimed shop has no
 * `owner_id`, which means nobody can accept a booking for it — it appears in
 * search, takes requests, and then silently strands every customer who asks.
 * Unclaimed is the platform's most common broken state, so it is a filter and a
 * headline number rather than something to notice by reading rows.
 */
export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; verified?: string; claimed?: string; sort?: string }>;
}) {
  const params = await searchParams;

  const filters: ExpertFilters = {
    q: params.q?.trim() || undefined,
    verified: isYesNo(params.verified) ? params.verified : undefined,
    claimed: isYesNo(params.claimed) ? params.claimed : undefined,
    sort: isSort(params.sort) ? params.sort : "name",
  };

  // Unfiltered, for the headline counts — filtering these would make them move
  // as the reader narrows the list, which is not what a total is for.
  const [experts, all] = await Promise.all([listExperts(filters), listExperts({})]);

  const unclaimed = all.filter((expert) => expert.ownerId === null).length;
  const unverified = all.filter((expert) => !expert.verified).length;

  const columns: DataColumn<ExpertRow>[] = [
    {
      key: "shop",
      header: "Shop",
      cell: (row) => (
        <Link href={`/experts/${row.id}`} className="flex flex-col text-enamel hover:text-signal">
          <span className="flex items-center gap-2 font-medium">
            {row.shopName}
            {row.verified ? <Badge variant="verified">Verified</Badge> : null}
          </span>
          <span className="text-xs text-steel">{row.address}</span>
        </Link>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) =>
        row.ownerId ? (
          <span className="text-enamel">{row.ownerName}</span>
        ) : (
          <Badge variant="signal">Unclaimed</Badge>
        ),
    },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      hideOnMobile: true,
      cell: (row) =>
        row.ratingCount > 0 ? (
          <span className="font-mono text-enamel">
            {row.ratingAvg.toFixed(1)}
            <span className="text-steel-soft"> ({row.ratingCount})</span>
          </span>
        ) : (
          <span className="text-steel-soft">—</span>
        ),
    },
    {
      key: "services",
      header: "Services",
      align: "right",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono text-enamel">{row.serviceCount}</span>,
    },
    {
      key: "bookings",
      header: "Jobs",
      align: "right",
      cell: (row) => <span className="font-mono text-enamel">{row.bookingCount}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      cell: (row) => <span className="font-mono text-enamel">{formatMoney(row.grossPence)}</span>,
    },
    {
      key: "last",
      header: "Last job",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="font-mono text-xs text-steel">
          {row.lastBookingAt ? formatRelative(row.lastBookingAt) : "—"}
        </span>
      ),
    },
  ];

  const withParam = (key: string, value: string | undefined) => {
    const search = new URLSearchParams();
    if (filters.q) search.set("q", filters.q);
    if (filters.verified) search.set("verified", filters.verified);
    if (filters.claimed) search.set("claimed", filters.claimed);
    if (filters.sort) search.set("sort", filters.sort);
    if (value === undefined) search.delete(key);
    else search.set(key, value);
    return `/experts?${search.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Experts"
        description="Every shop on the platform, claimed or not."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Shops" value={String(all.length)} />
        <StatTile
          label="Unclaimed"
          value={String(unclaimed)}
          tone={unclaimed > 0 ? "signal" : "neutral"}
          hint={unclaimed > 0 ? "Cannot accept bookings" : "All claimed"}
          href="/experts?claimed=no"
        />
        <StatTile
          label="Unverified"
          value={String(unverified)}
          href="/experts?verified=no"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Filter by claim state" className="flex items-center gap-1">
            <span className="eyebrow mr-1 text-steel-soft">Claimed</span>
            {[
              { key: undefined, label: "Any" },
              { key: "yes" as const, label: "Yes" },
              { key: "no" as const, label: "No" },
            ].map((option) => (
              <Link
                key={option.label}
                href={withParam("claimed", option.key)}
                aria-current={filters.claimed === option.key ? "true" : undefined}
                className={cn(
                  "rounded-machined px-2.5 py-1 font-display text-xs uppercase tracking-wide transition-colors",
                  filters.claimed === option.key
                    ? "bg-enamel text-bench"
                    : "text-steel hover:bg-bench hover:text-enamel",
                )}
              >
                {option.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Sort experts" className="flex items-center gap-1">
            <span className="eyebrow mr-1 text-steel-soft">Sort</span>
            {SORTS.map((sort) => (
              <Link
                key={sort.key}
                href={withParam("sort", sort.key)}
                aria-current={filters.sort === sort.key ? "true" : undefined}
                className={cn(
                  "rounded-machined px-2.5 py-1 font-display text-xs uppercase tracking-wide transition-colors",
                  filters.sort === sort.key
                    ? "bg-enamel text-bench"
                    : "text-steel hover:bg-bench hover:text-enamel",
                )}
              >
                {sort.label}
              </Link>
            ))}
          </nav>
        </div>

        <form method="get" className="flex items-end gap-2">
          {filters.claimed ? <input type="hidden" name="claimed" value={filters.claimed} /> : null}
          {filters.verified ? (
            <input type="hidden" name="verified" value={filters.verified} />
          ) : null}
          {filters.sort ? <input type="hidden" name="sort" value={filters.sort} /> : null}
          <div className="flex flex-col gap-1">
            <label htmlFor="expert-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="expert-search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Shop, address or owner"
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
        rows={experts}
        getRowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={Store}
            title={filters.q ? "No shop matches that" : "No shops yet"}
            description={
              filters.q
                ? "Clear the search to see every shop."
                : "Shops arrive from the seed data or the directory. If this is empty, the database has no fixer_profiles rows."
            }
            action={
              filters.q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/experts">Clear search</Link>
                </Button>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
