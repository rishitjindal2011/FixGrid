/**
 * Redirect-target sanitising, shared by the auth actions and the callback route.
 *
 * Not in `actions.ts` because the route handler needs it too and importing a
 * `"use server"` module for one pure function would export the actions as
 * endpoints from a second place.
 */

import { splitLocale, withLocale, type Locale } from "@/i18n/config";

/** Routes that must never be a post-sign-in destination. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Where a signed-in person lands when nothing else was requested.
 *
 * Sign-in, sign-up-with-session and the email-confirmation callback all resolve
 * their destination through `safeNextPath`, so this constant is the single
 * place that decides it. Anyone who arrived from a specific page — a shop, a
 * review form — still goes back there; this is only the fallback.
 */
export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

/**
 * Reduce an untrusted `next` value to a safe same-origin path.
 *
 * The value arrives from a hidden form field or a query string — that is, from
 * whatever the browser sent. Anything that could leave the origin is discarded
 * rather than repaired:
 *
 *   - must start with a single `/`  — rejects `https://evil.test` and `javascript:`
 *   - must not start with `//`      — protocol-relative URLs are absolute URLs
 *   - must not start with `/\`      — some parsers normalise this to `//`
 *   - must not contain a backslash  — folded to `/` by parts of the stack
 *   - an auth route collapses to the default — no bouncing back to the form
 *
 * Mirrors `safeNextPath` in the admin app. Duplicated rather than shared: the
 * two apps have no common package, and a redirect allowlist is the last place
 * to introduce a build-time coupling for the sake of nine lines.
 */
export function safeNextPath(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_SIGNED_IN_PATH;
  if (!candidate.startsWith("/")) return DEFAULT_SIGNED_IN_PATH;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  if (candidate.includes("\\")) return DEFAULT_SIGNED_IN_PATH;

  const path = candidate.split(/[?#]/)[0] ?? "";

  /*
   * Compared against the DE-LOCALIZED path.
   *
   * `AUTH_ROUTES` lists `/login`, and a localized candidate arrives as
   * `/hi/login` — which does not match, so the guard that stops us bouncing a
   * visitor back to the form they just submitted would quietly stop working for
   * six of seven locales. The failure mode is a login → login loop, and it is
   * reachable from a hand-edited `?next=`.
   */
  const { pathname: bare } = splitLocale(path);
  if (AUTH_ROUTES.includes(bare)) return DEFAULT_SIGNED_IN_PATH;

  return candidate;
}

/**
 * Re-express a safe redirect target in a specific locale, preserving any query
 * or hash.
 *
 * The auth actions and the already-signed-in guards feed the result of
 * `safeNextPath` straight into `redirect()`, which sets a bare `Location` header
 * — so a Hindi visitor signing in would be bounced to the English `/dashboard`,
 * dropping them out of their locale at the exact moment they commit to an
 * account. This strips whatever prefix the candidate arrived with and reapplies
 * the request's own, so the destination stays in-language.
 *
 * For the default locale `withLocale` returns the path untouched, so English
 * redirects are byte-for-byte identical to before this existed.
 */
export function localizedTarget(safe: string, locale: Locale): string {
  const cut = safe.search(/[?#]/);
  const path = cut === -1 ? safe : safe.slice(0, cut);
  const suffix = cut === -1 ? "" : safe.slice(cut);
  const { pathname } = splitLocale(path);
  return withLocale(pathname, locale) + suffix;
}
