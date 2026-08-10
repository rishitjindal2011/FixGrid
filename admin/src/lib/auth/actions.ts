"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Login, against the same `seo_admins` table the SEO console uses.
 *
 * Sharing the table is a deliberate decision, not laziness: `shop_claims.reviewed_by`
 * and `disputes.resolved_by` are already documented as `seo_admins.id` in the
 * migration, so an approval recorded by this console lines up with the schema
 * as written. A second admin table would mean those columns point at whichever
 * app happened to write the row.
 *
 * Three properties this implementation is built around:
 *
 *   1. **No account enumeration.** A wrong email and a wrong password produce
 *      the same message *and* roughly the same amount of work — when the email
 *      doesn't exist we still run bcrypt against a decoy hash, so response time
 *      doesn't leak which addresses are real.
 *
 *   2. **Throttling.** bcrypt is slow by design, which makes login an easy way
 *      to burn all the server's CPU. A per-IP attempt counter caps that. It is
 *      in-process, so it resets on deploy and doesn't span instances — adequate
 *      for an internal tool, and the obvious place to swap in Redis if this
 *      ever faces the open internet.
 *
 *   3. **The password never leaves the server.** This is a Server Action; the
 *      form posts straight to it and the plaintext exists only in this scope.
 */

const LoginSchema = z.object({
  // Not `.email()` — that rejects some valid addresses, and the real check is
  // "does this match a row", which happens below regardless.
  email: z.string().min(3).max(320),
  password: z.string().min(1).max(200),
  next: z.string().max(2000).optional(),
});

/**
 * Reduce an untrusted `next` value to a safe same-origin path.
 *
 * The value reaches here from a hidden form field, which is to say from
 * whatever the browser sent. Anything that could leave the origin is discarded
 * rather than repaired:
 *
 *   - must start with a single `/`  — rejects `https://evil.test` and `javascript:`
 *   - must not start with `//`      — protocol-relative URLs are absolute URLs
 *   - must not start with `/\`      — some parsers normalise this to `//`
 *   - must not contain a backslash  — folded to `/` by parts of the stack
 *   - `/login` collapses to `/`     — no redirect loop back to the form
 */
function safeNextPath(candidate: string | undefined): string {
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return "/";
  if (candidate.includes("\\")) return "/";
  if (candidate === "/login" || candidate.startsWith("/login?")) return "/";
  return candidate;
}

export interface LoginState {
  error: string | null;
}

/**
 * A bcrypt hash of a random string, used when the email is unknown so the
 * timing profile matches a genuine failed login.
 */
const DECOY_HASH = "$2b$12$Ck7Y1cJ5m3tJ8Q9aV2r5.uQ8k3xH1oB6dW2sN4vC0pL9tR7mE5yGa";

const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkThrottle(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return true;
  }

  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

async function clientKey(): Promise<string> {
  const headerList = await headers();
  // Behind a proxy the left-most entry is the client. It is spoofable if the
  // app is exposed directly, which is exactly why this is a rate limiter and
  // not an authorisation control.
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

/** One message for every failure mode. Never says which half was wrong. */
const GENERIC_FAILURE = "That email and password combination didn't work.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: GENERIC_FAILURE };

  const key = await clientKey();
  if (!checkThrottle(key)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { data: admin, error } = await supabase
    .from("seo_admins")
    .select("id, email, password_hash, role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[auth] admin lookup failed:", error.message);
    return { error: "Sign-in is temporarily unavailable." };
  }

  // Always compare, even with no row — see property 1 above.
  const matches = await bcrypt.compare(
    parsed.data.password,
    admin?.password_hash ?? DECOY_HASH,
  );
  if (!admin || !matches) return { error: GENERIC_FAILURE };

  attempts.delete(key);

  const token = await signSessionToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });
  await setSessionCookie(token);

  // Best-effort audit trail; a failed write must not block sign-in. Shared with
  // the SEO console, so this column answers "when did this person last use
  // *either* admin", not this one specifically.
  const { error: stampError } = await supabase
    .from("seo_admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);
  if (stampError) console.error("[auth] last_login_at update failed:", stampError.message);

  // `redirect` throws, so nothing after this line runs.
  redirect(safeNextPath(parsed.data.next));
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
