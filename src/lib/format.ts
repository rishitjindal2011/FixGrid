/**
 * Money and time formatting for the dashboards.
 *
 * Two rules the whole system depends on:
 *
 *   1. **Money is an integer count of minor units.** Every amount crossing this
 *      boundary is a whole number of paise. `4999` is ₹49.99. Nothing here
 *      accepts a decimal amount, because accepting one would invite a float
 *      upstream.
 *
 *   2. **Dates render in a stated timezone**, never in the runtime's. A server
 *      component formatting a slot with the machine's local zone produces
 *      whatever the deploy region happens to be, then hydrates to the user's
 *      and mismatches. Every function here takes the zone explicitly — the
 *      shop's for slots, the customer's for their own history.
 *
 * The currency is INR and the locale for money is `en-IN`, which matters for
 * more than the symbol: Indian digit grouping is 2-2-3, so ₹1,00,000 rather
 * than ₹100,000. Getting that wrong reads as a foreign site.
 *
 * Note the date helpers below still use `en-GB` and fall back to
 * `Europe/London`. That is deliberate and separate: the date *format* (8 August
 * 2026) is already right, and the timezone fallback is load-bearing in
 * `src/lib/bookings/slots.ts`, so moving it is a scheduling change rather than a
 * formatting one.
 */

/**
 * Format an integer paise amount as currency. `4999` → "₹49.99", `5000` → "₹50".
 *
 * Whole amounts drop the ".00" because dense tables of round numbers read
 * better without it. Non-whole amounts always show both digits — paise are
 * never rounded away, since a total that doesn't add up is worse than a wide
 * column.
 */
/**
 * Money is formatted with `en-IN` on purpose, in every UI language.
 *
 * DO NOT make this take the active locale. It looks like an oversight after the
 * i18n work; it is not. Verified against the runtime:
 *
 *   en / hi / ta / te / kn →  ₹2,500.00
 *   mr                     →  ₹२,५००.००     (Devanagari digits)
 *   bn                     →  ২,৫০০.০০₹     (Bengali digits, AND ₹ moves to the end)
 *
 * CLDR's default numbering system is `deva` for Marathi and `beng` for Bengali,
 * and Bengali also places the currency symbol as a suffix. On a wallet balance,
 * a fee or an invoice line that is a legibility and trust problem, not a
 * nicety — the amount and where the ₹ sits must not change with the interface
 * language. Amounts are also compared against SMS receipts and UPI apps, which
 * are Latin-digit.
 *
 * Prose counts are different and are left to the locale: `২টি দোকান` is simply
 * how Bengali writes "2 shops", and those go through ICU plurals in the message
 * catalogues, not through this function.
 *
 * If a locale ever genuinely needs native digits for money, pin it explicitly
 * with a `-u-nu-…` extension rather than passing the bare locale through.
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
 * where two decimal places are noise. Never use it on an invoice line.
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

/**
 * A price as the catalogue advertises it, respecting `price_type`.
 * `quote` deliberately shows no number at all rather than a misleading "₹0".
 */
export function formatPriceRange(
  priceType: "fixed" | "from" | "quote",
  min: number | null,
  max: number | null,
  currency = "INR",
): string {
  if (priceType === "quote") return "Quote on inspection";
  if (min === null) return "Quote on inspection";
  if (priceType === "from") return `from ${formatMoney(min, currency)}`;
  if (max !== null && max !== min) {
    return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
  }
  return formatMoney(min, currency);
}

/** "1 hr 30 min" / "45 min" — durations are minutes throughout the schema. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hr`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

const DEFAULT_TZ = "Europe/London";

/** "Sat 8 Aug" — the compact form for lists. */
export function formatDay(iso: string | Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(iso));
}

/** "8 August 2026" — the long form for detail pages. */
export function formatDateLong(iso: string | Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** "09:30" — 24-hour, because a repair slot is a schedule, not a conversation. */
export function formatTime(iso: string | Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

/** "Sat 8 Aug, 09:30". */
export function formatDateTime(iso: string | Date, timeZone = DEFAULT_TZ): string {
  return `${formatDay(iso, timeZone)}, ${formatTime(iso, timeZone)}`;
}

/**
 * "Sat 8 Aug, 09:30–10:30" for a slot inside one day, falling back to two full
 * datetimes when the slot crosses midnight (a pickup_drop job held overnight).
 */
export function formatSlot(
  start: string | Date,
  end: string | Date,
  timeZone = DEFAULT_TZ,
): string {
  const sameDay = formatDay(start, timeZone) === formatDay(end, timeZone);
  return sameDay
    ? `${formatDay(start, timeZone)}, ${formatTime(start, timeZone)}–${formatTime(end, timeZone)}`
    : `${formatDateTime(start, timeZone)} → ${formatDateTime(end, timeZone)}`;
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
export function formatRelative(iso: string | Date, now: Date = new Date()): string {
  const target = new Date(iso);
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
 * Whole days between now and a deadline, rounded up and floored at zero.
 * Used for the warranty countdown, where "0 days left" must not read as "-1".
 */
export function daysUntil(iso: string | Date, now: Date = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
