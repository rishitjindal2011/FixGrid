"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";
import type { AuthState } from "@/lib/auth/state";
import { SITE_ORIGIN } from "@/lib/site";

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
 */

/* ── Validation ───────────────────────────────────────────────────────────── */

// Deliberately not `.email()`: it rejects some valid addresses, and the real
// check is whether Supabase accepts it.
const email = z.string().trim().min(3).max(320).toLowerCase();

/**
 * Eight characters is Supabase's own default minimum. Enforcing it here as well
 * means the user gets a field-level message instead of a raw API error, and the
 * two limits cannot drift apart silently.
 */
const password = z.string().min(8, "Use at least 8 characters.").max(200);

const next = z.string().max(2000).optional();

const SignInSchema = z.object({ email, password: z.string().min(1).max(200), next });

const SignUpSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1, "Tell us what to call you.").max(80),
  next,
});

const ResetRequestSchema = z.object({ email });

const NewPasswordSchema = z
  .object({ password, confirm: z.string().min(1).max(200) })
  .refine((value) => value.password === value.confirm, {
    message: "Those passwords don't match.",
    path: ["confirm"],
  });

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

const THROTTLED = "Too many attempts. Wait a few minutes and try again.";
const GENERIC_FAILURE = "That email and password combination didn't work.";
const UNAVAILABLE = "Sign-in is temporarily unavailable. Try again in a moment.";

/* ── Sign in ──────────────────────────────────────────────────────────────── */

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return fail(GENERIC_FAILURE);

  if (!checkThrottle(await clientKey("signin"))) return fail(THROTTLED);

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
      return fail("Confirm your email address first — check your inbox for the link.");
    }
    if (error.status === 429) return fail(THROTTLED);
    if (error.code === "invalid_credentials") return fail(GENERIC_FAILURE);

    console.error("[auth] sign-in failed", { code: error.code, status: error.status });
    return fail(GENERIC_FAILURE);
  }

  // The header renders session state, so every cached shell is now stale.
  revalidatePath("/", "layout");
  redirect(safeNextPath(parsed.data.next)); // throws — nothing below runs
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = formData.get("next");
  const supabase = await createClient();
  
  const redirectTo = `${SITE_ORIGIN}/auth/callback?next=${encodeURIComponent(
    safeNextPath(typeof next === "string" ? next : undefined)
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("[auth] Google sign-in failed", { code: error.code, message: error.message });
    redirect("/login?error=oauth_failed");
  }

  if (data.url) {
    redirect(data.url); // redirects to Google consent screen
  }
}

/* ── Sign up ──────────────────────────────────────────────────────────────── */

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return fail(firstIssue(parsed.error, "Check the details and try again."));
  }

  if (!checkThrottle(await clientKey("signup"))) return fail(THROTTLED);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the `handle_new_user` trigger to populate `public.users`.
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${SITE_ORIGIN}/auth/callback?next=${encodeURIComponent(
        safeNextPath(parsed.data.next),
      )}`,
    },
  });

  if (error) {
    if (error.status === 429) return fail(THROTTLED);
    if (error.code === "weak_password") {
      return fail("That password is too easy to guess. Try a longer one.");
    }
    console.error("[auth] sign-up failed", { code: error.code, status: error.status });
    return fail("We couldn't create that account. Try again in a moment.");
  }

  // When confirmations are on, Supabase returns a user with no session and — for
  // an address that already exists — an identical response to a fresh signup.
  // That is intentional on their side and we preserve it: saying "already
  // registered" would confirm who has an account here.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNextPath(parsed.data.next));
  }

  return notify(
    "Check your inbox — we've sent a link to confirm your address. " +
      "It expires in an hour.",
  );
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
  redirect("/");
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
  const SENT =
    "If that address has an account, a reset link is on its way. " +
    "Check spam if it hasn't arrived in a few minutes.";

  const parsed = ResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return notify(SENT);

  if (!checkThrottle(await clientKey("reset"))) return fail(THROTTLED);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_ORIGIN}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
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
  const parsed = NewPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return fail(firstIssue(parsed.error, "Check the password and try again."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") {
      return fail("That's already your password. Choose a different one.");
    }
    if (error.status === 401 || error.code === "session_not_found") {
      return fail("That reset link has expired. Request a new one.");
    }
    console.error("[auth] password update failed", { code: error.code });
    return fail(UNAVAILABLE);
  }

  revalidatePath("/", "layout");
  redirect("/account?updated=password");
}
