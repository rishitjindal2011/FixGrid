/**
 * The booking state machine.
 *
 * Pure — no imports beyond types, no I/O, no `Date.now()` in the transition
 * table itself. Kept that way for the same reason `src/lib/hours.ts` is: this
 * is the logic most worth testing and least worth mocking a database for.
 *
 * The rule this file exists to enforce: **who** may move a booking **where**.
 * Both dashboards ask `allowedActions()` what buttons to render, and every
 * server action asks `canTransition()` again before writing. The UI check is a
 * courtesy; the server check is the enforcement. Neither is a substitute for
 * RLS, which decides whether you may touch the row at all.
 */

import type { ActorRole, BookingStatus } from "@/lib/types/marketplace";

/** Who is attempting the transition. `system` is cron; `admin` is the back office. */
export type TransitionActor = ActorRole;

/**
 * Legal transitions, keyed by origin status.
 *
 * Read a row as: from this status, this actor may move it to that status.
 * Anything absent is illegal — the table is a whitelist, and a status missing
 * from a row's actor list is a deliberate omission rather than an oversight.
 */
const TRANSITIONS: Record<
  BookingStatus,
  Partial<Record<BookingStatus, readonly TransitionActor[]>>
> = {
  requested: {
    // The shop answers. `accepted` carries the quote; `confirmed` is the
    // auto-accept path, where a shop with fixed prices skips quoting.
    accepted: ["shop", "admin"],
    confirmed: ["shop", "admin"],
    declined: ["shop", "admin"],
    cancelled_customer: ["customer"],
    // Nobody answered inside `expires_at`. Cron only — a shop letting a request
    // lapse must not be able to backdate it as "expired" instead of "declined".
    expired: ["system"],
  },

  accepted: {
    // The customer accepts the quote. This is the transition that commits the
    // slot, and the one the exclusion constraint can reject with 23P01.
    confirmed: ["customer", "admin"],
    cancelled_customer: ["customer"],
    cancelled_shop: ["shop", "admin"],
    expired: ["system"],
  },

  confirmed: {
    in_progress: ["shop", "admin"],
    cancelled_customer: ["customer"],
    cancelled_shop: ["shop", "admin"],
    // The customer never turned up. Shop-only: the customer cannot mark
    // themselves absent, and the shop should not be able to claim it before the
    // slot has actually passed — that part is a time check in `actions.ts`,
    // not something a transition table can express.
    no_show: ["shop", "admin"],
  },

  in_progress: {
    // Completion opens the warranty window. The database stamps
    // `warranty_expires_at`; the app never sends it.
    completed: ["shop", "admin"],
    cancelled_shop: ["shop", "admin"],
  },

  completed: {
    // Warranty ran out with no claim. Cron closes it, and an admin can close
    // early when both sides agree.
    closed: ["system", "admin"],
    // A claim inside the window. Customer-raised, or admin on their behalf
    // after a phone call.
    disputed: ["customer", "admin"],
  },

  disputed: {
    // Adjudicated in the admin. Back to `completed` when the claim is
    // withdrawn or rejected, so the warranty clock resumes rather than the
    // booking being stranded in a dispute state for ever.
    completed: ["admin"],
    closed: ["admin"],
  },

  // Terminal. No transitions out — a cancelled booking is re-booked as a new
  // one, which keeps its own audit trail rather than mutating the old.
  closed: {},
  declined: {},
  cancelled_customer: {},
  cancelled_shop: {},
  no_show: {},
  expired: {},
};

/** True when nothing can move this booking any further. */
export function isTerminal(status: BookingStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

/** Every status this actor could move the booking to, right now. */
export function nextStatuses(
  from: BookingStatus,
  actor: TransitionActor,
): BookingStatus[] {
  return Object.entries(TRANSITIONS[from])
    .filter(([, actors]) => actors?.includes(actor))
    .map(([status]) => status as BookingStatus);
}

/**
 * The one question this module answers. Returns a reason on refusal rather than
 * a bare false, because that reason is shown to the user — a server action that
 * refuses silently is indistinguishable from one that is broken.
 */
export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: TransitionActor,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) {
    return { ok: false, reason: "That booking is already in this state." };
  }

  const allowed = TRANSITIONS[from][to];

  if (!allowed) {
    return {
      ok: false,
      reason: isTerminal(from)
        ? `This booking is ${LABEL[from]} and cannot be changed.`
        : `A ${LABEL[from]} booking cannot become ${LABEL[to]}.`,
    };
  }

  if (!allowed.includes(actor)) {
    return { ok: false, reason: `You do not have permission to do that.` };
  }

  return { ok: true };
}

/** Lower-case status wording for mid-sentence use in the messages above. */
const LABEL: Record<BookingStatus, string> = {
  requested: "requested",
  accepted: "quoted",
  confirmed: "confirmed",
  in_progress: "in progress",
  completed: "completed",
  closed: "closed",
  declined: "declined",
  cancelled_customer: "cancelled",
  cancelled_shop: "cancelled",
  no_show: "marked as a no-show",
  expired: "expired",
  disputed: "in dispute",
};
