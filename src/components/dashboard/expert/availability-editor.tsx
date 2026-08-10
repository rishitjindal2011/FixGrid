"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { setWeeklyAvailability } from "@/lib/dashboard/expert-actions";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/**
 * The trading week, edited as one thing and saved in one submit.
 *
 * `setWeeklyAvailability` replaces the whole week — it deletes every row for the
 * shop and re-inserts what the form posted — so the form has to post every day
 * whether it changed or not. That is why there is a single `<form>` around all
 * seven rows and a single Save at the bottom, rather than a save per day: a
 * per-day submit against a replace-everything action would wipe the other six.
 *
 * Field names are `day-mon-open`, `day-mon-start`, `day-mon-end`,
 * `day-mon-buffer` and `day-mon-capacity`. They are built from the `Weekday`
 * union rather than typed out, so a rename in the enum is a compile error here
 * rather than a form that silently posts nothing the action recognises.
 *
 * The one piece of client state is the week itself, and it earns it: the plain
 * English summary has to track what is typed, not what was last saved, or an
 * owner reads back a sentence describing the hours they are about to replace.
 * It is seeded once on mount and never pushed back into sync from props —
 * `react-hooks/set-state-in-effect` is an error in this repo, and the only thing
 * that writes these rows is this form, so after a save the two already agree.
 */

/** One `shop_availability` row, narrowed to what this form edits. */
export interface WeeklyHours {
  weekday: Weekday;
  /** `HH:MM:SS` from the `time` column. */
  startsAt: string;
  endsAt: string;
  bufferMinutes: number;
  capacity: number;
}

interface DayDraft {
  open: boolean;
  /** `HH:MM`, which is what `<input type="time">` posts and the action parses. */
  start: string;
  end: string;
  /** Kept as strings: these are what the inputs hold, and "" is a real state. */
  buffer: string;
  capacity: string;
}

type WeekDraft = Record<Weekday, DayDraft>;

const BLANK_DAY: DayDraft = {
  open: false,
  start: "09:00",
  end: "17:00",
  buffer: "15",
  capacity: "1",
};

/**
 * What a shop with nothing saved sees pencilled in.
 *
 * A suggestion, not a saved state — the copy beside the summary says so. Landing
 * on seven closed days would make the most common setup (a normal working week)
 * a seven-step chore before the first save.
 */
const SUGGESTED_OPEN: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

/** Mirrors the `bounded` limits in `setWeeklyAvailability`, so the form and the action agree. */
const BUFFER_MAX = 240;
const CAPACITY_MAX = 20;

function seedWeek(rows: WeeklyHours[]): WeekDraft {
  const byDay = new Map<Weekday, WeeklyHours>();
  // First window wins. A day can carry several in the table; this form edits one
  // per day and warns about the rest rather than pretending they are not there.
  for (const row of rows) {
    if (!byDay.has(row.weekday)) byDay.set(row.weekday, row);
  }

  const draft = {} as WeekDraft;

  for (const day of WEEKDAYS) {
    const row = byDay.get(day);
    draft[day] = row
      ? {
          open: true,
          start: row.startsAt.slice(0, 5),
          end: row.endsAt.slice(0, 5),
          buffer: String(row.bufferMinutes),
          capacity: String(row.capacity),
        }
      : { ...BLANK_DAY, open: rows.length === 0 && SUGGESTED_OPEN.includes(day) };
  }

  return draft;
}

/* ── Plain English ────────────────────────────────────────────────────────── */

function sameShape(a: DayDraft, b: DayDraft): boolean {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.buffer === b.buffer &&
    a.capacity === b.capacity
  );
}

function shortLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day].slice(0, 3);
}

/**
 * "Mon–Fri 09:00–17:00, 30 min buffer, 2 jobs at a time".
 *
 * Contiguous days sharing every setting collapse into a range, the same way
 * `toSchemaOpeningHours` folds a week for JSON-LD. A shop reads its own hours as
 * "weekdays nine to five", not as five identical lines, and a summary that does
 * not fold is a summary nobody checks.
 */
function describeWeek(draft: WeekDraft): string[] {
  const runs: Array<{ start: Weekday; end: Weekday; day: DayDraft }> = [];

  for (const day of WEEKDAYS) {
    const entry = draft[day];
    if (!entry.open) continue;

    const previous = runs[runs.length - 1];
    const contiguous =
      previous !== undefined &&
      WEEKDAYS.indexOf(day) === WEEKDAYS.indexOf(previous.end) + 1 &&
      sameShape(previous.day, entry);

    if (contiguous && previous) previous.end = day;
    else runs.push({ start: day, end: day, day: entry });
  }

  return runs.map((run) => {
    const days =
      run.start === run.end
        ? shortLabel(run.start)
        : `${shortLabel(run.start)}–${shortLabel(run.end)}`;

    const buffer = Number(run.day.buffer);
    const capacity = Number(run.day.capacity);

    const bufferPhrase =
      Number.isFinite(buffer) && buffer > 0 ? `${buffer} min buffer` : "no gap between jobs";
    const capacityPhrase =
      Number.isFinite(capacity) && capacity > 1
        ? `${capacity} jobs at a time`
        : "one job at a time";

    return `${days} ${run.day.start}–${run.day.end}, ${bufferPhrase}, ${capacityPhrase}`;
  });
}

/* ── The editor ───────────────────────────────────────────────────────────── */

export function AvailabilityEditor({
  fixerId,
  rows,
}: {
  fixerId: string;
  rows: WeeklyHours[];
}) {
  const [state, formAction] = useActionState(setWeeklyAvailability, BOOKING_INITIAL_STATE);
  const [week, setWeek] = React.useState<WeekDraft>(() => seedWeek(rows));

  const fieldId = React.useId();
  const id = (day: Weekday, field: string) => `${fieldId}-${day}-${field}`;

  // Derived every render from what is typed, never mirrored into state.
  const summary = describeWeek(week);
  const nothingOpen = summary.length === 0;
  const unsaved = rows.length === 0;

  // A day may hold several windows in the table — a morning bench and an
  // afternoon one. This form edits the first and the save replaces the week, so
  // the extras would vanish without a word. Saying so is the difference between
  // a limitation and data loss.
  const droppedWindows = rows.length - new Set(rows.map((row) => row.weekday)).size;

  const update = (day: Weekday, patch: Partial<DayDraft>): void => {
    setWeek((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  };

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench"
    >
      <input type="hidden" name="fixerId" value={fixerId} />

      <div className="border-b border-hairline px-4 py-3 sm:px-5">
        <h3 className="font-display text-lg uppercase tracking-wide text-enamel">
          Opening hours
        </h3>
        <p className="max-w-prose pt-1 text-sm leading-relaxed text-steel">
          The grid customers are offered slots from. The buffer is your turnaround
          after a job, not before it — it blocks the slot that would follow.
        </p>
      </div>

      {/* Column headings on desktop only. Every input keeps a real label
          underneath, visible on a phone and screen-reader-only from `md` up. */}
      <div
        aria-hidden
        className="hidden border-b border-hairline bg-bench-sunk px-4 py-2 md:grid md:grid-cols-[7.5rem_repeat(4,minmax(0,1fr))] md:gap-3 sm:px-5"
      >
        <span className="eyebrow">Day</span>
        <span className="eyebrow">Opens</span>
        <span className="eyebrow">Closes</span>
        <span className="eyebrow">Buffer — min</span>
        <span className="eyebrow">At a time</span>
      </div>

      <ul>
        {WEEKDAYS.map((day) => {
          const entry = week[day];

          return (
            <li
              key={day}
              className={cn(
                "border-b border-hairline px-4 py-3 sm:px-5",
                !entry.open && "bg-bench-sunk/40",
              )}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[7.5rem_repeat(4,minmax(0,1fr))] md:items-center">
                <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                  <Switch
                    id={id(day, "open")}
                    name={`day-${day}-open`}
                    checked={entry.open}
                    onCheckedChange={(open) => update(day, { open })}
                  />
                  <label
                    htmlFor={id(day, "open")}
                    className="font-display text-base uppercase tracking-wide text-enamel"
                  >
                    {WEEKDAY_LABELS[day]}
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id(day, "start")} className="md:sr-only">
                    {WEEKDAY_LABELS[day]} opens
                  </Label>
                  <Input
                    id={id(day, "start")}
                    name={`day-${day}-start`}
                    type="time"
                    required={entry.open}
                    disabled={!entry.open}
                    value={entry.start}
                    onChange={(event) => update(day, { start: event.target.value })}
                    className="font-mono tabular-nums"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id(day, "end")} className="md:sr-only">
                    {WEEKDAY_LABELS[day]} closes
                  </Label>
                  <Input
                    id={id(day, "end")}
                    name={`day-${day}-end`}
                    type="time"
                    required={entry.open}
                    disabled={!entry.open}
                    value={entry.end}
                    onChange={(event) => update(day, { end: event.target.value })}
                    className="font-mono tabular-nums"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id(day, "buffer")} className="md:sr-only">
                    {WEEKDAY_LABELS[day]} buffer in minutes
                  </Label>
                  <Input
                    id={id(day, "buffer")}
                    name={`day-${day}-buffer`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={BUFFER_MAX}
                    step={5}
                    required={entry.open}
                    disabled={!entry.open}
                    value={entry.buffer}
                    onChange={(event) => update(day, { buffer: event.target.value })}
                    className="font-mono tabular-nums"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id(day, "capacity")} className="md:sr-only">
                    {WEEKDAY_LABELS[day]} jobs at a time
                  </Label>
                  <Input
                    id={id(day, "capacity")}
                    name={`day-${day}-capacity`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={CAPACITY_MAX}
                    step={1}
                    required={entry.open}
                    disabled={!entry.open}
                    value={entry.capacity}
                    onChange={(event) => update(day, { capacity: event.target.value })}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="eyebrow pb-2">What this means</p>

          {nothingOpen ? (
            <p className="text-sm leading-relaxed text-rust">
              Every day is switched off. Nobody can pick a slot with you until at
              least one day is open.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {summary.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-enamel">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {unsaved && !nothingOpen ? (
            <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-steel">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Nothing is saved yet — this is a standard week we have pencilled in.
              Change what is wrong with it and save.
            </p>
          ) : null}
        </div>

        {droppedWindows > 0 ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-machined border border-signal/30 bg-signal-wash px-3 py-2.5 text-sm leading-relaxed text-signal"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {droppedWindows === 1
              ? "One of your days has a second opening window — a morning and an afternoon bench, say. This editor holds one window a day, so saving here will drop it."
              : `${droppedWindows} of your days have a second opening window. This editor holds one window a day, so saving here will drop them.`}
          </p>
        ) : null}

        {state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.message ?? "Opening hours saved."}
          </p>
        ) : null}

        <div className="flex justify-end">
          <SaveButton />
        </div>
      </div>
    </form>
  );
}

/** Separate component because `useFormStatus` reads the enclosing form. */
function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save opening hours"}
    </Button>
  );
}
