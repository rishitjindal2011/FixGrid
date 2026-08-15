"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canTransition, type TransitionActor } from "@/lib/bookings/machine";
import type { BookingActionState, SavedExpertState } from "@/lib/bookings/state";
import {
  notifyBookingCreated,
  notifyBookingTransition,
  notifyDisputeOpened,
  notifyNewMessage,
  notifyRescheduleRequested,
} from "@/lib/notifications/booking";
import { createClient } from "@/lib/supabase/server";
import type { AppDatabase } from "@/lib/types/supabase";
import type { BookingStatus, DisputeResolution } from "@/lib/types/marketplace";

/**
 * Every write the two dashboards perform.
 *
 * The RLS policies in `supabase/policies-marketplace.sql` are the real
 * enforcement — a customer may only move their own booking, a shop only its
 * own jobs. The checks here exist to turn database errors into sentences a
 * person can act on, not to replace them. Anything reaching the database
 * without a session is rejected there regardless of what this file does.
 *
 * Three conventions hold throughout:
 *
 *   1. **Return, never throw.** Every action resolves to a `BookingActionState`.
 *      A thrown error inside a form action surfaces as an unhandled rejection
 *      and loses the message the person needed to read.
 *   2. **Money arrives in rupees from a form and is stored as integer paise.**
 *      The conversion happens once, here, in `rupeesToPaise`.
 *   3. **The migration may not have been run.** A missing table returns a
 *      diagnosable sentence rather than a stack trace.
 */

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
 * `23P01` is the exclusion constraint on `bookings` — two people raced for one
 * slot and this one lost. It is the single most likely write failure in the
 * whole system and deserves wording that tells the person what to do next.
 * `42P01` means the migration has not been run; saying so beats "relation does
 * not exist" reaching a customer.
 */
function explain(code: string | undefined, fallback: string): string {
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

/** The signed-in user, or null. Every action starts here. */
async function currentUser() {
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
async function resolveActor(
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

const BOOKING_STATUSES = [
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

/* ── Booking lifecycle ────────────────────────────────────────────────────── */

const TransitionSchema = z.object({
  bookingId: z.string().uuid("That booking could not be found."),
  to: z.enum(BOOKING_STATUSES),
  reason: z.string().trim().max(2000).optional(),
  /** Rupees, from the quote form. Only meaningful on `requested → accepted`. */
  quote: z.string().trim().optional(),
});

/**
 * The one action every status change goes through.
 *
 * Deliberately general rather than one action per transition: the legality rules
 * already live in `machine.ts`, and duplicating them across a dozen thin
 * wrappers is how the two copies drift. The wrappers below exist only where the
 * *wording* differs, and they all delegate here.
 */
export async function transitionBooking(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = TransitionSchema.safeParse({
    bookingId: formData.get("bookingId"),
    to: formData.get("to"),
    reason: formData.get("reason") ?? undefined,
    quote: formData.get("quote") ?? undefined,
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { bookingId, to, reason, quote } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to update this booking.");

  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, status, customer_id, fixer_id, warranty_days, quoted_amount")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: BookingStatus;
      customer_id: string;
      fixer_id: string;
      warranty_days: number;
      quoted_amount: number | null;
    }>();

  if (readError) return FAILED(explain(readError.code, "That booking could not be loaded."));
  if (!booking) return FAILED("That booking could not be found.");

  const actor = await resolveActor(supabase, user.id, booking);
  if (!actor) return FAILED("You do not have permission to update this booking.");

  const verdict = canTransition(booking.status, to, actor);
  if (!verdict.ok) {
    return FAILED(verdict.reason ?? "That is not something you can do right now.");
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
    const pence = rupeesToPaise(quote);
    if (pence === null) {
      return FAILED("Enter the quote as an amount in rupees, like 49.99.");
    }
    patch.quoted_amount = pence;
  }

  const { error: writeError } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", bookingId);

  if (writeError) {
    return FAILED(explain(writeError.code, "That change could not be saved."));
  }

  // Append-only audit. A failure here must not fail the transition itself —
  // the status change is the thing that matters and it has already committed.
  const { error: eventError } = await supabase.from("booking_events").insert({
    booking_id: bookingId,
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
    bookingId,
    from: booking.status,
    to,
    actor,
  }).catch((error) => console.error("[notifications] transition failed", error));

  return OK("Booking updated.");
}

/** Cancel, choosing the right terminal status for whoever is asking. */
export async function cancelBooking(
  prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return FAILED("That booking could not be found.");

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to cancel this booking.");

  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, fixer_id")
    .eq("id", bookingId)
    .maybeSingle<{ customer_id: string; fixer_id: string }>();

  if (!booking) return FAILED("That booking could not be found.");

  const actor = await resolveActor(supabase, user.id, booking);
  if (!actor) return FAILED("You do not have permission to cancel this booking.");

  const next = new FormData();
  next.set("bookingId", bookingId);
  next.set("to", actor === "shop" ? "cancelled_shop" : "cancelled_customer");
  const reason = formData.get("reason");
  if (reason) next.set("reason", String(reason));

  return transitionBooking(prev, next);
}

const CreateBookingSchema = z.object({
  fixerId: z.string().uuid("Pick a shop."),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  deliveryMode: z.enum(["in_shop", "home_visit", "pickup_drop"]),
  slotStart: z.string().min(1, "Pick a time."),
  slotEnd: z.string().min(1, "Pick a time."),
  deviceDetails: z.string().trim().min(1, "Tell the shop what needs fixing.").max(2000),
  customerNotes: z.string().trim().max(2000).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  addressCity: z.string().trim().max(120).optional(),
  addressPostcode: z.string().trim().max(20).optional(),
  // An unchecked checkbox submits nothing at all, so absence is false rather
  // than invalid. Only ever true when the customer typed a new address.
  saveAddress: z.coerce.boolean().optional(),
});

/**
 * Raise a new request.
 *
 * `reference` is generated by a database trigger and must never be sent from
 * here — the trigger owns collision retries, and a client-supplied reference
 * would defeat them.
 */
export async function createBooking(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = CreateBookingSchema.safeParse({
    fixerId: formData.get("fixerId"),
    serviceId: formData.get("serviceId") ?? undefined,
    deliveryMode: formData.get("deliveryMode"),
    slotStart: formData.get("slotStart"),
    slotEnd: formData.get("slotEnd"),
    deviceDetails: formData.get("deviceDetails"),
    customerNotes: formData.get("customerNotes") ?? undefined,
    addressLine1: formData.get("addressLine1") ?? undefined,
    addressLine2: formData.get("addressLine2") ?? undefined,
    addressCity: formData.get("addressCity") ?? undefined,
    addressPostcode: formData.get("addressPostcode") ?? undefined,
    saveAddress: formData.get("saveAddress") === "on",
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const input = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to book a repair.");

  const start = new Date(input.slotStart);
  const end = new Date(input.slotEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return FAILED("That time slot is not valid — pick another.");
  }
  if (start.getTime() < Date.now()) {
    return FAILED("That slot is in the past — pick another time.");
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
    return FAILED(
      "This is your own shop, so you cannot book a repair with it. " +
        "Customer requests arrive in your shop dashboard under Requests.",
    );
  }

  const responseHours = shop?.response_hours ?? 24;
  const expiresAt = new Date(Date.now() + responseHours * 60 * 60 * 1000).toISOString();

  const needsAddress =
    input.deliveryMode === "home_visit" || input.deliveryMode === "pickup_drop";
  if (needsAddress && !input.addressLine1) {
    return FAILED("Add the address the shop should come to.");
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
    return FAILED(explain(error.code, "That request could not be sent."));
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

  if (data?.id) {
    void notifyBookingCreated(data.id).catch((error) =>
      console.error("[notifications] booking created failed", error),
    );
  }

  return {
    error: null,
    success: true,
    message: data?.reference
      ? `Request sent — reference ${data.reference}.`
      : "Request sent to the shop.",
    bookingId: data?.id,
    reference: data?.reference,
  };
}

const RescheduleSchema = z.object({
  bookingId: z.string().uuid(),
  slotStart: z.string().min(1, "Pick a new time."),
  slotEnd: z.string().min(1, "Pick a new time."),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Propose a different time.
 *
 * Deliberately does NOT move the booking's status. A proposal is a message plus
 * an audit entry; the other party accepting it is what changes anything. Moving
 * the status here would let one side unilaterally rewrite an agreed slot.
 */
export async function requestReschedule(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = RescheduleSchema.safeParse({
    bookingId: formData.get("bookingId"),
    slotStart: formData.get("slotStart"),
    slotEnd: formData.get("slotEnd"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Pick a new time.");
  }

  const { bookingId, slotStart, slotEnd, note } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to propose a new time.");

  const start = new Date(slotStart);
  const end = new Date(slotEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return FAILED("That time slot is not valid — pick another.");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, customer_id, fixer_id")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      customer_id: string;
      fixer_id: string;
    }>();

  if (!booking) return FAILED("That booking could not be found.");

  const actor = await resolveActor(supabase, user.id, booking);
  if (!actor) return FAILED("You do not have permission to change this booking.");

  const { error } = await supabase.from("booking_events").insert({
    booking_id: bookingId,
    actor_id: user.id,
    actor_role: actor,
    from_status: null,
    to_status: null,
    note: note ?? null,
    metadata: {
      kind: "reschedule_requested",
      proposed_start: start.toISOString(),
      proposed_end: end.toISOString(),
    },
  });

  if (error) {
    return FAILED(explain(error.code, "That proposal could not be sent."));
  }

  // Mirror it into the thread so it lands where the other party is looking.
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle<{ id: string }>();

  if (thread) {
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: user.id,
      body: `Proposed a new time: ${start.toLocaleString("en-GB")}${
        note ? ` — ${note}` : ""
      }`,
    });
  }

  revalidatePath(`/dashboard/bookings/${booking.reference}`);
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/expert/requests");

  void notifyRescheduleRequested({
    bookingId,
    actor,
    proposedStart: start,
    proposedEnd: end,
    note,
  }).catch((error) => console.error("[notifications] reschedule failed", error));

  return OK("New time proposed.");
}

/* ── Saved experts ────────────────────────────────────────────────────────── */

/**
 * Favourite toggle. Idempotent in both directions: the button posts the state
 * it believes it is in, and a double-submit converges rather than flapping.
 */
export async function toggleSavedExpert(
  _prev: SavedExpertState,
  formData: FormData,
): Promise<SavedExpertState> {
  const fixerId = String(formData.get("fixerId") ?? "");
  const wasSaved = formData.get("saved") === "1";

  if (!fixerId) return { saved: wasSaved, error: "That shop could not be found." };

  const { supabase, user } = await currentUser();
  if (!user) return { saved: wasSaved, error: "Sign in to save shops." };

  if (wasSaved) {
    const { error } = await supabase
      .from("saved_experts")
      .delete()
      .eq("user_id", user.id)
      .eq("fixer_id", fixerId);

    if (error) {
      return { saved: true, error: explain(error.code, "That could not be removed.") };
    }
  } else {
    const { error } = await supabase
      .from("saved_experts")
      .upsert({ user_id: user.id, fixer_id: fixerId }, { onConflict: "user_id,fixer_id" });

    if (error) {
      return { saved: false, error: explain(error.code, "That could not be saved.") };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/discover");

  return { saved: !wasSaved, error: null };
}

/* ── Messaging ────────────────────────────────────────────────────────────── */

const MessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a message first.").max(4000, "Keep it under 4000 characters."),
});

export async function sendMessage(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = MessageSchema.safeParse({
    threadId: formData.get("threadId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Write a message first.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to send a message.");

  const { error } = await supabase.from("messages").insert({
    thread_id: parsed.data.threadId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  if (error) {
    return FAILED(explain(error.code, "That message could not be sent."));
  }

  void notifyNewMessage({
    threadId: parsed.data.threadId,
    senderId: user.id,
    preview: parsed.data.body,
  }).catch((err) => console.error("[notifications] message failed", err));

  revalidatePath("/dashboard/messages");
  revalidatePath(`/dashboard/messages/${parsed.data.threadId}`);
  revalidatePath("/dashboard/expert/messages");

  return OK();
}

/**
 * Stamp everything the caller did not send as read.
 *
 * Called from an effect on thread open, so it takes the id directly rather than
 * FormData and returns nothing anyone waits on. A failure is logged, not
 * surfaced: an unread badge that lingers is a far smaller problem than an error
 * banner over a conversation the person is already reading.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  if (!threadId) return;

  const { supabase, user } = await currentUser();
  if (!user) return;

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[messages] mark read failed", error.message);
    return;
  }

  revalidatePath("/dashboard/messages");
}

/* ── Warranty claims ──────────────────────────────────────────────────────── */

const DISPUTE_OUTCOMES = [
  "refund_full",
  "refund_partial",
  "redo_service",
  "no_action",
] as const satisfies readonly DisputeResolution[];

const OpenDisputeSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(20, "Describe what went wrong in a little more detail — at least 20 characters.")
    .max(4000),
  desiredOutcome: z.enum(DISPUTE_OUTCOMES).optional(),
});

/**
 * Raise a warranty claim.
 *
 * Two writes that belong together: the dispute row, then the booking moving to
 * `disputed`. Ordered that way on purpose — if the status change fails, an
 * orphaned open dispute is visible and recoverable, whereas a booking marked
 * disputed with no dispute row is a dead end for both parties.
 */
export async function openDispute(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = OpenDisputeSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
    desiredOutcome: formData.get("desiredOutcome") ?? undefined,
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { bookingId, reason, desiredOutcome } = parsed.data;
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to raise a claim.");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, status, customer_id, fixer_id, warranty_expires_at")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: BookingStatus;
      customer_id: string;
      fixer_id: string;
      warranty_expires_at: string | null;
    }>();

  if (!booking) return FAILED("That booking could not be found.");
  if (booking.customer_id !== user.id) {
    return FAILED("Only the customer on a booking can raise a claim.");
  }
  if (booking.status !== "completed") {
    return FAILED("A claim can only be raised on a completed repair.");
  }
  if (
    booking.warranty_expires_at &&
    new Date(booking.warranty_expires_at).getTime() <= Date.now()
  ) {
    return FAILED("The warranty window on this repair has closed.");
  }

  const { error: disputeError } = await supabase.from("disputes").insert({
    booking_id: bookingId,
    raised_by: user.id,
    status: "open",
    reason,
    desired_outcome: desiredOutcome ?? null,
  });

  if (disputeError) {
    return FAILED(explain(disputeError.code, "That claim could not be opened."));
  }

  const { error: statusError } = await supabase
    .from("bookings")
    .update({ status: "disputed" })
    .eq("id", bookingId);

  if (statusError) {
    console.error("[disputes] booking status update failed", statusError.message);
  }

  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    actor_id: user.id,
    actor_role: "customer",
    from_status: booking.status,
    to_status: "disputed",
    note: reason,
  });

  revalidatePath("/dashboard/warranty");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);

  void notifyDisputeOpened(bookingId).catch((error) =>
    console.error("[notifications] dispute failed", error),
  );

  return OK("Claim opened. We will be in touch.");
}

const DisputeMessageSchema = z.object({
  disputeId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a message first.").max(4000),
});

export async function addDisputeMessage(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = DisputeMessageSchema.safeParse({
    disputeId: formData.get("disputeId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Write a message first.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to reply.");

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, raised_by, status")
    .eq("id", parsed.data.disputeId)
    .maybeSingle<{ id: string; raised_by: string; status: string }>();

  if (!dispute) return FAILED("That claim could not be found.");
  if (dispute.status === "resolved" || dispute.status === "withdrawn") {
    return FAILED("This claim is closed — replies are no longer accepted.");
  }

  const { error } = await supabase.from("dispute_messages").insert({
    dispute_id: parsed.data.disputeId,
    author_id: user.id,
    author_role: dispute.raised_by === user.id ? "customer" : "shop",
    body: parsed.data.body,
  });

  if (error) {
    return FAILED(explain(error.code, "That reply could not be sent."));
  }

  // Both parties read the same claim at different URLs, and either can be the
  // one replying. Revalidating only the customer's path left a shop's own reply
  // invisible to it until the cache expired.
  revalidatePath(`/dashboard/warranty/${parsed.data.disputeId}`);
  revalidatePath(`/dashboard/expert/disputes/${parsed.data.disputeId}`);

  return OK();
}

/* ── Onboarding ───────────────────────────────────────────────────────────── */

/**
 * The details a shop cannot work without.
 *
 * Stricter than `ProfileSchema` below on purpose: there, `fullName` and `phone`
 * are `.optional()` because someone editing their profile may legitimately
 * clear a field. Here all three are required — this is the one moment we
 * insist, and a booking with no name on the job and no number to ring is not
 * actionable by the shop that receives it.
 *
 * The phone pattern matches `fixer_profiles_phone_shape` in schema.sql rather
 * than inventing a second rule, so a number accepted here is one the database
 * would also accept on the shop side.
 */
const OnboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name — the shop puts this on the job.")
    .max(120, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a phone number the shop can reach you on.")
    .max(25, "That phone number is too long.")
    .regex(
      /^[0-9+][0-9 ()+-]{5,24}$/,
      "Use digits, spaces and + ( ) - only, starting with a digit or +.",
    ),
  preferredContact: z.enum(["email", "phone", "sms"]),
});

/**
 * Complete the mandatory onboarding.
 *
 * `onboarded_at` is stamped here and nowhere else. It is what stops the dialog
 * reappearing on the next visit, and it is written in the same statement as the
 * fields so the two can never disagree — a save that landed the details but not
 * the flag would re-prompt someone who has already answered.
 *
 * `upsert` rather than `update` because a hand-created auth user has no
 * `public.users` row. `handle_new_user` covers the normal signup path; this
 * should not fail for the accounts it missed.
 */
export async function completeOnboarding(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = OnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    preferredContact: formData.get("preferredContact"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the details and try again.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Your session has expired. Sign in again.");

  const payload = {
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    preferred_contact: parsed.data.preferredContact,
    onboarded_at: new Date().toISOString(),
  };

  // `upsert` requires INSERT privilege, which migration 009 deliberately
  // withholds from `authenticated` — only the `handle_new_user` trigger may
  // insert. A normal Google/email signup already has a row; update it.
  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return FAILED(explain(error.code, "Those details could not be saved."));
  }

  if (!data) {
    return FAILED(
      "Your profile row is missing. Sign out and back in, or contact support if this keeps happening.",
    );
  }

  // The gate is read by the dashboard layout, so the whole subtree has to
  // re-render for the dialog to disappear.
  revalidatePath("/dashboard", "layout");

  return OK("Thanks — you are all set.");
}

/* ── Profile and preferences ──────────────────────────────────────────────── */

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Add a display name.").max(80),
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  timezone: z.string().trim().min(1).max(64),
  preferredContact: z.enum(["email", "phone", "sms"]),
  marketingOptIn: z.boolean(),
});

/**
 * Profile save.
 *
 * Email is deliberately absent. Changing it in Supabase Auth needs a
 * confirmation round-trip to both the old and new addresses, so the form
 * renders it read-only — accepting an email field here would build a control
 * that appears to work and silently does nothing.
 */
export async function updateProfile(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = ProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    fullName: formData.get("fullName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    timezone: formData.get("timezone"),
    preferredContact: formData.get("preferredContact"),
    marketingOptIn: checked(formData, "marketingOptIn"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to update your profile.");

  const { error } = await supabase
    .from("users")
    .update({
      display_name: parsed.data.displayName,
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone,
      preferred_contact: parsed.data.preferredContact,
      marketing_opt_in: parsed.data.marketingOptIn,
    })
    .eq("id", user.id);

  if (error) {
    return FAILED(explain(error.code, "Your profile could not be saved."));
  }

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");

  return OK("Profile saved.");
}

const PrefsSchema = z.object({
  emailBookings: z.boolean(),
  emailMessages: z.boolean(),
  emailReminders: z.boolean(),
  emailMarketing: z.boolean(),
  smsReminders: z.boolean(),
});

export async function updateNotificationPrefs(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = PrefsSchema.safeParse({
    emailBookings: checked(formData, "emailBookings"),
    emailMessages: checked(formData, "emailMessages"),
    emailReminders: checked(formData, "emailReminders"),
    emailMarketing: checked(formData, "emailMarketing"),
    smsReminders: checked(formData, "smsReminders"),
  });

  if (!parsed.success) {
    return FAILED("Those preferences could not be saved.");
  }

  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in to update your preferences.");

  // Upsert rather than update: the row is created lazily by a trigger on first
  // notification, so someone who has never been notified has no row to update.
  const { error } = await supabase.from("notification_prefs").upsert(
    {
      user_id: user.id,
      email_bookings: parsed.data.emailBookings,
      email_messages: parsed.data.emailMessages,
      email_reminders: parsed.data.emailReminders,
      email_marketing: parsed.data.emailMarketing,
      sms_reminders: parsed.data.smsReminders,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return FAILED(explain(error.code, "Those preferences could not be saved."));
  }

  revalidatePath("/dashboard/settings/notifications");

  return OK("Preferences saved.");
}

/** Clear the bell. Returns state so it can drive a form like everything else. */
export async function markAllNotificationsRead(): Promise<BookingActionState> {
  const { supabase, user } = await currentUser();
  if (!user) return FAILED("Sign in first.");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return FAILED(explain(error.code, "Those could not be marked as read."));
  }

  revalidatePath("/dashboard");

  return OK();
}
