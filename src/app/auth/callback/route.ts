import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";

/**
 * Landing point for every emailed auth link: signup confirmation, password
 * recovery, email change.
 *
 * Supabase sends one of two shapes depending on project configuration, and both
 * are live in the wild, so both are handled:
 *
 *   • `?code=…`                  — PKCE. Exchanged for a session.
 *   • `?token_hash=…&type=…`     — the newer email-link format, verified as OTP.
 *
 * A Route Handler is the right home for this because it can write cookies. The
 * session must be established *before* the redirect, or `/reset-password` would
 * load with no session and refuse the update.
 *
 * On failure we land on `/login` with a flag rather than rendering an error
 * page: the user's next move is to sign in or request a fresh link either way,
 * and an expired link is the overwhelmingly common cause.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // `next` came in on a URL we generated, but it round-tripped through an email
  // client — treat it as untrusted and re-sanitise.
  const next = safeNextPath(searchParams.get("next"));

  // Supabase reports link-level problems as query params, not as a failed
  // exchange. Surface them without attempting the exchange.
  const errorCode = searchParams.get("error_code");
  if (errorCode) {
    console.error("[auth] callback link rejected", {
      errorCode,
      description: searchParams.get("error_description"),
    });
    return redirectTo(origin, "/login?error=link_invalid");
  }

  if (!code && !tokenHash) {
    return redirectTo(origin, "/login?error=link_invalid");
  }

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        // Recovery is the only flow that must not be silently downgraded: if the
        // type is missing we would verify a password-reset link as a signup
        // confirmation and land the user somewhere with no session.
        type: type ?? "email",
      });

  if (error) {
    console.error("[auth] callback exchange failed", { code: error.code });
    return redirectTo(origin, "/login?error=link_invalid");
  }

  return redirectTo(origin, next);
}

/**
 * Redirect against the request's own origin.
 *
 * Not `SITE_ORIGIN`: behind a proxy or on a preview deployment the canonical
 * origin is not where the user actually is, and redirecting there drops the
 * cookies that were just set on this host.
 */
function redirectTo(origin: string, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin));
}
