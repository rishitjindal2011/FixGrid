"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertTriangle, Check, CheckCircle2, Lock } from "lucide-react";

import { ProposeTimeDialog } from "@/components/dashboard/expert/propose-time-dialog";
import {
  QuoteForm,
  needsQuote,
  paiseToRupeesInput,
  type RequestPricing,
} from "@/components/dashboard/expert/quote-form";
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
import { transitionBooking } from "@/lib/bookings/actions";
import { allowedActions, slotStart } from "@/lib/bookings/actions-map";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { saveBookingNote } from "@/lib/dashboard/expert-actions";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { BookingStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * The three answers a shop can give a request: accept it, decline it, or suggest
 * a different time.
 *
 * Which of them are legal is still `allowedActions()`'s call, asked here with
 * the same arguments `transitionBooking` will ask `canTransition()` with before
 * it writes anything — this is the drawing, not the enforcement. What this file
 * adds on top is the one rule the transition table cannot express: **accepting
 * means two different things depending on the service's price type.** A fixed
 * price is already agreed, so accepting confirms the booking outright; a `quote`
 * or `from` price is not, so accepting has to collect a number first and the
 * booking lands on `accepted` for the customer to agree to.
 *
 * Each action owns its own `useActionState`. One shared state would attach a
 * failed decline's error to whichever button the eye happened to land on.
 *
 * Nothing closes a dialog programmatically. On success the booking's status
 * changes, the page re-renders, `allowedActions()` returns a different set and
 * the button unmounts with its dialog. Closing from an action result would mean
 * a `setState` inside an effect, which this eslint config rejects outright.
 */

function FormError({ message }: { message: string }) {
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

/* ── Accept ───────────────────────────────────────────────────────────────── */

/**
 * Straight to `confirmed`, for a job whose price the catalogue already settled.
 *
 * The price rides along in the `quote` field. `transitionBooking` converts it to
 * pence and stamps `quoted_amount`, which matters because a booking confirmed
 * with a null amount has no figure for the invoice, the earnings page or the
 * payout to work from — it would read as a free repair for the rest of its life.
 */
function AcceptOutright({
  bookingId,
  pricePence,
  fullWidth,
}: {
  bookingId: string;
  pricePence: number | null;
  fullWidth: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    transitionBooking,
    BOOKING_INITIAL_STATE,
  );

  return (
    <form action={formAction} className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="to" value="confirmed" />
      {pricePence !== null ? (
        <input type="hidden" name="quote" value={paiseToRupeesInput(pricePence)} />
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={pending}
        className={fullWidth ? "w-full" : undefined}
      >
        <Check aria-hidden />
        {pending ? "Accepting…" : "Accept"}
      </Button>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

/* ── Decline ──────────────────────────────────────────────────────────────── */

function DeclineForm({ bookingId, confirmCopy }: { bookingId: string; confirmCopy: string }) {
  const [state, formAction, pending] = useActionState(
    transitionBooking,
    BOOKING_INITIAL_STATE,
  );
  const reasonId = React.useId();

  return (
    <form action={formAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="to" value="declined" />

      <DialogHeader>
        <DialogTitle>Decline this request</DialogTitle>
        <DialogDescription>{confirmCopy}</DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={reasonId} className="eyebrow">
            Reason — required
          </label>
          <Textarea
            id={reasonId}
            name="reason"
            rows={3}
            required
            minLength={5}
            maxLength={2000}
            placeholder="Fully booked that week. Not a model we carry parts for. Too far for a home visit."
          />
          <p className="text-xs leading-relaxed text-steel">
            The customer reads this on the job&apos;s timeline. It is kept on the record and
            cannot be edited afterwards — one plain sentence is plenty.
          </p>
        </div>

        <p className="text-xs leading-relaxed text-steel-soft">
          Declining is final. If you might be able to help on another day, propose a new
          time instead.
        </p>

        {state.error ? <FormError message={state.error} /> : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Keep it
          </Button>
        </DialogClose>
        {/* The trigger is an outline button so it does not compete with Accept.
            The button that actually declines is the destructive one. */}
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Declining…" : "Decline request"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ── The three together ───────────────────────────────────────────────────── */

export interface RequestActionsProps {
  bookingId: string;
  status: BookingStatus;
  /** `tstzrange` text, for the slot the customer asked for. */
  slot: string;
  warrantyExpiresAt: string | null;
  pricing: RequestPricing | null;
  serviceName: string | null;
  deviceDetails: string | null;
  /** The shop's zone — the clock every proposed time is typed in. */
  timezone: string;
  durationMinutes: number;
  /** Request time from the server render, so hydration cannot disagree. */
  now: Date;
  /** Stack full-width buttons, for the detail page's action column. */
  stacked?: boolean;
  className?: string;
}

export function RequestActions({
  bookingId,
  status,
  slot,
  warrantyExpiresAt,
  pricing,
  serviceName,
  deviceDetails,
  timezone,
  durationMinutes,
  now,
  stacked = false,
  className,
}: RequestActionsProps) {
  const actions = allowedActions(
    { status, slot, warranty_expires_at: warrantyExpiresAt },
    "shop",
    now,
  );

  const quoting = needsQuote(pricing);
  const canQuote = quoting && actions.some((action) => action.to === "accepted");
  const canConfirm = !quoting && actions.some((action) => action.to === "confirmed");
  const decline = actions.find((action) => action.to === "declined") ?? null;

  // A time can only be suggested while there is still a time to argue about. A
  // job on the bench or already finished is not a scheduling conversation.
  const canPropose = status === "requested" || status === "accepted" || status === "confirmed";

  if (!canQuote && !canConfirm && !decline && !canPropose) return null;

  const fixedPricePence =
    pricing && pricing.priceType === "fixed" ? pricing.minPence : null;

  const start = slotStart(slot);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "flex gap-2",
          stacked ? "flex-col" : "flex-wrap items-start",
        )}
      >
        {canConfirm ? (
          <AcceptOutright
            bookingId={bookingId}
            pricePence={fixedPricePence}
            fullWidth={stacked}
          />
        ) : null}

        {canQuote ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                className={stacked ? "w-full" : undefined}
              >
                <Check aria-hidden />
                Accept and quote
              </Button>
            </DialogTrigger>

            <DialogContent>
              <QuoteForm
                bookingId={bookingId}
                serviceName={serviceName}
                pricing={pricing}
                deviceDetails={deviceDetails}
              />
            </DialogContent>
          </Dialog>
        ) : null}

        {canPropose ? (
          <ProposeTimeDialog
            bookingId={bookingId}
            timezone={timezone}
            durationMinutes={durationMinutes}
            currentStart={start ? start.toISOString() : null}
            now={now}
            fullWidth={stacked}
          />
        ) : null}

        {decline ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={stacked ? "w-full" : undefined}
              >
                {decline.label}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DeclineForm
                bookingId={bookingId}
                confirmCopy={
                  decline.confirm ??
                  "Decline this request? The customer is told straight away."
                }
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {canConfirm || canQuote ? (
        <p className="text-xs leading-relaxed text-steel">
          {canConfirm
            ? fixedPricePence !== null
              ? `Accepting books the job in at ${formatMoney(fixedPricePence, pricing?.currency)} — your listed price. The slot is yours from that moment.`
              : "Accepting books the job in at the slot the customer asked for."
            : "This service is priced on inspection, so accepting sends a quote. The slot is not held until the customer agrees to it."}
        </p>
      ) : null}
    </div>
  );
}

/* ── The shop's private note ──────────────────────────────────────────────── */

/**
 * The shop's working notes on one job.
 *
 * Lives in this file rather than its own because it is the other write the
 * request screen performs, and it shares every convention with the three above —
 * a `(prev, formData)` action, `useActionState`, an inline error.
 *
 * SHOP-PRIVATE, and said so on screen. `booking_notes` is a separate table with
 * an owner-only policy precisely because RLS is row-level: a customer allowed to
 * read their own booking can read every column of it, so no column of `bookings`
 * could ever hold this.
 */
export function PrivateNoteEditor({
  bookingId,
  fixerId,
  note,
  timezone,
}: {
  bookingId: string;
  fixerId: string;
  note: { body: string; updatedAt: string } | null;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveBookingNote,
    BOOKING_INITIAL_STATE,
  );
  const bodyId = React.useId();
  const hintId = React.useId();

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fixerId" value={fixerId} />

      <label htmlFor={bodyId} className="eyebrow flex items-center gap-1.5">
        <Lock aria-hidden className="size-3" />
        Private note — your shop only
      </label>

      <Textarea
        id={bodyId}
        name="body"
        rows={4}
        maxLength={4000}
        defaultValue={note?.body ?? ""}
        aria-describedby={hintId}
        placeholder="Waiting on a screen from the supplier. Customer is deaf — text, do not ring."
      />

      <p id={hintId} className="text-xs leading-relaxed text-steel">
        The customer never sees this, on the booking or anywhere else. Save an empty box to
        clear it.
        {note ? ` Last saved ${formatDateTime(note.updatedAt, timezone)}.` : ""}
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>

        {state.success && state.message ? (
          <span className="flex items-center gap-1.5 text-xs text-verdigris">
            <CheckCircle2 aria-hidden className="size-3.5" />
            {state.message}
          </span>
        ) : null}
      </div>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
