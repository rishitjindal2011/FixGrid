"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPrefs } from "@/lib/bookings/actions";

/**
 * Notification preferences.
 *
 * Every row is an uncontrolled `Switch` with a `name`, so Radix's hidden
 * checkbox posts the standard HTML contract — `"on"` when checked, absent when
 * not — and the server action reads it like any other checkbox. No client state
 * means nothing to resync after a save, which is what keeps this component
 * clear of `react-hooks/set-state-in-effect`.
 *
 * The form saves all five at once rather than one switch at a time. Per-toggle
 * autosave reads as instant but has no honest failure state: a switch that
 * flips back two seconds later, with no explanation, is exactly the silent
 * failure this screen is meant to avoid.
 */

/** Read off the action, so a change to what it returns breaks here loudly. */
type NotificationPrefsFormState = Awaited<ReturnType<typeof updateNotificationPrefs>>;

const INITIAL_STATE = { error: null, success: false } as NotificationPrefsFormState;

export interface NotificationPrefsValues {
  emailBookings: boolean;
  emailMessages: boolean;
  emailReminders: boolean;
  emailMarketing: boolean;
  smsReminders: boolean;
}

interface ToggleSpec {
  name: keyof NotificationPrefsValues;
  title: string;
  description: string;
}

const EMAIL_TOGGLES: ToggleSpec[] = [
  {
    name: "emailBookings",
    title: "Booking updates",
    description:
      "When a shop accepts, quotes, declines, starts or finishes a job. Turning this off means you find out by checking the dashboard.",
  },
  {
    name: "emailMessages",
    title: "New messages",
    description: "When a shop replies to you about a booking.",
  },
  {
    name: "emailReminders",
    title: "Appointment reminders",
    description: "The morning before a confirmed slot, and when a warranty is about to run out.",
  },
  {
    name: "emailMarketing",
    title: "Occasional updates",
    description:
      "New shops in your area and seasonal repair guides. Nothing about your own bookings.",
  },
];

const SMS_TOGGLES: ToggleSpec[] = [
  {
    name: "smsReminders",
    title: "Appointment reminders",
    description:
      "A text an hour before a confirmed slot. Needs a phone number on your profile — add one there first.",
  },
];

export function NotificationPrefsForm({
  values,
  hasPhone,
}: {
  values: NotificationPrefsValues;
  /** SMS is offered but disabled without a number — see the note on the row. */
  hasPhone: boolean;
}) {
  const [state, formAction] = useActionState(updateNotificationPrefs, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow pb-2">Email</legend>
        <div className="divide-y divide-hairline rounded-machined border border-hairline bg-chalk shadow-bench">
          {EMAIL_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.name}
              spec={toggle}
              defaultChecked={values[toggle.name]}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow pb-2">Text message</legend>
        <div className="divide-y divide-hairline rounded-machined border border-hairline bg-chalk shadow-bench">
          {SMS_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.name}
              spec={toggle}
              defaultChecked={values[toggle.name] && hasPhone}
              // Disabled rather than hidden: hiding it would make the missing
              // phone number look like a missing feature. A disabled control
              // posts nothing, so saving here cannot switch SMS on for an
              // account we have no way to text.
              disabled={!hasPhone}
            />
          ))}
        </div>
      </fieldset>

      <FormResult state={state} />

      <div className="flex items-center gap-3">
        <SaveButton />
        <p className="text-xs text-steel-soft">
          Transactional email about a live booking is always sent — we cannot let a
          shop&rsquo;s reply go nowhere.
        </p>
      </div>
    </form>
  );
}

function ToggleRow({
  spec,
  defaultChecked,
  disabled = false,
}: {
  spec: ToggleSpec;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
      <div className="max-w-prose">
        <label
          htmlFor={spec.name}
          className="font-display text-base uppercase tracking-wide text-enamel"
        >
          {spec.title}
        </label>
        <p id={`${spec.name}-hint`} className="pt-1 text-sm leading-relaxed text-steel">
          {spec.description}
        </p>
      </div>

      <Switch
        id={spec.name}
        name={spec.name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-describedby={`${spec.name}-hint`}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

/**
 * The save outcome, announced rather than merely shown.
 *
 * Toggling five switches and pressing save gives no visible feedback of its own
 * — the switches already look the way the user left them — so without this
 * banner a successful save and a failed one are indistinguishable.
 */
function FormResult({ state }: { state: NotificationPrefsFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        aria-live="polite"
        className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
      >
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
      >
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
        Preferences saved. New settings apply to the next message we send.
      </p>
    );
  }

  return null;
}

/** Separate component because `useFormStatus` reads the enclosing form. */
function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save preferences"}
    </Button>
  );
}
