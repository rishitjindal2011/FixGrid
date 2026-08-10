"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/lib/bookings/actions";
import type { ContactMethod } from "@/lib/types/marketplace";

/**
 * The profile form.
 *
 * Client because of `useActionState` — a save that silently succeeds is the
 * complaint this whole screen exists to answer, so the outcome has to be
 * rendered, announced and specific.
 *
 * Every control is otherwise uncontrolled (`defaultValue` / `defaultChecked`).
 * That is deliberate: mirroring server data into `useState` would need an effect
 * to resync after a save, and `react-hooks/set-state-in-effect` is an error in
 * this config. Uncontrolled inputs keep what the user typed across a save
 * without a single line of syncing code.
 */

/** Read off the action, so a change to what it returns breaks here loudly. */
type ProfileFormState = Awaited<ReturnType<typeof updateProfile>>;

const INITIAL_STATE = { error: null, success: false } as ProfileFormState;

export interface ProfileFormValues {
  displayName: string;
  fullName: string | null;
  phone: string | null;
  timezone: string;
  preferredContact: ContactMethod;
  marketingOptIn: boolean;
}

/**
 * A short list, not the full ~600-zone IANA database. A select the user has to
 * scroll for a minute is worse than one that covers where our shops and
 * customers actually are; `extraZone` below is the escape hatch for anyone
 * outside it.
 */
const TIMEZONES: readonly string[] = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Zurich",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "UTC",
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  email: "Email",
  phone: "Phone call",
  sms: "Text message",
};

const CONTACT_METHODS = Object.keys(CONTACT_METHOD_LABELS) as ContactMethod[];

export function ProfileForm({
  values,
  email,
}: {
  values: ProfileFormValues;
  /** From the auth session. Rendered, never posted — see the note below. */
  email: string | null;
}) {
  const [state, formAction] = useActionState(updateProfile, INITIAL_STATE);

  // A saved zone outside the shortlist would otherwise be silently rewritten to
  // whichever option happens to render first — a settings form that changes a
  // setting you did not touch. Appending it keeps the save lossless.
  const extraZone = TIMEZONES.includes(values.timezone) ? null : values.timezone;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Display name"
          htmlFor="displayName"
          hint="Shown to shops you book with."
        >
          <Input
            id="displayName"
            name="displayName"
            defaultValue={values.displayName}
            required
            maxLength={80}
            autoComplete="nickname"
          />
        </Field>

        <Field
          label="Full name"
          htmlFor="fullName"
          hint="Used on invoices and for home visits."
        >
          <Input
            id="fullName"
            name="fullName"
            defaultValue={values.fullName ?? ""}
            maxLength={120}
            autoComplete="name"
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          hint="How a shop reaches you if a job needs a decision."
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={values.phone ?? ""}
            maxLength={32}
            autoComplete="tel"
            className="font-mono"
          />
        </Field>

        <Field
          label="Timezone"
          htmlFor="timezone"
          hint="Booking times are shown in the shop's zone; reminders use yours."
        >
          <Select id="timezone" name="timezone" defaultValue={values.timezone}>
            {extraZone ? <option value={extraZone}>{extraZone}</option> : null}
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Preferred contact"
          htmlFor="preferredContact"
          hint="Shops see this before they get in touch."
        >
          <Select
            id="preferredContact"
            name="preferredContact"
            defaultValue={values.preferredContact}
          >
            {CONTACT_METHODS.map((method) => (
              <option key={method} value={method}>
                {CONTACT_METHOD_LABELS[method]}
              </option>
            ))}
          </Select>
        </Field>

        <EmailField email={email} />
      </div>

      {/* Unticked by default and never pre-ticked from the server: under PECR a
          pre-ticked box is not consent. */}
      <ToggleRow
        id="marketingOptIn"
        name="marketingOptIn"
        defaultChecked={values.marketingOptIn}
        title="Occasional updates"
        description="New shops in your area, seasonal repair guides. Never more than monthly, and nothing about your bookings — those are separate, under Notifications."
      />

      <FormResult state={state} />

      <div className="flex items-center gap-3">
        <SaveButton />
        <p className="text-xs text-steel-soft">
          Changes apply straight away across the site.
        </p>
      </div>
    </form>
  );
}

/**
 * Email, read-only and honest about why.
 *
 * Changing the sign-in address means confirming both the old and the new one —
 * otherwise a hijacked session can quietly move the account out of reach of its
 * owner. That flow does not exist yet, and an editable field that discards what
 * you typed is worse than a locked one that explains itself.
 *
 * The input is `disabled`, so the browser posts nothing for it. `readOnly`
 * would still submit, and a server action that trusted it would be accepting an
 * address it must not.
 */
function EmailField({ email }: { email: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor="email" className="eyebrow">
        Email
      </label>

      <div className="relative">
        <Input
          id="email"
          type="email"
          value={email ?? ""}
          disabled
          readOnly
          aria-describedby="email-hint"
          className="pr-10 font-mono disabled:opacity-100 disabled:bg-bench-sunk disabled:text-steel"
        />
        <Lock
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
        />
      </div>

      <p id="email-hint" className="text-xs leading-relaxed text-steel-soft">
        Your email is also how you sign in, so changing it needs a confirmation
        link sent to both the old and the new address. Email support and we will
        start that off — we would rather tell you that than give you a box that
        looks like it works and doesn&rsquo;t.
      </p>
    </div>
  );
}

/** Label + control + hint. Written once so no field ends up unlabelled. */
function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="eyebrow">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-steel-soft">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * A switch in a labelled row.
 *
 * Radix renders a hidden checkbox alongside the switch when it has a `name`, so
 * this posts the normal HTML contract — `"on"` when checked, absent when not.
 * Keeping that contract is what lets the server action parse it the same way it
 * parses any other checkbox.
 */
function ToggleRow({
  id,
  name,
  defaultChecked,
  title,
  description,
}: {
  id: string;
  name: string;
  defaultChecked: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-machined border border-hairline bg-bench-sunk/50 p-4">
      <div className="max-w-prose">
        <label
          htmlFor={id}
          className="font-display text-base uppercase tracking-wide text-enamel"
        >
          {title}
        </label>
        <p id={`${id}-hint`} className="pt-1 text-sm leading-relaxed text-steel">
          {description}
        </p>
      </div>

      <Switch
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        aria-describedby={`${id}-hint`}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

/**
 * The save outcome.
 *
 * `role="status"` with `aria-live="polite"` because the visual change — a green
 * bar appearing below the form — is invisible to a screen reader that has
 * already moved past it.
 */
function FormResult({ state }: { state: ProfileFormState }) {
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
        Profile saved.
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
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}
