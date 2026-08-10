import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Route guard.
 *
 * Next 16 renamed this convention from `middleware` to `proxy`. The file and
 * the exported function have to move together — an old `middleware.ts`, or a
 * `proxy.ts` still exporting `middleware`, is simply never invoked. There is no
 * error, no warning at runtime, and here that failure mode is not a degraded
 * feature: this function is the only thing turning anonymous requests away, so
 * a silent no-op publishes every customer's bookings, every shop's payouts and
 * every open dispute to whoever finds the hostname.
 *
 * Runs on the Edge runtime, which is why the session is a `jose` JWT rather
 * than a database-backed session — there is no Postgres driver here, and adding
 * a fetch to Supabase on every navigation would put a network round-trip in
 * front of every page.
 *
 * This protects *navigation* only. Server actions re-check with
 * `requireSession()` because a POST to an action endpoint never passes through
 * a route match.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isLoginRoute = pathname === "/login";

  if (!session && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    // Round-trip the intended destination so a bookmarked deep link still
    // lands correctly after sign-in. Only the path is carried, and the login
    // action validates it before redirecting — an absolute URL here would be an
    // open redirect.
    const target = `${pathname}${search}`;
    if (target !== "/") loginUrl.searchParams.set("next", target);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Expired cookies are cleared on the way through so the browser stops
  // sending a token that will never verify again.
  const response = NextResponse.next();
  if (!session && token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  /*
   * Everything except Next's own build assets. API routes are *included*
   * deliberately: anything added under /api in this app acts on behalf of a
   * signed-in admin and must not be reachable anonymously. Excluding them —
   * the usual copy-pasted matcher — would leave the most dangerous endpoints
   * as the only unguarded ones.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
