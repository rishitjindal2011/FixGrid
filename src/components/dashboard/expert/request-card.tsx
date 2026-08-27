import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  Car,
  Clock,
  Home,
  Hourglass,
  MapPin,
  Phone,
  Smartphone,
} from "lucide-react";

import { BookingActions } from "@/components/dashboard/booking-actions";
import { RequestActions } from "@/components/dashboard/expert/request-actions";
import type { RequestPricing } from "@/components/dashboard/expert/quote-form";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { allowedActions, slotEnd, slotStart } from "@/lib/bookings/actions-map";
import type { ExpertBooking, ExpertService } from "@/lib/dashboard/expert";
import {
  formatDateTime,
  formatMoney,
  formatPriceRange,
  formatRelative,
  formatSlot,
} from "@/lib/format";
import {
  type BookingRow,
  type DeliveryMode,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * One unanswered request, as the queue draws it.
 *
 * A server component: everything on it is text the server already has, and the
 * only interactive part — the three answers — is a client leaf inside it. That
 * keeps the customer's name, the address and the whole card body out of the
 * bundle and off the hydration path.
 *
 * `now` is a prop rather than a `new Date()` here so that the waiting time, the
 * expiry countdown and the action gating all agree on one instant, and so the
 * client leaf hydrates against the same one.
 */

const MODE_ICON: Record<DeliveryMode, typeof Building2> = {
  in_shop: Building2,
  home_visit: Home,
  pickup_drop: Car,
};

/** Modes where somebody has to travel, and the address on the booking matters. */
const NEEDS_ADDRESS: readonly DeliveryMode[] = ["home_visit", "pickup_drop"];

/**
 * The catalogue price for each service, keyed by id.
 *
 * Built once per page and handed down. `bookings` carries what was agreed, and
 * on an unanswered request nothing has been — so the only price in the system is
 * the one on `shop_services`, and the embedded service on a booking row is
 * narrowed to id/name/duration.
 */
export function buildPricingIndex(services: ExpertService[]): Map<string, RequestPricing> {
  return new Map(
    services.map((service) => [
      service.id,
      {
        priceType: service.price_type,
        minPence: service.price_min,
        maxPence: service.price_max,
        currency: service.currency,
      },
    ]),
  );
}

/** Whole minutes waited, floored at zero so clock skew cannot read as negative. */
function waitedMinutes(requestedAt: string, now: Date): number {
  const ms = now.getTime() - new Date(requestedAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

/** "45m" / "14h 05m" / "2d 03h" — compact enough to sit next to a name. */
function waitedLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;

  return `${Math.floor(hours / 24)}d ${String(hours % 24).padStart(2, "0")}h`;
}

/**
 * How long this customer has been waiting for an answer.
 *
 * Coloured rather than merely stated, and that is the point of the whole screen:
 * a shop losing work to a slow reply should be able to see it without reading a
 * word. Signal past twelve hours, rust past a day — the thresholds are
 * deliberately harsher than the "few hours" the customer is promised.
 */
export function WaitingTime({
  requestedAt,
  now,
  timezone,
  className,
}: {
  requestedAt: string;
  now: Date;
  timezone: string;
  className?: string;
}) {
  const minutes = waitedMinutes(requestedAt, now);
  const hours = minutes / 60;

  const tone = hours >= 24 ? "text-rust" : hours >= 12 ? "text-signal" : "text-steel";

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", tone, className)}>
      <Clock aria-hidden className="size-3.5 shrink-0" />
      <time
        dateTime={requestedAt}
        title={`Requested ${formatDateTime(requestedAt, timezone)}`}
        className="font-mono tabular-nums"
      >
        {waitedLabel(minutes)}
      </time>
      <span>waiting</span>
    </span>
  );
}

/**
 * The auto-expiry stamp, when the request carries one.
 *
 * Worth its own colour because it is a deadline the shop does not control: at
 * `expires_at` the cron job moves the booking to `expired` and the customer is
 * told to try somebody else.
 */
export function RequestExpiry({
  expiresAt,
  now,
  timezone,
}: {
  expiresAt: string;
  now: Date;
  timezone: string;
}) {
  const gone = new Date(expiresAt).getTime() <= now.getTime();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        gone ? "text-rust" : "text-steel",
      )}
    >
      <Hourglass aria-hidden className="size-3.5 shrink-0" />
      <span>{gone ? "Expired" : "Expires"}</span>
      <time
        dateTime={expiresAt}
        title={formatDateTime(expiresAt, timezone)}
        className="font-mono tabular-nums"
      >
        {formatRelative(expiresAt, now)}
      </time>
    </span>
  );
}

/** The postal address on the job, as lines. Empty when the shop is the venue. */
export function addressLines(
  booking: Pick<
    BookingRow,
    "address_line1" | "address_line2" | "address_city" | "address_postcode"
  >,
): string[] {
  return [
    booking.address_line1,
    booking.address_line2,
    booking.address_city,
    booking.address_postcode,
  ].filter((line): line is string => Boolean(line?.trim()));
}

function Fact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="eyebrow pb-1.5">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

export function RequestCard({
  request,
  pricing,
  timezone,
  now,
}: {
  request: ExpertBooking;
  pricing: RequestPricing | null;
  timezone: string;
  now: Date;
}) {
  const start = slotStart(request.slot);
  const end = slotEnd(request.slot);
  const tDelivery = useTranslations("deliveryModes");

  const customerName = request.customer?.display_name ?? "A customer";
  const lines = addressLines(request);
  const ModeIcon = MODE_ICON[request.delivery_mode];
  const href = `/dashboard/expert/requests/${encodeURIComponent(request.reference)}`;

  // The slot's own length is the truth for a request the customer chose the
  // times of; the service duration is the fallback, and an hour is the last
  // resort so the propose-a-time dialog always has an end to derive.
  const durationMinutes =
    start && end
      ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
      : (request.service?.duration_minutes ?? 60);

  return (
    <li className="rounded-machined border border-hairline bg-chalk shadow-bench">
      {/* The signal rule marks the queue as the one place on the dashboard
          holding work that has not been answered. */}
      <div className="border-l-2 border-signal p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar src={request.customer?.avatar_url} name={customerName} />

            <div className="min-w-0">
              <p className="truncate font-display text-base uppercase tracking-wide text-enamel">
                {customerName}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {request.reference}
                </span>
                {request.customer?.phone ? (
                  <a
                    href={`tel:${request.customer.phone}`}
                    className="inline-flex items-center gap-1.5 font-mono text-eyebrow tracking-[0.08em] text-steel hover:text-signal"
                  >
                    <Phone aria-hidden className="size-3" />
                    {request.customer.phone}
                  </a>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <WaitingTime requestedAt={request.requested_at} now={now} timezone={timezone} />
            {request.expires_at ? (
              <RequestExpiry
                expiresAt={request.expires_at}
                now={now}
                timezone={timezone}
              />
            ) : null}
          </div>
        </div>

        {request.device_details ? (
          <p className="flex items-start gap-2 pt-4 text-sm leading-relaxed text-enamel">
            <Smartphone aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
            <span className="min-w-0 whitespace-pre-wrap break-words">
              {request.device_details}
            </span>
          </p>
        ) : null}

        {request.customer_notes ? (
          <p className="mt-3 whitespace-pre-wrap break-words rounded-machined bg-bench-sunk px-3 py-2.5 text-sm leading-relaxed text-steel">
            {request.customer_notes}
          </p>
        ) : null}

        <dl className="grid gap-x-8 gap-y-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Slot they asked for">
            {start && end ? (
              <span className="font-mono tabular-nums">
                {formatSlot(start, end, timezone)}
              </span>
            ) : (
              <span className="text-steel">Flexible</span>
            )}
          </Fact>

          <Fact label="Service">
            <span className="block truncate">{request.service?.name ?? "Not specified"}</span>
            {pricing ? (
              <span className="block pt-0.5 text-xs text-steel">
                {formatPriceRange(
                  pricing.priceType,
                  pricing.minPence,
                  pricing.maxPence,
                  pricing.currency,
                )}
              </span>
            ) : null}
          </Fact>

          <Fact label="How">
            <span className="flex items-center gap-2">
              <ModeIcon aria-hidden className="size-4 shrink-0 text-steel-soft" />
              {tDelivery(request.delivery_mode)}
            </span>
          </Fact>

          {NEEDS_ADDRESS.includes(request.delivery_mode) ? (
            <Fact label="Address" className="sm:col-span-2 lg:col-span-3">
              {lines.length > 0 ? (
                <span className="flex items-start gap-2">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
                  <span className="leading-relaxed">{lines.join(", ")}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-rust">
                  <MapPin aria-hidden className="size-4 shrink-0" />
                  No address on this request — ask before you accept
                </span>
              )}
            </Fact>
          ) : null}
        </dl>

        <div className="flex flex-col gap-3 pt-4">
          <RequestActions
            bookingId={request.id}
            status={request.status}
            slot={request.slot}
            warrantyExpiresAt={request.warranty_expires_at}
            pricing={pricing}
            serviceName={request.service?.name ?? null}
            deviceDetails={request.device_details}
            timezone={timezone}
            durationMinutes={durationMinutes}
            now={now}
          />

          <Link
            href={href}
            className="inline-flex w-fit items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal"
          >
            Open the full request
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

/**
 * A quote already sent, waiting on the customer.
 *
 * Deliberately far plainer than `RequestCard` — it carries no buttons, because
 * the next move belongs to the other side. It is here so a shop can see that a
 * job it answered has gone quiet, which is otherwise invisible until the
 * request expires.
 */
/**
 * A job the customer has accepted, with the button that starts it.
 *
 * On the Requests screen rather than only in the schedule because this is where
 * the shop already is. A confirmed job used to disappear from here the moment the
 * customer accepted, which meant the one screen the shop lives on could show a
 * request, and a quote, and then nothing — the work itself had to be started from
 * a different page. Now the queue carries a job from arrival to bench.
 *
 * `allowedActions` supplies the buttons, so this row cannot offer a transition the
 * state machine would refuse; and since the early-start guard is gone, "Start
 * work" appears as soon as the job is confirmed rather than when the slot opens.
 */
export function ConfirmedRow({
  booking,
  timezone,
  now,
}: {
  booking: ExpertBooking;
  timezone: string;
  now: Date;
}) {
  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);
  const actions = allowedActions(booking, "shop", now);

  // Only the forward move belongs on a queue row. Cancelling and no-showing are
  // real actions but they are decisions, and a decision belongs on the job's own
  // page next to the context for making it — not one mis-tap from a list.
  const starting = actions.filter((action) => action.to === "in_progress");

  const early = start !== null && now < start;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/dashboard/expert/requests/${encodeURIComponent(booking.reference)}`}
            className="truncate text-sm text-enamel hover:text-signal"
          >
            {booking.customer?.display_name ?? "A customer"}
          </Link>
          <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {booking.reference}
          </span>
        </p>
        <p className="pt-1 text-xs text-steel">
          {booking.service?.name ?? "Repair"}
          {start && end ? (
            <span className="pl-2 font-mono tabular-nums">
              {formatSlot(start, end, timezone)}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {booking.quoted_amount !== null ? (
          <span className="font-mono text-sm tabular-nums text-enamel">
            {formatMoney(booking.quoted_amount, booking.currency)}
          </span>
        ) : null}

        {/* Named rather than hidden: starting ahead of the slot is allowed, and
            saying so is what stops it reading as a bug in the schedule. */}
        <Badge variant={early ? "neutral" : "signal"}>
          {early && start ? `Booked ${formatRelative(start, now)}` : "Ready to start"}
        </Badge>

        {starting.length > 0 ? (
          <BookingActions
            bookingId={booking.id}
            reference={booking.reference}
            actions={starting}
          />
        ) : null}
      </div>
    </li>
  );
}

export function QuotedRow({
  booking,
  timezone,
  now,
}: {
  booking: ExpertBooking;
  timezone: string;
  now: Date;
}) {
  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/dashboard/expert/requests/${encodeURIComponent(booking.reference)}`}
            className="truncate text-sm text-enamel hover:text-signal"
          >
            {booking.customer?.display_name ?? "A customer"}
          </Link>
          <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {booking.reference}
          </span>
        </p>
        <p className="pt-1 text-xs text-steel">
          {booking.service?.name ?? "Repair"}
          {start && end ? (
            <span className="pl-2 font-mono tabular-nums">
              {formatSlot(start, end, timezone)}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {booking.quoted_amount !== null ? (
          <span className="font-mono tabular-nums text-sm text-enamel">
            {formatMoney(booking.quoted_amount, booking.currency)}
          </span>
        ) : null}
        <Badge variant="signal">
          {booking.responded_at
            ? `Quoted ${formatRelative(booking.responded_at, now)}`
            : "Quoted"}
        </Badge>
      </div>
    </li>
  );
}
