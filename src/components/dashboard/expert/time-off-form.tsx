"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle, CalendarOff, CheckCircle2, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { addTimeOff, removeTimeOff } from "@/lib/dashboard/expert-actions";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { BookingStatus } from "@/lib/types/marketplace";

/**
 * Holidays, trade fairs, the morning the boiler went.
 *
 * The part of this screen that earns its keep is the clash check. Blocking a
 * week out does **not** cancel the jobs already in it — `shop_time_off` only
 * stops new slots being offered — so a shop that shuts a fortnight it has work
 * in ends up with customers arriving at a locked door. Telling them which jobs
 * before the closure is saved is the whole point; telling them after would be a
 * receipt for a mistake.
 *
 * The comparison is done on WALL CLOCKS in the shop's zone, not on instants, and
 * that is deliberate. `<input type="datetime-local">` posts a bare
 * `YYYY-MM-DDTHH:mm` with no offset; the page renders every upcoming job into
 * the same shape through the shop's timezone, and two strings of that shape
 * compare lexically exactly as they compare chronologically. Resolving the typed
 * value to an instant here would mean a second, client-side copy of the DST
 * arithmetic in `expert-actions.ts` — which is unexported, being inside a
 * `"use server"` module — and a copy that drifts is worse than no copy. The one
 * cost is the repeated hour on an autumn clock change, where a job can be
 * flagged an hour wide; erring toward warning is the right side to be wrong on.
 */

/** One saved closure, already parsed out of its `tstzrange` by the page. */
export interface TimeOffEntry {
  id: string;
  /** ISO instants, for display. */
  start: string;
  end: string;
  /** `YYYY-MM-DDTHH:mm` in the shop's zone, for comparing against the form. */
  startLocal: string;
  endLocal: string;
  reason: string | null;
}

/** An upcoming job a proposed closure might land on top of. */
export interface ClashCandidate {
  id: string;
  reference: string;
  status: BookingStatus;
  customerName: string;
  serviceName: string | null;
  /** ISO instant, for display. */
  start: string;
  /** `YYYY-MM-DDTHH:mm` in the shop's zone. */
  startLocal: string;
  endLocal: string;
}

export function TimeOffForm({
  fixerId,
  timezone,
  closures,
  upcoming,
  now,
}: {
  fixerId: string;
  timezone: string;
  closures: TimeOffEntry[];
  upcoming: ClashCandidate[];
  /** Passed in rather than read here, so the server render and its hydration agree. */
  now: Date;
}) {
  const [addState, addAction] = useActionState(addTimeOff, BOOKING_INITIAL_STATE);
  const [removeState, removeAction] = useActionState(removeTimeOff, BOOKING_INITIAL_STATE);

  // Mirrored from the inputs in their own change handlers — an event handler,
  // never an effect. The clash list below is derived from these during render.
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  const fieldId = React.useId();
  const id = (field: string) => `${fieldId}-${field}`;

  const ranged = start !== "" && end !== "" && end > start;
  const backwards = start !== "" && end !== "" && end <= start;

  const clashes = ranged
    ? upcoming.filter((job) => job.startLocal < end && job.endLocal > start)
    : [];

  // A resubmit of the identical range would file a second closure over the top
  // of the first. The action cannot tell them apart — nothing stops a shop
  // legitimately booking two closures — so the form does.
  const duplicate =
    ranged && closures.some((row) => row.startLocal === start && row.endLocal === end);

  return (
    <section className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <div className="border-b border-hairline px-4 py-3 sm:px-5">
        <h3 className="font-display text-lg uppercase tracking-wide text-enamel">
          Time off
        </h3>
        <p className="max-w-prose pt-1 text-sm leading-relaxed text-steel">
          Blocks out the calendar whatever your opening hours say. It stops new
          bookings — it does not cancel the ones you already have.
        </p>
      </div>

      <form action={addAction} className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <input type="hidden" name="fixerId" value={fixerId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("start")}>Closes from</Label>
            <Input
              id={id("start")}
              name="start"
              type="datetime-local"
              required
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="font-mono tabular-nums"
              aria-describedby={id("zoneHint")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("end")}>Open again</Label>
            <Input
              id={id("end")}
              name="end"
              type="datetime-local"
              required
              min={start || undefined}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="font-mono tabular-nums"
              aria-describedby={id("zoneHint")}
            />
          </div>
        </div>

        <p id={id("zoneHint")} className="text-xs leading-relaxed text-steel-soft">
          Times are your shop&rsquo;s own — <span className="font-mono">{timezone}</span>.
          The end is exclusive, so closing until 09:00 leaves the 09:00 slot bookable.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("reason")}>Reason — optional</Label>
          <Input
            id={id("reason")}
            name="reason"
            type="text"
            maxLength={200}
            placeholder="Annual leave"
            aria-describedby={id("reasonHint")}
          />
          <p id={id("reasonHint")} className="text-xs text-steel-soft">
            Only you see this. It labels the block on your calendar.
          </p>
        </div>

        {backwards ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            The closure has to end after it starts.
          </p>
        ) : null}

        {/* The check the whole panel exists for. Rendered before the button, so
            it cannot be missed on the way to pressing it. */}
        {ranged && clashes.length > 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-machined border border-signal/30 bg-signal-wash px-3 py-3"
          >
            <p className="flex items-start gap-2 text-sm leading-relaxed text-signal">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">
                  {clashes.length === 1
                    ? "One job is already booked in that window."
                    : `${clashes.length} jobs are already booked in that window.`}
                </strong>{" "}
                Closing it does not cancel them. Move or cancel them first if you
                will not be there.
              </span>
            </p>

            <ul className="flex flex-col gap-2 pt-3">
              {clashes.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-machined border border-hairline bg-chalk px-3 py-2"
                >
                  <span className="min-w-0">
                    <Link
                      href={`/dashboard/expert/requests?booking=${encodeURIComponent(job.reference)}`}
                      className="font-display text-sm uppercase tracking-wide text-enamel hover:underline"
                    >
                      {job.customerName}
                    </Link>
                    <span className="block pt-0.5 font-mono text-eyebrow tabular-nums text-steel">
                      {formatDateTime(job.start, timezone)}
                      {job.serviceName ? (
                        <span className="font-sans normal-case tracking-normal text-steel-soft">
                          {" · "}
                          {job.serviceName}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <StatusBadge status={job.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {ranged && clashes.length === 0 ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            Nothing is booked in that window.
          </p>
        ) : null}

        {duplicate ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm leading-relaxed text-steel"
          >
            <CalendarOff aria-hidden className="mt-0.5 size-4 shrink-0" />
            That closure is already in your calendar.
          </p>
        ) : null}

        {addState.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {addState.error}
          </p>
        ) : null}

        {addState.success ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            {addState.message ?? "Closure added."}
          </p>
        ) : null}

        <div className="flex justify-end">
          <AddButton blocked={duplicate || backwards} />
        </div>
      </form>

      <div className="border-t border-hairline px-4 py-4 sm:px-5">
        <h4 className="eyebrow pb-3">Booked closures</h4>

        {removeState.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mb-3 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {removeState.error}
          </p>
        ) : null}

        {closures.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No time off booked"
            description="Nothing is blocked out. Your calendar follows your opening hours until you add a closure above."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {closures.map((closure) => {
              const label = `${formatDateTime(closure.start, timezone)} → ${formatDateTime(closure.end, timezone)}`;

              return (
                <li
                  key={closure.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-machined border border-hairline bg-bench px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm tabular-nums text-enamel">{label}</p>
                    <p className="pt-0.5 text-xs text-steel">
                      {closure.reason ?? "No reason given"}
                      <span className="text-steel-soft">
                        {" · starts "}
                        {formatRelative(closure.start, now)}
                      </span>
                    </p>
                  </div>

                  <form action={removeAction}>
                    <input type="hidden" name="id" value={closure.id} />
                    <RemoveButton label={label} />
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Separate components because `useFormStatus` reads the enclosing form. */
function AddButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || blocked}>
      {pending ? "Saving…" : "Block this out"}
    </Button>
  );
}

function RemoveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Remove closure ${label}`}
    >
      <Trash2 aria-hidden />
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}
