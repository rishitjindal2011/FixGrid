"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelBooking, transitionBooking } from "@/lib/bookings/actions";
import type { BookingAction } from "@/lib/bookings/actions-map";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import type { BookingStatus } from "@/lib/types/marketplace";

/**
 * The buttons a customer may press on one booking.
 *
 * The list is decided by `allowedActions()` on the server and passed in whole —
 * this component never asks what the status is or reasons about legality. That
 * matters because the same question is asked again inside `transitionBooking`
 * before anything is written: this is the drawing, not the enforcement.
 *
 * Three decisions worth knowing about:
 *
 *   • **Each action owns its own `useActionState`.** One shared state would
 *     attach a failed cancel's error to whichever button the eye landed on.
 *
 *   • **Nothing closes a dialog programmatically.** On success the booking's
 *     status changes, the page revalidates, and `allowedActions()` returns a
 *     different set — so the button that was pressed unmounts and takes its
 *     dialog with it. Closing it from the action result would mean a `setState`
 *     in an effect, which this eslint config rejects outright.
 *
 *   • **The form lives inside `DialogContent`.** Radix unmounts content when the
 *     dialog closes, so backing out of a cancellation and reopening it starts
 *     from a clean form rather than a stale typed reason and a stale error.
 */

/**
 * Cancellation goes through `cancelBooking`, not `transitionBooking`.
 *
 * `cancelled_customer` and `cancelled_shop` are the same button worded from two
 * sides, and which one applies depends on who the caller is — a fact the server
 * resolves from the session. Posting the status from here would let the client
 * choose whose fault the cancellation was.
 */
function serverActionFor(to: BookingStatus) {
  return to === "cancelled_customer" || to === "cancelled_shop"
    ? cancelBooking
    : transitionBooking;
}

function ActionError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function SubmitButton({
  action,
  className,
}: {
  action: BookingAction;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={action.tone}
      disabled={pending}
      className={className}
    >
      {pending ? "Working…" : action.label}
    </Button>
  );
}

/** An action that commits on one press — no dialog, no reason. */
function InlineAction({
  bookingId,
  action,
}: {
  bookingId: string;
  action: BookingAction;
}) {
  const [state, formAction] = useActionState(
    serverActionFor(action.to),
    BOOKING_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="to" value={action.to} />

      <SubmitButton action={action} className="w-full" />

      {state.error ? <ActionError message={state.error} /> : null}
    </form>
  );
}

function ConfirmForm({
  bookingId,
  action,
}: {
  bookingId: string;
  action: BookingAction;
}) {
  const [state, formAction] = useActionState(
    serverActionFor(action.to),
    BOOKING_INITIAL_STATE,
  );
  const reasonId = React.useId();

  return (
    <form action={formAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="to" value={action.to} />

      <DialogHeader>
        <DialogTitle>{action.label}</DialogTitle>
        {action.confirm ? (
          <DialogDescription>{action.confirm}</DialogDescription>
        ) : null}
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        {action.needsReason ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={reasonId} className="eyebrow">
              Reason — required
            </label>
            <Textarea
              id={reasonId}
              name="reason"
              rows={3}
              required
              maxLength={2000}
              placeholder="A line on why. The shop sees this, and it is kept on the job's record."
            />
            <p className="text-xs text-steel">
              This is stored on the booking&apos;s timeline and cannot be edited afterwards.
            </p>
          </div>
        ) : null}

        {state.error ? <ActionError message={state.error} /> : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Back
          </Button>
        </DialogClose>
        <SubmitButton action={action} />
      </DialogFooter>
    </form>
  );
}

/** An action that asks first — because it declares `confirm`, `needsReason`, or both. */
function ConfirmAction({
  bookingId,
  action,
}: {
  bookingId: string;
  action: BookingAction;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={action.tone} size="sm" className="w-full">
          {action.label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <ConfirmForm bookingId={bookingId} action={action} />
      </DialogContent>
    </Dialog>
  );
}

export function BookingActions({
  bookingId,
  reference,
  actions,
}: {
  bookingId: string;
  /** Only needed to hand the warranty claim form its booking. */
  reference: string;
  actions: BookingAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {actions.map((action) => {
        // Raising a claim is the one "action" that is not a bare transition.
        // `openDispute` writes a `disputes` row, a desired outcome and any
        // evidence, then moves the booking — posting `disputed` straight to
        // `transitionBooking` would strand a completed job in a dispute state
        // with no claim behind it. The form for all that is a page, not a
        // textarea, so this one links out.
        if (action.to === "disputed") {
          return (
            <Button key={action.to} asChild variant={action.tone} size="sm" className="w-full">
              <Link href={`/dashboard/warranty/new?booking=${encodeURIComponent(reference)}`}>
                {action.label}
              </Link>
            </Button>
          );
        }

        const asks = Boolean(action.confirm) || Boolean(action.needsReason);

        return asks ? (
          <ConfirmAction key={action.to} bookingId={bookingId} action={action} />
        ) : (
          <InlineAction key={action.to} bookingId={bookingId} action={action} />
        );
      })}
    </div>
  );
}
