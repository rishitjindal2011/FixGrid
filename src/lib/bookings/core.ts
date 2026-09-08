import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { coreFail, coreOk, pgErrorCode, pgStatus, type CoreFailure, type CoreResult } from "@/lib/api/result";
import { canTransition, type TransitionActor } from "@/lib/bookings/machine";
import { notifyBookingCreated, notifyBookingTransition } from "@/lib/notifications/booking";
import { createClient } from "@/lib/supabase/server";
import { chargeToPlatform, creditFromPlatform } from "@/lib/wallet/server";
import type { AppDatabase } from "@/lib/types/supabase";
import type { BookingStatus } from "@/lib/types/marketplace";

/**
 * The booking lifecycle writes, with no opinion about how they were called.
 *
 * This file exists because the same three operations now have two front doors.
 * `@/lib/bookings/actions` is FormData in, UI copy out, invoked as RPC by a
 * form; `src/app/api/v1/bookings/*` is JSON in, an HTTP status out. Duplicating
 * the logic behind them would mean the money ordering in `createBookingCore` —
 * charge, insert, refund on failure, consume allowance — existing twice, and the
 * second copy drifting the first time only one of them is fixed.
 *
 * So the logic lives here, once, and returns a `CoreResult`: a discriminated
 * refusal carrying a status, a slug and a sentence. Each caller takes the parts
 * it can use. See `@/lib/api/result` for why it returns rather than throws.
 *
 * What is NOT here: parsing. The schemas are exported from this file but applied
 * by the caller, because the two callers receive different things — `FormData`
 * where every value is a string, and JSON where they are typed. Validating at
 * the edge and passing a parsed object inward is what lets one schema serve both.
 *
 * The three conventions from `actions.ts` still hold: return never throw, money
 * is integer paise, and a missing table produces a diagnosable sentence rather
 * than a stack trace.
 */

/* ── Shared helpers (also imported by actions.ts) ──────────────────────────── */

/**
 * Postgres error codes into sentences.
 *
 * `23P01` is the exclusion constraint on `bookings` — two people raced for one
 * slot and this one lost. It is the single most likely write failure in the
 * whole system and deserves wording that tells the person what to do next.
 * `42P01` means the migration has not been run; saying so beats "relation does
 * not exist" reaching a customer.
 */
export function explain(code: string | undefined, fallback: string): string {
  switch (code) {
    case "23P01":
      return "That slot was just taken — pick another time.";
    case "42501":
      return "You do not have permission to do that.";
    case "23505":
      return "That has already been recorded.";
    case "23503":
      return "That booking or shop no longer exists.";
    case "42P01":
      return "The booking system is not set up on this database yet.";
    default:
      return fallback;
  }
}

/** A Postgres error as a refusal: status, slug and sentence from the one code. */
function pgFail(error: { code?: string }, fallback: string): CoreFailure {
  return coreFail(
    pgStatus(error.code),
    pgErrorCode(error.code),
    explain(error.code, fallback),
  );
}

/** The signed-in user, or null. Every core starts here. */
export async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Which side of a booking this user is on.
 *
 * Ownership is read from `fixer_profiles.owner_id`, matching the `owns_shop()`
 * helper the RLS policies use. It previously required an approved `shop_claims`
 * row, which disagreed with the policies: a shop created through /join owns
 * itself from the first second but its claim is still pending, so this returned
 * null and the shop could not accept the very bookings RLS would have let it
 * write.
 *
 * Returns null when the caller is neither party, which the callers turn into a
 * refusal rather than a 404: RLS will already have hidden the row if they had no
 * business seeing it.
 */
export async function resolveActor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  booking: { customer_id: string; fixer_id: string },
): Promise<TransitionActor | null> {
  if (booking.customer_id === userId) return "customer";

  const { data } = await supabase
    .from("fixer_profiles")
    .select("id")
    .eq("id", booking.fixer_id)
    .eq("owner_id", userId)
    .maybeSingle();

  return data ? "shop" : null;
}

/**
 * "49.99" → 4999. Rejects anything with more than two decimal places rather
 * than rounding it, because silently turning ₹49.999 into ₹50.00 is the kind of
 * bug that only surfaces in an invoice dispute.
 */
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim().replace(/^₹/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "confirmed",
  "in_progress",
  "completed",
  "closed",
  "declined",
  "cancelled_customer",
  "cancelled_shop",
  "no_show",
  "expired",
  "disputed",
] as const satisfies readonly BookingStatus[];

/**
 * Terminal states where the customer gets their platform fee back.
 *
 * All three are "the repair is not happening, and it was not the customer's
 * doing". `cancelled_customer` is absent on purpose — see the note at the refund
 * in `transitionBookingCore`.
 */
export const REFUND_FEE_ON: readonly BookingStatus[] = [
  "declined",
  "expired",
  "cancelled_shop",
];

/* ── Addressing a booking ─────────────────────────────────────────────────── */

/**
 * How a caller names the booking it means.
 *
 * The two front doors identify a booking differently and both are right for
 * where they sit. A form already holds the row it rendered, so it posts the
 * `id`. A URL is read and typed by people — `/dashboard/bookings/FIX-7Q2M4X` —
 * so the API addresses bookings by `reference`, which is unique, stable and not
 * a UUID a customer would ever transcribe.
 *
 * Accepting either here rather than resolving reference → id in the handler
 * saves a round-trip and, more importantly, keeps "no such booking" as one
 * answer produced in one place instead of two lookups that can disagree.
 */
export type BookingLocator = { bookingId: string } | { reference: string };

/**
 * References are generated uppercase (`FIX-7Q2M4X`) but arrive from a URL a
 * person may have typed or a mail client may have lower-cased. Normalising here
 * rather than using `ilike` keeps the lookup on the unique btree index.
 */
export function normaliseReference(reference: string): string {
  return reference.trim().toUpperCase();
}

/* ── Schemas (exported: parsed by the caller, defined here) ────────────────── */

/**
 * A JSON body may send `null` where a form simply omits the field, so the
 * optional fields below are `.nullish()` rather than `.optional()`. Every
 * consumer already coalesces with `|| null` or a truthiness check, so the two
 * are the same thing downstream — this only stops a well-formed `{"reason":null}`
 * being rejected as a type error.
 */
const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const TransitionFieldsSchema = z.object({
  to: z.enum(BOOKING_STATUSES),
  reason: optionalText(2000),
  /** Rupees, from the quote form or a JSON body. Only on `requested → accepted`. */
  quote: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .nullish(),
});

/**
 * The form's shape: the same fields, plus the id the form already knows.
 *
 * Merged with `bookingId` first so that key order — and therefore which issue
 * `issues[0]` is — matches what the form action reported before this split.
 */
export const TransitionSchema = z
  .object({ bookingId: z.string().uuid("That booking could not be found.") })
  .merge(TransitionFieldsSchema);

export type TransitionInput = z.infer<typeof TransitionFieldsSchema>;

export const CreateBookingSchema = z.object({
  fixerId: z.string().uuid("Pick a shop."),
  serviceId: z.union([z.string().uuid(), z.literal("")]).nullish(),
  deliveryMode: z.enum(["in_shop", "home_visit", "pickup_drop"]),
  slotStart: z.string().min(1, "Pick a time."),
  slotEnd: z.string().min(1, "Pick a time."),
  deviceDetails: z.string().trim().min(1, "Tell the shop what needs fixing.").max(2000),
  customerNotes: optionalText(2000),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  addressCity: optionalText(120),
  addressPostcode: optionalText(20),
  // An unchecked checkbox submits nothing at all, so absence is false rather
  // than invalid. Only ever true when the customer typed a new address.
  saveAddress: z.coerce.boolean().nullish(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

/* ── Transition ───────────────────────────────────────────────────────────── */

/** What a completed transition tells its caller. */
export interface TransitionedBooking {
  id: string;
  reference: string;
  from: BookingStatus;
  to: BookingStatus;
}

/** The columns a transition needs to decide and to settle up afterwards. */
const TRANSITION_COLUMNS =
  "id, reference, status, customer_id, fixer_id, warranty_days, quoted_amount, platform_fee";

interface TransitionRow {
  id: string;
  reference: string;
  status: BookingStatus;
  customer_id: string;
  fixer_id: string;
  warranty_days: number;
  quoted_amount: number | null;
  /** Read so a refusal can hand the fee back. See the refund below. */
  platform_fee: number;
}

/**
 * The one path every status change goes through.
 *
 * Deliberately general rather than one function per transition: the legality
 * rules already live in `machine.ts`, and duplicating them across a dozen thin
 * wrappers is how the two copies drift. `canTransition` is asked again here even
 * though both dashboards already asked it to decide which buttons to draw — the
 * UI check is a courtesy, this one is the enforcement, and neither replaces RLS.
 *
 * Machine refusals answer 409 rather than 403. The request is well-formed and the
 * caller may well be allowed to make it later or from another state; what is
 * wrong is the booking's current state, which is what 409 means. The reason
 * string says which.
 */
export async function transitionBookingCore(
  locator: BookingLocator,
  fields: TransitionInput,
): Promise<CoreResult<TransitionedBooking>> {
  const { to, reason, quote } = fields;
  const { supabase, user } = await currentUser();
  if (!user) {
    return coreFail(401, "unauthenticated", "Sign in to update this booking.");
  }

  const select = supabase.from("bookings").select(TRANSITION_COLUMNS);

  const { data: booking, error: readError } = await ("bookingId" in locator
    ? select.eq("id", locator.bookingId)
    : select.eq("reference", normaliseReference(locator.reference))
  ).maybeSingle<TransitionRow>();

  if (readError) return pgFail(readError, "That booking could not be loaded.");
  if (!booking) {
    return coreFail(404, "not_found", "That booking could not be found.");
  }

  const actor = await resolveActor(supabase, user.id, booking);
  if (!actor) {
    return coreFail(403, "forbidden", "You do not have permission to update this booking.");
  }

  const verdict = canTransition(booking.status, to, actor);
  if (!verdict.ok) {
    return coreFail(
      409,
      "illegal_transition",
      verdict.reason ?? "That is not something you can do right now.",
    );
  }

  // Stamp the transition's own timestamp column. The trigger in the migration
  // also does this; setting it here keeps the returned row correct for the
  // revalidated render rather than one request behind.
  //
  // Typed as the table's own Update shape rather than Record<string, unknown>:
  // postgrest rejects an open-ended record on a typed client, and this way a
  // typo in a column name is caught here instead of at runtime.
  const now = new Date().toISOString();
  const patch: AppDatabase["public"]["Tables"]["bookings"]["Update"] = { status: to };

  if (to === "accepted") patch.responded_at = now;
  if (to === "confirmed") patch.confirmed_at = now;
  if (to === "in_progress") patch.started_at = now;
  if (to === "closed") patch.closed_at = now;
  if (to === "declined") patch.responded_at = now;

  if (to === "completed") {
    patch.completed_at = now;
    // The warranty window opens at completion, so it can only be computed here.
    const days = booking.warranty_days ?? 0;
    patch.warranty_expires_at = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  if (to === "cancelled_customer" || to === "cancelled_shop" || to === "no_show") {
    patch.cancelled_at = now;
    patch.cancelled_by = user.id;
    if (reason) patch.cancellation_reason = reason;
  }

  if (quote) {
    const paise = rupeesToPaise(quote);
    if (paise === null) {
      return coreFail(
        422,
        "invalid_quote",
        "Enter the quote as an amount in rupees, like 49.99.",
      );
    }
    patch.quoted_amount = paise;
  }

  const { error: writeError } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", booking.id);

  if (writeError) return pgFail(writeError, "That change could not be saved.");

  // Append-only audit. A failure here must not fail the transition itself —
  // the status change is the thing that matters and it has already committed.
  const { error: eventError } = await supabase.from("booking_events").insert({
    booking_id: booking.id,
    actor_id: user.id,
    actor_role: actor,
    from_status: booking.status,
    to_status: to,
    note: reason ?? null,
  });

  if (eventError) {
    console.error("[bookings] event log failed", eventError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);
  revalidatePath("/dashboard/expert");
  revalidatePath("/dashboard/expert/requests");

  void notifyBookingTransition({
    bookingId: booking.id,
    from: booking.status,
    to,
    actor,
  }).catch((error) => console.error("[notifications] transition failed", error));

  /*
   * Give the platform fee back when the repair is never going to happen.
   *
   * The customer pays the fee the moment they request a booking, before anyone has
   * agreed to anything. If the shop then declines, or nobody answers and cron
   * expires it, or the shop cancels — the customer has paid us for a repair they
   * are not getting. That is not a fee, it is a charge for nothing.
   *
   * Deliberately NOT refunded on `cancelled_customer`. Somebody withdrawing their
   * own request is the one case where the fee bought what it was for: the shop was
   * engaged and the slot was held against other customers.
   *
   * Runs after the status has committed, and a failure here does not fail the
   * transition. The decline is the thing that had to happen; an unrefunded fee is
   * recoverable from this log line, whereas a booking stuck in its old state
   * because a refund failed is not.
   */
  if (REFUND_FEE_ON.includes(to) && booking.platform_fee > 0) {
    const refund = await creditFromPlatform({
      kind: "refund",
      amountMinor: booking.platform_fee,
      to: { kind: "user", ownerId: booking.customer_id },
      bookingId: booking.id,
      memo: `Booking fee returned — ${booking.reference} ${to}`,
    });

    if (!refund.ok) {
      console.error("[bookings] FEE REFUND FAILED — needs manual correction", {
        reference: booking.reference,
        customerId: booking.customer_id,
        amountMinor: booking.platform_fee,
        to,
        reason: refund.error,
      });
    }
  }

  return coreOk({
    id: booking.id,
    reference: booking.reference,
    from: booking.status,
    to,
  });
}

/* ── Cancel ───────────────────────────────────────────────────────────────── */

/**
 * Cancel, choosing the right terminal status for whoever is asking.
 *
 * The actor is resolved here and again inside `transitionBookingCore`, which is
 * one redundant read of `fixer_profiles`. Kept deliberately: this side has to
 * know which of the two cancelled statuses to aim at *before* it can ask whether
 * that transition is legal, and the alternative — a `to` computed by the caller —
 * would let a shop post `cancelled_customer` and blame the customer for it.
 */
export async function cancelBookingCore(
  locator: BookingLocator,
  reason?: string | null,
): Promise<CoreResult<TransitionedBooking>> {
  const { supabase, user } = await currentUser();
  if (!user) {
    return coreFail(401, "unauthenticated", "Sign in to cancel this booking.");
  }

  const select = supabase.from("bookings").select("customer_id, fixer_id");

  const { data: booking } = await ("bookingId" in locator
    ? select.eq("id", locator.bookingId)
    : select.eq("reference", normaliseReference(locator.reference))
  ).maybeSingle<{ customer_id: string; fixer_id: string }>();

  if (!booking) {
    return coreFail(404, "not_found", "That booking could not be found.");
  }

  const actor = await resolveActor(supabase, user.id, booking);
  if (!actor) {
    return coreFail(403, "forbidden", "You do not have permission to cancel this booking.");
  }

  return transitionBookingCore(locator, {
    to: actor === "shop" ? "cancelled_shop" : "cancelled_customer",
    reason: reason ?? null,
    quote: null,
  });
}

/* ── Create ───────────────────────────────────────────────────────────────── */

/**
 * What the insert gave back. Nullable because `maybeSingle` is: an insert that
 * commits but whose `select` returns nothing leaves the booking made and this
 * caller unable to name it, which is a success with less to say rather than a
 * failure.
 */
export interface CreatedBooking {
  id: string | null;
  reference: string | null;
}

/**
 * Raise a new request.
 *
 * `reference` is generated by a database trigger and must never be sent from
 * here — the trigger owns collision retries, and a client-supplied reference
 * would defeat them.
 *
 * The ordering through the middle of this function is load-bearing and is
 * explained inline at each step: resolve the fee, read the entitlement, take the
 * money, insert, refund if the insert failed, then spend the plan's allowance.
 * Every one of those is placed so that the *recoverable* failure is the one that
 * can happen.
 */
export async function createBookingCore(
  input: CreateBookingInput,
): Promise<CoreResult<CreatedBooking>> {
  const { supabase, user } = await currentUser();
  if (!user) return coreFail(401, "unauthenticated", "Sign in to book a repair.");

  const start = new Date(input.slotStart);
  const end = new Date(input.slotEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return coreFail(422, "invalid_slot", "That time slot is not valid — pick another.");
  }
  if (start.getTime() < Date.now()) {
    return coreFail(422, "slot_in_past", "That slot is in the past — pick another time.");
  }

  /*
   * One read, two answers, both off the same row.
   *
   * `response_hours` sets how long the shop has to reply before the request
   * expires. `owner_id` decides whether the request is legal at all: the
   * `customer requests booking` policy carries `not owns_shop(fixer_id)`,
   * because a shop owner booking their own shop would corrupt its earnings
   * figures and hand them a self-reviewable completed job.
   */
  const { data: shop } = await supabase
    .from("fixer_profiles")
    .select("response_hours, owner_id")
    .eq("id", input.fixerId)
    .maybeSingle<{ response_hours: number; owner_id: string | null }>();

  // Checked here as well as in the policy so the refusal explains itself.
  // Reaching the policy returns 42501, which `explain` can only render as a bare
  // "you do not have permission" — on a form that looked ready to submit.
  if (shop?.owner_id === user.id) {
    return coreFail(
      403,
      "own_shop",
      "This is your own shop, so you cannot book a repair with it. " +
        "Customer requests arrive in your shop dashboard under Requests.",
    );
  }

  const responseHours = shop?.response_hours ?? 24;
  const expiresAt = new Date(Date.now() + responseHours * 60 * 60 * 1000).toISOString();

  /*
   * The platform fee, resolved and then frozen onto the row.
   *
   * `resolve_booking_fee` owns the fallback chain (service category → shop's own
   * category → ₹50). Snapshotting the result means repricing a category later
   * cannot rewrite this invoice — the same reasoning `billing.ts` applies to its
   * price snapshot.
   *
   * A failure here is not fatal. Falling back to a zero fee books the repair and
   * costs us the fee; refusing the booking costs the customer their repair and
   * the shop the job. The first is recoverable from the logs, so it is the one to
   * choose — but it is logged loudly, because a silent zero-fee booking is
   * revenue quietly going missing.
   */
  const { data: feeRow, error: feeError } = await supabase
    .rpc("resolve_booking_fee", {
      p_fixer_id: input.fixerId,
      p_service_id: input.serviceId || null,
    })
    .maybeSingle<{ category_id: string | null; fee_minor: number }>();

  if (feeError) {
    console.error("[bookings] fee resolution failed — booking at zero fee", {
      fixerId: input.fixerId,
      code: feeError.code,
      message: feeError.message,
    });
  }

  const feeMinor = Math.max(0, feeRow?.fee_minor ?? 0);
  const categoryId = feeRow?.category_id ?? null;

  /*
   * What the customer's plan covers.
   *
   * `my_entitlement()` resolves the plan actually in force — a lapsed period falls
   * back to `free` rather than to its expired tier — and says whether this next
   * booking's fee is waived. Read here rather than trusted from the form for the
   * obvious reason: the client would otherwise be asserting its own discount.
   *
   * A failure resolves to "no plan", which charges the fee. That is the safe
   * direction: undercharging a subscriber is a refund, overcharging a free user is
   * a complaint, and charging a subscriber we could not verify is a refund too —
   * but silently waiving fees because a read failed is revenue going missing with
   * no trace.
   */
  const { data: entitlement, error: planError } = await supabase
    .rpc("my_entitlement")
    .maybeSingle<{
      plan_code: string;
      plan_name: string;
      priority: boolean;
      fee_waived: boolean;
      bookings_used: number;
      bookings_included: number | null;
    }>();

  if (planError) {
    console.error("[bookings] entitlement read failed — charging the fee", {
      code: planError.code,
      message: planError.message,
    });
  }

  const feeWaived = entitlement?.fee_waived === true;
  const priority = entitlement?.priority === true;

  // The fee actually charged and snapshotted. A waived booking records zero, so
  // the invoice tells the truth about what was taken rather than showing a charge
  // that never happened.
  const chargeableFeeMinor = feeWaived ? 0 : feeMinor;

  const needsAddress =
    input.deliveryMode === "home_visit" || input.deliveryMode === "pickup_drop";
  if (needsAddress && !input.addressLine1) {
    return coreFail(422, "address_required", "Add the address the shop should come to.");
  }

  /*
   * Take the fee before the booking exists, not after.
   *
   * Ordered this way because the two failure modes are not equally bad. Charging
   * first and failing to insert leaves a fee with no booking, which is visible in
   * the customer's own statement and refundable. Inserting first and failing to
   * charge leaves a live booking the shop will work on for free, which nobody
   * notices until the earnings figures are wrong. So the recoverable direction
   * goes first, and the refund below covers it.
   *
   * A refused charge is a 402: the request was correct and the money was not
   * there. Nothing about the payload would fix it.
   */
  if (chargeableFeeMinor > 0) {
    const charge = await chargeToPlatform({
      kind: "fee",
      amountMinor: chargeableFeeMinor,
      from: { kind: "user", ownerId: user.id },
      memo: "Booking platform fee",
      fallbackError: "That request could not be sent — the fee could not be taken.",
    });

    if (!charge.ok) return coreFail(402, "fee_charge_failed", charge.error);
  }

  // PostgREST serialises a tstzrange as its literal text form. `[start,end)` —
  // half-open, so a job ending at 10:00 does not collide with one starting then.
  const slot = `[${start.toISOString()},${end.toISOString()})`;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      customer_id: user.id,
      fixer_id: input.fixerId,
      service_id: input.serviceId || null,
      category_id: categoryId,
      platform_fee: chargeableFeeMinor,
      priority,
      delivery_mode: input.deliveryMode,
      status: "requested",
      slot,
      expires_at: expiresAt,
      device_details: input.deviceDetails,
      customer_notes: input.customerNotes || null,
      address_line1: input.addressLine1 || null,
      address_line2: input.addressLine2 || null,
      address_city: input.addressCity || null,
      address_postcode: input.addressPostcode || null,
    })
    .select("id, reference")
    .maybeSingle<{ id: string; reference: string }>();

  if (error) {
    // Logged as well as returned. `explain` deliberately flattens several causes
    // into one sentence for the customer, but 42501 alone can mean a policy
    // refusal or a missing table grant, and neither is distinguishable from the
    // UI. Without this the only record of a failed booking is the sentence the
    // customer read and dismissed.
    console.error("[bookings] create failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    /*
     * Give the fee back. The customer is not paying for a booking that does not
     * exist.
     *
     * If this refund itself fails there is nothing further to try from here, so
     * it is logged with the amount and the person's id — enough for an operator
     * to post the correction by hand from the admin console.
     */
    if (chargeableFeeMinor > 0) {
      const refund = await creditFromPlatform({
        kind: "refund",
        amountMinor: chargeableFeeMinor,
        to: { kind: "user", ownerId: user.id },
        memo: "Booking fee returned — request could not be sent",
      });

      if (!refund.ok) {
        console.error("[bookings] ORPHANED FEE — refund failed, needs manual correction", {
          userId: user.id,
          amountMinor: chargeableFeeMinor,
          reason: refund.error,
        });
      }
    }

    return pgFail(error, "That request could not be sent.");
  }

  /*
   * Save the address for next time, if they asked.
   *
   * After the booking, never before, and the result is deliberately ignored: the
   * booking is the thing they came to do, and it already carries its own address
   * snapshot. Failing the whole request because a convenience copy could not be
   * filed would be the wrong trade — they would see "that request could not be
   * sent" for a request that was.
   */
  if (needsAddress && input.saveAddress && input.addressLine1) {
    const { error: saveError } = await supabase.from("user_addresses").insert({
      user_id: user.id,
      line1: input.addressLine1,
      line2: input.addressLine2 || null,
      city: input.addressCity || null,
      postcode: input.addressPostcode || null,
    });

    if (saveError) {
      console.error("[bookings] address save failed", {
        code: saveError.code,
        message: saveError.message,
      });
    } else {
      revalidatePath("/dashboard/settings/addresses");
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");

  /*
   * Spend the included booking.
   *
   * After the insert, never before: an allowance consumed by a booking that then
   * failed to save is one the customer paid for and did not get, and unlike a fee
   * there is nothing to refund — only a counter to walk back.
   *
   * If this fails the customer has had a free booking that went uncounted, which
   * costs us one fee and is visible in the log. The reverse ordering would cost
   * them a booking they had already paid for, which they would have to notice and
   * complain about. The cheap failure goes second.
   */
  if (feeWaived) {
    const { data: spent, error: spendError } = await supabase.rpc(
      "consume_booking_allowance",
    );

    if (spendError || spent === false) {
      console.error("[bookings] plan allowance not consumed — booking was free", {
        userId: user.id,
        plan: entitlement?.plan_code,
        reference: data?.reference,
        reason: spendError?.message ?? "the function reported nothing to spend",
      });
    } else {
      revalidatePath("/dashboard/plan");
    }
  }

  if (data?.id) {
    void notifyBookingCreated(data.id).catch((error) =>
      console.error("[notifications] booking created failed", error),
    );
  }

  return coreOk({ id: data?.id ?? null, reference: data?.reference ?? null });
}

