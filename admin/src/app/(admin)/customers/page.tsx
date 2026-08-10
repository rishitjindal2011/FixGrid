import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listCustomers,
  type CustomerFilters,
  type CustomerRow,
} from "@/lib/queries/customers";
import { formatDay, formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customers",
  robots: { index: false, follow: false },
};

const SORTS: { key: NonNullable<CustomerFilters["sort"]>; label: string }[] = [
  { key: "joined", label: "Joined" },
  { key: "spend", label: "Spend" },
  { key: "bookings", label: "Bookings" },
];

function isSort(value: string | undefined): value is NonNullable<CustomerFilters["sort"]> {
  return SORTS.some((sort) => sort.key === value);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;

  const filters: CustomerFilters = {
    q: params.q?.trim() || undefined,
    sort: isSort(params.sort) ? params.sort : "joined",
  };

  const customers = await listCustomers(filters);

  const columns: DataColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (row) => (
        <Link href={`/customers/${row.id}`} className="flex flex-col text-enamel hover:text-signal">
          <span className="font-medium">{row.displayName}</span>
          {row.phone ? (
            <span className="font-mono text-xs text-steel">{row.phone}</span>
          ) : null}
        </Link>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono text-xs text-steel">{formatDay(row.createdAt)}</span>,
    },
    {
      key: "bookings",
      header: "Bookings",
      align: "right",
      cell: (row) => <span className="font-mono text-enamel">{row.bookingCount}</span>,
    },
    {
      key: "spent",
      header: "Spent",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-enamel">{formatMoney(row.totalSpentPence)}</span>
      ),
    },
    {
      key: "disputes",
      header: "Claims",
      align: "right",
      hideOnMobile: true,
      cell: (row) =>
        row.disputeCount > 0 ? (
          <Badge variant="danger">{row.disputeCount}</Badge>
        ) : (
          <span className="font-mono text-steel-soft">0</span>
        ),
    },
    {
      key: "last",
      header: "Last seen",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="font-mono text-xs text-steel">
          {row.lastBookingAt ? formatRelative(row.lastBookingAt) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Customers"
        description="Every account on the platform. These are real customer records, not test data."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Sort customers" className="flex items-center gap-1">
          <span className="eyebrow mr-1 text-steel-soft">Sort</span>
          {SORTS.map((sort) => {
            const search = new URLSearchParams();
            if (filters.q) search.set("q", filters.q);
            search.set("sort", sort.key);

            return (
              <Link
                key={sort.key}
                href={`/customers?${search.toString()}`}
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
            );
          })}
        </nav>

        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="sort" value={filters.sort ?? "joined"} />
          <div className="flex flex-col gap-1">
            <label htmlFor="customer-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="customer-search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name or phone"
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
        rows={customers}
        getRowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={Users}
            title={filters.q ? "No customer matches that" : "No customers yet"}
            description={
              filters.q
                ? "Clear the search to see everyone."
                : "Accounts appear here as people sign up on the site."
            }
            action={
              filters.q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/customers">Clear search</Link>
                </Button>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
