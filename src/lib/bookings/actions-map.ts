/**
 * Which actions a booking offers, and what they're called.
 *
 * Separate from `machine.ts` on purpose: the machine knows which transitions
 * are legal, this file knows how they're presented. A single transition can be
 * two different buttons depending on who is looking — `confirmed → in_progress`
 * is "Start work" to the shop and is not offered to the customer at all — and
 * putting that wording in the transition table would make it a view concern.
 *
 * Pure, like the machine. Time-dependent rules (a slot that has not started
 * yet, a warranty that has expired) take `now` as an argument rather than
 * reading the clock, so tests can pin it.
 */

import { canTransition, type TransitionActor } from "@/lib/bookings/machine";
import type { BookingRow, BookingStatus } from "@/lib/types/marketplace";

export interface BookingAction {
  /** The status this action moves the booking to. */
  to: BookingStatus;
  label: string;
  /** Longer wording for a confirmation dialog. */
  confirm?: string;
  /**
   * Visual weight, mapping to `Button` variants. Only one action per booking
   * should ever be `primary` — the one the actor is expected to take next.
   */
  tone: "primary" | "secondary" | "outline" | "danger";
  /** Whether the action needs a typed reason before it can be submitted. */
  needsReason?: boolean;
}

/** Anything narrower than the booking row, for callers that only have a summary. */
type BookingLike = Pick<BookingRow, "status" | "slot" | "warranty_expires_at">;

/**
 * Parse the lower bound out of a Postgres `tstzrange` literal.
 *
 * PostgREST hands ranges back as text — `["2026-08-08T09:00:00+00:00",...)`.
 * Returns null rather than throwing on anything unparseable: a malformed range
 * should hide a time-gated button, not crash the dashboard.
 */
export function slotStart(range: string | null | undefined): Date | null {
  if (!range) return null;
  const match = /^[[(]"?([^",]+)"?,/.exec(range);
  if (!match?.[1]) return null;
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Parse the upper bound out of a `tstzrange` literal. Empty bound → null. */
export function slotEnd(range: string | null | undefined): Date | null {
  if (!range) return null;
  const match = /,\s*"?([^",]*)"?[\])]$/.exec(range);
  if (!match?.[1]) return null;
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ── Wording, per actor ───────────────────────────────────────────────────── */

const SHOP_ACTIONS: Partial<Record<BookingStatus, Omit<BookingAction, "to">>> = {
  accepted: { label: "Send quote", tone: "primary" },
  confirmed: { label: "Accept booking", tone: "primary" },
  declined: {
    label: "Decline",
    tone: "outline",
    confirm: "Decline this request? The customer is told straight away.",
    needsReason: true,
  },
  in_progress: { label: "Start work", tone: "primary" },
  completed: {
    label: "Mark complete",
    tone: "primary",
    confirm:
      "Marking this complete opens the customer's warranty window and releases the job for payout.",
  },
  cancelled_shop: {
    label: "Cancel booking",
    tone: "danger",
    confirm: "Cancel this booking? Cancelling late affects your response record.",
    needsReason: true,
  },
  no_show: {
    label: "Mark no-show",
    tone: "outline",
    confirm: "Record that the customer did not arrive for this appointment?",
    needsReason: true,
  },
};

const CUSTOMER_ACTIONS: Partial<Record<BookingStatus, Omit<BookingAction, "to">>> = {
  confirmed: { label: "Accept quote", tone: "primary" },
  cancelled_customer: {
    label: "Cancel",
    tone: "danger",
    confirm: "Cancel this booking? You will need to request a new slot to rebook.",
    needsReason: true,
  },
  disputed: {
    label: "Raise a warranty claim",
    tone: "outline",
    confirm: "Open a claim on this repair? The shop and our team both see it.",
    needsReason: true,
  },
};

/**
 * The actions to render, in the order they should appear.
 *
 * `now` gates the two rules that depend on time rather than status:
 *   • work cannot start before the slot does — a shop tapping "Start work"
 *     the day before is a mis-tap, not an early start;
 *   • a warranty claim cannot be raised after the window closes.
 *
 * Both are re-checked server-side. This function only decides what to draw.
 */
export function allowedActions(
  booking: BookingLike,
  actor: TransitionActor,
  now: Date = new Date(),
): BookingAction[] {
  const wording = actor === "shop" ? SHOP_ACTIONS : CUSTOMER_ACTIONS;

  return Object.entries(wording)
    .filter(([to]) => canTransition(booking.status, to as BookingStatus, actor).ok)
    .filter(([to]) => {
      if (to === "in_progress") {
        const start = slotStart(booking.slot);
        // No parseable slot: allow it and let the server decide.
        return start === null || now >= start;
      }

      if (to === "disputed") {
        const expires = booking.warranty_expires_at
          ? new Date(booking.warranty_expires_at)
          : null;
        return expires === null || now < expires;
      }

      return true;
    })
    .map(([to, action]) => ({ ...action, to: to as BookingStatus }));
}

/* ── Status presentation ──────────────────────────────────────────────────── */

export type StatusTone = "neutral" | "verified" | "signal" | "solid";

/**
 * Badge tone per status, following the token rule that signal orange marks
 * live and actionable state only — never decoration. So `requested` (waiting
 * on someone) and `in_progress` (happening now) are signal; `completed` is
 * verdigris; everything settled or dead is neutral.
 */
export const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  requested: "signal",
  accepted: "signal",
  confirmed: "solid",
  in_progress: "signal",
  completed: "verified",
  closed: "neutral",
  declined: "neutral",
  cancelled_customer: "neutral",
  cancelled_shop: "neutral",
  no_show: "neutral",
  expired: "neutral",
  disputed: "signal",
};

/** One line of plain English about where the booking stands, for each side. */
export function statusExplainer(status: BookingStatus, actor: TransitionActor): string {
  const shop = actor === "shop";

  switch (status) {
    case "requested":
      return shop
        ? "Waiting on you — accept, quote or decline."
        : "Sent to the shop. They usually reply within a few hours.";
    case "accepted":
      return shop
        ? "Quote sent. Waiting for the customer to accept."
        : "The shop has quoted. Accept to lock in your slot.";
    case "confirmed":
      return shop ? "Booked in. Start work when they arrive." : "Booked in. See you then.";
    case "in_progress":
      return shop ? "Work underway." : "The shop is working on it now.";
    case "completed":
      return shop
        ? "Done. Payout is released once the warranty window closes."
        : "Repair complete. Your warranty window is open — tell us if anything is wrong.";
    case "closed":
      return "Finished, with the warranty window closed.";
    case "declined":
      return shop ? "You declined this request." : "The shop could not take this one.";
    case "cancelled_customer":
      return shop ? "The customer cancelled." : "You cancelled this booking.";
    case "cancelled_shop":
      return shop ? "You cancelled this booking." : "The shop cancelled this booking.";
    case "no_show":
      return shop ? "Recorded as a no-show." : "Recorded as a missed appointment.";
    case "expired":
      return shop
        ? "This request expired before it was answered."
        : "The shop did not reply in time. Try another shop.";
    case "disputed":
      return shop
        ? "A warranty claim is open on this job."
        : "Your claim is open. We will be in touch.";
  }
}
