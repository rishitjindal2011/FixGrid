import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import {
  AvailabilityEditor,
  type WeeklyHours,
} from "@/components/dashboard/expert/availability-editor";
import { MonthCalendar } from "@/components/dashboard/expert/month-calendar";
import {
  TimeOffForm,
  type ClashCandidate,
  type TimeOffEntry,
} from "@/components/dashboard/expert/time-off-form";
import {
  WeekCalendar,
  addCalendarDays,
  shopDayKey,
  splitDayKey,
  weekStartKey,
  type CalendarClosure,
  type CalendarRule,
} from "@/components/dashboard/expert/week-calendar";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { getMyShop } from "@/lib/dashboard/claims";
import { listAvailability, listExpertBookings, listTimeOff } from "@/lib/dashboard/expert";
import { formatDay } from "@/lib/format";
import { ACTIVE_BOOKING_STATUSES, type BookingStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

const SCHEDULE_PATH = "/dashboard/expert/schedule";

/**
 * Jobs that have a time both sides have agreed to.
 *
 * `requested` and `accepted` are deliberately absent, matching
 * `getTodaySchedule`: neither has a slot the customer has committed to, so
 * drawing one on the calendar would promise a booking nobody made. They are
 * still counted for the time-off clash check below, where an unanswered request
 * inside a proposed closure is exactly the thing worth knowing about.
 */
const CALENDAR_STATUSES: readonly BookingStatus[] = [
  "confirmed",
  "in_progress",
  "completed",
  "closed",
];

/** How many jobs either read will bring back. Comfortably past a busy month. */
const BOOKING_LIMIT = 200;

type ScheduleView = "week" | "month";

/**
 * The shop's diary, and the two things that shape it.
 *
 * Which week or month is on screen lives entirely in the query string, never in
 * component state. That is what makes "the fortnight I am away" a link a shop
 * can send itself, and what makes the back button step back through the weeks
 * instead of leaving the page — every arrow here is an `<a>`, and this Server
 * Component re-runs its reads for each one.
 *
 * All four reads go out together; none depends on another. Every one degrades to
 * `[]` before the migration has been run, and the page is written so that the
 * zero-row render is a complete screen rather than a hole: an empty grid still
 * draws its week, and a shop with no hours gets the sentence explaining what
 * that costs it with the editor immediately underneath.
 */
export default async function ExpertSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/schedule");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this is a narrowing step rather than a second query. A null shop cannot
  // reach here — the gate renders the claim screen instead of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const params = await searchParams;
  const now = new Date();
  const todayKey = shopDayKey(now, shop.timezone);

  const view = readView(params.view);
  const requested = readDayKey(params.date);
  // Round-tripped through the civil arithmetic so a hand-typed "2026-02-31"
  // lands on a real day rather than on a month grid that does not exist.
  const anchor = requested ? addCalendarDays(requested, 0) : todayKey;

  const weekStart = weekStartKey(anchor);
  const monthKey = anchor.slice(0, 7);

  const window = calendarWindow(view, anchor, now);

  // Closures are read from whichever is earlier, the window or now: browsing
  // back to a past week should still show the fortnight the shop was shut, and
  // the list below re-narrows to what is still ahead.
  const closuresFrom = new Date(Math.min(window.from.getTime(), now.getTime()));

  const [availability, timeOff, calendarBookings, liveBookings] = await Promise.all([
    listAvailability(shop.id),
    listTimeOff(shop.id, { from: closuresFrom }),
    listExpertBookings(shop.id, {
      statuses: CALENDAR_STATUSES,
      from: window.from,
      to: window.to,
      limit: BOOKING_LIMIT,
    }),
    listExpertBookings(shop.id, {
      statuses: ACTIVE_BOOKING_STATUSES,
      from: now,
      limit: BOOKING_LIMIT,
    }),
  ]);

  const rules: CalendarRule[] = availability.map((row) => ({
    weekday: row.weekday,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));

  const weeklyHours: WeeklyHours[] = availability.map((row) => ({
    weekday: row.weekday,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    bufferMinutes: row.buffer_minutes,
    capacity: row.capacity,
  }));

  const wallClock = wallClockReader(shop.timezone);

  // `period` is a `tstzrange` like `slot`, so the same two parsers read it —
  // they are generic range parsers despite their names, as `listTimeOff` notes.
  const closures = timeOff
    .map((row) => {
      const start = slotStart(row.period);
      const end = slotEnd(row.period);
      if (!start || !end || end.getTime() <= start.getTime()) return null;
      return { id: row.id, start, end, reason: row.reason };
    })
    .filter((row): row is { id: string; start: Date; end: Date; reason: string | null } =>
      row !== null,
    );

  const calendarClosures: CalendarClosure[] = closures.map((row) => ({
    id: row.id,
    start: row.start.toISOString(),
    end: row.end.toISOString(),
    reason: row.reason,
  }));

  const upcomingClosures: TimeOffEntry[] = closures
    .filter((row) => row.end.getTime() > now.getTime())
    .map((row) => ({
      id: row.id,
      start: row.start.toISOString(),
      end: row.end.toISOString(),
      startLocal: wallClock(row.start),
      endLocal: wallClock(row.end),
      reason: row.reason,
    }));

  const upcomingJobs: ClashCandidate[] = liveBookings
    .map((booking) => {
      const start = slotStart(booking.slot);
      if (!start) return null;
      // A range with no readable upper bound still occupies the shop's morning;
      // an hour is the least misleading assumption and matches the median job.
      const end = slotEnd(booking.slot) ?? new Date(start.getTime() + 60 * 60_000);

      return {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        customerName:
          booking.customer?.display_name ?? booking.customer?.full_name ?? "Customer",
        serviceName: booking.service?.name ?? null,
        start: start.toISOString(),
        startLocal: wallClock(start),
        endLocal: wallClock(end),
      };
    })
    .filter((job): job is ClashCandidate => job !== null);

  const noHours = availability.length === 0;

  // Preserved across a view switch only when the shop navigated somewhere
  // explicitly, so "Today" and the first load both land on a clean URL.
  const anchorParam = requested ? anchor : null;

  const previousHref =
    view === "week"
      ? scheduleHref(view, addCalendarDays(weekStart, -7))
      : scheduleHref(view, shiftMonth(monthKey, -1));
  const nextHref =
    view === "week"
      ? scheduleHref(view, addCalendarDays(weekStart, 7))
      : scheduleHref(view, shiftMonth(monthKey, 1));

  const rangeLabel =
    view === "week" ? weekLabel(weekStart, now) : monthLabel(monthKey, now);

  const calendarSection = (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link
              href={previousHref}
              aria-label={view === "week" ? "Previous week" : "Previous month"}
            >
              <ChevronLeft aria-hidden />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link href={scheduleHref(view, null)}>Today</Link>
          </Button>

          <Button asChild variant="outline" size="icon">
            <Link
              href={nextHref}
              aria-label={view === "week" ? "Next week" : "Next month"}
            >
              <ChevronRight aria-hidden />
            </Link>
          </Button>

          <h2 className="pl-1 font-display text-lg uppercase tracking-wide text-enamel">
            {rangeLabel}
          </h2>
        </div>

        <div
          role="group"
          aria-label="Calendar view"
          className="inline-flex overflow-hidden rounded-machined border border-hairline bg-chalk"
        >
          {(["week", "month"] as const).map((option) => (
            <Link
              key={option}
              href={scheduleHref(option, anchorParam)}
              aria-current={view === option ? "page" : undefined}
              className={cn(
                "px-3 py-1.5 font-display text-sm uppercase tracking-wide transition-colors",
                option === "month" && "border-l border-hairline",
                view === option
                  ? "bg-enamel text-bench"
                  : "text-steel hover:bg-bench hover:text-enamel",
              )}
            >
              {option === "week" ? "Week" : "Month"}
            </Link>
          ))}
        </div>
      </div>

      {view === "week" ? (
        <WeekCalendar
          bookings={calendarBookings}
          rules={rules}
          closures={calendarClosures}
          timezone={shop.timezone}
          weekStart={weekStart}
          todayKey={todayKey}
        />
      ) : (
        <MonthCalendar
          bookings={calendarBookings}
          rules={rules}
          closures={calendarClosures}
          timezone={shop.timezone}
          monthKey={monthKey}
          todayKey={todayKey}
          basePath={SCHEDULE_PATH}
        />
      )}
    </section>
  );

  const editorSection = <AvailabilityEditor fixerId={shop.id} rows={weeklyHours} />;

  const timeOffSection = (
    <TimeOffForm
      fixerId={shop.id}
      timezone={shop.timezone}
      closures={upcomingClosures}
      upcoming={upcomingJobs}
      now={now}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Schedule"
        description={
          <>
            Everything is shown in your shop&rsquo;s own timezone,{" "}
            <span className="font-mono">{shop.timezone}</span> — not in whatever
            zone the browser happens to be in.
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/expert/${shop.slug}`}>
              <ExternalLink aria-hidden />
              Public page
            </Link>
          </Button>
        }
      />

      {/* The one dead end this page can be in, said plainly. A shop reading a
          calendar full of nothing has no way of knowing the calendar is the
          reason, so it is spelled out and the fix is put directly underneath. */}
      {noHours ? (
        <section
          role="status"
          className="rounded-machined border border-rust/30 bg-rust-wash px-4 py-4 sm:px-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-rust" />
            <div>
              <h2 className="font-display text-base uppercase tracking-wide text-rust">
                You have not set your opening hours
              </h2>
              <p className="max-w-prose pt-1.5 text-sm leading-relaxed text-rust">
                This is the only thing that decides when customers can book you.
                Until it is set your diary falls back to the plain opening times on
                your public profile — one job at a time, no turnaround gap between
                jobs, and no way to shut a Wednesday afternoon. Set the week below
                and the calendar becomes yours.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {noHours ? (
        <>
          {editorSection}
          {calendarSection}
          {timeOffSection}
        </>
      ) : (
        <>
          {calendarSection}
          {editorSection}
          {timeOffSection}
        </>
      )}

      <p className="text-xs leading-relaxed text-steel-soft">
        <CalendarDays aria-hidden className="mr-1.5 inline size-3.5 align-[-0.15em]" />
        Requests you have not answered yet are not drawn on the calendar — nobody
        has agreed a slot for them.{" "}
        <Link href="/dashboard/expert/requests" className="text-signal hover:underline">
          Open requests
        </Link>
      </p>
    </div>
  );
}

/* ── Query string ─────────────────────────────────────────────────────────── */

function readView(value: string | string[] | undefined): ScheduleView {
  return value === "month" ? "month" : "week";
}

/** A `YYYY-MM-DD` param, or null. Anything else falls back to today. */
function readDayKey(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  return splitDayKey(value) ? value : null;
}

/**
 * Week is the default view and today is the default date, so neither is spelled
 * out in the URL. That keeps the plain path canonical and stops "Today" from
 * producing a second address for the screen the shop already has open.
 */
function scheduleHref(view: ScheduleView, date: string | null): string {
  const params = new URLSearchParams();
  if (view === "month") params.set("view", "month");
  if (date) params.set("date", date);

  const query = params.toString();
  return query ? `${SCHEDULE_PATH}?${query}` : SCHEDULE_PATH;
}

/* ── Civil date helpers ───────────────────────────────────────────────────── */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Noon UTC on a civil day key.
 *
 * Only ever handed to a formatter pinned to UTC, so it is a label rather than a
 * moment. Noon is far enough from either edge that no rounding can shunt it into
 * a neighbouring day.
 */
function civilNoon(key: string, fallback: Date): Date {
  const parts = splitDayKey(key);
  if (!parts) return fallback;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

/** The first of the month `delta` months from `monthKey`. */
function shiftMonth(monthKey: string, delta: number): string {
  const parts = splitDayKey(`${monthKey}-01`);
  if (!parts) return `${monthKey}-01`;

  // `Date.UTC` normalises a negative or >12 month index into the right year.
  const moved = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-01`;
}

/** "Mon 10 Aug – Sun 16 Aug 2026". The year is carried once, on the end. */
function weekLabel(weekStart: string, fallback: Date): string {
  const from = civilNoon(weekStart, fallback);
  const to = civilNoon(addCalendarDays(weekStart, 6), fallback);
  const year = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
  }).format(to);

  return `${formatDay(from, "UTC")} – ${formatDay(to, "UTC")} ${year}`;
}

/** "August 2026" for a `YYYY-MM` key. `format.ts` has no month formatter. */
function monthLabel(monthKey: string, fallback: Date): string {
  const parts = splitDayKey(`${monthKey}-01`);
  const anchor = parts
    ? new Date(Date.UTC(parts.year, parts.month - 1, 15))
    : fallback;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(anchor);
}

/**
 * UTC bounds that comfortably contain the view.
 *
 * A day of slack either side absorbs whatever the shop's UTC offset is, so the
 * range never clips a job on the first or last square. Being generous is free:
 * `slot` is filtered with `overlaps`, and both calendars bucket what comes back
 * by day key in the shop's own zone, so extra rows land outside the grid rather
 * than on the wrong square.
 */
function calendarWindow(
  view: ScheduleView,
  anchor: string,
  fallback: Date,
): { from: Date; to: Date } {
  if (view === "week") {
    const start = weekStartKey(anchor);
    return {
      from: civilMidnight(addCalendarDays(start, -1), fallback),
      to: civilMidnight(addCalendarDays(start, 8), fallback),
    };
  }

  const parts = splitDayKey(`${anchor.slice(0, 7)}-01`);
  if (!parts) return { from: fallback, to: fallback };

  return {
    // Day 0 is the last day of the previous month; day 2 of the next covers the
    // far edge. Both are the same one-day skirt, spelled in `Date.UTC` terms.
    from: new Date(Date.UTC(parts.year, parts.month - 1, 0)),
    to: new Date(Date.UTC(parts.year, parts.month, 2)),
  };
}

function civilMidnight(key: string, fallback: Date): Date {
  const parts = splitDayKey(key);
  if (!parts) return fallback;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/**
 * An instant as the shop's wall clock reads it: `YYYY-MM-DDTHH:mm`, the exact
 * shape `<input type="datetime-local">` posts.
 *
 * This is what lets the time-off form compare a typed closure against real
 * bookings with a string comparison instead of a second copy of the zone
 * arithmetic — see the note at the top of `time-off-form.tsx`. The formatter is
 * built once and closed over, because constructing one is far more expensive
 * than formatting with it and this runs over every upcoming job.
 */
function wallClockReader(timeZone: string): (instant: Date) => string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (instant: Date): string => {
    const parts = formatter.formatToParts(instant);
    const field = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? "00";

    // "24" is emitted for midnight by some ICU builds, which would sort a
    // midnight closure after every job on the day it actually starts.
    const hour = pad(Number(field("hour")) % 24);

    return `${field("year")}-${field("month")}-${field("day")}T${hour}:${field("minute")}`;
  };
}
