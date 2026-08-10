import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, ChevronRight, Search } from "lucide-react";

import { BookingBoard } from "@/components/dashboard/booking-board";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { slotStart } from "@/lib/bookings/actions-map";
import { listCustomerBookings, type CustomerBooking } from "@/lib/dashboard/customer";
import { formatDay, formatMoney } from "@/lib/format";
import {
  ACTIVE_BOOKING_STATUSES,
  CLOSED_BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

/**
 * Everything that is not live.
 *
 * `completed` and `disputed` are not in `CLOSED_BOOKING_STATUSES` — a completed
 * job is still inside its warranty window and a disputed one is being argued
 * about — but neither is waiting on a move from either side, so both belong in
 * the history table rather than on the board. The board is for jobs in motion.
 */
const HISTORY_STATUSES: readonly BookingStatus[] = [
  "completed",
  "disputed",
  ...CLOSED_BOOKING_STATUSES,
];

/**
 * The date a history row is filed under.
 *
 * The slot, not `created_at`: a customer looking back for "the screen repair in
 * March" is remembering when they took the thing in, not when they tapped
 * Request. Falls back to the booking's creation for a request that expired
 * before a slot was ever agreed.
 */
function historyDate(booking: CustomerBooking): string {
  return slotStart(booking.slot)?.toISOString() ?? booking.created_at;
}

function HistoryRow({ booking }: { booking: CustomerBooking }) {
  const href = `/dashboard/bookings/${booking.reference}`;
  const timeZone = booking.shop?.timezone ?? "Europe/London";
  const amount = booking.final_amount ?? booking.quoted_amount;

  return (
    <TableRow>
      <TableCell>
        <Link
          href={href}
          className="font-mono text-sm uppercase tracking-[0.08em] text-enamel hover:text-signal"
        >
          {booking.reference}
        </Link>
      </TableCell>

      <TableCell className="hidden max-w-[18ch] truncate sm:table-cell">
        {booking.shop?.shop_name ?? "Shop removed"}
      </TableCell>

      <TableCell className="hidden max-w-[22ch] truncate md:table-cell text-steel">
        {booking.service?.name ?? booking.device_details ?? "Repair"}
      </TableCell>

      <TableCell className="whitespace-nowrap font-mono text-sm tabular-nums text-steel">
        {formatDay(historyDate(booking), timeZone)}
      </TableCell>

      <TableCell className="whitespace-nowrap text-right font-mono text-sm tabular-nums">
        {amount === null ? (
          <span className="text-steel-soft">—</span>
        ) : (
          formatMoney(amount, booking.currency)
        )}
      </TableCell>

      <TableCell>
        <StatusBadge status={booking.status} />
      </TableCell>

      <TableCell className="w-10 text-right">
        <Link
          href={href}
          aria-label={`Open booking ${booking.reference}`}
          className="inline-grid size-8 place-items-center rounded-machined text-steel-soft hover:bg-bench hover:text-signal"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

/**
 * Every booking the customer has, split by whether anything is still happening.
 *
 * Two reads rather than one filtered in memory: the board and the table have
 * different limits, and pulling a heavy history to render four live cards would
 * make the top of the page wait on the bottom of it. They run in parallel, and
 * either coming back empty — including because the migration has not been run —
 * costs that section its content, never the page.
 */
export default async function BookingsPage() {
  const user = await getCurrentUser();
  // The layout gates this already; the redirect is what narrows `user`.
  if (!user) redirect("/login?next=/dashboard/bookings");

  const [active, history] = await Promise.all([
    listCustomerBookings(user.id, { statuses: ACTIVE_BOOKING_STATUSES, limit: 60 }),
    listCustomerBookings(user.id, { statuses: HISTORY_STATUSES, limit: 50 }),
  ]);

  const nothingAtAll = active.length === 0 && history.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Bookings"
        title="Your repairs"
        description="Everything on the go, stage by stage — and every job you have had done before."
        actions={
          <Button asChild variant="primary" size="sm">
            <Link href="/dashboard/discover">
              <Search aria-hidden />
              Find an expert
            </Link>
          </Button>
        }
      />

      {nothingAtAll ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings yet"
          description="Find a shop that handles your device, send a request, and it will appear here — from first reply through to the end of the warranty."
          action={
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/discover">Find an expert</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* No `aria-labelledby` on either section: `SectionHeader` already
              emits the h2, and a second sr-only heading to point at would have
              a screen reader announce the same words twice. */}
          <section>
            <SectionHeader
              title="In progress"
              action={
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {active.length} live
                </span>
              }
            />

            {active.length > 0 ? (
              <BookingBoard bookings={active} />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Nothing on the bench"
                description="No live jobs right now. Your finished repairs are in the history below."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/discover">Book another repair</Link>
                  </Button>
                }
              />
            )}
          </section>

          <section>
            <SectionHeader
              title="History"
              action={
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {history.length}
                </span>
              }
            />

            {history.length > 0 ? (
              <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
                {/* `Table` owns the horizontal scroll container. The shop and
                    service columns drop out below `sm`/`md` so a phone gets the
                    four that identify a job rather than a scrollbar. */}
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Reference</TableHead>
                      <TableHead className="hidden sm:table-cell">Shop</TableHead>
                      <TableHead className="hidden md:table-cell">Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Open</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {history.map((booking) => (
                      <HistoryRow key={booking.id} booking={booking} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No finished jobs yet"
                description="Once a repair is complete it moves down here, with its invoice and its warranty."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
