"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authCallbackUrl } from "@/lib/auth/origin";
import { localizedTarget, safeNextPath } from "@/lib/auth/paths";
import type { AuthState } from "@/lib/auth/state";
import { CANONICAL_ORIGIN } from "@/lib/site";

/**
 * Visitor authentication (Supabase Auth, email + password).
 *
 * Properties this is built around, matching the admin app's posture:
 *
 *   1. **No account enumeration.** Sign-in reports one message for every
 *      failure. Password reset and sign-up both report success even when the
 *      address is unknown or already registered — otherwise the form becomes a
 *      free "is this person a customer here" oracle.
 *
 *   2. **Throttling.** Auth calls leave the process and cost real money per
 *      request. A per-IP counter caps abuse. It is in-process, so it resets on
 *      deploy and does not span instances — fine as a brake, and the obvious
 *      place to swap in Redis. It is not an authorisation control.
 *
 *   3. **Passwords never leave the server.** These are Server Actions; the form
 *      posts directly to them and the plaintext exists only in this scope.
 *
 * Cookie writes work here because Server Actions run before headers are sealed —
 * unlike Server Components, where `createClient` swallows the attempt.
 *
 * User-facing copy is resolved through `getTranslations("auth")` rather than
 * module constants: a Server Action runs in the request, so the visitor's locale
 * is available and the message comes back in their language. The vague,
 * enumeration-safe wording is unchanged — only the language varies.
 */

/* ── Validation ───────────────────────────────────────────────────────────── */

// Deliberately not `.email()`: it rejects some valid addresses, and the real
// check is whether Supabase accepts it.
const email = z.string().trim().min(3).max(320).toLowerCase();

const next = z.string().max(2000).optional();

// No user-facing messages: sign-in reports one generic failure for any bad
// input, so these schemas stay at module scope. The two that DO surface
// field-level messages (sign-up, new password) are built per request, below,
// where a translator exists.
const SignInSchema = z.object({ email, password: z.string().min(1).max(200), next });

const ResetRequestSchema = z.object({ email });

/* ── Action state ─────────────────────────────────────────────────────────── */

function fail(error: string): AuthState {
  return { error, notice: null };
}

function notify(notice: string): AuthState {
  return { error: null, notice };
}

/** First message from a ZodError, so the user sees the specific problem. */
function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/* ── Throttling ───────────────────────────────────────────────────────────── */

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 10 * 60_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkThrottle(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return true;
  }

  // Unbounded growth is the failure mode here: one entry per IP, never cleared
  // on the happy path. Sweep expired records whenever the map gets large.
  if (attempts.size > 5000) {
    for (const [existing, value] of attempts) {
      if (value.resetAt < now) attempts.delete(existing);
    }
  }

  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

async function clientKey(scope: string): Promise<string> {
  const headerList = await headers();
  // Behind a proxy the left-most entry is the client. It is spoofable if the app
  // is exposed directly, which is why this is a rate limiter, not a control.
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

/* ── Sign in ──────────────────────────────────────────────────────────────── */

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");

  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return fail(t("errors.genericFailure"));

  if (!checkThrottle(await clientKey("signin"))) return fail(t("errors.throttled"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // An unconfirmed address is the one case worth naming: the credentials were
    // correct, and "wrong password" would send the user in circles resetting a
    // password that works. It reveals only what they already know.
    if (error.code === "email_not_confirmed") {
      return fail(t("errors.emailNotConfirmed"));
    }
    if (error.status === 429) return fail(t("errors.throttled"));
    if (error.code === "invalid_credentials") return fail(t("errors.genericFailure"));

    console.error("[auth] sign-in failed", { code: error.code, status: error.status });
    return fail(t("errors.genericFailure"));
  }

  // The header renders session state, so every cached shell is now stale.
  revalidatePath("/", "layout");
  // Locale-preserving: a Hindi sign-in lands on `/hi/…`, not the English page.
  redirect(localizedTarget(safeNextPath(parsed.data.next), await getLocale())); // throws
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = formData.get("next");
  const supabase = await createClient();

  const redirectTo = await authCallbackUrl(typeof next === "string" ? next : undefined);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("[auth] Google sign-in failed", { code: error.code, message: error.message });
    redirect(localizedTarget("/login?error=oauth_failed", await getLocale()));
  }

  if (data.url) {
    redirect(data.url); // redirects to Google consent screen
  }
}

/* ── Sign up ──────────────────────────────────────────────────────────────── */

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");

  // Built here rather than at module scope so the field messages are in the
  // visitor's language.
  const SignUpSchema = z.object({
    email,
    password: z.string().min(8, t("errors.use8Chars")).max(200),
    displayName: z.string().trim().min(1, t("errors.tellUsName")).max(80),
    next,
  });

  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return fail(firstIssue(parsed.error, t("errors.checkDetails")));
  }

  if (!checkThrottle(await clientKey("signup"))) return fail(t("errors.throttled"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the `handle_new_user` trigger to populate `public.users`.
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${CANONICAL_ORIGIN}/auth/callback?next=${encodeURIComponent(
        safeNextPath(parsed.data.next),
      )}`,
    },
  });

  if (error) {
    if (error.status === 429) return fail(t("errors.throttled"));
    if (error.code === "weak_password") {
      return fail(t("errors.weakPassword"));
    }
    console.error("[auth] sign-up failed", { code: error.code, status: error.status });
    return fail(t("errors.signUpFailed"));
  }

  // When confirmations are on, Supabase returns a user with no session and — for
  // an address that already exists — an identical response to a fresh signup.
  // That is intentional on their side and we preserve it: saying "already
  // registered" would confirm who has an account here.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(localizedTarget(safeNextPath(parsed.data.next), await getLocale()));
  }

  return notify(t("notices.signupConfirm"));
}

/* ── Sign out ─────────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  // `scope: "local"` clears this browser's session only. A global sign-out on a
  // shared computer would kick the user off their phone too, which is not what
  // pressing "sign out" in a header implies.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("[auth] sign-out failed", error.message);

  revalidatePath("/", "layout");
  redirect(localizedTarget("/", await getLocale()));
}

/* ── Password reset ───────────────────────────────────────────────────────── */

/**
 * Always reports success. Whether the address exists is exactly what an attacker
 * wants from this endpoint, and the honest version of this message is the one
 * below: a link was sent *if* the account exists.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const SENT = t("notices.resetSent");

  const parsed = ResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return notify(SENT);

  if (!checkThrottle(await clientKey("reset"))) return fail(t("errors.throttled"));

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${CANONICAL_ORIGIN}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Logged, not surfaced — the caller gets SENT either way.
  if (error) console.error("[auth] reset request failed", { code: error.code });

  return notify(SENT);
}

/**
 * Set a new password. Reached only from the recovery link, which has already
 * established a session via `/auth/callback`; `updateUser` fails without one, so
 * a stale or forged link cannot change a password.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");

  const NewPasswordSchema = z
    .object({ password: z.string().min(8, t("errors.use8Chars")).max(200), confirm: z.string().min(1).max(200) })
    .refine((value) => value.password === value.confirm, {
      message: t("errors.passwordsDontMatch"),
      path: ["confirm"],
    });

  const parsed = NewPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return fail(firstIssue(parsed.error, t("errors.checkPassword")));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") {
      return fail(t("errors.samePassword"));
    }
    if (error.status === 401 || error.code === "session_not_found") {
      return fail(t("errors.resetLinkExpired"));
    }
    console.error("[auth] password update failed", { code: error.code });
    return fail(t("errors.unavailable"));
  }

  revalidatePath("/", "layout");
  redirect(localizedTarget("/account?updated=password", await getLocale()));
}
