"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_INITIAL_STATE, type BookingActionState } from "@/lib/bookings/state";
import { updateShopProfile } from "@/lib/dashboard/expert-actions";

/**
 * The public listing: the name, the pitch, how to make contact, where to go.
 *
 * Client because of `useActionState`. Every control is otherwise uncontrolled
 * (`defaultValue`), which is what keeps this clear of
 * `react-hooks/set-state-in-effect` — mirroring server values into state would
 * need an effect to resync them after each save, and the uncontrolled inputs
 * already hold what was typed across one.
 *
 * The fields here are exactly the ones `updateShopProfile` writes, plus two it
 * refuses. See `LockedField` for why those two are shown at all.
 */

import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/dashboard/expert/location-picker").then((mod) => mod.LocationPicker),
  { ssr: false, loading: () => <div className="h-[400px] bg-bench-sunk rounded-machined animate-pulse" /> }
);

export interface ShopProfileValues {
  fixerId: string;
  shopName: string;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

function splitAddress(address: string): { line: string; city: string; postcode: string } {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const last = parts[parts.length - 1] ?? "";

  if (parts.length >= 2 && UK_POSTCODE.test(last)) {
    const rest = parts.slice(0, -1);
    const city = rest.length >= 2 ? (rest[rest.length - 1] ?? "") : "";
    const line = (city ? rest.slice(0, -1) : rest).join(", ");
    return { line, city, postcode: last };
  }

  return { line: parts.join(", "), city: "", postcode: "" };
}

export function ShopProfileForm({ values }: { values: ShopProfileValues }) {
  const [state, formAction] = useActionState(updateShopProfile, BOOKING_INITIAL_STATE);
  const address = splitAddress(values.address);
  const [lat, setLat] = useState<number | null>(values.lat ?? null);
  const [lng, setLng] = useState<number | null>(values.lng ?? null);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="fixerId" value={values.fixerId} />
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      <Field
        label="Shop name"
        htmlFor="shopName"
        hint="The name on your listing, your booking confirmations and your invoices."
      >
        <Input
          id="shopName"
          name="shopName"
          defaultValue={values.shopName}
          required
          maxLength={120}
          autoComplete="organization"
        />
      </Field>

      <LockedField
        label="Tagline"
        id="tagline"
        placeholder="Screen repairs while you wait"
        hint="A one-line pitch under your shop name. There is no column for it on the listing yet, so this is locked rather than editable — a box that quietly threw away what you typed would be worse than one that says so."
      />

      <Field
        label="About the shop"
        htmlFor="description"
        hint="What you fix, how long jobs usually take, anything a customer should know before they turn up. Blank lines start a new paragraph on your public page."
      >
        <Textarea
          id="description"
          name="description"
          defaultValue={values.description ?? ""}
          rows={7}
          maxLength={4000}
          placeholder="We have repaired phones, tablets and laptops on the same bench since 2011…"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phone"
          htmlFor="contactPhone"
          hint="Shown on your listing and used for the call button."
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            defaultValue={values.contactPhone ?? ""}
            maxLength={32}
            autoComplete="tel"
            className="font-mono"
          />
        </Field>

        <Field
          label="Contact email"
          htmlFor="contactEmail"
          hint="Where customer enquiries land. Not your sign-in address, and not where payouts are confirmed."
        >
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={values.contactEmail ?? ""}
            maxLength={200}
            autoComplete="email"
            className="font-mono"
          />
        </Field>
      </div>

      <LockedField
        label="Website"
        id="website"
        placeholder="https://"
        hint="Same story as the tagline — the listing has nowhere to store a link yet. Put it in the About text for now and customers will still find it."
      />

      <fieldset className="flex flex-col gap-5 rounded-machined border border-hairline bg-bench-sunk/50 p-4">
        <legend className="eyebrow px-1">Where you are</legend>

        <Field
          label="Street address"
          htmlFor="address"
          hint="The line a customer follows to your door. Building name or number first."
        >
          <Input
            id="address"
            name="address"
            defaultValue={address.line}
            required
            minLength={4}
            maxLength={200}
            autoComplete="street-address"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Town or city" htmlFor="city">
            <Input
              id="city"
              name="city"
              defaultValue={address.city}
              maxLength={120}
              autoComplete="address-level2"
            />
          </Field>

          <Field label="Postcode" htmlFor="postcode">
            <Input
              id="postcode"
              name="postcode"
              defaultValue={address.postcode}
              maxLength={20}
              autoComplete="postal-code"
              className="font-mono uppercase"
            />
          </Field>
        </div>

        <p className="text-xs leading-relaxed text-steel-soft">
          These three are stored as one address line, so they appear on your listing
          exactly as they read here. Moving premises? Change the address and the map pin
          follows on the next refresh.
        </p>

        <LocationPicker 
          defaultLat={lat} 
          defaultLng={lng} 
          onChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }} 
        />
      </fieldset>

      <FormResult state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        <p className="text-xs text-steel-soft">
          Saved changes appear on your public page straight away.
        </p>
      </div>
    </form>
  );
}

/**
 * A field the listing has no column for.
 *
 * Disabled rather than dropped, for the same reason the SMS toggle in
 * Notifications is disabled rather than hidden: leaving it out makes a missing
 * column look like a missing feature and invites the question to be asked again.
 * `disabled` also means the browser posts nothing for it, so there is no value
 * for the server action to silently discard — which is the failure this is
 * avoiding, not merely a nicety.
 */
function LockedField({
  label,
  id,
  placeholder,
  hint,
}: {
  label: string;
  id: string;
  placeholder: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}{" "}
        <span className="normal-case tracking-normal text-steel-soft">(not yet stored)</span>
      </label>

      <div className="relative">
        <Input
          id={id}
          value=""
          readOnly
          disabled
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          className="pr-10 disabled:bg-bench-sunk disabled:text-steel disabled:opacity-100"
        />
        <Lock
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
        />
      </div>

      <p id={`${id}-hint`} className="text-xs leading-relaxed text-steel-soft">
        {hint}
      </p>
    </div>
  );
}

/** Label + control + hint, written once so no field ends up unlabelled. */
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
      {hint ? <p className="text-xs leading-relaxed text-steel-soft">{hint}</p> : null}
    </div>
  );
}

/**
 * The save outcome, announced as well as shown.
 *
 * A form full of uncontrolled inputs looks identical before and after a save,
 * so without this banner a refusal and a success are indistinguishable.
 */
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
        {state.message ?? "Shop profile saved."}
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
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}
