import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ContactMethod,
  NotificationPrefsRow,
  UserAddressRow,
  UserProfileRow,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Settings reads.
 *
 * Same contract as `customer.ts` — every read degrades to a default rather than
 * throwing — but settings has a failure mode the booking reads do not, and it
 * shapes this whole file:
 *
 *   **`users` already exists, and is narrower than the app thinks.** The other
 *   dashboard tables (`bookings`, `notification_prefs`, `user_addresses`) are
 *   created wholesale by `001_marketplace.sql`, so before it runs they are
 *   simply absent and a query against them fails as "relation does not exist".
 *   `users` is different: it has shipped since day one with four columns, and
 *   the migration *widens* it with `add column if not exists`. So the profile
 *   read is the one query here that fails on a column (42703), not a table, and
 *   it fails for a row that genuinely exists and that we can still show most of.
 *
 *   `getProfile` therefore retries against the guaranteed-present columns rather
 *   than giving up. Someone on an un-migrated database still sees their own name
 *   on the settings screen, with the new fields sitting at their schema
 *   defaults, which is a far better answer than an empty page.
 */

/* ── Profile ──────────────────────────────────────────────────────────────── */

/**
 * The four columns `users` has carried since before the marketplace phase, and
 * the only ones still readable directly by the `authenticated` role after
 * migration 009. Everything wider comes back from `my_profile()`.
 */
const BASE_PROFILE_COLUMNS = "id, display_name, avatar_url, created_at";

/**
 * Schema defaults, mirrored from `001_marketplace.sql`.
 *
 * Duplicated here on purpose: these are what the database will apply the moment
 * the migration lands, so a form rendered against a narrow `users` row shows the
 * value it is about to have rather than a blank the user has to guess at.
 */
const PROFILE_DEFAULTS = {
  timezone: "Europe/London",
  preferred_contact: "email" as ContactMethod,
  marketing_opt_in: false,
  phone_verified: false,
} as const;

export type SettingsProfile = UserProfileRow;

/**
 * The caller's own profile.
 *
 * Goes through the `my_profile()` RPC rather than `select ... eq('id', userId)`
 * because migration 009 revoked column-level SELECT on the sensitive half of
 * `users` from the `authenticated` role. Anonymous visitors could previously
 * read every phone number on the platform (25 rows, confirmed by probe), and
 * the only mechanism that closes that is a column grant — which is per-role,
 * not per-row, so it takes the columns away from the row's own owner too.
 *
 * `my_profile()` is SECURITY DEFINER and filters on `auth.uid()` internally, so
 * the subject is the session rather than a parameter. `userId` stays in the
 * signature for call-site symmetry and is asserted against the session below:
 * every existing caller already passes the signed-in user's own id, and a
 * mismatch means a caller changed in a way this function will not serve.
 */
export async function getProfile(userId: string): Promise<SettingsProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_profile").maybeSingle<SettingsProfile>();

  if (!error) {
    if (data && data.id !== userId) {
      // Not reachable through any current call site; if it ever is, the caller
      // wants somebody else's profile and must go through an explicit,
      // authorised path rather than silently receiving their own.
      logReadFailure("[settings] profile subject mismatch", {
        message: "my_profile() returned a different user than requested",
      });
      return null;
    }
    return data ?? null;
  }

  logReadFailure("[settings] profile read failed", error);

  // Pre-009 databases have no `my_profile()` (42883 undefined_function), and
  // pre-001 ones lack the widened columns. Both land here, and both can still
  // answer from the four columns `users` has carried since day one.
  const { data: base, error: baseError } = await supabase
    .from("users")
    .select(BASE_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<Pick<UserProfileRow, "id" | "display_name" | "avatar_url" | "created_at">>();

  if (baseError || !base) {
    if (baseError) logReadFailure("[settings] profile fallback read failed", baseError);
    return null;
  }

  return {
    ...base,
    full_name: null,
    phone: null,
    onboarded_at: null,
    updated_at: base.created_at,
    ...PROFILE_DEFAULTS,
  };
}

/* ── Notification preferences ─────────────────────────────────────────────── */

export type NotificationPrefs = Omit<NotificationPrefsRow, "created_at" | "updated_at">;

/**
 * Defaults from the migration: transactional email on, marketing off, SMS off.
 *
 * Opt-in marketing is not a style choice — under UK PECR a pre-ticked marketing
 * box is not consent, so `false` here has to match `false` in the column.
 */
function defaultPrefs(userId: string): NotificationPrefs {
  return {
    user_id: userId,
    email_bookings: true,
    email_messages: true,
    email_reminders: true,
    email_marketing: false,
    sms_reminders: false,
  };
}

/**
 * Never null.
 *
 * `ensure_notification_prefs` creates a row on signup, but the missing row is
 * the *common* case rather than the edge: every account that predates the
 * migration has none, and the trigger only fires on insert. A caller forced to
 * handle null would end up re-deriving these defaults at each call site, and the
 * form would drift from the column defaults the first time one of them changed.
 */
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_prefs")
    .select(
      "user_id, email_bookings, email_messages, email_reminders, email_marketing, sms_reminders",
    )
    .eq("user_id", userId)
    .maybeSingle<NotificationPrefs>();

  if (error) {
    logReadFailure("[settings] notification prefs read failed", error);
    return defaultPrefs(userId);
  }

  return data ?? defaultPrefs(userId);
}

/* ── Saved addresses ──────────────────────────────────────────────────────── */

/**
 * Ordered default-first, then newest.
 *
 * `user_addresses_one_default` is a partial unique index, so at most one row per
 * user is default and this ordering is stable rather than merely usually right.
 */
export async function listAddresses(userId: string): Promise<UserAddressRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_addresses")
    .select(
      "id, user_id, label, line1, line2, city, postcode, country, lat, lng, is_default, created_at",
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<UserAddressRow[]>();

  if (error) {
    logReadFailure("[settings] addresses read failed", error);
    return [];
  }

  return data ?? [];
}

/* ── Account security ─────────────────────────────────────────────────────── */

export interface AccountSecurity {
  email: string | null;
  /** Null when the address has never been confirmed. */
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
  /** `email`, `google`, … — one entry per linked identity. */
  providers: string[];
}

/**
 * Facts about the auth account itself, which live on `auth.users` and are
 * reachable only through the auth API — `public.users` has no copy of them, by
 * design, since duplicating a credential timestamp is how the two drift.
 *
 * Takes no `userId`: it reports on whoever holds the session. Passing an id
 * would imply you could ask about someone else, and you cannot.
 */
export async function getAccountSecurity(): Promise<AccountSecurity | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (error) logReadFailure("[settings] auth account read failed", error);
    return null;
  }

  return {
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at ?? null,
    providers: user.identities?.map((identity) => identity.provider) ?? [],
  };
}
