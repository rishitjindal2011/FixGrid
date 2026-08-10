"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Info } from "lucide-react";

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
import { requestReschedule } from "@/lib/bookings/actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { formatDuration } from "@/lib/format";

/**
 * The shop's side of "how about Thursday instead?".
 *
 * A proposal is not a reschedule. `requestReschedule` writes an audit entry and
 * a message and deliberately leaves the booking's status and slot alone — the
 * customer agreeing is what moves anything. That is the single most important
 * thing this dialog has to communicate, because a shop that believes it has
 * moved the job will not answer the request afterwards, and the request will
 * expire while they wait for a customer who is waiting for them.
 *
 * The three time helpers below are near-copies of the pair in
 * `@/components/dashboard/reschedule-dialog`, which keeps them module-private.
 * They are the same arithmetic for the same reason and must stay in step: the
 * typed time is the shop's wall clock, and `new Date("2026-12-24T09:00")` on the
 * server reads it in the deploy region's zone instead.
 */

/**
 * How far `timeZone` is from UTC at a given instant, in milliseconds.
 *
 * Derived from `Intl` rather than a table because the offset is not a property
 * of the zone — it changes twice a year, and hard-coding "+1 in summer" is how a
 * booking lands an hour out on the last Sunday in October.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    // `hour12: false` renders midnight as 24 under some ICU builds.
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return asIfUtc - instant.getTime();
}

/**
 * A `datetime-local` value read as wall clock in `timeZone` → the real instant.
 *
 * The offset is applied twice on purpose. The first pass uses the offset at the
 * naive instant, which is an hour out for a time near a clock change; the second
 * re-reads it at the corrected instant and converges. Away from a boundary the
 * second pass is a no-op.
 */
function wallClockToInstant(local: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;

  const naive = new Date(`${local.slice(0, 16)}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const first = new Date(naive.getTime() - zoneOffsetMs(naive, timeZone));
  return new Date(naive.getTime() - zoneOffsetMs(first, timeZone));
}

/**
 * An instant as a `datetime-local` value in `timeZone`.
 *
 * `sv-SE` is the shortest route to ISO-ordered parts out of `Intl`; the parts
 * are reassembled by hand rather than string-sliced because the separator
 * differs between runtimes.
 */
function localInputValue(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export interface ProposeTimeDialogProps {
  bookingId: string;
  /** The shop's own zone. Every time on this screen is its wall clock. */
  timezone: string;
  /** Slot length, so the end is derived rather than asked for twice. */
  durationMinutes: number;
  /** The slot the customer asked for, ISO. Prefilled so a nudge is one edit. */
  currentStart: string | null;
  /**
   * Request time, from the server render. A client component reading its own
   * clock would disagree with the markup it is hydrating and the `min` on the
   * input would flicker.
   */
  now: Date;
  /** Full width in the detail page's action column, inline on a queue card. */
  fullWidth?: boolean;
}

function ProposeTimeForm({
  bookingId,
  timezone,
  durationMinutes,
  currentStart,
  now,
}: Omit<ProposeTimeDialogProps, "fullWidth">) {
  const [state, formAction, pending] = useActionState(
    requestReschedule,
    BOOKING_INITIAL_STATE,
  );

  const startId = React.useId();
  const noteId = React.useId();

  /**
   * Rewrites the typed wall clock into absolute instants before the action sees
   * it. An unparseable value is posted as an empty string so the server produces
   * the message rather than this guessing at one and the two disagreeing.
   */
  function submit(formData: FormData) {
    const local = String(formData.get("startLocal") ?? "");
    const start = wallClockToInstant(local, timezone);
    const end = start ? new Date(start.getTime() + durationMinutes * 60 * 1000) : null;

    formData.set("slotStart", start ? start.toISOString() : "");
    formData.set("slotEnd", end ? end.toISOString() : "");
    formData.delete("startLocal");

    formAction(formData);
  }

  if (state.success) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Sent to the customer</DialogTitle>
          <DialogDescription>{state.message ?? "New time proposed."}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-enamel">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
            It is in their thread and on this job&apos;s timeline. Nothing has moved — the
            request is still open and still needs an answer from you.
          </p>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" size="sm">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <form action={submit}>
      <input type="hidden" name="bookingId" value={bookingId} />

      <DialogHeader>
        <DialogTitle>Propose a new time</DialogTitle>
        <DialogDescription>
          A suggestion, sent as a message. The customer decides.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm leading-relaxed text-steel">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          <span>
            This <strong className="font-semibold text-enamel">messages the customer</strong>{" "}
            and <strong className="font-semibold text-enamel">does not move the booking</strong>.
            The slot they asked for stands, and this request still needs you to accept or
            decline it.
          </span>
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={startId} className="eyebrow">
            The time you can do
          </label>
          <input
            id={startId}
            name="startLocal"
            type="datetime-local"
            required
            defaultValue={currentStart ? localInputValue(new Date(currentStart), timezone) : undefined}
            min={localInputValue(now, timezone)}
            className="w-full rounded-machined border border-hairline bg-chalk px-3 py-2 font-mono text-[0.95rem] tabular-nums text-enamel focus:border-signal focus:outline-none"
          />
          <p className="text-xs leading-relaxed text-steel">
            Your shop&apos;s clock ({timezone.replace(/_/g, " ")}). Runs for{" "}
            {formatDuration(durationMinutes)}, so the end is worked out for you.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="eyebrow">
            Note — optional
          </label>
          <Textarea
            id={noteId}
            name="note"
            rows={3}
            maxLength={2000}
            placeholder="Why the change, and what else you could do if that one does not suit."
          />
        </div>

        {state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Back
          </Button>
        </DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send suggestion"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProposeTimeDialog({ fullWidth = false, ...props }: ProposeTimeDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={fullWidth ? "w-full" : undefined}>
          <CalendarClock aria-hidden />
          Propose a new time
        </Button>
      </DialogTrigger>

      {/* The form lives inside the content so Radix unmounting it on close also
          resets its action state — reopening starts blank rather than on the
          previous attempt's error or its confirmation. */}
      <DialogContent>
        <ProposeTimeForm {...props} />
      </DialogContent>
    </Dialog>
  );
}
