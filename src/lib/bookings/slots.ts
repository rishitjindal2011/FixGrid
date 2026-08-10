import { formatDay } from "@/lib/format";
import { parseTimeToMinutes } from "@/lib/hours";
import type { Weekday } from "@/lib/types/database";

/**
 * Slot generation.
 *
 * Pure and dependency-free, for the same reason `src/lib/hours.ts` is: this is
 * the arithmetic most worth testing and least worth standing up a database for.
 * Nothing here touches Supabase, and the only clock reading is the defaulted
 * `now` argument — pin it and every output is deterministic.
 *
 * The rules that make this hard, in the order they bite:
 *
 *   1. **Everything happens in the SHOP's timezone.** An availability row saying
 *      09:00–17:00 means 09:00 as the shop experiences it. That is 08:00Z in
 *      London summer and 09:00Z in London winter, so the same rule generates
 *      slots at different UTC instants depending on the date. Storing the offset
 *      would be wrong; it has to be resolved per day.
 *
 *   2. **A day is not 24 hours.** On the Europe/London spring forward a day is
 *      23h, in autumn 25h. Advancing a cursor by 86_400_000ms across a DST
 *      boundary silently shifts every subsequent slot by an hour, and the bug
 *      only shows up twice a year. So day-to-day movement here is *civil* date
 *      arithmetic — increment the calendar day, then resolve that day's wall
 *      clock back to an instant — never millisecond addition.
 *
 *   3. **Elapsed time is not calendar time.** `leadHours` is a notice period, so
 *      it really is plain millisecond addition: four hours' notice is four
 *      hours, DST or not. `horizonDays` is a calendar promise — "we take
 *      bookings three weeks out" — so it advances civil days instead. The two
 *      are deliberately computed differently below.
 *
 * Bad input returns `[]` rather than throwing. These functions run inside page
 * renders where the availability rows may be missing entirely.
 */

/** One row of `shop_availability`, already parsed into the shape this needs. */
export interface SlotRule {
  weekday: Weekday;
  /** `HH:MM` or `HH:MM:SS`, wall clock in the shop's timezone. */
  startsAt: string;
  endsAt: string;
  /** Gap enforced after a booked job before the next slot may start. */
  bufferMinutes: number;
  /** Concurrent jobs this shop can run in the window. */
  capacity: number;
}

/** An existing job that blocks capacity. */
export interface BookedSlot {
  start: Date;
  end: Date;
}

/** A holiday or closure that blanks out the calendar regardless of capacity. */
export interface TimeOff {
  start: Date;
  end: Date;
}

export interface Slot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface GenerateSlotsOptions {
  rules: readonly SlotRule[];
  booked: readonly BookedSlot[];
  timeOff: readonly TimeOff[];
  durationMinutes: number;
  /** IANA name, e.g. `Europe/London`. Falls back to the runtime zone if invalid. */
  timezone: string;
  from: Date;
  to: Date;
  /** Minimum notice before the first bookable slot. */
  leadHours: number;
  /** How far ahead the calendar is open, in calendar days. */
  horizonDays: number;
  /** Overrides each rule's own capacity when the caller knows better. */
  capacity?: number;
  now?: Date;
}

export interface SlotDay {
  /** `YYYY-MM-DD` in the shop's timezone — the stable key for a day. */
  day: string;
  /** "Sat 8 Aug". */
  label: string;
  slots: Slot[];
}

/**
 * Ceiling on how many days one call will walk, so a nonsense `to` far in the
 * future cannot spin the render thread. Well past any realistic horizon.
 */
const MAX_DAYS = 400;

/** Ceiling on returned slots, for the same reason. */
const MAX_SLOTS = 2000;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/* ── Zoned wall-clock arithmetic ──────────────────────────────────────────── */

/** A calendar date with no timezone attached. */
interface CivilDate {
  year: number;
  month: number;
  day: number;
}

interface CivilDateTime extends CivilDate {
  /** Minutes since local midnight. */
  minutes: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Formatters are cached because `generateSlots` builds one per day per rule and
 * constructing an `Intl.DateTimeFormat` is the expensive part of this module.
 *
 * An invalid IANA name falls back to the runtime zone — matching `getZonedNow`
 * in `hours.ts` — rather than throwing and taking a booking page down over one
 * bad `fixer_profiles.timezone`. The bad key is cached too, so the throw
 * happens once rather than on every lookup.
 */
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", options);
  }

  formatterCache.set(timeZone, formatter);
  return formatter;
}

/** The wall clock inside `timeZone` at a given instant. */
function zonedDateTime(instant: Date, timeZone: string): CivilDateTime {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    return Number.isFinite(value) ? value : 0;
  };

  // "24" is emitted for midnight by some ICU versions, as in `hours.ts`.
  const hour = read("hour") % 24;

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    minutes: hour * 60 + read("minute"),
  };
}

/** The zone's UTC offset, in ms, at a given instant. Positive is east of UTC. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    return Number.isFinite(value) ? value : 0;
  };

  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Resolve a wall clock in `timeZone` to the instant it names.
 *
 * Two passes, and the second one is the whole point. The first guesses using the
 * offset in force at the *naive* instant; if the target is on the far side of a
 * DST change from that guess, the offset it used is the wrong one. Re-reading
 * the offset at the corrected instant converges, because a zone's offset is
 * constant either side of a transition and the error is at most that one shift.
 *
 * Times that do not exist — 01:30 on the spring-forward morning — resolve to the
 * instant the clock skipped to. That is the right answer for a booking: the shop
 * opens when the clock says it does, and there is no 01:30 that day to open at.
 *
 * Times that happen twice, on the autumn morning, resolve to the first pass.
 * The instants stay correct and strictly increasing, but a slot spanning the
 * repeat renders as "01:30–01:30" through `formatSlot` because the wall clock
 * really does read the same at both ends. Rare enough to accept; do not "fix" it
 * by nudging the instant.
 */
function wallClockToInstant(date: CivilDate, minutes: number, timeZone: string): Date {
  const naive = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    Math.floor(minutes / 60),
    minutes % 60,
  );

  const firstPass = naive - zoneOffsetMs(new Date(naive), timeZone);
  return new Date(naive - zoneOffsetMs(new Date(firstPass), timeZone));
}

/**
 * Move a calendar date by whole days.
 *
 * Done in UTC on purpose: UTC has no DST, so every day there is exactly 24h and
 * this is pure civil arithmetic. Month and year rollovers come free from
 * `Date.UTC`. The result is a date label, never an instant.
 */
function addCivilDays(date: CivilDate, days: number): CivilDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * 86_400_000);
  return {
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  };
}

/** `Date.prototype.getUTCDay` order, so the index maps straight across. */
const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

function civilWeekday(date: CivilDate): Weekday {
  const index = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return WEEKDAY_BY_INDEX[index] ?? "mon";
}

function civilKey(date: CivilDate): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** Ordering comparator for civil dates, avoiding a second instant conversion. */
function civilOrdinal(date: CivilDate): number {
  return date.year * 10_000 + date.month * 100 + date.day;
}

/* ── Conflict detection ───────────────────────────────────────────────────── */

function isUsableInterval(interval: { start: Date; end: Date }): boolean {
  const start = interval.start?.getTime();
  const end = interval.end?.getTime();
  return (
    Number.isFinite(start) && Number.isFinite(end) && (end as number) > (start as number)
  );
}

/**
 * How many existing jobs collide with this slot.
 *
 * The buffer extends each booked job's *end* only. It is turnaround — cleaning
 * down the bench, writing the job up — so it blocks the slot that would follow a
 * job, not the one that would precede it. Applying it symmetrically would quietly
 * halve a shop's bookable day.
 */
function overlappingJobs(
  slot: { start: Date; end: Date },
  booked: readonly BookedSlot[],
  bufferMs: number,
): number {
  const slotStart = slot.start.getTime();
  const slotEnd = slot.end.getTime();
  let count = 0;

  for (const job of booked) {
    if (!isUsableInterval(job)) continue;
    if (slotStart < job.end.getTime() + bufferMs && slotEnd > job.start.getTime()) {
      count += 1;
    }
  }

  return count;
}

function hitsTimeOff(
  slot: { start: Date; end: Date },
  timeOff: readonly TimeOff[],
): boolean {
  const slotStart = slot.start.getTime();
  const slotEnd = slot.end.getTime();

  return timeOff.some(
    (period) =>
      isUsableInterval(period) &&
      slotStart < period.end.getTime() &&
      slotEnd > period.start.getTime(),
  );
}

function normaliseCapacity(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

/* ── Generation ───────────────────────────────────────────────────────────── */

export function generateSlots(options: GenerateSlotsOptions): Slot[] {
  const {
    rules,
    booked,
    timeOff,
    durationMinutes,
    timezone,
    from,
    to,
    leadHours,
    horizonDays,
    capacity,
    now = new Date(),
  } = options;

  if (!Array.isArray(rules) || rules.length === 0) return [];
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];

  const fromMs = from?.getTime();
  const toMs = to?.getTime();
  const nowMs = now?.getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || !Number.isFinite(nowMs)) {
    return [];
  }
  if (toMs <= fromMs) return [];

  const safeLeadHours = Number.isFinite(leadHours) ? Math.max(0, leadHours) : 0;
  const safeHorizonDays = Number.isFinite(horizonDays) ? Math.max(0, Math.floor(horizonDays)) : 0;

  // Notice period: genuinely elapsed hours, so plain addition is correct here.
  const earliestStart = Math.max(fromMs, nowMs + safeLeadHours * MS_PER_HOUR);

  // Horizon: a calendar promise, so it walks civil days and keeps the same wall
  // clock. Across a DST change that is 23 or 25 hours, which is what "three
  // weeks from today" means to the shop.
  //
  // Note this is an *instant*, not a whole-day count: with a 2-day horizon at
  // noon, the last day is only bookable up to noon. That is deliberate — it is
  // what "no slot beyond now + horizonDays" says — but it means the final day in
  // the returned list can be partial, and a calendar UI should not read that as
  // the shop having closed early.
  const nowZoned = zonedDateTime(now, timezone);
  const horizonDate = addCivilDays(nowZoned, safeHorizonDays);
  const horizonMs = wallClockToInstant(horizonDate, nowZoned.minutes, timezone).getTime();
  const latestEnd = Math.min(toMs, horizonMs);

  if (latestEnd <= earliestStart) return [];

  // Group rules by weekday once; a shop can list several windows for one day
  // (a morning bench and an afternoon bench) and each generates its own grid.
  const rulesByWeekday = new Map<Weekday, SlotRule[]>();
  for (const rule of rules) {
    if (!rule) continue;
    const existing = rulesByWeekday.get(rule.weekday);
    if (existing) existing.push(rule);
    else rulesByWeekday.set(rule.weekday, [rule]);
  }

  const durationMs = durationMinutes * MS_PER_MINUTE;
  const usableBooked = booked?.filter(isUsableInterval) ?? [];
  const usableTimeOff = timeOff?.filter(isUsableInterval) ?? [];

  // Walk from the calendar day containing `earliestStart` — a slot on that day
  // may start before it and is filtered per-slot below — to the day containing
  // `latestEnd`. Days advance civilly; never by adding 24h.
  let cursorDate: CivilDate = zonedDateTime(new Date(earliestStart), timezone);
  const finalDate = zonedDateTime(new Date(latestEnd), timezone);
  const finalOrdinal = civilOrdinal(finalDate);

  const slots: Slot[] = [];

  for (let dayIndex = 0; dayIndex < MAX_DAYS; dayIndex += 1) {
    if (civilOrdinal(cursorDate) > finalOrdinal) break;
    if (slots.length >= MAX_SLOTS) break;

    const dayRules = rulesByWeekday.get(civilWeekday(cursorDate));

    for (const rule of dayRules ?? []) {
      const openMinutes = parseTimeToMinutes(rule.startsAt);
      const closeMinutes = parseTimeToMinutes(rule.endsAt);
      // Overnight windows are rejected by `fixer_hours_ordered` at the database
      // level, so an inverted pair here is a bad row, not a night shift.
      if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
        continue;
      }

      const bufferMinutes = Number.isFinite(rule.bufferMinutes)
        ? Math.max(0, rule.bufferMinutes)
        : 0;
      const bufferMs = bufferMinutes * MS_PER_MINUTE;
      const effectiveCapacity = normaliseCapacity(capacity ?? rule.capacity);

      // Both bounds are resolved for this specific date, which is what makes the
      // window track DST instead of drifting an hour twice a year.
      const windowOpen = wallClockToInstant(cursorDate, openMinutes, timezone).getTime();
      const windowClose = wallClockToInstant(cursorDate, closeMinutes, timezone).getTime();

      // Candidates sit on a duration+buffer grid, so consecutive bookings out of
      // this list already leave the shop its turnaround gap.
      const strideMs = Math.max(MS_PER_MINUTE, durationMs + bufferMs);

      for (let cursorMs = windowOpen; cursorMs + durationMs <= windowClose; cursorMs += strideMs) {
        if (slots.length >= MAX_SLOTS) break;

        const slotEndMs = cursorMs + durationMs;
        if (cursorMs < earliestStart) continue;
        if (slotEndMs > latestEnd) break;

        const slot = { start: new Date(cursorMs), end: new Date(slotEndMs) };

        // Time off blanks the slot outright: extra capacity does not help when
        // the shop is shut.
        const available =
          !hitsTimeOff(slot, usableTimeOff) &&
          overlappingJobs(slot, usableBooked, bufferMs) < effectiveCapacity;

        slots.push({ ...slot, available });
      }
    }

    cursorDate = addCivilDays(cursorDate, 1);
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* ── Grouping ─────────────────────────────────────────────────────────────── */

/**
 * Bucket slots into the shop's calendar days.
 *
 * Grouping by the shop's civil date rather than the viewer's matters for late
 * slots: a 23:30 job in London is "tomorrow" to someone reading in Sydney, and
 * putting it under tomorrow's heading would misrepresent the shop's own diary.
 */
export function groupSlotsByDay(slots: readonly Slot[], timezone: string): SlotDay[] {
  const groups = new Map<string, SlotDay>();

  const ordered = [...(slots ?? [])]
    .filter((slot) => slot && Number.isFinite(slot.start?.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const slot of ordered) {
    const day = civilKey(zonedDateTime(slot.start, timezone));
    const existing = groups.get(day);

    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(day, { day, label: formatDay(slot.start, timezone), slots: [slot] });
    }
  }

  return [...groups.values()];
}

/* ── Re-checking one slot ─────────────────────────────────────────────────── */

export interface SlotBookabilityOptions {
  booked?: readonly BookedSlot[];
  timeOff?: readonly TimeOff[];
  bufferMinutes?: number;
  capacity?: number;
  leadHours?: number;
  horizonDays?: number;
  timezone?: string;
  now?: Date;
}

/**
 * Whether one slot still stands up on its own.
 *
 * `generateSlots` produces a list at a point in time; by the time a customer
 * taps one, another customer may have taken it and the lead window may have
 * closed. Server actions re-run this against fresh rows before writing. It is a
 * courtesy check either way — the exclusion constraint on `bookings.slot` is
 * what actually prevents a double booking, surfacing as 23P01.
 */
export function isSlotBookable(
  slot: { start: Date; end: Date },
  options: SlotBookabilityOptions = {},
): boolean {
  if (!slot || !isUsableInterval(slot)) return false;

  const {
    booked = [],
    timeOff = [],
    bufferMinutes = 0,
    capacity,
    leadHours = 0,
    horizonDays,
    timezone = "Europe/London",
    now = new Date(),
  } = options;

  const nowMs = now?.getTime();
  if (!Number.isFinite(nowMs)) return false;

  const safeLeadHours = Number.isFinite(leadHours) ? Math.max(0, leadHours) : 0;
  if (slot.start.getTime() < nowMs + safeLeadHours * MS_PER_HOUR) return false;

  if (horizonDays !== undefined && Number.isFinite(horizonDays)) {
    // Same calendar-day walk as `generateSlots`, so the two agree on the edge.
    const nowZoned = zonedDateTime(now, timezone);
    const horizonDate = addCivilDays(nowZoned, Math.max(0, Math.floor(horizonDays)));
    const horizonMs = wallClockToInstant(horizonDate, nowZoned.minutes, timezone).getTime();
    if (slot.end.getTime() > horizonMs) return false;
  }

  if (hitsTimeOff(slot, timeOff.filter(isUsableInterval))) return false;

  const bufferMs = Number.isFinite(bufferMinutes) ? Math.max(0, bufferMinutes) * MS_PER_MINUTE : 0;

  return (
    overlappingJobs(slot, booked.filter(isUsableInterval), bufferMs) <
    normaliseCapacity(capacity)
  );
}
