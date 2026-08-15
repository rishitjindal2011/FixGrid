"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canTransition } from "@/lib/bookings/machine";
import type { BookingActionState } from "@/lib/bookings/state";
import { getExpertStats } from "@/lib/dashboard/expert";
import { formatMoney } from "@/lib/format";
import { notifyQuoteSent } from "@/lib/notifications/booking";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/lib/types/database";
import type {
  BookingStatus,
  DeliveryMode,
  InventoryCondition,
  PriceType,
} from "@/lib/types/marketplace";
import type { AppDatabase } from "@/lib/types/supabase";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Every write the shop owner's dashboard performs — the counterpart to
 * `@/lib/bookings/actions`, which owns the writes *both* dashboards share.
 *
 * Nothing here duplicates that file. Status changes still go through
 * `transitionBooking`; messages still go through `sendMessage`. What lives here
 * is the half a customer has no business touching: the catalogue, the week's
 * opening hours, the shop's private notes, and the money it asks to be paid.
 *
 * Four conventions hold throughout, three inherited and one new:
 *
 *   1. **Return, never throw.** Every action resolves to a `BookingActionState`.
 *      A thrown error inside a form action surfaces as an unhandled rejection
 *      and loses the message the person needed to read.
 *   2. **Money arrives in rupees from a form and is stored as integer paise.**
 *      The conversion happens once, in `rupeesToPaise`, and rejects a third
 *      decimal rather than rounding it away.
 *   3. **The migration may not have been run.** A missing table returns a
 *      diagnosable sentence rather than a stack trace.
 *   4. **Ownership is asserted before every write.** `assertOwnership` reads
 *      `fixer_profiles.owner_id`, exactly as the RLS helper `owns_shop()`
 *      does. RLS is still the enforcement — this check exists because a policy
 *      refusing a write produces *zero rows updated*, which PostgREST reports
 *      as success. Without it, editing another shop's service would look like
 *      it worked.
 *
 * The helpers below are deliberate near-copies of the ones in
 * `@/lib/bookings/actions`. A `"use server"` module may only export async
 * functions, so `explain`, `rupeesToPaise` and `checked` cannot be imported
 * from there without exporting them as server endpoints — which would publish
 * three string utilities as routes.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Fallback only — matches the `fixer_profiles.timezone` column default. */
const DEFAULT_TIMEZONE = "Europe/London";

/* ── Shared helpers ───────────────────────────────────────────────────────── */

const FAILED = (error: string): BookingActionState => ({ error, success: false });
const OK = (message?: string): BookingActionState => ({
  error: null,
  success: true,
  ...(message ? { message } : {}),
});

/**
 * Postgres error codes into sentences.
 *
 * `PGRST205` sits alongside `42P01` because PostgREST answers a request for a
 * table missing from its schema cache with its own code rather than Postgres's
 * — the same deployment state, reported twice in two dialects.
 */
function explain(code: string | undefined, fallback: string): string {
  switch (code) {
    case "23P01":
      return "That overlaps something already in the diary — pick another time.";
    case "42501":
      return "You do not have permission to do that.";
    case "23505":
      return "That has already been recorded.";
    case "23503":
      return "That no longer exists.";
    case "42P01":
    case "PGRST205":
      return "The booking system is not set up on this database yet.";
    default:
      return fallback;
  }
}

/** The signed-in user, or null. Every action starts here. */
async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Does this user run this shop? Returns the refusal sentence, or null to pass.
 *
 * Read from `fixer_profiles.owner_id`, which is what the `owns_shop()` RLS
 * helper checks:
 *
 *   select exists (select 1 from fixer_profiles f
 *                   where f.id = p_fixer_id and f.owner_id = auth.uid())
 *
 * This used to query `shop_claims` for an approved row and claim in a comment
 * that it matched `owns_shop()`. It did not. The gap was invisible while every
 * owner arrived via an approved claim, and became a bug the moment /join started
 * setting `owner_id` at creation with the claim still pending: this check
 * refused every write while the policies would have allowed it, so a new shop
 * could reach its dashboard and change nothing on it.
 *
 * A sentence rather than a boolean because the two failure modes need different
 * wording: "you do not manage that shop" is actionable, "the tables are
 * missing" is a deployment problem, and a bare `false` would flatten them.
 */
async function assertOwnership(
  supabase: ServerClient,
  userId: string,
  fixerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("id")
    .eq("id", fixerId)
    .eq("owner_id", userId)
    .maybeSingle<{ id: string }>();

  if (error) {
    logReadFailure("[expert] ownership check failed", error);
    return explain(error.code, "We could not confirm you manage that shop.");
  }

  return data ? null : "You do not manage that shop.";
}

/**
 * "49.99" → 4999. Rejects anything with more than two decimal places rather
 * than rounding it, because silently turning ₹49.999 into ₹50.00 is the kind of
 * bug that only surfaces in an invoice dispute.
 */
function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim().replace(/^₹/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

/** A form checkbox is present-or-absent, not true-or-false. */
function checked(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

/**
 * A whole number inside a range, or the sentence to show instead.
 *
 * A union rather than `number | null` because "that is not a number" and "that
 * is out of range" want different wording, and every caller here already knows
 * which field it is asking about. `z.coerce.number()` is deliberately avoided:
 * it turns a missing form field into `Number(null)` — zero — which would let a
 * form that forgot an input save a silently wrong value.
 */
function bounded(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
  sentence: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return { ok: false, error: sentence };

  const parsed = Number(raw);
  if (parsed < min || parsed > max) return { ok: false, error: sentence };

  return { ok: true, value: parsed };
}

/** A uuid form field, or null. Treats "" as absent — a hidden input sends it. */
function readId(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  const parsed = z.string().uuid().safeParse(typeof value === "string" ? value : "");
  return parsed.success ? parsed.data : null;
}

/** Empty string from an optional text input means "not set", not "set to ''". */
function optionalText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  return value.trim() === "" ? undefined : value;
}

/* ── Timezone arithmetic ──────────────────────────────────────────────────── */

/**
 * How far ahead of UTC `timeZone` is at this instant, in milliseconds.
 *
 * Derived by formatting the instant into the zone's wall clock and reading that
 * back as if it were UTC; the difference is the offset. There is no API that
 * returns it directly, and hard-coding "+1 in summer" is how a booking system
 * loses an hour twice a year.
 *
 * `hourCycle: "h23"` rather than `hour12: false`: the latter renders midnight
 * as hour 24 under some ICU builds, which would push the reading a day forward.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const field = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const wall = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour"),
    field("minute"),
    field("second"),
  );

  // The wall reading has no milliseconds, so the instant is floored to the
  // second before subtracting or the offset comes back a fraction short.
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

const OFFSET_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * A form datetime into a real instant, read in the shop's timezone.
 *
 * `<input type="datetime-local">` posts a bare wall clock — "2026-12-24T09:00"
 * — with no offset at all. Handing that to `new Date()` reads it in the
 * *runtime's* zone, which on a deployed server is UTC: a shop in Europe/London
 * closing at 09:00 on a summer day would have its closure start at 10:00 local.
 * A value that does carry an offset is trusted as-is.
 *
 * Two passes over the offset. The first guess uses the offset in force at the
 * UTC reading of the wall clock, which is an hour out when that reading falls
 * the other side of a clock change from the real instant; re-reading the offset
 * at the guess converges for every zone in the database.
 */
function parseInstant(value: string, timeZone: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (OFFSET_SUFFIX.test(trimmed)) {
    const explicit = new Date(trimmed);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }

  const parts = WALL_CLOCK.exec(trimmed);
  if (!parts) return null;

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = parts;
  if (!year || !month || !day) return null;

  const asIfUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  const firstGuess = asIfUtc - zoneOffsetMs(new Date(asIfUtc), timeZone);
  const instant = asIfUtc - zoneOffsetMs(new Date(firstGuess), timeZone);

  return Number.isNaN(instant) ? null : new Date(instant);
}

/** The shop's own zone. Degrades to the column default rather than the runtime's. */
async function shopTimezone(supabase: ServerClient, fixerId: string): Promise<string> {
  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("timezone")
    .eq("id", fixerId)
    .maybeSingle<{ timezone: string }>();

  if (error) {
    logReadFailure("[expert] shop timezone lookup failed", error);
  }

  return data?.timezone ?? DEFAULT_TIMEZONE;
}

/* ── Availability ─────────────────────────────────────────────────────────── */

type AvailabilityInsert =
  AppDatabase["public"]["Tables"]["shop_availability"]["Insert"];

type FixerProfileUpdate =
  AppDatabase["public"]["Tables"]["fixer_profiles"]["Update"];

/** Minutes since midnight from `HH:MM` or `HH:MM:SS`, or null if unreadable. */
function minutesOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, rawHours, rawMinutes] = match;
  if (!rawHours || !rawMinutes) return null;

  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Back to the `time` column's own form, zero-padded so string sorts hold. */
function timeLiteral(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const rest = String(minutes % 60).padStart(2, "0");
  return `${hours}:${rest}:00`;
}

/**
 * The whole trading week, in one submit.
 *
 * A day at a time would be seven round-trips and, worse, seven chances to leave
 * the week half-saved. The form posts every day whether it changed or not and
 * this replaces the lot.
 *
 * Replacement is a delete followed by an insert, because PostgREST offers no
 * transaction. That is why every field is validated *before* the delete runs:
 * by the time the rows are gone the only remaining failure is the connection
 * itself, and the message for that case says the week was cleared rather than
 * leaving the owner to discover it.
 */
/**
 * Mirror the saved week onto `fixer_profiles`, and return the shop's slug.
 *
 * There are two representations of opening hours in this database and they are
 * read by different halves of the product:
 *
 *   • `shop_availability` — one row per open weekday, carrying `buffer_minutes`
 *     and `capacity`. Only slot generation needs those, so only the booking
 *     flow reads this table.
 *   • `fixer_profiles.working_days` / `opening_time` / `closing_time` / `hours` —
 *     what `src/lib/hours.ts` consumes, and therefore what the public shop page,
 *     the "Open now" status strip, the contact card, the search results and the
 *     `openingHours` JSON-LD all render.
 *
 * The editor writes the first and every customer-facing surface reads the
 * second, so without this projection a shop could change its hours, see the
 * change in its own dashboard, and have the public page keep advertising the old
 * ones indefinitely. That is worse than a cosmetic bug: the JSON-LD feeds
 * search engines, so wrong hours propagate off-site.
 *
 * `shop_availability` stays authoritative — this only ever writes derived
 * values, and a failure here is reported to the caller rather than rolled back:
 * the hours themselves saved, and telling someone their save failed when it
 * did not would be the worse lie.
 */
/**
 * One open day, as validated by the editor.
 *
 * Deliberately not `AvailabilityInsert`: that is the *generated* Insert type, so
 * every column is optional (the database supplies defaults), and deriving the
 * public projection from it would mean handling `string | undefined` for times
 * this code has already proven are present.
 */
interface OpenDay {
  weekday: Weekday;
  startsAt: string;
  endsAt: string;
}

async function syncPublicHours(
  supabase: Awaited<ReturnType<typeof currentUser>>["supabase"],
  fixerId: string,
  week: OpenDay[],
): Promise<string | null> {
  // An explicit entry for all seven days, not just the ones that differ from
  // the base window. `resolveDay` gives an override precedence over
  // `working_days`, so spelling out every day makes the result independent of
  // whatever the base times happen to be — and a closed day is `null`, which is
  // exactly how that function reads "closed".
  const hours: Record<string, { open: string; close: string } | null> = {};
  for (const day of WEEKDAYS) {
    const match = week.find((candidate) => candidate.weekday === day);
    hours[day] = match ? { open: match.startsAt, close: match.endsAt } : null;
  }

  const patch: FixerProfileUpdate = {
    working_days: week.map((day) => day.weekday),
    // `hours` is a `jsonb` column typed as `Json`; this record is valid JSON but
    // the generated union does not narrow to it structurally.
    hours: hours as FixerProfileUpdate["hours"],
  };

  // The base window still has to be coherent for any reader that ignores the
  // overrides: the widest span across the week. A shop with no open days keeps
  // its existing times and simply has an empty `working_days`, because "closed
  // all week" is not the same as "open 00:00–00:00".
  if (week.length > 0) {
    const starts = week.map((day) => day.startsAt).sort();
    const ends = week.map((day) => day.endsAt).sort();
    patch.opening_time = starts[0];
    patch.closing_time = ends[ends.length - 1];
  }

  const { data, error } = await supabase
    .from("fixer_profiles")
    .update(patch)
    .eq("id", fixerId)
    .select("slug")
    .maybeSingle<{ slug: string }>();

  if (error) {
    logReadFailure("[expert] public hours projection failed", error);
    return null;
  }

  return data?.slug ?? null;
}

export async function setWeeklyAvailability(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const fixerId = readId(formData, "fixerId");
  if (!fixerId) return FAILED("That shop could not be found.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to change your opening hours.");

  const denied = await assertOwnership(supabase, user.id, fixerId);
  if (denied) return FAILED(denied);

  const rows: AvailabilityInsert[] = [];
  // The same week in the shape the public projection needs — built here, where
  // the times have just been validated, rather than recovered from `rows`.
  const week: OpenDay[] = [];

  for (const day of WEEKDAYS) {
    if (!checked(formData, `day-${day}-open`)) continue;

    const label = WEEKDAY_LABELS[day];

    const opens = minutesOfDay(String(formData.get(`day-${day}-start`) ?? ""));
    const closes = minutesOfDay(String(formData.get(`day-${day}-end`) ?? ""));

    if (opens === null || closes === null) {
      return FAILED(`Set an opening and a closing time for ${label}.`);
    }
    if (closes <= opens) {
      return FAILED(`${label} closes before it opens — check those times.`);
    }

    const buffer = bounded(
      formData.get(`day-${day}-buffer`),
      0,
      240,
      `The gap between jobs on ${label} has to be between 0 and 240 minutes.`,
    );
    if (!buffer.ok) return FAILED(buffer.error);

    const capacity = bounded(
      formData.get(`day-${day}-capacity`),
      1,
      20,
      `${label} needs to take at least one job at a time.`,
    );
    if (!capacity.ok) return FAILED(capacity.error);

    rows.push({
      fixer_id: fixerId,
      weekday: day,
      starts_at: timeLiteral(opens),
      ends_at: timeLiteral(closes),
      buffer_minutes: buffer.value,
      capacity: capacity.value,
    });

    week.push({
      weekday: day,
      startsAt: timeLiteral(opens),
      endsAt: timeLiteral(closes),
    });
  }

  const { error: clearError } = await supabase
    .from("shop_availability")
    .delete()
    .eq("fixer_id", fixerId);

  if (clearError) {
    return FAILED(explain(clearError.code, "Your opening hours could not be saved."));
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("shop_availability").insert(rows);

    if (insertError) {
      return FAILED(
        explain(
          insertError.code,
          "Your old hours were cleared but the new ones would not save — set them again.",
        ),
      );
    }
  }

  // Project the week onto `fixer_profiles`, and revalidate the public surfaces.
  // Without this the save is invisible everywhere a customer actually looks.
  const slug = await syncPublicHours(supabase, fixerId, week);

  revalidatePath("/dashboard/expert/schedule");
  revalidatePath("/dashboard/expert");
  revalidatePath("/discover");
  revalidatePath("/search");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/expert/${slug}`);
    revalidatePath(`/dashboard/discover/${slug}`);
  }

  // An empty week is legal and it is not the same as closing the shop: with no
  // rows here slot generation falls back to the profile's opening hours. Saying
  // so beats letting an owner think they have shut the diary.
  return OK(
    rows.length > 0
      ? "Opening hours saved."
      : "Every day is switched off — bookings fall back to your profile hours until you open one.",
  );
}

/* ── Time off ─────────────────────────────────────────────────────────────── */

const TimeOffSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  start: z.string().trim().min(1, "Pick when the closure starts."),
  end: z.string().trim().min(1, "Pick when the closure ends."),
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
});

/**
 * Block a stretch of the diary — holidays, a trade fair, a broken boiler.
 *
 * Stored as a `tstzrange` literal, half-open like `bookings.slot`: a closure
 * ending at 09:00 does not swallow the job that starts then. The two ranges are
 * compared by the slot generator, so they have to agree about their boundaries.
 */
export async function addTimeOff(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = TimeOffSchema.safeParse({
    fixerId: formData.get("fixerId"),
    start: formData.get("start"),
    end: formData.get("end"),
    reason: optionalText(formData, "reason"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { fixerId, reason } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to change your calendar.");

  const denied = await assertOwnership(supabase, user.id, fixerId);
  if (denied) return FAILED(denied);

  const timezone = await shopTimezone(supabase, fixerId);
  const start = parseInstant(parsed.data.start, timezone);
  const end = parseInstant(parsed.data.end, timezone);

  if (!start || !end) return FAILED("Those dates could not be read — pick them again.");
  if (end.getTime() <= start.getTime()) {
    return FAILED("The closure has to end after it starts.");
  }

  const { error } = await supabase.from("shop_time_off").insert({
    fixer_id: fixerId,
    period: `[${start.toISOString()},${end.toISOString()})`,
    reason: reason ?? null,
  });

  if (error) {
    return FAILED(explain(error.code, "That closure could not be saved."));
  }

  // Time off does not change the advertised opening hours, but it does remove
  // slots from the booking form, which reads its diary live.
  const closureSlug = await shopSlug(supabase, fixerId);
  revalidatePath("/dashboard/expert/schedule");
  revalidatePath("/dashboard/expert");
  if (closureSlug) revalidatePath(`/dashboard/discover/${closureSlug}`);

  return OK("Closure added.");
}

export async function removeTimeOff(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That closure could not be found.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to change your calendar.");

  // The form only carries the row's id, so the shop it belongs to has to be
  // read before it can be checked. RLS would refuse a stranger's row anyway;
  // this turns that refusal into a sentence instead of a silent no-op.
  const { data: row, error: readError } = await supabase
    .from("shop_time_off")
    .select("id, fixer_id")
    .eq("id", id)
    .maybeSingle<{ id: string; fixer_id: string }>();

  if (readError) {
    return FAILED(explain(readError.code, "That closure could not be loaded."));
  }
  if (!row) return FAILED("That closure could not be found.");

  const denied = await assertOwnership(supabase, user.id, row.fixer_id);
  if (denied) return FAILED(denied);

  const { error } = await supabase.from("shop_time_off").delete().eq("id", id);

  if (error) {
    return FAILED(explain(error.code, "That closure could not be removed."));
  }

  // Removing a closure puts those slots back on the booking form, which is a
  // customer-facing change even though the advertised hours never moved.
  const reopenedSlug = await shopSlug(supabase, row.fixer_id);
  revalidatePath("/dashboard/expert/schedule");
  revalidatePath("/dashboard/expert");
  if (reopenedSlug) revalidatePath(`/dashboard/discover/${reopenedSlug}`);

  return OK("Closure removed.");
}

/* ── Service catalogue ────────────────────────────────────────────────────── */

const DELIVERY_MODES = [
  "in_shop",
  "home_visit",
  "pickup_drop",
] as const satisfies readonly DeliveryMode[];

const PRICE_TYPES = ["fixed", "from", "quote"] as const satisfies readonly PriceType[];

const ServiceSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Give the service a name customers will recognise.")
    .max(120, "Keep the name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters.")
    .optional(),
  categoryId: z.string().uuid().optional(),
  priceType: z.enum(PRICE_TYPES, {
    errorMap: () => ({ message: "Pick how this service is priced." }),
  }),
  priceMin: z.string().trim().optional(),
  priceMax: z.string().trim().optional(),
  deliveryModes: z
    .array(z.enum(DELIVERY_MODES))
    .min(1, "Pick at least one way customers can use this service."),
  isActive: z.boolean(),
});

type ServiceWrite = AppDatabase["public"]["Tables"]["shop_services"]["Update"];

/**
 * Where a new service lands in the list.
 *
 * Appended rather than inserted at the top: a catalogue is ordered by how the
 * owner wants it read, and a new row jumping the queue would silently reorder a
 * list they had already arranged.
 */
async function nextSortOrder(supabase: ServerClient, fixerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("shop_services")
    .select("sort_order")
    .eq("fixer_id", fixerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  if (error) {
    logReadFailure("[expert] service sort order lookup failed", error);
  }

  return (data?.sort_order ?? -1) + 1;
}

/**
 * Create or edit one service. `id` present means edit.
 *
 * One action rather than two because the validation is identical and the two
 * halves would drift — the create form and the edit form are the same form.
 */
export async function upsertService(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = ServiceSchema.safeParse({
    fixerId: formData.get("fixerId"),
    id: optionalText(formData, "id"),
    name: formData.get("name"),
    description: optionalText(formData, "description"),
    categoryId: optionalText(formData, "categoryId"),
    priceType: formData.get("priceType"),
    priceMin: optionalText(formData, "priceMin"),
    priceMax: optionalText(formData, "priceMax"),
    deliveryModes: formData.getAll("deliveryModes").map((value) => String(value)),
    isActive: checked(formData, "isActive"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const input = parsed.data;

  const duration = bounded(
    formData.get("durationMinutes"),
    5,
    1440,
    "Set how long this job takes, between 5 minutes and 24 hours.",
  );
  if (!duration.ok) return FAILED(duration.error);

  const warranty = bounded(
    formData.get("warrantyDays"),
    0,
    3650,
    "Set the warranty in whole days, up to 3650.",
  );
  if (!warranty.ok) return FAILED(warranty.error);

  let priceMin: number | null = null;
  let priceMax: number | null = null;

  if (input.priceType !== "quote") {
    if (!input.priceMin) {
      return FAILED("Set a price, or switch this service to quote on inspection.");
    }

    priceMin = rupeesToPaise(input.priceMin);
    if (priceMin === null) return FAILED("Enter the price in rupees, like 49.99.");

    // Only `fixed` renders a range. `from` advertises a floor and
    // `formatPriceRange` ignores its upper bound, so storing one here would be
    // a number nobody ever sees and an edit form would show it back as fact.
    if (input.priceType === "fixed" && input.priceMax) {
      priceMax = rupeesToPaise(input.priceMax);
      if (priceMax === null) return FAILED("Enter the upper price in rupees, like 89.99.");
      if (priceMax < priceMin) return FAILED("The upper price cannot be below the lower one.");
    }
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your services.");

  const denied = await assertOwnership(supabase, user.id, input.fixerId);
  if (denied) return FAILED(denied);

  const write: ServiceWrite = {
    name: input.name,
    description: input.description ?? null,
    category_id: input.categoryId ?? null,
    price_type: input.priceType,
    // `quote` nulls both rather than storing 0 — ₹0.00 is a price a customer
    // would read as free, and `formatPriceRange` only says "quote on
    // inspection" when there is genuinely no number.
    price_min: priceMin,
    price_max: priceMax,
    duration_minutes: duration.value,
    delivery_modes: input.deliveryModes,
    warranty_days: warranty.value,
    is_active: input.isActive,
  };

  if (input.id) {
    // Scoped by `fixer_id` as well as `id`. RLS would refuse another shop's row,
    // but a policy-refused update returns zero rows and reads as success —
    // selecting the id back is what turns that into a message.
    const { data, error } = await supabase
      .from("shop_services")
      .update(write)
      .eq("id", input.id)
      .eq("fixer_id", input.fixerId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) return FAILED(explain(error.code, "That service could not be saved."));
    if (!data) return FAILED("That service could not be found on your shop.");
  } else {
    const { error } = await supabase.from("shop_services").insert({
      ...write,
      fixer_id: input.fixerId,
      sort_order: await nextSortOrder(supabase, input.fixerId),
    });

    if (error) return FAILED(explain(error.code, "That service could not be added."));
  }

  await revalidateCatalogue(supabase, input.fixerId);

  return OK(input.id ? "Service saved." : "Service added.");
}

export async function toggleServiceActive(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That service could not be found.");

  const active = checked(formData, "active");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your services.");

  const service = await readOwnedService(supabase, user.id, id);
  if (typeof service === "string") return FAILED(service);

  const { error } = await supabase
    .from("shop_services")
    .update({ is_active: active })
    .eq("id", id);

  if (error) {
    return FAILED(explain(error.code, "That service could not be updated."));
  }

  await revalidateCatalogue(supabase, service.fixer_id);

  return OK(active ? "Service switched on." : "Service switched off.");
}

/**
 * Move a service one place in the catalogue.
 *
 * Positions are rewritten as 0…n-1 rather than swapping the two stored values.
 * Every row starts on the column default of 0, so a bare swap between two
 * zeroes would change nothing at all and the arrow would look broken. The list
 * is read in the same order `listShopServices` renders it — `sort_order` then
 * name — so what the owner clicked next to is what moves.
 */
export async function reorderService(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That service could not be found.");

  const direction = formData.get("direction");
  if (direction !== "up" && direction !== "down") {
    return FAILED("That service could not be moved.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your services.");

  const service = await readOwnedService(supabase, user.id, id);
  if (typeof service === "string") return FAILED(service);

  const { data, error } = await supabase
    .from("shop_services")
    .select("id, sort_order, name")
    .eq("fixer_id", service.fixer_id)
    .returns<{ id: string; sort_order: number; name: string }[]>();

  if (error) {
    return FAILED(explain(error.code, "Your services could not be loaded."));
  }

  const ordered = [...(data ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  const from = ordered.findIndex((row) => row.id === id);
  if (from < 0) return FAILED("That service could not be found on your shop.");

  const to = direction === "up" ? from - 1 : from + 1;
  // Already at the end of the list. Nothing moved and nothing went wrong, so
  // this is a success with nothing to say rather than an error to explain.
  if (to < 0 || to >= ordered.length) return OK();

  const moved = ordered[from];
  const displaced = ordered[to];
  if (!moved || !displaced) return FAILED("That service could not be moved.");

  ordered[from] = displaced;
  ordered[to] = moved;

  const writes = ordered
    .map((row, position) => ({ row, position }))
    .filter((entry) => entry.row.sort_order !== entry.position)
    .map((entry) =>
      supabase
        .from("shop_services")
        .update({ sort_order: entry.position })
        .eq("id", entry.row.id),
    );

  const results = await Promise.all(writes);
  const failure = results.find((result) => result.error);

  if (failure?.error) {
    return FAILED(explain(failure.error.code, "That service could not be moved."));
  }

  await revalidateCatalogue(supabase, service.fixer_id);

  return OK();
}

export async function deleteService(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That service could not be found.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your services.");

  const service = await readOwnedService(supabase, user.id, id);
  if (typeof service === "string") return FAILED(service);

  const { error } = await supabase.from("shop_services").delete().eq("id", id);

  if (error) {
    // `bookings.service_id` references this row. A past job naming a service
    // that no longer exists would leave its history unreadable, so the FK is
    // doing the right thing here and the answer is to retire the service, not
    // to force it through.
    if (error.code === "23503") {
      return FAILED("This service has bookings against it — deactivate it instead.");
    }
    return FAILED(explain(error.code, "That service could not be deleted."));
  }

  await revalidateCatalogue(supabase, service.fixer_id);

  return OK("Service deleted.");
}

/**
 * One service the caller demonstrably owns, or the sentence explaining why not.
 *
 * The three single-id service actions all carry only the row id, so each has to
 * resolve the shop before it can assert anything about it. Shared so the three
 * cannot disagree about what "not yours" reads like.
 */
async function readOwnedService(
  supabase: ServerClient,
  userId: string,
  id: string,
): Promise<{ id: string; fixer_id: string } | string> {
  const { data, error } = await supabase
    .from("shop_services")
    .select("id, fixer_id")
    .eq("id", id)
    .maybeSingle<{ id: string; fixer_id: string }>();

  if (error) return explain(error.code, "That service could not be loaded.");
  if (!data) return "That service could not be found.";

  const denied = await assertOwnership(supabase, userId, data.fixer_id);
  return denied ?? data;
}

/**
 * The catalogue is public as well as internal, so both sides have to re-read.
 *
 * The shop's own `/expert/[slug]` page lists services too, so it is revalidated
 * as well. That costs one primary-key lookup to turn the fixer id into a slug —
 * an earlier version skipped it on the grounds that the profile page would
 * "pick the change up on its own window", which is another way of saying a shop
 * could switch a service off and watch its public page keep offering it. A
 * single indexed read is the cheaper of those two.
 */
async function revalidateCatalogue(
  supabase: Awaited<ReturnType<typeof currentUser>>["supabase"],
  fixerId: string | null,
): Promise<void> {
  revalidatePath("/dashboard/expert/services");
  revalidatePath("/dashboard/expert/inventory");
  revalidatePath("/dashboard/expert");
  revalidatePath("/discover");
  revalidatePath("/search");

  if (!fixerId) return;

  const slug = await shopSlug(supabase, fixerId);
  if (slug) {
    revalidatePath(`/expert/${slug}`);
    revalidatePath(`/dashboard/discover/${slug}`);
  }
}

/**
 * The public slug for a shop, or null.
 *
 * Its own function because four actions need it purely to name the paths they
 * revalidate, and a failure to find it must never fail the write that already
 * succeeded — the caller simply revalidates less.
 */
async function shopSlug(
  supabase: Awaited<ReturnType<typeof currentUser>>["supabase"],
  fixerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("slug")
    .eq("id", fixerId)
    .maybeSingle<{ slug: string }>();

  if (error) {
    logReadFailure("[expert] slug lookup for revalidation failed", error);
    return null;
  }

  return data?.slug ?? null;
}

/* ── Inventory ────────────────────────────────────────────────────────────── */

const CONDITIONS = [
  "new",
  "refurbished",
  "used",
] as const satisfies readonly InventoryCondition[];

const InventorySchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  id: z.string().uuid().optional(),
  // Optional, not required: a shop that numbers nothing should not be forced to
  // invent codes. When present it is unique per shop — enforced by
  // `shop_inventory_sku_key`, whose 23505 becomes a sentence below.
  sku: z.string().trim().max(64, "Keep the item ID under 64 characters.").optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name the item.")
    .max(160, "Keep the name under 160 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters.")
    .optional(),
  brand: z.string().trim().max(80, "Keep the brand under 80 characters.").optional(),
  categoryId: z.string().uuid().optional(),
  condition: z.enum(CONDITIONS, {
    errorMap: () => ({ message: "Pick the condition this item is in." }),
  }),
  isActive: z.boolean(),
});

type InventoryWrite = AppDatabase["public"]["Tables"]["shop_inventory"]["Update"];

/**
 * `explain` renders 23505 as "that has already been recorded", which is true
 * and useless here: the only unique index on this table is the per-shop item
 * ID, and the owner needs to be told *which* field collided so they can change
 * it. Every other code falls through to the shared wording.
 */
function explainInventory(code: string | undefined, fallback: string): string {
  if (code === "23505") {
    return "You already have an item with that ID. Item IDs are unique per shop.";
  }
  return explain(code, fallback);
}

/**
 * Create or edit one stock item. `id` present means edit.
 *
 * One action rather than two because the validation is identical and the two
 * halves would drift — the create form and the edit form are the same form,
 * exactly as with `upsertService`. Quantity, threshold and price are read with
 * `bounded`/`rupeesToPaise` instead of being part of the Zod shape because
 * `z.coerce.number()` turns a missing form field into `Number(null)` — zero —
 * and a form that forgot an input would save a silently wrong count.
 */
export async function upsertInventoryItem(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = InventorySchema.safeParse({
    fixerId: formData.get("fixerId"),
    id: optionalText(formData, "id"),
    sku: optionalText(formData, "sku"),
    name: formData.get("name"),
    description: optionalText(formData, "description"),
    brand: optionalText(formData, "brand"),
    categoryId: optionalText(formData, "categoryId"),
    condition: formData.get("condition"),
    isActive: checked(formData, "isActive"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const input = parsed.data;

  const quantity = bounded(
    formData.get("quantity"),
    0,
    1000000,
    "Set the quantity on the shelf, up to 1,000,000.",
  );
  if (!quantity.ok) return FAILED(quantity.error);

  const threshold = bounded(
    formData.get("threshold"),
    0,
    1000000,
    "Set the low-stock alert in whole units, up to 1,000,000. Zero turns it off.",
  );
  if (!threshold.ok) return FAILED(threshold.error);

  let unitPrice: number | null = null;

  // Blank is a real answer here, unlike quantity: an item priced on request
  // stores null and the public panel says "Ask us" rather than "₹0.00".
  const priceRaw = formData.get("price");
  if (typeof priceRaw === "string" && priceRaw.trim() !== "") {
    unitPrice = rupeesToPaise(priceRaw);
    if (unitPrice === null) return FAILED("Enter the price in rupees, like 49.99.");
    if (unitPrice > 1000000) {
      return FAILED("Enter a price up to ₹10,000.");
    }
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your inventory.");

  const denied = await assertOwnership(supabase, user.id, input.fixerId);
  if (denied) return FAILED(denied);

  const write: InventoryWrite = {
    sku: input.sku ?? null,
    name: input.name,
    description: input.description ?? null,
    brand: input.brand ?? null,
    category_id: input.categoryId ?? null,
    condition: input.condition,
    // Null rather than 0: 0 would advertise "free" on the public page, and a
    // blank price field is the owner saying "ask us".
    unit_price: unitPrice,
    quantity: quantity.value,
    low_stock_threshold: threshold.value,
    is_active: input.isActive,
  };

  if (input.id) {
    // Scoped by `fixer_id` as well as `id`. RLS would refuse another shop's row,
    // but a policy-refused update returns zero rows and reads as success —
    // selecting the id back is what turns that into a message.
    const { data, error } = await supabase
      .from("shop_inventory")
      .update(write)
      .eq("id", input.id)
      .eq("fixer_id", input.fixerId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) return FAILED(explainInventory(error.code, "That item could not be saved."));
    if (!data) return FAILED("That item could not be found on your shop.");
  } else {
    const { error } = await supabase.from("shop_inventory").insert({
      ...write,
      fixer_id: input.fixerId,
      sort_order: await nextInventorySortOrder(supabase, input.fixerId),
    });

    if (error) return FAILED(explainInventory(error.code, "That item could not be added."));
  }

  await revalidateCatalogue(supabase, input.fixerId);

  return OK(input.id ? "Item saved." : "Item added.");
}

export async function toggleInventoryActive(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That item could not be found.");

  const active = checked(formData, "active");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your inventory.");

  const item = await readOwnedInventoryItem(supabase, user.id, id);
  if (typeof item === "string") return FAILED(item);

  const { error } = await supabase
    .from("shop_inventory")
    .update({ is_active: active })
    .eq("id", id);

  if (error) {
    return FAILED(explain(error.code, "That item could not be updated."));
  }

  await revalidateCatalogue(supabase, item.fixer_id);

  return OK(active ? "Item listed." : "Item unlisted.");
}

/**
 * Move an item one place in the list. Mirrors `reorderService` — positions are
 * rewritten as 0…n-1 rather than swapping the two stored values, because every
 * row starts on the column default of 0 and a bare swap between two zeroes
 * would change nothing at all.
 */
export async function reorderInventoryItem(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That item could not be found.");

  const direction = formData.get("direction");
  if (direction !== "up" && direction !== "down") {
    return FAILED("That item could not be moved.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your inventory.");

  const item = await readOwnedInventoryItem(supabase, user.id, id);
  if (typeof item === "string") return FAILED(item);

  const { data, error } = await supabase
    .from("shop_inventory")
    .select("id, sort_order, name")
    .eq("fixer_id", item.fixer_id)
    .returns<{ id: string; sort_order: number; name: string }[]>();

  if (error) {
    return FAILED(explain(error.code, "Your inventory could not be loaded."));
  }

  const ordered = [...(data ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  const from = ordered.findIndex((row) => row.id === id);
  if (from < 0) return FAILED("That item could not be found on your shop.");

  const to = direction === "up" ? from - 1 : from + 1;
  // Already at the end of the list. Nothing moved and nothing went wrong, so
  // this is a success with nothing to say rather than an error to explain.
  if (to < 0 || to >= ordered.length) return OK();

  const moved = ordered[from];
  const displaced = ordered[to];
  if (!moved || !displaced) return FAILED("That item could not be moved.");

  ordered[from] = displaced;
  ordered[to] = moved;

  const writes = ordered
    .map((row, position) => ({ row, position }))
    .filter((entry) => entry.row.sort_order !== entry.position)
    .map((entry) =>
      supabase
        .from("shop_inventory")
        .update({ sort_order: entry.position })
        .eq("id", entry.row.id),
    );

  const results = await Promise.all(writes);
  const failure = results.find((result) => result.error);

  if (failure?.error) {
    return FAILED(explain(failure.error.code, "That item could not be moved."));
  }

  await revalidateCatalogue(supabase, item.fixer_id);

  return OK();
}

export async function deleteInventoryItem(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const id = readId(formData, "id");
  if (!id) return FAILED("That item could not be found.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your inventory.");

  const item = await readOwnedInventoryItem(supabase, user.id, id);
  if (typeof item === "string") return FAILED(item);

  const { error } = await supabase.from("shop_inventory").delete().eq("id", id);

  if (error) {
    // Nothing references an inventory row today, but the FK on `bookings`
    // taught us the shape of this failure. If a booking ever does quote an
    // item, deleting it must not corrupt the history that names it.
    if (error.code === "23503") {
      return FAILED("This item is referenced elsewhere — unlist it instead.");
    }
    return FAILED(explain(error.code, "That item could not be deleted."));
  }

  await revalidateCatalogue(supabase, item.fixer_id);

  return OK("Item deleted.");
}

/** Where a new item lands in the list — appended, like a new service. */
async function nextInventorySortOrder(
  supabase: ServerClient,
  fixerId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("shop_inventory")
    .select("sort_order")
    .eq("fixer_id", fixerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  if (error) {
    logReadFailure("[expert] inventory sort order lookup failed", error);
  }

  return (data?.sort_order ?? -1) + 1;
}

/**
 * One stock item the caller demonstrably owns, or the sentence explaining why
 * not. The inventory analogue of `readOwnedService`.
 */
async function readOwnedInventoryItem(
  supabase: ServerClient,
  userId: string,
  id: string,
): Promise<{ id: string; fixer_id: string } | string> {
  const { data, error } = await supabase
    .from("shop_inventory")
    .select("id, fixer_id")
    .eq("id", id)
    .maybeSingle<{ id: string; fixer_id: string }>();

  if (error) return explain(error.code, "That item could not be loaded.");
  if (!data) return "That item could not be found.";

  const denied = await assertOwnership(supabase, userId, data.fixer_id);
  return denied ?? data;
}

/* ── Shop settings ────────────────────────────────────────────────────────── */

const BookingSettingsSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  acceptsBookings: z.boolean(),
  autoAccept: z.boolean(),
  payoutEmail: z
    .string()
    .trim()
    .email("That payout email does not look right.")
    .max(200, "That payout email is too long.")
    .optional(),
});

/**
 * How the diary behaves: whether it is open, how much notice it needs, how far
 * ahead it runs, and where the money is sent.
 *
 * `auto_accept` is the consequential one — it skips the quote step, so a shop
 * that turns it on has agreed to be booked without seeing the job first. That
 * is a decision for the form's copy to make plain; this only records it.
 */
export async function updateBookingSettings(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = BookingSettingsSchema.safeParse({
    fixerId: formData.get("fixerId"),
    acceptsBookings: checked(formData, "acceptsBookings"),
    autoAccept: checked(formData, "autoAccept"),
    payoutEmail: optionalText(formData, "payoutEmail"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const input = parsed.data;

  const leadHours = bounded(
    formData.get("bookingLeadHours"),
    0,
    720,
    "Set the notice you need in whole hours, up to 30 days.",
  );
  if (!leadHours.ok) return FAILED(leadHours.error);

  const horizonDays = bounded(
    formData.get("bookingHorizonDays"),
    1,
    365,
    "Open the calendar for between 1 and 365 days.",
  );
  if (!horizonDays.ok) return FAILED(horizonDays.error);

  const responseHours = bounded(
    formData.get("responseHours"),
    1,
    168,
    "Promise a response time between 1 hour and a week.",
  );
  if (!responseHours.ok) return FAILED(responseHours.error);

  const warrantyDays = bounded(
    formData.get("defaultWarrantyDays"),
    0,
    3650,
    "Set the default warranty in whole days, up to 3650.",
  );
  if (!warrantyDays.ok) return FAILED(warrantyDays.error);

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to change your booking settings.");

  const denied = await assertOwnership(supabase, user.id, input.fixerId);
  if (denied) return FAILED(denied);

  const { error } = await supabase
    .from("fixer_profiles")
    .update({
      accepts_bookings: input.acceptsBookings,
      booking_lead_hours: leadHours.value,
      booking_horizon_days: horizonDays.value,
      auto_accept: input.autoAccept,
      response_hours: responseHours.value,
      default_warranty_days: warrantyDays.value,
      payout_email: input.payoutEmail ?? null,
    })
    .eq("id", input.fixerId);

  if (error) {
    return FAILED(explain(error.code, "Those settings could not be saved."));
  }

  // The layout's header reads `accepts_bookings`, so the whole expert subtree
  // has to re-render rather than just the settings page.
  revalidatePath("/dashboard/expert", "layout");

  // `accepts_bookings` also decides whether the shop offers a "Book now" button
  // publicly and whether it appears in availability-filtered search, so the
  // customer-facing surfaces are as stale as the dashboard would be.
  const settingsSlug = await shopSlug(supabase, input.fixerId);
  revalidatePath("/discover");
  revalidatePath("/search");
  if (settingsSlug) {
    revalidatePath(`/expert/${settingsSlug}`);
    revalidatePath(`/dashboard/discover/${settingsSlug}`);
  }

  return OK("Booking settings saved.");
}

const ShopProfileSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  shopName: z
    .string()
    .trim()
    .min(2, "Add the name customers know you by.")
    .max(120, "Keep the shop name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(4000, "Keep the description under 4000 characters.")
    .optional(),
  contactPhone: z
    .string()
    .trim()
    .max(32, "That phone number looks too long.")
    .regex(/^[\d+()\s-]+$/, "Use digits, spaces and + ( ) - only.")
    .optional(),
  contactEmail: z
    .string()
    .trim()
    .email("That contact email does not look right.")
    .max(200, "That contact email is too long.")
    .optional(),
  address: z.string().trim().min(4, "Add the street address.").max(200),
  city: z.string().trim().max(120).optional(),
  postcode: z.string().trim().max(20).optional(),
});

/**
 * The public listing: name, description, how to reach the shop, where it is.
 *
 * Two fields a form might reasonably offer are **not** here, and their absence
 * is deliberate rather than an oversight. `fixer_profiles` has no `tagline` and
 * no `website` column — see `supabase/schema.sql` — so accepting either would
 * build a control that appears to work and silently discards what was typed.
 * That is the same reasoning that keeps email off `updateProfile`: a field with
 * nowhere to go belongs out of the form, not quietly dropped on the way to the
 * database. If they are wanted, they need a migration first.
 *
 * `description` writes to `bio`, which is the column the public profile page
 * and the JSON-LD both already read.
 */
export async function updateShopProfile(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = ShopProfileSchema.safeParse({
    fixerId: formData.get("fixerId"),
    shopName: formData.get("shopName"),
    description: optionalText(formData, "description"),
    contactPhone: optionalText(formData, "contactPhone"),
    contactEmail: optionalText(formData, "contactEmail"),
    address: formData.get("address"),
    city: optionalText(formData, "city"),
    postcode: optionalText(formData, "postcode"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const input = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to edit your shop profile.");

  const denied = await assertOwnership(supabase, user.id, input.fixerId);
  if (denied) return FAILED(denied);

  const latStr = formData.get("lat")?.toString() || null;
  const lngStr = formData.get("lng")?.toString() || null;

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  const { data, error } = await supabase
    .from("fixer_profiles")
    .update({
      shop_name: input.shopName,
      bio: input.description ?? null,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      address: composeAddress(input.address, input.city, input.postcode),
      lat,
      lng,
      // No `updated_at` here: the `fixer_profiles_updated_at` trigger sets it
      // to now() on every update, so writing it from the client was always
      // redundant — and it is the client's clock, which the trigger's is not.
    })
    .eq("id", input.fixerId)
    .select("slug")
    .maybeSingle<{ slug: string }>();

  if (error) {
    return FAILED(explain(error.code, "Your shop profile could not be saved."));
  }
  if (!data) return FAILED("That shop could not be found.");

  revalidatePath("/dashboard/expert", "layout");
  revalidatePath("/dashboard/expert/profile");
  // Everything above is on the public listing, so it has to re-render too.
  revalidatePath(`/expert/${data.slug}`);
  revalidatePath("/discover");

  return OK("Shop profile saved.");
}

/**
 * One address line out of three fields.
 *
 * `fixer_profiles.address` is a single free-text column that the listing and
 * the JSON-LD both render whole, so the town and postcode have to be folded
 * into it. Folding is skipped when the line already contains them, which makes
 * a resubmit idempotent — the form renders the composed value back into the
 * address field, and without this check "London" would be appended every save.
 */
function composeAddress(line: string, city?: string, postcode?: string): string {
  const parts = [line];

  for (const extra of [city, postcode]) {
    if (!extra) continue;
    if (line.toLowerCase().includes(extra.toLowerCase())) continue;
    parts.push(extra);
  }

  return parts.join(", ");
}

/* ── Private notes ────────────────────────────────────────────────────────── */

const BookingNoteSchema = z.object({
  bookingId: z.string().uuid("That booking could not be found."),
  fixerId: z.string().uuid("That shop could not be found."),
  // Empty is allowed on purpose: it is how a note is cleared, and the column
  // defaults to '' rather than null for exactly that.
  body: z.string().trim().max(4000, "Keep the note under 4000 characters."),
});

/**
 * The shop's working notes on one job — "waiting on a screen", "customer is
 * deaf, text don't ring".
 *
 * SHOP-PRIVATE. It lives in its own table because RLS is row-level: a customer
 * allowed to read their own booking can read every column of it, so no column
 * of `bookings` could ever hold this. Nothing in the customer dashboard reads
 * `booking_notes`, and nothing should ever be added that does.
 *
 * The booking is re-read to confirm it really is this shop's. The note's own
 * RLS policy checks `owns_shop(booking_notes.fixer_id)` — the id in the *note*,
 * not in the booking — so without this an owner could file a note against a
 * stranger's job by sending their own `fixerId` alongside someone else's
 * `bookingId`, and the policy would wave it through.
 */
export async function saveBookingNote(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = BookingNoteSchema.safeParse({
    bookingId: formData.get("bookingId"),
    fixerId: formData.get("fixerId"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That note could not be saved.");
  }

  const { bookingId, fixerId, body } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to save a note.");

  const denied = await assertOwnership(supabase, user.id, fixerId);
  if (denied) return FAILED(denied);

  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, fixer_id")
    .eq("id", bookingId)
    .maybeSingle<{ id: string; reference: string; fixer_id: string }>();

  if (readError) {
    return FAILED(explain(readError.code, "That booking could not be loaded."));
  }
  if (!booking) return FAILED("That booking could not be found.");
  if (booking.fixer_id !== fixerId) {
    return FAILED("That booking is not on your shop.");
  }

  const { error } = await supabase.from("booking_notes").upsert(
    {
      booking_id: bookingId,
      fixer_id: fixerId,
      body,
      updated_by: user.id,
    },
    { onConflict: "booking_id" },
  );

  if (error) {
    return FAILED(explain(error.code, "That note could not be saved."));
  }

  revalidatePath("/dashboard/expert/requests");
  revalidatePath(`/dashboard/expert/bookings/${booking.reference}`);

  return OK(body ? "Note saved." : "Note cleared.");
}

const ClientNoteSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  customerId: z.string().uuid("That client could not be found."),
  body: z
    .string()
    .trim()
    .min(1, "Write the note first.")
    .max(4000, "Keep the note under 4000 characters."),
  id: z.string().uuid().optional(),
});

/**
 * The shop's notes on a client, across every job they have ever booked.
 *
 * Owner-only by RLS, like `booking_notes`, and for the same reason. Unlike them
 * there may be several per client, so `id` decides between adding one and
 * editing one rather than the row being keyed on the relationship.
 */
export async function saveClientNote(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = ClientNoteSchema.safeParse({
    fixerId: formData.get("fixerId"),
    customerId: formData.get("customerId"),
    body: formData.get("body"),
    id: optionalText(formData, "id"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That note could not be saved.");
  }

  const { fixerId, customerId, body, id } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to save a note.");

  const denied = await assertOwnership(supabase, user.id, fixerId);
  if (denied) return FAILED(denied);

  if (id) {
    // Scoped by `fixer_id` too, so a policy-refused edit comes back as no row
    // rather than as a successful update of nothing.
    const { data, error } = await supabase
      .from("client_notes")
      .update({ body })
      .eq("id", id)
      .eq("fixer_id", fixerId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) return FAILED(explain(error.code, "That note could not be saved."));
    if (!data) return FAILED("That note could not be found.");
  } else {
    const { error } = await supabase.from("client_notes").insert({
      fixer_id: fixerId,
      customer_id: customerId,
      body,
      created_by: user.id,
    });

    if (error) return FAILED(explain(error.code, "That note could not be saved."));
  }

  revalidatePath("/dashboard/expert/clients");
  revalidatePath(`/dashboard/expert/clients/${customerId}`);

  return OK("Note saved.");
}

/* ── Money ────────────────────────────────────────────────────────────────── */

const PayoutSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  amount: z.string().trim().min(1, "Enter how much to withdraw."),
});

/**
 * Ask for a withdrawal of released earnings.
 *
 * The ceiling is `getExpertStats().availableForPayoutPence` — money that is
 * earned, out of its warranty hold, and not already committed to another
 * payout. Recomputed here rather than trusted from the form: the figure the
 * page rendered may be minutes old, and a warranty window closing or another
 * request landing in between would move it.
 *
 * Worth knowing before debugging a refusal: `payouts` has no insert policy and
 * `insert` is revoked from `authenticated` in
 * `supabase/policies-marketplace.sql` — every row is written by the payout job
 * running as service-role, because a client that could write here could credit
 * itself. So this action validates fully and then hands over, and a `42501`
 * means the request needs the finance side rather than that the caller did
 * something wrong.
 */
export async function requestPayout(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = PayoutSchema.safeParse({
    fixerId: formData.get("fixerId"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { fixerId } = parsed.data;
  const pence = rupeesToPaise(parsed.data.amount);
  if (pence === null) return FAILED("Enter the amount in rupees, like 250.00.");
  if (pence <= 0) return FAILED("Enter an amount above zero.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to request a payout.");

  const denied = await assertOwnership(supabase, user.id, fixerId);
  if (denied) return FAILED(denied);

  const stats = await getExpertStats(fixerId);

  if (stats.availableForPayoutPence <= 0) {
    return FAILED("You have nothing available to withdraw yet.");
  }
  if (pence > stats.availableForPayoutPence) {
    return FAILED(
      `You can withdraw up to ${formatMoney(stats.availableForPayoutPence)} right now.`,
    );
  }

  const { error } = await supabase.from("payouts").insert({
    fixer_id: fixerId,
    status: "scheduled",
    amount: pence,
  });

  if (error) {
    if (error.code === "42501") {
      return FAILED(
        "Payouts are released by our finance team — we could not file that request automatically.",
      );
    }
    return FAILED(explain(error.code, "That payout could not be requested."));
  }

  revalidatePath("/dashboard/expert/earnings");
  revalidatePath("/dashboard/expert");

  return OK(`${formatMoney(pence)} requested.`);
}

const QuoteSchema = z.object({
  bookingId: z.string().uuid("That booking could not be found."),
  amount: z.string().trim().min(1, "Enter the quote."),
  note: z.string().trim().max(2000, "Keep the note under 2000 characters.").optional(),
});

/**
 * Answer a request with a price.
 *
 * Two things at once — the number and the status — which is why this exists
 * rather than the requests page calling `transitionBooking` with a quote field.
 * The legality of the move is still decided by `canTransition`, asked here with
 * the same arguments that action would ask it with, so the two can never
 * disagree about whether a shop may quote a job.
 *
 * `confirmed` is not reachable from here: accepting a quote is the customer's
 * move, and a shop that could jump straight to it would be holding a slot
 * against a price nobody had agreed.
 */
export async function sendQuote(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = QuoteSchema.safeParse({
    bookingId: formData.get("bookingId"),
    amount: formData.get("amount"),
    note: optionalText(formData, "note"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { bookingId, note } = parsed.data;
  const pence = rupeesToPaise(parsed.data.amount);
  if (pence === null) return FAILED("Enter the quote in rupees, like 49.99.");
  if (pence <= 0) return FAILED("Enter a quote above zero.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to send a quote.");

  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, status, fixer_id")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: BookingStatus;
      fixer_id: string;
    }>();

  if (readError) {
    return FAILED(explain(readError.code, "That booking could not be loaded."));
  }
  if (!booking) return FAILED("That booking could not be found.");

  const denied = await assertOwnership(supabase, user.id, booking.fixer_id);
  if (denied) return FAILED(denied);

  const verdict = canTransition(booking.status, "accepted", "shop");
  if (!verdict.ok) return FAILED(verdict.reason);

  const now = new Date().toISOString();

  const { error: writeError } = await supabase
    .from("bookings")
    .update({
      quoted_amount: pence,
      status: "accepted",
      responded_at: now,
    })
    .eq("id", bookingId);

  if (writeError) {
    return FAILED(explain(writeError.code, "That quote could not be sent."));
  }

  // Append-only audit. A failure here must not fail the quote itself — the
  // price and the status have already committed, and losing the timeline entry
  // is far less damage than telling the shop its quote did not send.
  const { error: eventError } = await supabase.from("booking_events").insert({
    booking_id: bookingId,
    actor_id: user.id,
    actor_role: "shop",
    from_status: booking.status,
    to_status: "accepted",
    note: note ?? null,
    metadata: { kind: "quote_sent", amount: pence },
  });

  if (eventError) {
    logReadFailure("[expert] quote event log failed", eventError);
  }

  revalidatePath("/dashboard/expert");
  revalidatePath("/dashboard/expert/requests");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);

  void notifyQuoteSent(bookingId).catch((error) =>
    console.error("[notifications] quote failed", error),
  );

  return OK(`Quote for ${formatMoney(pence)} sent.`);
}

/* ── Bills and the 5% rebate ──────────────────────────────────────────────── */

const BillSchema = z.object({
  bookingId: z.string().uuid("That booking could not be found."),
  amount: z.string().trim().min(1, "Enter what the job came to."),
  storagePath: z.string().trim().max(400).optional(),
});

/**
 * File the bill for a finished job.
 *
 * Two things at once, and they belong together:
 *
 *   1. **It sets `bookings.final_amount`.** Nothing in the app wrote that column
 *      before this action existed — every earnings figure fell back to the quote,
 *      so a job that came in over or under its estimate was reported at the
 *      estimate. The bill is what the work actually came to, so the bill *is* the
 *      final amount rather than a second number sitting beside it.
 *   2. **It queues the 5% rebate for review.** The row lands `pending`. Nothing is
 *      credited here — approval happens in the admin console, because a shop that
 *      could approve its own bill could write itself a cheque.
 *
 * Filed after completion rather than as part of it. That is what the shop
 * actually does: finish the work, then total it up.
 */
export async function submitBill(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = BillSchema.safeParse({
    bookingId: formData.get("bookingId"),
    amount: formData.get("amount"),
    storagePath: formData.get("storagePath") ?? undefined,
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the amount and try again.");
  }

  const minor = rupeesToPaise(parsed.data.amount);
  if (minor === null) {
    return FAILED("Enter the amount in rupees, like 1200 or 1200.50.");
  }
  if (minor <= 0) return FAILED("Enter an amount above zero.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to file a bill.");

  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, status, fixer_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle<{ id: string; reference: string; status: BookingStatus; fixer_id: string }>();

  if (readError) return FAILED(explain(readError.code, "That booking could not be loaded."));
  if (!booking) return FAILED("That booking could not be found.");

  const denied = await assertOwnership(supabase, user.id, booking.fixer_id);
  if (denied) return FAILED(denied);

  // The RLS insert policy enforces this too. Checked here so the refusal is a
  // sentence rather than an opaque 42501 — the shop needs to know the job has to
  // be finished first, not that permission was denied.
  if (!["completed", "closed", "disputed"].includes(booking.status)) {
    return FAILED("Finish the job first — a bill can only be filed on a completed repair.");
  }

  /*
   * `final_amount` before the bill row, deliberately.
   *
   * The rebate is capped against `final_amount` at approval time, so writing the
   * bill row first would leave a window where a reviewer could approve against a
   * stale or absent amount and pay out the wrong figure. This order means the cap
   * always has something to cap against.
   */
  const { error: amountError } = await supabase
    .from("bookings")
    .update({ final_amount: minor })
    .eq("id", booking.id);

  if (amountError) {
    return FAILED(explain(amountError.code, "That amount could not be saved."));
  }

  const { error: billError } = await supabase.from("shop_bills").insert({
    booking_id: booking.id,
    fixer_id: booking.fixer_id,
    amount_minor: minor,
    storage_path: parsed.data.storagePath || null,
  });

  if (billError) {
    // One bill per booking, by unique index. A second attempt is almost always a
    // double-submit rather than fraud, so it is worded as already-done.
    if (billError.code === "23505") {
      return FAILED("A bill has already been filed for this job.");
    }
    return FAILED(explain(billError.code, "That bill could not be filed."));
  }

  revalidatePath("/dashboard/expert/earnings");
  revalidatePath("/dashboard/expert/requests");
  revalidatePath(`/dashboard/expert/requests/${booking.reference}`);

  return OK(
    `Bill for ${formatMoney(minor)} filed. Your ${formatMoney(Math.floor(minor * 0.05))} ` +
      "rebate is credited once we have checked it.",
  );
}
