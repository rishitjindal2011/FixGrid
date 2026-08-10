import Link from "next/link";

import {
  addCalendarDays,
  splitDayKey,
  weekdayOfKey,
  type CalendarBooking,
  type CalendarClosure,
  type CalendarRule,
} from "@/components/dashboard/expert/week-calendar";
import {
  STATUS_TONE,
  slotEnd,
  slotStart,
  type StatusTone,
} from "@/lib/bookings/actions-map";
import { formatTime } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * A whole month, one square a day.
 *
 * The week grid answers "when am I busy on Tuesday"; this answers "how full is
 * February" — so it drops the hour rows entirely and lists each day's jobs as
 * chips. Everything is bucketed on `YYYY-MM-DD` keys produced in the SHOP's
 * timezone, never on a `Date`'s local getters: a 23:30 job in London belongs to
 * the 8th, and to anything reading in UTC it looks like the 9th.
 *
 * The grid itself is plain UTC arithmetic, because at that point the numbers are
 * labels rather than instants — `Date.UTC(2026, 8, 0)` is "how many days has
 * August got", not a moment in time. Same reasoning as `MiniCalendar`.
 */

/** Monday first — a working week, not a US calendar. */
const COLUMN_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** How many jobs a square lists before it collapses into a count. */
const CHIPS_PER_DAY = 3;

/**
 * Chip colour follows `STATUS_TONE`, so a job reads the same here as its badge
 * does everywhere else. Only the left edge is coloured: at this size a filled
 * chip per job turns the month into a patchwork and the shape stops being
 * readable.
 */
const CHIP_TONE: Record<StatusTone, string> = {
  signal: "border-l-signal bg-signal-wash",
  verified: "border-l-verdigris bg-verdigris-wash",
  solid: "border-l-enamel bg-bench-sunk",
  neutral: "border-l-steel-soft bg-bench",
};

interface DayEntry {
  booking: CalendarBooking;
  start: Date;
}

/** `en-CA` renders as `YYYY-MM-DD`, which is the key this whole file sorts on. */
function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Every local day an interval touches.
 *
 * The upper bound is exclusive — a closure ending at midnight does not shut the
 * following morning — so the last day is read from `end - 1ms`. The walk is
 * capped so a malformed range cannot spin the render thread.
 */
function daysTouched(
  formatter: Intl.DateTimeFormat,
  start: Date,
  end: Date | null,
): string[] {
  const firstKey = formatter.format(start);
  const lastKey = formatter.format(end ? new Date(end.getTime() - 1) : start);

  const keys: string[] = [];
  let key = firstKey;

  for (let step = 0; step < 40; step += 1) {
    keys.push(key);
    if (key === lastKey || key > lastKey) break;
    key = addCalendarDays(key, 1);
  }

  return keys;
}

export function MonthCalendar({
  bookings,
  rules,
  closures,
  timezone,
  monthKey,
  todayKey,
  basePath,
}: {
  bookings: CalendarBooking[];
  rules: CalendarRule[];
  closures: CalendarClosure[];
  timezone: string;
  /** `YYYY-MM` of the month being drawn, in the shop's zone. */
  monthKey: string;
  /** `YYYY-MM-DD` of today, in the shop's zone. */
  todayKey: string;
  /** Where a day square drills through to — the week grid, on that day. */
  basePath: string;
}) {
  const anchor = splitDayKey(`${monthKey}-01`);
  if (!anchor) return null;

  const { year, month } = anchor;
  const formatter = dayKeyFormatter(timezone);

  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay is Sunday-first; shift it so Monday is column 0.
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const byDay = new Map<string, DayEntry[]>();

  for (const booking of bookings) {
    const start = slotStart(booking.slot);
    if (!start) continue;

    for (const key of daysTouched(formatter, start, slotEnd(booking.slot))) {
      const list = byDay.get(key) ?? [];
      list.push({ booking, start });
      byDay.set(key, list);
    }
  }

  const closedDays = new Map<string, string | null>();

  for (const closure of closures) {
    const start = new Date(closure.start);
    const end = new Date(closure.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    for (const key of daysTouched(formatter, start, end)) {
      // First closure to claim a day names it; a day carrying two closures only
      // has room for one reason and the earlier one is the one already agreed.
      if (!closedDays.has(key)) closedDays.set(key, closure.reason);
    }
  }

  const tradingWeekdays = new Set(rules.map((rule) => rule.weekday));

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15)));

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section
      aria-label={`${monthLabel} calendar`}
      className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench"
    >
      <div
        aria-hidden
        className="grid grid-cols-7 border-b border-hairline bg-bench-sunk"
      >
        {COLUMN_LABELS.map((label) => (
          <span
            key={label}
            className="border-l border-hairline py-2 text-center font-mono text-eyebrow uppercase tracking-[0.08em] text-steel-soft first:border-l-0"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <span
                key={`pad-${index}`}
                aria-hidden
                className="min-h-16 border-b border-l border-hairline bg-bench-sunk/60 first:border-l-0 sm:min-h-28"
              />
            );
          }

          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const entries = (byDay.get(key) ?? []).sort(
            (a, b) => a.start.getTime() - b.start.getTime(),
          );
          const isToday = key === todayKey;
          const trades = tradingWeekdays.size === 0 || tradingWeekdays.has(weekdayOfKey(key));
          const closureReason = closedDays.has(key) ? closedDays.get(key) ?? null : undefined;
          const closed = closureReason !== undefined;

          return (
            <div
              key={key}
              className={cn(
                "min-h-16 border-b border-l border-hairline p-1 sm:min-h-28 sm:p-1.5",
                // A day the shop never trades on is sunk, so the shape of the
                // working week is legible at a glance rather than inferred.
                trades ? "bg-chalk" : "bg-bench-sunk/60",
                closed && "bg-rust-wash/70",
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <Link
                  href={`${basePath}?date=${key}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={
                    entries.length === 0
                      ? `${day} ${monthLabel}, nothing booked`
                      : `${day} ${monthLabel}, ${entries.length} ${entries.length === 1 ? "job" : "jobs"}`
                  }
                  className={cn(
                    "inline-flex min-w-6 items-center justify-center rounded-machined px-1 font-mono text-xs tabular-nums transition-colors",
                    isToday
                      ? "bg-signal text-white"
                      : "text-steel hover:bg-bench hover:text-enamel",
                  )}
                >
                  {day}
                </Link>

                {/* At 375px a square is roughly 50px wide and a chip cannot fit,
                    so the phone gets the count and the chips start at `sm`. */}
                {entries.length > 0 ? (
                  <span
                    aria-hidden
                    className="font-mono text-eyebrow tabular-nums text-signal sm:hidden"
                  >
                    {entries.length}
                  </span>
                ) : null}
              </div>

              {closed ? (
                <p className="hidden truncate pt-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-rust sm:block">
                  {closureReason ?? "Closed"}
                </p>
              ) : null}

              <ul className="hidden flex-col gap-0.5 pt-1 sm:flex">
                {entries.slice(0, CHIPS_PER_DAY).map((entry) => {
                  const { booking } = entry;
                  const customerName =
                    booking.customer?.display_name ??
                    booking.customer?.full_name ??
                    "Customer";

                  return (
                    <li key={`${booking.id}-${key}`}>
                      <Link
                        href={`/dashboard/expert/requests?booking=${encodeURIComponent(booking.reference)}`}
                        aria-label={`${customerName}, ${formatTime(entry.start, timezone)}, ${BOOKING_STATUS_LABELS[booking.status]}`}
                        className={cn(
                          "flex items-baseline gap-1 overflow-hidden rounded-machined border-l-2 px-1 py-0.5 transition-shadow hover:shadow-bench",
                          CHIP_TONE[STATUS_TONE[booking.status]],
                        )}
                      >
                        <span
                          aria-hidden
                          className="shrink-0 font-mono text-eyebrow tabular-nums text-steel"
                        >
                          {formatTime(entry.start, timezone)}
                        </span>
                        <span
                          aria-hidden
                          className="truncate text-xs leading-tight text-enamel"
                        >
                          {customerName}
                        </span>
                      </Link>
                    </li>
                  );
                })}

                {entries.length > CHIPS_PER_DAY ? (
                  <li>
                    <Link
                      href={`${basePath}?date=${key}`}
                      className="block px-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
                    >
                      +{entries.length - CHIPS_PER_DAY} more
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
