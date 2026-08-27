import { WEEKDAYS, WEEKDAY_LABELS, type Json, type Weekday } from "@/lib/types/database";

/**
 * Opening-hours engine.
 *
 * Powers the status strip — the one piece of live state on the site — so it is
 * deliberately dependency-free and pure. Pass `now` explicitly to test it.
 *
 * Correctness notes:
 *   • All arithmetic happens in the SHOP's timezone, not the server's and not
 *     the visitor's. A Bengaluru shop is closed at 02:00 IST regardless of who
 *     is looking. This is why `fixer_profiles.timezone` exists.
 *   • Overnight spans (open 20:00, close 02:00) are rejected at the database
 *     level by `fixer_hours_ordered`. If that constraint is ever relaxed,
 *     `resolveDay` must be extended to wrap past midnight.
 *   • Rendered on the server, so the output is a snapshot. `useShopStatus`
 *     re-evaluates on the client each minute to keep it honest.
 */

export interface DaySchedule {
  /** Minutes from local midnight. */
  openMinutes: number;
  closeMinutes: number;
}

export interface HoursInput {
  working_days: Weekday[];
  opening_time: string;
  closing_time: string;
  hours: Json;
  timezone: string;
}

/**
 * The status detail as data rather than as a sentence.
 *
 * `detail` below is the English rendering, kept because JSON-LD and the expert
 * profile's own summary line consume it directly. `detailParts` is what the UI
 * should use: the status strip is a Client Component in seven languages, and it
 * cannot translate a string that has already been assembled. Passing the shape
 * and the numbers lets `messages/<locale>.json` own the word order — which
 * matters, because "Opens 9:00 am" inverts in every Indic language on the list
 * ("9:00 am पर खुलेगा").
 */
export type StatusDetail =
  | { kind: "closesAt"; minutes: number }
  | { kind: "opensAt"; minutes: number }
  | { kind: "opensTomorrow"; minutes: number }
  | { kind: "opensOnDay"; day: Weekday; minutes: number }
  | { kind: "notListed" };

export type ShopStatus =
  | {
      isOpen: true;
      headline: "Open now";
      /** e.g. "Closes 7:00 pm" */
      detail: string;
      detailParts: StatusDetail;
      closesAtMinutes: number;
    }
  | {
      isOpen: false;
      headline: "Closed";
      /** e.g. "Opens Monday 9:00 am", or "Opening hours not listed" */
      detail: string;
      detailParts: StatusDetail;
      opensAtMinutes: number | null;
    };

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/** Accepts "9:00", "09:00", "09:00:00". Returns null when unparseable. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 570 → "9:30 am". Minutes are omitted when zero: 540 → "9:00 am". */
export function formatClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridiem = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

/* ── Timezone-aware "now" ─────────────────────────────────────────────────── */

interface ZonedNow {
  weekday: Weekday;
  minutes: number;
}

const INTL_WEEKDAY_TO_CODE: Record<string, Weekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/**
 * Current weekday + minutes-since-midnight inside `timeZone`.
 * Falls back to the runtime zone if the IANA name is invalid, rather than
 * throwing and taking a whole page down over one bad row.
 */
export function getZonedNow(timeZone: string, now: Date = new Date()): ZonedNow {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  }

  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = INTL_WEEKDAY_TO_CODE[lookup("weekday")] ?? "mon";
  // "24" is emitted for midnight by some ICU versions.
  const hour = Number(lookup("hour")) % 24;
  const minute = Number(lookup("minute"));

  return {
    weekday,
    minutes: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
  };
}

/* ── Schedule resolution ──────────────────────────────────────────────────── */

/**
 * Resolve one day's schedule.
 *
 * Precedence: an explicit `hours` override beats the base schedule. A `null`
 * override means "closed this day" even if the day is in `working_days` —
 * that's how a shop marks a standing day off.
 */
export function resolveDay(input: HoursInput, day: Weekday): DaySchedule | null {
  const overrides =
    input.hours && typeof input.hours === "object" && !Array.isArray(input.hours)
      ? (input.hours as Record<string, Json | undefined>)
      : {};

  if (day in overrides) {
    const override = overrides[day];
    if (override === null) return null;
    if (override && typeof override === "object" && !Array.isArray(override)) {
      const record = override as Record<string, Json | undefined>;
      const openMinutes = parseTimeToMinutes(
        typeof record.open === "string" ? record.open : undefined,
      );
      const closeMinutes = parseTimeToMinutes(
        typeof record.close === "string" ? record.close : undefined,
      );
      if (openMinutes !== null && closeMinutes !== null && openMinutes < closeMinutes) {
        return { openMinutes, closeMinutes };
      }
    }
    // Malformed override — fall through to the base schedule rather than
    // claiming the shop is closed.
  }

  if (!input.working_days.includes(day)) return null;

  const openMinutes = parseTimeToMinutes(input.opening_time);
  const closeMinutes = parseTimeToMinutes(input.closing_time);
  if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) return null;

  return { openMinutes, closeMinutes };
}

/** The full week, in display order, with nulls for closed days. */
export function resolveWeek(input: HoursInput): Array<{
  day: Weekday;
  label: string;
  schedule: DaySchedule | null;
}> {
  return WEEKDAYS.map((day) => ({
    day,
    label: WEEKDAY_LABELS[day],
    schedule: resolveDay(input, day),
  }));
}

/* ── The status strip ─────────────────────────────────────────────────────── */

export function getShopStatus(input: HoursInput, now: Date = new Date()): ShopStatus {
  const { weekday, minutes } = getZonedNow(input.timezone, now);
  const today = resolveDay(input, weekday);

  if (today && minutes >= today.openMinutes && minutes < today.closeMinutes) {
    return {
      isOpen: true,
      headline: "Open now",
      detail: `Closes ${formatClock(today.closeMinutes)}`,
      detailParts: { kind: "closesAt", minutes: today.closeMinutes },
      closesAtMinutes: today.closeMinutes,
    };
  }

  // Still to open today?
  if (today && minutes < today.openMinutes) {
    return {
      isOpen: false,
      headline: "Closed",
      detail: `Opens ${formatClock(today.openMinutes)}`,
      detailParts: { kind: "opensAt", minutes: today.openMinutes },
      opensAtMinutes: today.openMinutes,
    };
  }

  // Scan forward up to a full week for the next opening.
  const startIndex = WEEKDAYS.indexOf(weekday);
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidateDay = WEEKDAYS[(startIndex + offset) % 7];
    if (!candidateDay) continue;
    const schedule = resolveDay(input, candidateDay);
    if (!schedule) continue;

    const dayLabel = offset === 1 ? "tomorrow" : WEEKDAY_LABELS[candidateDay];
    return {
      isOpen: false,
      headline: "Closed",
      detail: `Opens ${dayLabel} ${formatClock(schedule.openMinutes)}`,
      detailParts:
        offset === 1
          ? { kind: "opensTomorrow", minutes: schedule.openMinutes }
          : { kind: "opensOnDay", day: candidateDay, minutes: schedule.openMinutes },
      opensAtMinutes: schedule.openMinutes,
    };
  }

  return {
    isOpen: false,
    headline: "Closed",
    detail: "Opening hours not listed",
    detailParts: { kind: "notListed" },
    opensAtMinutes: null,
  };
}

/**
 * schema.org `openingHours` strings for LocalBusiness JSON-LD.
 * Consecutive days sharing a schedule are collapsed: "Mo-Fr 09:00-18:00".
 */
export function toSchemaOpeningHours(input: HoursInput): string[] {
  const SCHEMA_DAY: Record<Weekday, string> = {
    mon: "Mo",
    tue: "Tu",
    wed: "We",
    thu: "Th",
    fri: "Fr",
    sat: "Sa",
    sun: "Su",
  };

  const pad = (value: number): string =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  const runs: Array<{ start: Weekday; end: Weekday; schedule: DaySchedule }> = [];

  for (const day of WEEKDAYS) {
    const schedule = resolveDay(input, day);
    if (!schedule) continue;

    const previous = runs[runs.length - 1];
    const isContiguous =
      previous !== undefined &&
      WEEKDAYS.indexOf(day) === WEEKDAYS.indexOf(previous.end) + 1 &&
      previous.schedule.openMinutes === schedule.openMinutes &&
      previous.schedule.closeMinutes === schedule.closeMinutes;

    if (isContiguous && previous) {
      previous.end = day;
    } else {
      runs.push({ start: day, end: day, schedule });
    }
  }

  return runs.map(({ start, end, schedule }) => {
    const days =
      start === end ? SCHEMA_DAY[start] : `${SCHEMA_DAY[start]}-${SCHEMA_DAY[end]}`;
    return `${days} ${pad(schedule.openMinutes)}-${pad(schedule.closeMinutes)}`;
  });
}
