import type { ComponentType } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, Car, ChevronRight, Home, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import type { CustomerBooking } from "@/lib/dashboard/customer";
import { formatMoney, formatSlot } from "@/lib/format";
import { type DeliveryMode } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<
  DeliveryMode,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  in_shop: Building2,
  home_visit: Home,
  pickup_drop: Car,
};

/**
 * One booking, in a list.
 *
 * The whole card is the link rather than a "view" button at the end: a booking
 * row has one destination, and a 44px target beats a 12px chevron on a phone.
 *
 * Times render in the **shop's** timezone, not the customer's. A slot is an
 * appointment at a physical counter — "10:00 at the shop" has to mean the time
 * on the shop's wall, or a customer travelling turns up an hour out.
 */
export function BookingCard({
  booking,
  className,
}: {
  booking: CustomerBooking;
  className?: string;
}) {
  const timeZone = booking.shop?.timezone ?? "Europe/London";
  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);
  const ModeIcon = MODE_ICON[booking.delivery_mode];
  const tDelivery = useTranslations("deliveryModes");

  // The quote once it exists, the final price once the job is done. Before
  // either, no number at all — "₹0" would read as free.
  const amount = booking.final_amount ?? booking.quoted_amount;

  return (
    <Link
      href={`/dashboard/bookings/${booking.reference}`}
      className={cn(
        "group flex items-center gap-4 rounded-machined border border-hairline bg-chalk p-4 shadow-bench",
        "transition-shadow hover:border-steel-soft hover:shadow-lift",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {booking.reference}
          </span>
        </div>

        <p className="truncate pt-2 font-display text-base uppercase tracking-wide text-enamel">
          {booking.service?.name ?? booking.device_details ?? "Repair booking"}
        </p>

        <p className="truncate pt-0.5 text-sm text-steel">
          {booking.shop?.shop_name ?? "Shop removed"}
        </p>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5 text-xs text-steel">
          {start && end ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Slot</dt>
              <dd className="font-mono tabular-nums">{formatSlot(start, end, timeZone)}</dd>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Service type</dt>
            <dd className="flex items-center gap-1.5">
              <ModeIcon aria-hidden className="size-3.5 text-steel-soft" />
              {tDelivery(booking.delivery_mode)}
            </dd>
          </div>

          {booking.address_city ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Location</dt>
              <dd className="flex items-center gap-1.5">
                <MapPin aria-hidden className="size-3.5 text-steel-soft" />
                {booking.address_city}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {amount !== null ? (
          <span className="hidden font-mono text-sm tabular-nums text-enamel sm:inline">
            {formatMoney(amount, booking.currency)}
          </span>
        ) : null}
        <ChevronRight
          aria-hidden
          className="size-4 text-steel-soft transition-colors group-hover:text-signal"
        />
      </div>
    </Link>
  );
}
