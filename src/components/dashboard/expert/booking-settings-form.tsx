"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BOOKING_INITIAL_STATE, type BookingActionState } from "@/lib/bookings/state";
import { updateBookingSettings } from "@/lib/dashboard/expert-actions";
import type { FixerBookingSettings } from "@/lib/types/marketplace";

/**
 * How the diary behaves — the seven columns phase 3 of the migration adds to
 * `fixer_profiles`, in the order a shop owner thinks about them: am I open,
 * what notice do I need, how far ahead do I run, do I quote first, what do I
 * promise, what do I guarantee, where does the money go.
 *
 * Every number here is a promise made to a customer before they have met you,
 * so each one carries a sentence saying what it actually controls. "Lead hours"
 * is a column name; "how much notice you need before the first bookable slot"
 * is the thing being set.
 *
 * `acceptsBookings` is the only controlled input on the form. It has to be —
 * the warning below it is the whole reason this screen explains itself rather
 * than just saving, and a warning that only appears after a reload is a warning
 * nobody reads. Its state is seeded from the server value at mount and moved
 * only by `onCheckedChange`, so there is no effect resyncing it.
 */

/** Exactly the columns `updateBookingSettings` writes. */
export type BookingSettingsValues = Omit<FixerBookingSettings, "stripe_account_id">;

export function BookingSettingsForm({
  fixerId,
  values,
}: {
  fixerId: string;
  values: BookingSettingsValues;
}) {
  const [state, formAction] = useActionState(updateBookingSettings, BOOKING_INITIAL_STATE);
  const [acceptsBookings, setAcceptsBookings] = useState(values.accepts_bookings);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="fixerId" value={fixerId} />

      <div className="flex items-start justify-between gap-4 rounded-machined border border-hairline bg-bench-sunk/50 p-4">
        <div className="max-w-prose">
          <label
            htmlFor="acceptsBookings"
            className="font-display text-base uppercase tracking-wide text-enamel"
          >
            Taking bookings
          </label>
          <p id="acceptsBookings-hint" className="pt-1 text-sm leading-relaxed text-steel">
            Whether customers can request a slot with you at all.
          </p>
        </div>

        <Switch
          id="acceptsBookings"
          name="acceptsBookings"
          checked={acceptsBookings}
          onCheckedChange={setAcceptsBookings}
          aria-describedby="acceptsBookings-hint"
          className="mt-1 shrink-0"
        />
      </div>

      {/* Rendered from the switch's live position rather than the saved value:
          the consequence has to be visible while the decision is being made,
          not after it has been saved. */}
      {acceptsBookings ? null : (
        <p
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
        >
          <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="font-display uppercase tracking-wide">
              Your shop disappears from booking search.
            </strong>{" "}
            Nobody can request a new slot once this is saved, and you drop out of the
            results customers book from. Your public page stays up and jobs already in
            the diary are unaffected — but no new work reaches you until you switch this
            back on.
          </span>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          label="Notice needed"
          name="bookingLeadHours"
          unit="hours"
          defaultValue={values.booking_lead_hours}
          min={0}
          max={720}
          hint="How much notice you need before the first bookable slot. At 2, a customer looking now sees nothing sooner than two hours from now."
        />

        <NumberField
          label="Calendar opens for"
          name="bookingHorizonDays"
          unit="days"
          defaultValue={values.booking_horizon_days}
          min={1}
          max={365}
          hint="How far into the future customers can book. Beyond this the diary shows nothing at all."
        />

        <NumberField
          label="Response time"
          name="responseHours"
          unit="hours"
          defaultValue={values.response_hours}
          min={1}
          max={168}
          hint="The reply time shown on your listing and counted against you on the requests screen. Promise what you can keep."
        />

        <NumberField
          label="Default warranty"
          name="defaultWarrantyDays"
          unit="days"
          defaultValue={values.default_warranty_days}
          min={0}
          max={3650}
          hint="Applied to a finished job when its service sets no warranty of its own. Payouts are held until it expires."
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-machined border border-hairline bg-bench-sunk/50 p-4">
        <div className="max-w-prose">
          <label
            htmlFor="autoAccept"
            className="font-display text-base uppercase tracking-wide text-enamel"
          >
            Accept without quoting
          </label>
          <p id="autoAccept-hint" className="pt-1 text-sm leading-relaxed text-steel">
            Confirms a request straight away instead of waiting for you to price it. It
            skips the quote step entirely, so you are agreeing to take the job before you
            have seen it — leave it off for anything you would want to inspect first.
          </p>
        </div>

        {/* Deliberately not disabled when bookings are off. A disabled switch
            posts nothing, and the action reads an absent checkbox as false —
            saving would quietly turn auto-accept off for a shop that only meant
            to close its diary for a fortnight. */}
        <Switch
          id="autoAccept"
          name="autoAccept"
          defaultChecked={values.auto_accept}
          aria-describedby="autoAccept-hint"
          className="mt-1 shrink-0"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="payoutEmail" className="eyebrow">
          Payout email
        </label>
        <Input
          id="payoutEmail"
          name="payoutEmail"
          type="email"
          defaultValue={values.payout_email ?? ""}
          maxLength={200}
          autoComplete="email"
          aria-describedby="payoutEmail-hint"
          className="font-mono"
        />
        <p id="payoutEmail-hint" className="text-xs leading-relaxed text-steel-soft">
          Where remittance advice goes when we release money to you. Leave it blank and
          it follows your contact email.
        </p>
      </div>

      <FormResult state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        <p className="text-xs text-steel-soft">
          Changes apply to new requests. Anything already in the diary keeps the terms it
          was booked under.
        </p>
      </div>
    </form>
  );
}

/**
 * A whole-number setting with its unit beside it.
 *
 * `min`/`max` mirror the bounds `updateBookingSettings` enforces, so the browser
 * catches an out-of-range value before the round-trip. The server still checks
 * — a native constraint is a convenience, never the rule.
 */
function NumberField({
  label,
  name,
  unit,
  defaultValue,
  min,
  max,
  hint,
}: {
  label: string;
  name: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="eyebrow">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <Input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={1}
          required
          aria-describedby={`${name}-hint`}
          className="font-mono tabular-nums"
        />
        <span aria-hidden className="shrink-0 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
          {unit}
        </span>
      </div>

      <p id={`${name}-hint`} className="text-xs leading-relaxed text-steel-soft">
        {hint}
      </p>
    </div>
  );
}

/** The save outcome, announced as well as shown. */
function FormResult({ state }: { state: BookingActionState }) {
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
        {state.message ?? "Booking settings saved."}
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
      {pending ? "Saving…" : "Save booking settings"}
    </Button>
  );
}
