import Link from "next/link";

import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import type { BookingRow } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * A month at a glance, with a mark on every day that has work on it.
 *
 * All the date maths happens on `YYYY-MM-DD` day keys produced by an `en-CA`
 * formatter pinned to the shop's timezone, never on a `Date`'s local getters. A
 * job at 23:30 on the 8th in London is the 9th in UTC — bucketing by anything
 * but the shop's own zone would put jobs on the wrong squares for half the day.
 *
 * The grid itself is built from plain UTC arithmetic, because at that point the
 * numbers are labels rather than instants: `Date.UTC(2026, 8, 0)` is "how many
 * days has August got", not a moment in time.
 */

/** Monday first — a working week, not a US calendar. */
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type CalendarBooking = Pick<BookingRow, "id" | "slot">;

interface DayKey {
  year: number;
  month: number;
  day: number;
}

function parseDayKey(key: string): DayKey | null {
  const parts = key.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MiniCalendar({
  bookings,
  timezone,
  now,
  basePath = "/dashboard/expert/schedule",
}: {
  bookings: CalendarBooking[];
  timezone: string;
  now: Date;
  basePath?: string;
}) {
  const dayKeyOf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayKey = dayKeyOf.format(now);
  const today = parseDayKey(todayKey);
  if (!today) return null;

  const { year, month } = today;

  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay is Sunday-first; shift it so Monday is column 0.
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const counts = new Map<string, number>();
  for (const booking of bookings) {
    const start = slotStart(booking.slot);
    if (!start) continue;

    // A collection-and-return job can span days, and it is work on every one of
    // them. `end - 1ms` keeps an exclusive upper bound off the following day.
    const end = slotEnd(booking.slot);
    const lastKey = dayKeyOf.format(end ? new Date(end.getTime() - 1) : start);

    let cursor = parseDayKey(dayKeyOf.format(start));
    // Capped: a malformed range must not spin here.
    for (let step = 0; cursor && step < 31; step += 1) {
      const key = toDayKey(cursor.year, cursor.month, cursor.day);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (key === lastKey) break;
      const next = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day + 1));
      cursor = {
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
      };
    }
  }

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    month: "long",
    year: "numeric",
  }).format(now);

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <h3 className="font-display text-base uppercase tracking-wide text-enamel">
          {monthLabel}
        </h3>
        <Link
          href={basePath}
          className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
        >
          Calendar
        </Link>
      </div>

      <div aria-hidden className="grid grid-cols-7 gap-1 pb-1">
        {WEEKDAYS.map((label) => (
          <span
            key={label}
            className="text-center font-mono text-eyebrow uppercase tracking-[0.08em] text-steel-soft"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`pad-${index}`} aria-hidden />;

          const key = toDayKey(year, month, day);
          const count = counts.get(key) ?? 0;
          const isToday = key === todayKey;

          return (
            <Link
              key={key}
              href={`${basePath}?date=${key}`}
              aria-current={isToday ? "date" : undefined}
              aria-label={
                count === 0
                  ? `${day} ${monthLabel}, nothing booked`
                  : `${day} ${monthLabel}, ${count} ${count === 1 ? "job" : "jobs"}`
              }
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-machined border text-sm transition-colors",
                isToday
                  ? "border-enamel bg-enamel text-bench"
                  : count > 0
                    ? "border-hairline bg-bench text-enamel hover:border-steel-soft"
                    : "border-transparent text-steel hover:bg-bench",
              )}
            >
              <span className="font-mono tabular-nums leading-none">{day}</span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-machined",
                  count > 0 ? (isToday ? "bg-bench" : "bg-signal") : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
