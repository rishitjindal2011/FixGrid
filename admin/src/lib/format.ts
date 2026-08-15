/**
 * Money and time formatting, copied from the consumer app's `src/lib/format.ts`.
 *
 * Copied, not imported — separate npm projects, no shared package. Two rules
 * the whole system depends on:
 *
 *   1. **Money is an integer count of minor units.** Every amount crossing this
 *      boundary is a whole number of paise. `4999` is ₹49.99. Nothing here
 *      accepts a decimal amount, because accepting one would invite a float
 *      upstream.
 *
 *   2. **Dates render in a stated timezone**, never in the runtime's. A server
 *      component formatting a timestamp in the machine's local zone produces
 *      whatever the deploy region happens to be, then hydrates to the operator's
 *      and mismatches.
 *
 * The admin default zone differs from the consumer app's on purpose: the
 * consumer sees a slot in the *shop's* zone, an operator comparing shops across
 * the country needs one clock. That clock is UTC, and it matches what Postgres
 * stores, so "captured 14:05" in this console agrees with the database.
 *
 * Money uses `en-IN` while dates stay `en-GB`. Not an oversight: the money
 * locale carries Indian digit grouping (₹1,00,000, not ₹100,000), whereas the
 * date format was already correct and its zone is deliberately UTC per above.
 */

/**
 * Format an integer paise amount as currency. `4999` → "₹49.99", `5000` → "₹50".
 *
 * Whole amounts drop the ".00" because dense tables of round numbers read
 * better without it. Non-whole amounts always show both digits — paise are
 * never rounded away, since a total that doesn't add up is worse than a wide
 * column.
 */
export function formatMoney(
  minor: number | null | undefined,
  currency = "INR",
): string {
  if (minor === null || minor === undefined) return "—";

  const digits = minor % 100 === 0 ? 0 : 2;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 100);
}

/**
 * Money rounded to whole rupees — for chart axes and headline stat tiles,
 * where two decimal places are noise. Never use it on a refund line.
 */
export function formatMoneyRounded(
  minor: number | null | undefined,
  currency = "INR",
): string {
  if (minor === null || minor === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/** A plain count with thousands separators, for stat tiles. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/**
 * UTC, and stated explicitly.
 *
 * See the file header: an operations console needs one clock, not the reader's.
 */
const ADMIN_TZ = "UTC";

/** "Sat 8 Aug" — the compact form for lists. */
export function formatDay(iso: string | Date | null, timeZone = ADMIN_TZ): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
}

/** "8 Aug 2026, 14:05" — 24-hour, because a ledger is a record, not a chat. */
export function formatDateTime(iso: string | Date | null, timeZone = ADMIN_TZ): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

/**
 * "in 2 hours" / "3 days ago". Uses `Intl.RelativeTimeFormat`, so it is
 * localised and needs no dependency.
 *
 * `now` is a parameter so a server render and its client hydration can agree on
 * the same instant — passing the request time through avoids the flash where
 * the server says "in 2 hours" and the client immediately re-renders "in 1
 * hour 59 minutes".
 */
export function formatRelative(iso: string | Date | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "—";

  const seconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);

  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, span] of units) {
    if (abs >= span) return rtf.format(Math.round(seconds / span), unit);
  }

  return rtf.format(seconds, "second");
}

/**
 * Read the lower bound out of a Postgres `tstzrange` literal.
 *
 * PostgREST hands ranges back as text — `["2026-08-01T09:00:00+00","2026-08-01T10:00:00+00")`
 * — so there is no parsed value to reach for. Returns null rather than throwing
 * on anything unexpected: a booking row with a range this code cannot read is
 * still worth rendering, minus its date.
 */
export function slotStart(range: string | null | undefined): string | null {
  if (!range) return null;
  const match = /^[[(]"?([^",]*)"?,/.exec(range);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

/**
 * "1 hr 30 min" / "45 min". Durations are minutes throughout the schema.
 *
 * Duplicated from the consumer app's `format.ts` rather than shared: the three
 * apps have no common package, and a formatting helper is not worth a build-time
 * coupling between them. Keep the two in step by behaviour, not by import.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hr`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

/**
 * A catalogue price as the shop advertises it, respecting `price_type`.
 *
 * `quote` shows no figure at all rather than a misleading "₹0" — a shop that
 * prices on inspection has not quoted zero, it has not quoted.
 */
export function formatPriceRange(
  priceType: "fixed" | "from" | "quote",
  min: number | null,
  max: number | null,
  currency = "INR",
): string {
  if (priceType === "quote" || min === null) return "Quote on inspection";
  if (priceType === "from") return `from ${formatMoney(min, currency)}`;
  if (max !== null && max !== min) {
    return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
  }
  return formatMoney(min, currency);
}
