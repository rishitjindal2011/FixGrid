import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ContactMethod } from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Whether this account has given us the details every booking depends on.
 *
 * A shop cannot act on a request without a name to put on the job and a number
 * to ring when the device is ready, so these are collected once, up front, and
 * not treated as optional profile polish.
 *
 * **`onboarded_at` is the flag, not "are the fields non-empty".** The two come
 * apart in a way that matters: a customer may later clear their phone number
 * from settings, and re-prompting them with a blocking dialog at that point
 * would be a trap — they just told us deliberately. `onboarded_at` records that
 * the question was *asked and answered*, which is the thing we actually want to
 * avoid repeating. The settings form owns the fields from then on.
 *
 * The completeness check below is therefore only used for the first pass, where
 * `onboarded_at` is null and we need to know how much of the form to pre-fill —
 * an account created before this flow existed may already have a full name from
 * `handle_new_user`.
 */

export interface OnboardingStatus {
  /** True once the dialog has been completed. Drives whether the gate renders. */
  complete: boolean;
  fullName: string | null;
  phone: string | null;
  preferredContact: ContactMethod;
  /** Falls back to the display name so the first field is rarely empty. */
  suggestedFullName: string | null;
}

interface OnboardingRow {
  full_name: string | null;
  phone: string | null;
  preferred_contact: ContactMethod | null;
  onboarded_at: string | null;
  display_name: string | null;
}

/**
 * Read the gate's state for one account.
 *
 * Degrades to `complete: true` on error, which is the opposite of this
 * directory's usual "empty state" fallback and is deliberate. Before the
 * migration runs, `onboarded_at` does not exist and this read fails with 42703
 * — treating that as "not onboarded" would put an undismissable dialog in front
 * of every dashboard page with a save button that can only fail. Locking the
 * user out of their own dashboard is a far worse failure than a skipped prompt,
 * so an unreadable status means the gate stays shut.
 *
 * Reads through `my_profile()` for the reason given in `settings.ts`: migration
 * 009 revoked `full_name`/`phone` from the `authenticated` role's column grant
 * on `users`, because anonymous callers could otherwise read every phone number
 * on the platform. The RPC resolves its own subject from `auth.uid()`, so this
 * takes no user id — the session is the parameter.
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_profile").maybeSingle<OnboardingRow>();

  if (error) {
    logReadFailure("[dashboard] onboarding status failed", error);
    return {
      complete: true,
      fullName: null,
      phone: null,
      preferredContact: "email",
      suggestedFullName: null,
    };
  }

  // No row is a real state, not an error: `handle_new_user` creates it on
  // signup, but a hand-inserted auth user has no profile. Prompt in that case
  // rather than silently skipping — the insert below is an upsert.
  if (!data) {
    return {
      complete: false,
      fullName: null,
      phone: null,
      preferredContact: "email",
      suggestedFullName: null,
    };
  }

  return {
    complete: data.onboarded_at !== null,
    fullName: data.full_name,
    phone: data.phone,
    preferredContact: data.preferred_contact ?? "email",
    suggestedFullName: data.full_name ?? data.display_name,
  };
}
