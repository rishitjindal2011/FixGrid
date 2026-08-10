import { BookingCard } from "@/components/dashboard/booking-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CustomerBooking } from "@/lib/dashboard/customer";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/types/marketplace";

/**
 * The four live stages, left to right, in the order a job passes through them.
 *
 * Deliberately not derived from `ACTIVE_BOOKING_STATUSES`: that constant is a
 * membership test and its order carries no promise, where these are columns
 * whose sequence *is* the meaning. The blurb answers the only question a
 * customer has about a column — whose move is it.
 */
const COLUMNS: readonly { status: BookingStatus; blurb: string }[] = [
  { status: "requested", blurb: "Waiting on the shop" },
  { status: "accepted", blurb: "Waiting on you" },
  { status: "confirmed", blurb: "Booked in" },
  { status: "in_progress", blurb: "On the bench" },
];

/**
 * Active bookings as a board: columns on desktop, accordions on a phone.
 *
 * A server component. The accordion is Radix, which is a client component, but
 * nothing here holds state — `defaultValue` opens every section that has
 * something in it and Radix owns the toggling from there, so the board itself
 * costs no JavaScript and no hydration boundary of its own.
 *
 * The two breakpoints render the same cards through different structures rather
 * than one structure restyled. Four columns cannot become four accordions in
 * CSS — an accordion needs a button, a heading and a collapsible region that a
 * grid cell has no equivalent for. A customer's live list is a handful of rows,
 * so the duplicated markup is cheap; a `<details>` forced open by a media query
 * would be cheaper and would strand content closed on a resize.
 */
export function BookingBoard({ bookings }: { bookings: CustomerBooking[] }) {
  const columns = COLUMNS.map((column) => ({
    ...column,
    label: BOOKING_STATUS_LABELS[column.status],
    bookings: bookings.filter((booking) => booking.status === column.status),
  }));

  const populated = columns.filter((column) => column.bookings.length > 0);

  return (
    <>
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        {columns.map((column) => (
          <section key={column.status} aria-labelledby={`board-${column.status}`}>
            <div className="flex items-baseline justify-between gap-2 border-b border-hairline pb-2">
              <h3 id={`board-${column.status}`} className="eyebrow">
                {column.label}
              </h3>
              <span className="font-mono text-eyebrow tabular-nums text-steel-soft">
                {column.bookings.length}
              </span>
            </div>

            <p className="pt-2 text-xs text-steel-soft">{column.blurb}</p>

            <div className="flex flex-col gap-3 pt-3">
              {column.bookings.length > 0 ? (
                column.bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="rounded-machined border border-dashed border-hairline px-3 py-6 text-center text-xs text-steel-soft">
                  Nothing here
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="lg:hidden">
        <Accordion
          type="multiple"
          defaultValue={populated.map((column) => column.status)}
          className="rounded-machined border border-hairline bg-chalk px-4 shadow-bench"
        >
          {columns.map((column) => (
            <AccordionItem key={column.status} value={column.status}>
              <AccordionTrigger>
                <span className="flex flex-col gap-1">
                  <span>{column.label}</span>
                  <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                    {column.bookings.length} · {column.blurb}
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="pr-0">
                {column.bookings.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {column.bookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-machined border border-dashed border-hairline px-3 py-5 text-center text-xs text-steel-soft">
                    Nothing at this stage
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
