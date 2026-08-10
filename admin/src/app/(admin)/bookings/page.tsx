import Link from "next/link";
import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listBookings, type BookingRowView } from "@/lib/queries/bookings";
import { formatDateTime, formatMoney, slotStart } from "@/lib/format";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

/**
 * Every status, read from the labels map rather than retyped — a status added to
 * the enum should appear in this filter without anyone remembering to add it.
 */
const STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];

const STATUS_VARIANT: Partial<Record<BookingStatus, "neutral" | "verified" | "signal" | "danger">> = {
  requested: "signal",
  accepted: "signal",
  in_progress: "signal",
  completed: "verified",
  closed: "neutral",
  disputed: "danger",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;

  const status = STATUSES.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : "all";
  const q = (params.q ?? "").trim();

  const bookings = await listBookings({ status, q });

  const columns: DataColumn<BookingRowView>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <Link
          href={`/bookings/${row.reference}`}
          className="font-mono text-xs text-enamel hover:text-signal"
        >
          {row.reference}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <Link href={`/customers/${row.customerId}`} className="text-enamel hover:text-signal">
          {row.customerName}
        </Link>
      ),
    },
    {
      key: "shop",
      header: "Shop",
      hideOnMobile: true,
      cell: (row) => (
        <Link href={`/experts/${row.shopId}`} className="text-enamel hover:text-signal">
          {row.shopName}
        </Link>
      ),
    },
    {
      key: "service",
      header: "Service",
      hideOnMobile: true,
      cell: (row) => <span className="text-steel">{row.serviceName ?? "—"}</span>,
    },
    {
      key: "slot",
      header: "Slot",
      hideOnMobile: true,
      cell: (row) => {
        const start = slotStart(row.slot);
        return (
          <span className="font-mono text-xs text-steel">
            {start ? formatDateTime(start, row.shopTimezone) : "—"}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-enamel">{formatMoney(row.amountPence, row.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "neutral"}>
          {BOOKING_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform"
        title="Bookings"
        description="Every job on the platform. Read-only — the parties move bookings, not admins."
      />

      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="eyebrow text-steel">
            Status
          </label>
          <Select id="status" name="status" defaultValue={status} className="sm:w-48">
            <option value="all">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {BOOKING_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="booking-search" className="eyebrow text-steel">
            Search
          </label>
          <Input
            id="booking-search"
            name="q"
            defaultValue={q}
            placeholder="Reference, customer or shop"
            className="w-full sm:w-72"
          />
        </div>

        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={bookings}
        getRowKey={(row) => row.id}
        caption={
          bookings.length > 0 ? (
            <span className="font-mono text-xs text-steel">
              {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
        empty={
          <EmptyState
            icon={CalendarRange}
            title={q || status !== "all" ? "Nothing matches those filters" : "No bookings yet"}
            description={
              q || status !== "all"
                ? "Widen the filters to see more."
                : "Jobs appear here as customers book them. If this is empty, either nobody has booked or the marketplace migration has not been applied."
            }
            action={
              q || status !== "all" ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/bookings">Clear filters</Link>
                </Button>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
