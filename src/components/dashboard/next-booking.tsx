import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarPlus, MapPin, MessagesSquare, Phone, Search } from "lucide-react";

import { BookingCountdown } from "@/components/dashboard/countdown";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { slotEnd, slotStart, statusExplainer } from "@/lib/bookings/actions-map";
import type { CustomerBooking } from "@/lib/dashboard/customer";
import { formatMoney, formatRelative, formatSlot } from "@/lib/format";

/**
 * The hero panel: the next repair, with a live countdown.
 *
 * The schematic grid appears once per page and `PageHeader` already spent it, so
 * this panel earns its weight from the enamel bar down the left edge instead —
 * the same device the site uses for a blockquote.
 */
export function NextBookingPanel({
  booking,
  now,
}: {
  booking: CustomerBooking | null;
  now: Date;
}) {
  const tDelivery = useTranslations("deliveryModes");

  if (!booking) {
    return (
      <EmptyState
        icon={Search}
        title="No upcoming repairs"
        description="Find a shop near you, send a request, and your next appointment appears here with a countdown."
        action={
          <Button asChild variant="primary" size="sm">
            <Link href="/dashboard/discover">Find an expert</Link>
          </Button>
        }
      />
    );
  }

  const timeZone = booking.shop?.timezone ?? "Europe/London";
  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);
  const amount = booking.final_amount ?? booking.quoted_amount;

  return (
    <section className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <div className="flex flex-col gap-5 border-l-2 border-enamel p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Next appointment</p>
            <StatusBadge status={booking.status} />
          </div>

          <h2 className="pt-2.5 font-display text-display-sm uppercase text-enamel">
            {booking.service?.name ?? booking.device_details ?? "Repair booking"}
          </h2>

          <p className="pt-1 text-sm text-steel">
            {booking.shop?.shop_name ?? "Shop removed"}
            {booking.shop?.verified ? " · Verified" : ""}
          </p>

          <dl className="grid gap-x-6 gap-y-2 pt-4 text-sm sm:grid-cols-2">
            {start && end ? (
              <div>
                <dt className="eyebrow pb-1">When</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {formatSlot(start, end, timeZone)}
                </dd>
              </div>
            ) : null}

            <div>
              <dt className="eyebrow pb-1">How</dt>
              <dd className="text-enamel">{tDelivery(booking.delivery_mode)}</dd>
            </div>

            {booking.shop?.address ? (
              <div className="sm:col-span-2">
                <dt className="eyebrow pb-1">Where</dt>
                <dd className="flex items-start gap-1.5 text-steel">
                  <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-steel-soft" />
                  {booking.delivery_mode === "home_visit" && booking.address_line1
                    ? [booking.address_line1, booking.address_city, booking.address_postcode]
                        .filter(Boolean)
                        .join(", ")
                    : booking.shop.address}
                </dd>
              </div>
            ) : null}

            {amount !== null ? (
              <div>
                <dt className="eyebrow pb-1">
                  {booking.final_amount !== null ? "Final price" : "Quoted"}
                </dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {formatMoney(amount, booking.currency)}
                </dd>
              </div>
            ) : null}

            <div>
              <dt className="eyebrow pb-1">Reference</dt>
              <dd className="font-mono uppercase tracking-[0.08em] text-steel">
                {booking.reference}
              </dd>
            </div>
          </dl>

          <p className="pt-4 text-sm leading-relaxed text-steel">
            {statusExplainer(booking.status, "customer")}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          {start ? (
            <div className="sm:text-right">
              <p className="eyebrow pb-2">Starts in</p>
              <BookingCountdown
                target={start.toISOString()}
                initial={formatRelative(start, now)}
                startedLabel="On the bench now"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/dashboard/bookings/${booking.reference}`}>
                <CalendarPlus aria-hidden />
                Open booking
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/messages?booking=${booking.reference}`}>
                <MessagesSquare aria-hidden />
                Message
              </Link>
            </Button>

            {booking.shop?.contact_phone ? (
              <Button asChild variant="ghost" size="sm">
                <a href={`tel:${booking.shop.contact_phone.replace(/\s+/g, "")}`}>
                  <Phone aria-hidden />
                  Call shop
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
