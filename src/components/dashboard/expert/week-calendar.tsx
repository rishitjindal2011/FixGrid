import Link from "next/link";

import { STATUS_TONE, slotEnd, slotStart, type StatusTone } from "@/lib/bookings/actions-map";
import { formatTime } from "@/lib/format";
import { parseTimeToMinutes } from "@/lib/hours";
import type { Weekday } from "@/lib/types/database";
import {
  BOOKING_STATUS_LABELS,
  type BookingCustomerSummary,
  type BookingRow,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Seven columns, hour rows, jobs drawn as blocks where they actually sit.
 *
 * Every reading of the clock here happens in the SHOP's timezone. That is not a
 * formatting nicety — it is the geometry. A job at 23:30 in London is 00:30 the
 * next day in UTC, so a grid positioned from a `Date`'s local getters would put
 * it in tomorrow's column and an hour off the row, on a server that happens to
 * deploy outside the shop's zone.
 *
 * The trick that keeps this honest and DST-proof is that no instant arithmetic
 * happens at all. Each booking is read once through a zoned formatter into a
 * `YYYY-MM-DD` day key (the column) and minutes-since-local-midnight (the row).
 * A day that is 23 or 25 hours long on a clock-change weekend still has a
 * midnight and still has a 09:00, so the grid stays correct through both without
 * ever adding 86_400_000 to anything.
 *
 * Day-to-day movement is civil date arithmetic in UTC, for the same reason
 * `MiniCalendar` does it: at that point the numbers are labels, not moments.
 */

/* ── Zoned + civil date helpers ───────────────────────────────────────────── */

/**
 * Shared with `month-calendar.tsx` and the schedule page rather than copied into
 * each. They live here because this is the file whose correctness depends on
 * them most, and because a fourth module for four pure functions used only by
 * this screen would be indirection without a payoff.
 */

/** `[year, month, day]` out of a day key, or null if it is not one. */
export function splitDayKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Today's `YYYY-MM-DD` in a given zone. `en-CA` renders exactly that shape. */
export function shopDayKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Move a day key by whole days.
 *
 * UTC has no DST, so every day there is exactly 24h and this is pure civil
 * arithmetic; month and year rollovers come free from `Date.UTC`. The result is
 * a label, never an instant.
 */
export function addCalendarDays(key: string, days: number): string {
  const parts = splitDayKey(key);
  if (!parts) return key;

  const moved = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/** `Date.prototype.getUTCDay` order, so the index maps straight across. */
const WEEKDAY_BY_INDEX: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function weekdayOfKey(key: string): Weekday {
  const parts = splitDayKey(key);
  if (!parts) return "mon";
  const index = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return WEEKDAY_BY_INDEX[index] ?? "mon";
}

/** The Monday of the week containing `key`. A working week, not a US calendar. */
export function weekStartKey(key: string): string {
  const parts = splitDayKey(key);
  if (!parts) return key;
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  // getUTCDay is Sunday-first; shift so Monday is 0 and Sunday is 6.
  return addCalendarDays(key, -((dayOfWeek + 6) % 7));
}

/**
 * One instant, read as the shop experiences it: which day it lands on and how
 * many minutes past that day's midnight it is.
 *
 * The formatter is built once by the caller and reused across every booking on
 * the grid — constructing an `Intl.DateTimeFormat` is far more expensive than
 * formatting with one, and a busy week runs this a few hundred times.
 */
function readZoned(formatter: Intl.DateTimeFormat, instant: Date): { key: string; minutes: number } {
  const parts = formatter.formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "0";

  // "24" is emitted for midnight by some ICU builds, which would otherwise push
  // the reading a whole day forward.
  const hour = Number(field("hour")) % 24;

  return {
    key: `${field("year")}-${field("month")}-${field("day")}`,
    minutes: hour * 60 + Number(field("minute")),
  };
}

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 570 → "09:30". The schedule is 24-hour throughout, like `formatTime`. */
function clockLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/* ── Props ────────────────────────────────────────────────────────────────── */

/** Only the columns the grid draws — narrower than the row, so it composes. */
export type CalendarBooking = Pick<BookingRow, "id" | "reference" | "status" | "slot"> & {
  customer: BookingCustomerSummary | null;
  service: { name: string } | null;
};

/** One `shop_availability` window, as the grid shades it. */
export interface CalendarRule {
  weekday: Weekday;
  /** `HH:MM` or `HH:MM:SS`, wall clock in the shop's zone. */
  startsAt: string;
  endsAt: string;
}

/** One closure, already parsed out of its `tstzrange` by the page. */
export interface CalendarClosure {
  id: string;
  /** ISO instants. */
  start: string;
  end: string;
  reason: string | null;
}

/* ── Geometry ─────────────────────────────────────────────────────────────── */

/** One booking's footprint on one day, in that day's local minutes. */
interface Segment {
  booking: CalendarBooking;
  /** The job's real bounds, for the label — not the clamped ones. */
  start: Date;
  end: Date;
  fromMinutes: number;
  toMinutes: number;
  lane: number;
}

/** A closure's footprint on one day, same units. */
interface ClosureBand {
  id: string;
  reason: string | null;
  fromMinutes: number;
  toMinutes: number;
}

/** The default window when a shop has set no hours: a plain working day. */
const FALLBACK_OPEN_MINUTES = 8 * 60;
const FALLBACK_CLOSE_MINUTES = 18 * 60;

/** Below this the grid stops reading as a day at all. */
const MIN_GRID_HOURS = 4;

/** Height of one hour row. Everything else is positioned as a percentage. */
const HOUR_ROW_REM = 3.25;

const MINUTES_PER_DAY = 1440;

/**
 * Split an interval across the local days it touches.
 *
 * A collection-and-return job held overnight is work on both days and has to
 * draw on both. The upper bound is exclusive — a job ending at midnight belongs
 * to the day before, not to the first pixel of the next one — so the last day is
 * found from `end - 1ms` rather than from `end`.
 */
function splitAcrossDays(
  formatter: Intl.DateTimeFormat,
  start: Date,
  end: Date,
): Array<{ key: string; fromMinutes: number; toMinutes: number }> {
  const first = readZoned(formatter, start);
  const last = readZoned(formatter, new Date(end.getTime() - 1));
  const realEnd = readZoned(formatter, end);

  const spans: Array<{ key: string; fromMinutes: number; toMinutes: number }> = [];

  let key = first.key;
  // Capped rather than trusted: a malformed range must not spin the render.
  for (let step = 0; step < 32; step += 1) {
    const fromMinutes = key === first.key ? first.minutes : 0;
    // Only the day the range genuinely ends on stops short of midnight. When the
    // end lands exactly on midnight its key is the *next* day, so this correctly
    // runs the final band to the bottom of the column.
    const toMinutes = key === realEnd.key ? realEnd.minutes : MINUTES_PER_DAY;

    if (toMinutes > fromMinutes) spans.push({ key, fromMinutes, toMinutes });
    if (key === last.key) break;

    key = addCalendarDays(key, 1);
  }

  return spans;
}

/**
 * Pack overlapping jobs into side-by-side lanes.
 *
 * A shop with a capacity of two runs two jobs at once, and stacking them would
 * hide one behind the other. Greedy first-fit over the day's segments in start
 * order, which is optimal enough for a diary and needs no backtracking.
 */
function assignLanes(segments: Segment[]): number {
  const laneEnds: number[] = [];

  for (const segment of segments) {
    let lane = laneEnds.findIndex((end) => end <= segment.fromMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(segment.toMinutes);
    } else {
      laneEnds[lane] = segment.toMinutes;
    }
    segment.lane = lane;
  }

  return Math.max(1, laneEnds.length);
}

/* ── Status colour ────────────────────────────────────────────────────────── */

/**
 * Block colour follows `STATUS_TONE`, so a job is the same colour here as its
 * badge is everywhere else. `solid` is the enamel badge, which would be far too
 * heavy repeated across a week — it keeps the enamel accent and drops to a sunk
 * fill instead.
 */
const BLOCK_TONE: Record<StatusTone, string> = {
  signal: "border-signal/40 border-l-signal bg-signal-wash",
  verified: "border-verdigris/30 border-l-verdigris bg-verdigris-wash",
  solid: "border-hairline border-l-enamel bg-bench-sunk",
  neutral: "border-hairline border-l-steel-soft bg-bench",
};

/* ── The grid ─────────────────────────────────────────────────────────────── */

export function WeekCalendar({
  bookings,
  rules,
  closures,
  timezone,
  weekStart,
  todayKey,
}: {
  bookings: CalendarBooking[];
  rules: CalendarRule[];
  closures: CalendarClosure[];
  timezone: string;
  /** `YYYY-MM-DD` of the Monday this grid opens on. */
  weekStart: string;
  /** `YYYY-MM-DD` of today, in the shop's zone. */
  todayKey: string;
}) {
  const formatter = zonedFormatter(timezone);
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const visible = new Set(days);

  const segmentsByDay = new Map<string, Segment[]>();

  for (const booking of bookings) {
    const start = slotStart(booking.slot);
    if (!start) continue;
    // A range with no readable upper bound still has to be drawn somewhere; an
    // hour is the least misleading guess and matches the median service.
    const end = slotEnd(booking.slot) ?? new Date(start.getTime() + 60 * 60_000);
    if (end.getTime() <= start.getTime()) continue;

    for (const span of splitAcrossDays(formatter, start, end)) {
      if (!visible.has(span.key)) continue;
      const list = segmentsByDay.get(span.key) ?? [];
      list.push({
        booking,
        start,
        end,
        fromMinutes: span.fromMinutes,
        toMinutes: span.toMinutes,
        lane: 0,
      });
      segmentsByDay.set(span.key, list);
    }
  }

  const closuresByDay = new Map<string, ClosureBand[]>();

  for (const closure of closures) {
    const start = new Date(closure.start);
    const end = new Date(closure.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (end.getTime() <= start.getTime()) continue;

    for (const span of splitAcrossDays(formatter, start, end)) {
      if (!visible.has(span.key)) continue;
      const list = closuresByDay.get(span.key) ?? [];
      list.push({
        id: closure.id,
        reason: closure.reason,
        fromMinutes: span.fromMinutes,
        toMinutes: span.toMinutes,
      });
      closuresByDay.set(span.key, list);
    }
  }

  // The window the grid draws: the shop's own opening hours, widened to cover
  // anything already in the diary. A job booked outside opening hours — a
  // rescheduled favour, an overrun — must not be cropped off the top or bottom,
  // because an invisible job is worse than an untidy grid.
  const openMinutes = rules
    .map((rule) => parseTimeToMinutes(rule.startsAt))
    .filter((value): value is number => value !== null);
  const closeMinutes = rules
    .map((rule) => parseTimeToMinutes(rule.endsAt))
    .filter((value): value is number => value !== null);

  let gridStart = openMinutes.length > 0 ? Math.min(...openMinutes) : FALLBACK_OPEN_MINUTES;
  let gridEnd = closeMinutes.length > 0 ? Math.max(...closeMinutes) : FALLBACK_CLOSE_MINUTES;

  for (const segments of segmentsByDay.values()) {
    for (const segment of segments) {
      gridStart = Math.min(gridStart, segment.fromMinutes);
      gridEnd = Math.max(gridEnd, segment.toMinutes);
    }
  }

  // Hour-aligned, so the percentage geometry lands exactly on the drawn rows.
  gridStart = Math.max(0, Math.floor(gridStart / 60) * 60);
  gridEnd = Math.min(MINUTES_PER_DAY, Math.ceil(gridEnd / 60) * 60);
  if (gridEnd - gridStart < MIN_GRID_HOURS * 60) {
    gridEnd = Math.min(MINUTES_PER_DAY, gridStart + MIN_GRID_HOURS * 60);
    gridStart = Math.max(0, gridEnd - MIN_GRID_HOURS * 60);
  }

  const span = gridEnd - gridStart;
  const hourCount = Math.round(span / 60);
  const hours = Array.from({ length: hourCount }, (_, index) => gridStart + index * 60);
  const columnHeight = `${(hourCount * HOUR_ROW_REM).toFixed(2)}rem`;

  /** Minutes to a percentage down the column, clamped to the drawn window. */
  const offset = (minutes: number): number =>
    ((Math.min(Math.max(minutes, gridStart), gridEnd) - gridStart) / span) * 100;

  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
  });
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });

  const jobCount = [...segmentsByDay.values()].reduce((sum, list) => sum + list.length, 0);

  return (
    <section
      aria-label="Week calendar"
      className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench"
    >
      {/* One scroller for the header and the body together, so the day columns
          cannot drift out of line with their own headings on a narrow phone. */}
      <div className="overflow-x-auto">
        <div className="min-w-[46rem]">
          <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-hairline">
            <span aria-hidden />
            {days.map((key) => {
              const parts = splitDayKey(key);
              // Anchored at UTC noon: these are labels for a civil date, and
              // noon is far enough from either edge that no zone can shunt the
              // weekday onto a neighbouring day.
              const anchor = parts
                ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
                : new Date();
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "border-l border-hairline px-2 py-2 text-center",
                    isToday && "bg-signal-wash",
                  )}
                >
                  <p
                    className={cn(
                      "font-mono text-eyebrow uppercase tracking-[0.14em]",
                      isToday ? "text-signal" : "text-steel-soft",
                    )}
                  >
                    {dayLabel.format(anchor)}
                  </p>
                  <p
                    className={cn(
                      "pt-0.5 font-display text-base uppercase tracking-wide",
                      isToday ? "text-signal" : "text-enamel",
                    )}
                  >
                    {dateLabel.format(anchor)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: columnHeight }} aria-hidden>
              {hours.map((minutes) => (
                <span
                  key={minutes}
                  className="absolute right-2 pt-1 font-mono text-eyebrow tabular-nums text-steel-soft"
                  style={{ top: `${offset(minutes)}%` }}
                >
                  {clockLabel(minutes)}
                </span>
              ))}
            </div>

            {days.map((key) => {
              const weekday = weekdayOfKey(key);
              const dayRules = rules.filter((rule) => rule.weekday === weekday);
              const segments = (segmentsByDay.get(key) ?? []).sort(
                (a, b) => a.fromMinutes - b.fromMinutes || a.toMinutes - b.toMinutes,
              );
              const laneCount = assignLanes(segments);
              const laneWidth = 100 / laneCount;

              return (
                <div
                  key={key}
                  className="relative border-l border-hairline bg-bench-sunk"
                  style={{ height: columnHeight }}
                >
                  {/* White is open, sunk grey is shut. The shading is the only
                      thing on the grid that says when the shop actually trades. */}
                  {dayRules.map((rule, index) => {
                    const from = parseTimeToMinutes(rule.startsAt);
                    const to = parseTimeToMinutes(rule.endsAt);
                    if (from === null || to === null || to <= from) return null;

                    return (
                      <div
                        key={`${rule.weekday}-${index}`}
                        aria-hidden
                        className="absolute inset-x-0 bg-chalk"
                        style={{
                          top: `${offset(from)}%`,
                          height: `${offset(to) - offset(from)}%`,
                        }}
                      />
                    );
                  })}

                  {hours.map((minutes, index) =>
                    index === 0 ? null : (
                      <div
                        key={minutes}
                        aria-hidden
                        className="absolute inset-x-0 border-t border-hairline/60"
                        style={{ top: `${offset(minutes)}%` }}
                      />
                    ),
                  )}

                  {(closuresByDay.get(key) ?? []).map((band) => (
                    <div
                      key={`${band.id}-${band.fromMinutes}`}
                      className="absolute inset-x-0 border-y border-rust/20 bg-rust-wash/80"
                      style={{
                        top: `${offset(band.fromMinutes)}%`,
                        height: `${offset(band.toMinutes) - offset(band.fromMinutes)}%`,
                      }}
                    >
                      <span className="sr-only">
                        Closed{band.reason ? ` — ${band.reason}` : ""}
                      </span>
                    </div>
                  ))}

                  {segments.map((segment) => {
                    const { booking } = segment;
                    const tone = STATUS_TONE[booking.status];
                    const customerName =
                      booking.customer?.display_name ??
                      booking.customer?.full_name ??
                      "Customer";
                    const window = `${formatTime(segment.start, timezone)}–${formatTime(segment.end, timezone)}`;

                    return (
                      <Link
                        key={`${booking.id}-${segment.fromMinutes}`}
                        href={`/dashboard/expert/requests?booking=${encodeURIComponent(booking.reference)}`}
                        aria-label={`${customerName}, ${window}, ${BOOKING_STATUS_LABELS[booking.status]}`}
                        className={cn(
                          "absolute z-10 flex min-h-6 flex-col overflow-hidden rounded-machined border border-l-2 px-1.5 py-1 text-left transition-shadow hover:shadow-lift",
                          BLOCK_TONE[tone],
                        )}
                        style={{
                          top: `${offset(segment.fromMinutes)}%`,
                          height: `${Math.max(offset(segment.toMinutes) - offset(segment.fromMinutes), 0)}%`,
                          left: `${segment.lane * laneWidth}%`,
                          width: `${laneWidth}%`,
                        }}
                      >
                        <span
                          aria-hidden
                          className="truncate font-mono text-eyebrow tabular-nums text-steel"
                        >
                          {window}
                        </span>
                        <span
                          aria-hidden
                          className="truncate text-xs font-medium leading-tight text-enamel"
                        >
                          {customerName}
                        </span>
                        {booking.service ? (
                          <span aria-hidden className="truncate text-xs leading-tight text-steel">
                            {booking.service.name}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline px-4 py-3">
        <p className="text-xs text-steel">
          {jobCount === 0
            ? "Nothing booked this week."
            : `${jobCount} ${jobCount === 1 ? "job" : "jobs"} this week.`}
        </p>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-steel-soft">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-machined border border-hairline bg-chalk" />
            Open
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-machined border border-hairline bg-bench-sunk"
            />
            Shut
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-machined border border-rust/20 bg-rust-wash"
            />
            Time off
          </li>
        </ul>
      </div>
    </section>
  );
}
