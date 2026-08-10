"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

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
 * Propose a different time for a booking.
 *
 * A proposal is not a reschedule. `requestReschedule` writes an audit entry and
 * a message and deliberately leaves the status alone — the other side agreeing
 * is what moves anything — so this dialog confirms "sent", never "changed".
 *
 * Two things it has to get right:
 *
 *   • **The time the customer types is the shop's wall clock**, matching every
 *     other time on the page. A bare `datetime-local` value has no zone, and
 *     the server action parses it with `new Date()`, which would resolve it in
 *     whatever region the server happens to run in. So the value is converted
 *     to an absolute instant here, against the shop's timezone, and posted as a
 *     full ISO string.
 *
 *   • **Only a start is asked for.** The end is the start plus the service's own
 *     duration. Two free-form inputs let someone propose a slot that ends before
 *     it begins, and a customer has no basis for choosing a length anyway.
 */

/**
 * How far `timeZone` is from UTC at a given instant, in milliseconds.
 *
 * Derived from `Intl` rather than a table because the offset is not a property
 * of the zone — it changes twice a year, and hard-coding "+1 in summer" is how
 * a booking lands an hour out on the last Sunday in October.
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
    // `hour12: false` renders midnight as 24 in some locales.
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
 * wrong instant (the naive one), which is off by an hour for a time that falls
 * near a DST change; the second pass re-reads the offset at the corrected
 * instant and converges. Away from a boundary the second pass is a no-op.
 */
function wallClockToInstant(local: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;

  const naive = new Date(`${local.slice(0, 16)}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const first = new Date(naive.getTime() - zoneOffsetMs(naive, timeZone));
  return new Date(naive.getTime() - zoneOffsetMs(first, timeZone));
}

interface RescheduleProps {
  bookingId: string;
  /** The shop's timezone — the zone the typed time is read in. */
  timeZone: string;
  /** Slot length, so the end can be derived rather than asked for. */
  durationMinutes: number;
  /** Current slot start as a `datetime-local` value in the shop's zone. */
  defaultLocal?: string;
  /** Now, same format — nothing earlier can be proposed. */
  minLocal?: string;
  /** Human name for the zone, shown so the typed time is unambiguous. */
  zoneLabel?: string;
}

function RescheduleForm({
  bookingId,
  timeZone,
  durationMinutes,
  defaultLocal,
  minLocal,
  zoneLabel,
}: RescheduleProps) {
  const [state, formAction, pending] = useActionState(
    requestReschedule,
    BOOKING_INITIAL_STATE,
  );

  const startId = React.useId();
  const noteId = React.useId();

  /**
   * Rewrites the typed wall clock into absolute instants before the server
   * action sees it. An unparseable value is posted as an empty string so the
   * action's own validation produces the message, rather than this guessing at
   * one and the two disagreeing.
   */
  function submit(formData: FormData) {
    const local = String(formData.get("startLocal") ?? "");
    const start = wallClockToInstant(local, timeZone);
    const end = start
      ? new Date(start.getTime() + durationMinutes * 60 * 1000)
      : null;

    formData.set("slotStart", start ? start.toISOString() : "");
    formData.set("slotEnd", end ? end.toISOString() : "");
    formData.delete("startLocal");

    formAction(formData);
  }

  if (state.success) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Time proposed</DialogTitle>
          <DialogDescription>
            {state.message ?? "New time proposed."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-enamel">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
            The shop has it in their thread and on this booking&apos;s timeline. Your
            existing slot stands until they agree.
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
          This sends the shop a suggestion. Nothing moves until they accept it.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={startId} className="eyebrow">
            New start time
          </label>
          <input
            id={startId}
            name="startLocal"
            type="datetime-local"
            required
            defaultValue={defaultLocal}
            min={minLocal}
            className="w-full rounded-machined border border-hairline bg-chalk px-3 py-2 font-mono text-[0.95rem] tabular-nums text-enamel focus:border-signal focus:outline-none"
          />
          <p className="text-xs text-steel">
            {zoneLabel ? `Times are the shop's local clock (${zoneLabel}). ` : ""}
            Runs for {formatDuration(durationMinutes)}.
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
            placeholder="Anything that helps them say yes — when you are free, why the change."
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
          {pending ? "Sending…" : "Send proposal"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RescheduleDialog(props: RescheduleProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <CalendarClock aria-hidden />
          Propose a new time
        </Button>
      </DialogTrigger>

      {/* The form lives in here so Radix unmounting the content on close also
          resets its action state — reopening starts blank rather than showing
          the previous attempt's error or its "sent" confirmation. */}
      <DialogContent>
        <RescheduleForm {...props} />
      </DialogContent>
    </Dialog>
  );
}
