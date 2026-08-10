import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { BookingActions } from "@/components/dashboard/expert/pending-requests-panel";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { formatDuration, formatTime } from "@/lib/format";
import {
  DELIVERY_MODE_LABELS,
  type BookingCustomerSummary,
  type BookingRow,
} from "@/lib/types/marketplace";

/**
 * Today's jobs, in slot order.
 *
 * Rows rather than a real `<table>`: the same markup has to work at 375px and
 * 1280px, and a table that turns into cards on mobile means writing the row
 * twice and keeping the two in step. A grid that reflows says the same thing
 * once.
 *
 * Times are formatted in the shop's timezone, not the runtime's — a server
 * rendering in one region and a shop in another would otherwise disagree about
 * what "today" even means.
 */

type ScheduledBooking = Pick<
  BookingRow,
  | "id"
  | "reference"
  | "status"
  | "slot"
  | "warranty_expires_at"
  | "delivery_mode"
  | "device_details"
  | "address_city"
> & {
  customer: BookingCustomerSummary | null;
  service: { id: string; name: string; duration_minutes: number } | null;
};

export function TodaySchedule({
  bookings,
  timezone,
  now,
}: {
  bookings: ScheduledBooking[];
  timezone: string;
  now: Date;
}) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing booked today"
        description="Confirmed jobs appear here in slot order, with the actions you can take on each."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/expert/schedule">Open the calendar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ol className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      {bookings.map((booking, index) => {
        const start = slotStart(booking.slot);
        const end = slotEnd(booking.slot);
        const customerName =
          booking.customer?.display_name ?? booking.customer?.full_name ?? "Customer";

        return (
          <li
            key={booking.id}
            className={
              index > 0
                ? "border-t border-hairline p-4 sm:p-5"
                : "p-4 sm:p-5"
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
              <p className="shrink-0 font-mono text-sm tabular-nums text-enamel sm:w-28">
                {start ? formatTime(start, timezone) : "—"}
                {end ? (
                  <span className="text-steel-soft">–{formatTime(end, timezone)}</span>
                ) : null}
              </p>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="font-display text-base uppercase tracking-wide text-enamel">
                    {customerName}
                  </p>
                  <StatusBadge status={booking.status} />
                </div>

                <p className="pt-1 text-sm text-steel">
                  {booking.service?.name ?? booking.device_details ?? "Repair"}
                  {booking.service ? (
                    <span className="text-steel-soft">
                      {" · "}
                      {formatDuration(booking.service.duration_minutes)}
                    </span>
                  ) : null}
                </p>

                {booking.delivery_mode !== "in_shop" ? (
                  <p className="flex items-center gap-1.5 pt-1 text-xs text-steel-soft">
                    <MapPin aria-hidden className="size-3.5 shrink-0" />
                    {DELIVERY_MODE_LABELS[booking.delivery_mode]}
                    {booking.address_city ? ` · ${booking.address_city}` : ""}
                  </p>
                ) : null}

                <p className="pt-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {booking.reference}
                </p>
              </div>

              <BookingActions
                booking={booking}
                now={now}
                className="shrink-0 sm:max-w-xs sm:items-end"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
