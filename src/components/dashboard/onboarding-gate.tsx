"use client";

import { useActionState } from "react";
import { Phone, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
// The native `<select>` wrapper, which takes `<option>` children — not the
// Radix composite in `ui/select.tsx`, whose `Select` is a headless Root.
import { Input, Select } from "@/components/ui/input";
import { completeOnboarding } from "@/lib/bookings/actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import type { ContactMethod } from "@/lib/types/marketplace";

/**
 * The mandatory details prompt.
 *
 * Shown whenever `users.onboarded_at` is null, which means it survives the
 * customer closing the tab half-way through — the state lives in the database,
 * not in this component, so they are asked again on their next visit rather
 * than slipping through with a half-filled profile.
 *
 * "Cannot be skipped" is enforced in three places, because any one of them
 * alone is a suggestion rather than a rule:
 *
 *   1. **Here.** No close button, Escape ignored, clicking the overlay ignored.
 *   2. **The server action.** `completeOnboarding` re-validates every field, so
 *      a crafted POST cannot stamp `onboarded_at` with empty values.
 *   3. **The database.** `onboarded_at` is the single source of truth and is
 *      only ever written together with the fields it certifies.
 *
 * What it deliberately does NOT do is block the page underneath by unmounting
 * it. The dashboard still renders behind the overlay, so someone can see what
 * they signed up for while filling this in — and if the save is failing for a
 * reason we did not anticipate, they are not staring at a blank screen.
 */

const CONTACT_OPTIONS: { value: ContactMethod; label: string; hint: string }[] = [
  { value: "phone", label: "Phone call", hint: "Fastest for urgent repairs" },
  { value: "sms", label: "Text message", hint: "Quiet, and you keep a record" },
  { value: "email", label: "Email", hint: "Best for quotes and receipts" },
];

export function OnboardingGate({
  suggestedFullName,
  phone,
  preferredContact,
}: {
  suggestedFullName: string | null;
  phone: string | null;
  preferredContact: ContactMethod;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, BOOKING_INITIAL_STATE);

  return (
    <Dialog open>
      <DialogContent
        hideClose
        // Radix fires these before dismissing. Preventing the default is what
        // actually makes the dialog modal in the strict sense — `hideClose`
        // only removes the button, it does not stop Escape or an outside click.
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="max-w-md"
      >
        <form action={action} className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-signal">One more step</span>
            <DialogTitle className="font-display text-2xl uppercase tracking-tight text-enamel">
              Finish your details
            </DialogTitle>
            <p className="text-sm leading-relaxed text-steel">
              A shop needs a name to put on the job and a number to ring when your
              repair is ready. We ask once, and never share it publicly.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ob-fullName" className="eyebrow text-steel">
              Full name
            </label>
            <div className="relative">
              <UserRound
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
              />
              <Input
                id="ob-fullName"
                name="fullName"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                defaultValue={suggestedFullName ?? ""}
                placeholder="Priya Sharma"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ob-phone" className="eyebrow text-steel">
              Phone number
            </label>
            <div className="relative">
              <Phone
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
              />
              <Input
                id="ob-phone"
                name="phone"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                maxLength={25}
                defaultValue={phone ?? ""}
                placeholder="+91 98765 43210"
                className="pl-9 font-mono"
              />
            </div>
            <p className="text-xs text-steel-soft">
              Only the shop handling your booking ever sees this.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ob-contact" className="eyebrow text-steel">
              How should shops reach you?
            </label>
            <Select id="ob-contact" name="preferredContact" defaultValue={preferredContact}>
              {CONTACT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </Select>
          </div>

          {state.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-sm text-rust"
            >
              {state.error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save and continue"}
          </Button>

          <p className="flex items-start gap-2 text-xs text-steel-soft">
            <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            You can change any of this later under Settings.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
