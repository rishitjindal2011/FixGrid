"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Inbox, Smartphone, User } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { transitionBooking } from "@/lib/bookings/actions";
import { allowedActions, slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { formatMoney, formatRelative, formatSlot } from "@/lib/format";
import {
  DELIVERY_MODE_LABELS,
  type BookingCustomerSummary,
  type BookingRow,
  type BookingStatus,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * "Needs your answer" — the queue of requests nobody has replied to.
 *
 * The highest-value thing on the expert dashboard, so it is the one panel that
 * carries real buttons instead of a link to somewhere the work happens. That
 * makes it a client component: `transitionBooking` is a `(prev, formData)`
 * action, which needs `useActionState`, which needs the client.
 *
 * `now` arrives as a prop rather than being read here. A client component
 * calling `new Date()` during render disagrees with the server render it is
 * hydrating, and every waiting time on this screen would flicker.
 */

/** Only the columns this panel draws — narrower than the row, so it composes. */
type PendingRequest = Pick<
  BookingRow,
  | "id"
  | "reference"
  | "status"
  | "slot"
  | "warranty_expires_at"
  | "delivery_mode"
  | "device_details"
  | "customer_notes"
  | "quoted_amount"
  | "currency"
  | "requested_at"
  | "expires_at"
> & {
  customer: BookingCustomerSummary | null;
  service: { id: string; name: string; duration_minutes: number } | null;
};

export function PendingRequestsPanel({
  requests,
  timezone,
  now,
}: {
  requests: PendingRequest[];
  timezone: string;
  now: Date;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing waiting"
        description="New booking requests land here. You will get a notification the moment one arrives."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/expert/services">Check your services</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} timezone={timezone} now={now} />
      ))}
    </ul>
  );
}

function RequestCard({
  request,
  timezone,
  now,
}: {
  request: PendingRequest;
  timezone: string;
  now: Date;
}) {
  const start = slotStart(request.slot);
  const end = slotEnd(request.slot);
  const customerName =
    request.customer?.display_name ?? request.customer?.full_name ?? "A customer";

  const waitedHours =
    (now.getTime() - new Date(request.requested_at).getTime()) / (1000 * 60 * 60);

  // Waiting is the whole point of this panel, so it is coloured rather than
  // just stated. A day-old request should be uncomfortable to look at.
  const waitTone =
    waitedHours >= 24 ? "text-rust" : waitedHours >= 6 ? "text-signal" : "text-steel";

  return (
    <li className="rounded-machined border border-hairline bg-chalk shadow-bench">
      <div className="border-l-2 border-signal p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-base uppercase tracking-wide text-enamel">
              <User aria-hidden className="size-4 shrink-0 text-steel-soft" />
              <span className="truncate">{customerName}</span>
            </p>
            <p className="pt-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
              {request.reference}
            </p>
          </div>

          <p className={cn("flex items-center gap-1.5 text-xs", waitTone)}>
            <Clock aria-hidden className="size-3.5 shrink-0" />
            <span>Requested {formatRelative(request.requested_at, now)}</span>
          </p>
        </div>

        {request.device_details ? (
          <p className="flex items-start gap-2 pt-3 text-sm leading-relaxed text-enamel">
            <Smartphone aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
            <span className="min-w-0">{request.device_details}</span>
          </p>
        ) : null}

        {request.customer_notes ? (
          <p className="mt-3 rounded-machined bg-bench-sunk px-3 py-2 text-sm leading-relaxed text-steel">
            {request.customer_notes}
          </p>
        ) : null}

        <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-4 text-xs">
          <div className="min-w-0">
            <dt className="eyebrow pb-1.5">Requested slot</dt>
            <dd className="font-mono tabular-nums text-enamel">
              {start && end ? formatSlot(start, end, timezone) : "Flexible"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow pb-1.5">Service</dt>
            <dd className="text-steel">{request.service?.name ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="eyebrow pb-1.5">Where</dt>
            <dd className="text-steel">{DELIVERY_MODE_LABELS[request.delivery_mode]}</dd>
          </div>
          {request.quoted_amount !== null ? (
            <div>
              <dt className="eyebrow pb-1.5">Quoted</dt>
              <dd className="font-mono tabular-nums text-enamel">
                {formatMoney(request.quoted_amount, request.currency)}
              </dd>
            </div>
          ) : null}
          {request.expires_at ? (
            <div>
              <dt className="eyebrow pb-1.5">Auto-expires</dt>
              <dd className="font-mono tabular-nums text-steel">
                {formatRelative(request.expires_at, now)}
              </dd>
            </div>
          ) : null}
        </dl>

        <BookingActions booking={request} now={now} className="pt-4" />
      </div>
    </li>
  );
}

/* ── Shared action leaf ───────────────────────────────────────────────────── */

/** The columns `allowedActions` needs to decide what is legal. */
type ActionableBooking = Pick<
  BookingRow,
  "id" | "reference" | "status" | "slot" | "warranty_expires_at"
>;

/**
 * The state type is read off the action, so a change to what `transitionBooking`
 * returns is a compile error here rather than a field that stops rendering.
 */
type TransitionState = Awaited<ReturnType<typeof transitionBooking>>;

const INITIAL_TRANSITION = { error: null, success: false } as TransitionState;

const TONE_VARIANT = {
  primary: "primary",
  secondary: "secondary",
  outline: "outline",
  danger: "danger",
} as const;

/**
 * The legal transitions for one booking, as buttons.
 *
 * Lives here rather than in its own file because the schedule needs exactly the
 * same control and duplicating it would let the two drift — the moment one
 * grows a confirmation step and the other does not, a shop can cancel a job
 * from the schedule with no warning and not from the queue.
 *
 * Two actions are not plain submits:
 *   • anything with `needsReason` reveals a textarea first, because the server
 *     rejects a reasonless decline and a round-trip to find that out is rude;
 *   • "Send quote" links out instead, because a quote needs an amount and this
 *     panel has nowhere to type one.
 */
export function BookingActions({
  booking,
  now,
  className,
}: {
  booking: ActionableBooking;
  now: Date;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(transitionBooking, INITIAL_TRANSITION);
  const [reasonFor, setReasonFor] = React.useState<BookingStatus | null>(null);
  const panelId = React.useId();

  const actions = allowedActions(booking, "shop", now);
  if (actions.length === 0) return null;

  const reasonAction = actions.find((action) => action.to === reasonFor) ?? null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => {
          if (action.to === "accepted") {
            return (
              <Button key={action.to} asChild variant="outline" size="sm">
                <Link href={`/dashboard/expert/requests?booking=${booking.reference}`}>
                  {action.label}
                </Link>
              </Button>
            );
          }

          if (action.needsReason) {
            const open = reasonFor === action.to;
            return (
              <Button
                key={action.to}
                type="button"
                variant={TONE_VARIANT[action.tone]}
                size="sm"
                disabled={pending}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setReasonFor(open ? null : action.to)}
              >
                {action.label}
              </Button>
            );
          }

          return (
            <form key={action.to} action={submit}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="to" value={action.to} />
              <Button
                type="submit"
                variant={TONE_VARIANT[action.tone]}
                size="sm"
                disabled={pending}
              >
                {action.label}
              </Button>
            </form>
          );
        })}
      </div>

      {reasonAction ? (
        <form
          id={panelId}
          action={submit}
          className="flex flex-col gap-2 rounded-machined border border-hairline bg-bench p-3"
        >
          <input type="hidden" name="bookingId" value={booking.id} />
          <input type="hidden" name="to" value={reasonAction.to} />

          {reasonAction.confirm ? (
            <p className="text-xs leading-relaxed text-steel">{reasonAction.confirm}</p>
          ) : null}

          <label htmlFor={`${panelId}-reason`} className="eyebrow">
            Reason
          </label>
          <Textarea
            id={`${panelId}-reason`}
            name="reason"
            rows={2}
            required
            minLength={5}
            maxLength={500}
            placeholder="The customer sees this. Keep it short and factual."
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant={TONE_VARIANT[reasonAction.tone]}
              size="sm"
              disabled={pending}
            >
              {pending ? "Sending…" : reasonAction.label}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReasonFor(null)}
              disabled={pending}
            >
              Keep it
            </Button>
          </div>
        </form>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {pending ? "Updating booking" : ""}
      </p>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-xs text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

/** A count badge for the section header, so the number sits next to the title. */
export function PendingCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="signal">
      <span className="font-mono tabular-nums">{count}</span>
      waiting
    </Badge>
  );
}
