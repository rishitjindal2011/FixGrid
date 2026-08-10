import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Timer } from "lucide-react";

import {
  BookingForm,
  type BookingFormService,
  type BookingSlotSource,
} from "@/components/dashboard/booking-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listAddresses } from "@/lib/dashboard/addresses";
import type { SlotRule } from "@/lib/bookings/slots";
import { getExpertForBooking, type BookingExpert } from "@/lib/dashboard/discover";
import { formatDuration } from "@/lib/format";
import { resolveWeek } from "@/lib/hours";
import { createClient } from "@/lib/supabase/server";
import type { FixerProfileRow } from "@/lib/types/database";
import { DELIVERY_MODE_LABELS, type DeliveryMode } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Book a repair",
  robots: { index: false, follow: false },
};

/** Mirrors the column defaults in `001_marketplace.sql`, for a pre-migration row. */
const DEFAULTS = {
  leadHours: 2,
  horizonDays: 60,
  responseHours: 24,
  warrantyDays: 3,
  /** Stride for a shop that lists no services, so the grid still has a shape. */
  durationMinutes: 60,
} as const;

/**
 * How far ahead the picker asks for slots, regardless of the shop's horizon.
 *
 * `shop_busy_periods` clamps its own window to 90 days, so asking for more would
 * return slots with no busy data behind them — every one of which would render
 * free and then collide on submit.
 */
const WINDOW_DAYS = 28;

/**
 * The shop's bookable weekly grid.
 *
 * `shop_availability` is the real source, but it arrives from a table that may
 * not exist yet. Falling back to the profile's opening hours means the picker
 * still offers the times the public profile advertises rather than going blank —
 * one bookable job at a time, since plain opening hours say nothing about how
 * many benches are free.
 */
function toSlotRules(expert: BookingExpert): SlotRule[] {
  if (expert.availability.length > 0) {
    return expert.availability.map((row) => ({
      weekday: row.weekday,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      bufferMinutes: row.buffer_minutes,
      capacity: row.capacity,
    }));
  }

  return resolveWeek(expert.profile)
    .filter((entry) => entry.schedule !== null)
    .map((entry) => ({
      weekday: entry.day,
      startsAt: clock(entry.schedule?.openMinutes ?? 0),
      endsAt: clock(entry.schedule?.closeMinutes ?? 0),
      bufferMinutes: 0,
      capacity: 1,
    }));
}

/** 570 → "09:30". `parseTimeToMinutes` in `hours.ts` is the inverse. */
function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Busy blocks for the picker, via the security-definer function.
 *
 * It has to be the function and not a read of `bookings`: RLS hides other
 * customers' rows, so a direct select would return an empty diary and the picker
 * would advertise every taken slot as free. `shop_busy_periods` returns merged
 * ranges with no reason, id or kind — see the note above it in
 * `policies-marketplace.sql`.
 *
 * `shop_busy_periods` is not in the generated `Database["public"]["Functions"]`
 * map (that file is regenerated from `schema.sql`, which predates this
 * migration), so the call is made through a narrowly-typed view of the client.
 * The cast describes exactly this one signature rather than widening the client.
 *
 * Note the cast is applied to the *client*, not to `supabase.rpc`. Casting the
 * method detaches it from its receiver: called as a bare `rpc(...)` its `this`
 * is undefined, and postgrest-js dereferences `this.rest` on the first line —
 * "Cannot read properties of undefined (reading 'rest')". Keeping it a method
 * call on the cast client preserves the binding.
 */
type BusyPeriodClient = {
  rpc: (
    fn: "shop_busy_periods",
    args: { p_fixer_id: string; p_from: string; p_to: string },
  ) => PromiseLike<{ data: string[] | null; error: { message: string } | null }>;
};

async function listBusyPeriods(
  fixerId: string,
  from: Date,
  to: Date,
): Promise<Array<{ start: string; end: string }>> {
  const supabase = (await createClient()) as unknown as BusyPeriodClient;

  const { data, error } = await supabase.rpc("shop_busy_periods", {
    p_fixer_id: fixerId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) {
    // Degrading to "nothing is busy" is the wrong-but-recoverable direction: the
    // customer may pick a taken slot and get 23P01 back with a clear message,
    // where a thrown error would lose them the whole page.
    console.error("[discover] busy periods failed", error.message);
    return [];
  }

  return (data ?? [])
    .map(parseRange)
    .filter((period): period is { start: string; end: string } => period !== null);
}

/**
 * `["2026-08-08T09:00:00+00:00","2026-08-08T10:00:00+00:00")` → its two bounds.
 *
 * Ranges come back as Postgres literal text. An unbounded or unparseable one is
 * dropped rather than guessed at — a busy period with no end would blank the
 * calendar to the horizon.
 */
function parseRange(literal: string): { start: string; end: string } | null {
  const match = /^[[(]"?([^",]*)"?,\s*"?([^",]*)"?[\])]$/.exec(literal ?? "");
  const start = match?.[1];
  const end = match?.[2];
  if (!start || !end) return null;
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) return null;
  return { start, end };
}

/** The `offers_*` flags, as the enum the form and the schema both speak. */
function shopDeliveryModes(profile: FixerProfileRow): DeliveryMode[] {
  const modes: DeliveryMode[] = [];
  if (profile.offers_in_shop) modes.push("in_shop");
  if (profile.offers_home_service) modes.push("home_visit");
  if (profile.offers_pickup_drop) modes.push("pickup_drop");
  // Every shop has a bench even if the row says otherwise; an empty picker
  // would make the whole page unusable over one unset boolean.
  return modes.length > 0 ? modes : ["in_shop"];
}

/**
 * One shop, and the form that books it.
 *
 * The heavy lifting is deliberately split: this component does the reads and
 * hands the client form a pure, serialisable description of the shop's calendar.
 * Slot *generation* happens on the client because the duration comes from the
 * service the customer picks, and a round-trip per service change would make the
 * price panel lag the select.
 */
export default async function BookExpertPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/dashboard/discover/${slug}`);

  const expert = await getExpertForBooking(slug);
  // Null covers "no such shop", "RLS said no" and "the lookup failed". All three
  // are a 404 here; the directory is the way back in.
  if (!expert) notFound();

  const { profile } = expert;
  const timezone = profile.timezone || "Europe/London";

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Both feed the form below and neither depends on the other.
  const [busyIso, addresses] = await Promise.all([
    listBusyPeriods(profile.id, now, windowEnd),
    listAddresses(user.id),
  ]);

  const acceptsBookings = profile.accepts_bookings ?? true;
  const responseHours = profile.response_hours ?? DEFAULTS.responseHours;
  const leadHours = profile.booking_lead_hours ?? DEFAULTS.leadHours;

  const services: BookingFormService[] = expert.services.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceType: row.price_type,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency,
    durationMinutes: row.duration_minutes,
    deliveryModes: row.delivery_modes ?? [],
    warrantyDays: row.warranty_days,
  }));

  const slotSource: BookingSlotSource = {
    rules: toSlotRules(expert),
    busyIso,
    leadHours,
    // The shop's horizon still applies inside `generateSlots`; this caps the
    // walk at the window the busy data actually covers.
    horizonDays: Math.min(profile.booking_horizon_days ?? DEFAULTS.horizonDays, WINDOW_DAYS),
    fromIso: now.toISOString(),
    toIso: windowEnd.toISOString(),
    nowIso: now.toISOString(),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/discover"
          className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Find an expert
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6">
        <div aria-hidden className="schematic schematic-fade absolute inset-0" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow pb-2">Book a repair</p>

            <h1 className="flex flex-wrap items-center gap-2 font-display text-display-sm uppercase text-enamel">
              {profile.shop_name}
              {profile.verified ? (
                <BadgeCheck
                  aria-label="Verified shop"
                  className="size-5 shrink-0 text-verdigris"
                />
              ) : null}
            </h1>

            <div className="pt-2">
              <RatingStars rating={profile.rating_avg} count={profile.rating_count} size="md" />
            </div>

            <p className="flex items-start gap-1.5 pt-2 text-sm leading-relaxed text-steel">
              <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-steel-soft" />
              {profile.address}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/expert/${profile.slug}`}>View full profile</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          {acceptsBookings ? (
            <BookingForm
              fixerId={profile.id}
              shopName={profile.shop_name}
              timezone={timezone}
              services={services}
              shopModes={shopDeliveryModes(profile)}
              slotSource={slotSource}
              fallbackDurationMinutes={DEFAULTS.durationMinutes}
              defaultWarrantyDays={profile.default_warranty_days ?? DEFAULTS.warrantyDays}
              addresses={addresses}
            />
          ) : (
            <EmptyState
              icon={Timer}
              title="Not taking bookings right now"
              description={`${profile.shop_name} has paused their online calendar. Their profile has a phone number and opening hours if it is urgent.`}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild variant="primary" size="sm">
                    <Link href={`/expert/${profile.slug}`}>Contact the shop</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/discover">Find another expert</Link>
                  </Button>
                </div>
              }
            />
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-2">
          <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
            <h2 className="eyebrow">What to expect</h2>

            <dl className="flex flex-col gap-3 pt-3 text-sm">
              <div>
                <dt className="eyebrow pb-1">Typical reply</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  Within {formatDuration(responseHours * 60)}
                </dd>
              </div>

              <div>
                <dt className="eyebrow pb-1">Earliest slot</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {leadHours > 0 ? `${formatDuration(leadHours * 60)} from now` : "Today"}
                </dd>
              </div>

              <div>
                <dt className="eyebrow pb-1">Ways to book</dt>
                <dd className="flex flex-wrap gap-1.5 pt-0.5">
                  {shopDeliveryModes(profile).map((mode) => (
                    <Badge key={mode} variant="neutral">
                      {DELIVERY_MODE_LABELS[mode]}
                    </Badge>
                  ))}
                </dd>
              </div>

              {profile.contact_phone ? (
                <div>
                  <dt className="eyebrow pb-1">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${profile.contact_phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-mono tabular-nums text-enamel hover:text-signal"
                    >
                      <Phone aria-hidden className="size-3.5 text-steel-soft" />
                      {profile.contact_phone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {expert.categories.length > 0 ? (
            <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
              <h2 className="eyebrow">Works on</h2>
              <ul className="flex flex-wrap gap-1.5 pt-3">
                {expert.categories.map((category) => (
                  <li key={category.id}>
                    <Badge variant="neutral">{category.name}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="rounded-machined border border-hairline bg-bench px-4 py-3 text-xs leading-relaxed text-steel">
            Requesting a booking does not charge you. The shop confirms the slot and the price
            first, and you can cancel from your dashboard until they do.
          </p>
        </aside>
      </div>
    </div>
  );
}
