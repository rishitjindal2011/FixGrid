import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, splitLocale, withLocale, type Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import type { Database } from "@/lib/types/database";

/**
 * Next 16 renamed this convention from `middleware` to `proxy`; the file and the
 * exported function have to move together or the export is simply never called.
 *
 * The proxy does four jobs, in this order:
 *
 *   0. Recover an OAuth code that landed on the wrong path. First, because it
 *      must happen regardless of locale and regardless of any redirect rule.
 *
 *   1. Resolve the locale. `next-intl` decides it, then we re-express its
 *      decision as our own response so we can also inject a request header
 *      (see `PATHNAME_HEADER`) — which `NextResponse.next({ request })` can do
 *      and next-intl's own response cannot be retrofitted with.
 *
 *   2. Apply admin-managed redirects from `seo_redirects`. These run before the
 *      page renders or the session is touched.
 *
 *   3. Refresh the Supabase auth session. Server Components can read cookies
 *      but cannot set them, so a token that expires mid-visit can only be
 *      rotated here. Without this, a signed-in user silently becomes anonymous.
 *
 * Every path-keyed lookup below compares against the DE-LOCALIZED path. The
 * redirect table stores `/foo`, not `/hi/foo`, so matching on the raw pathname
 * would silently stop applying every admin redirect for six of the seven
 * locales — the site would look fine and quietly ignore its own configuration.
 */

const handleI18nRouting = createIntlMiddleware(routing);

interface RedirectRule {
  destination: string;
  statusCode: number;
}

interface RedirectCache {
  rules: Map<string, RedirectRule>;
  expiresAt: number;
}

/**
 * The redirect table is cached in module scope with a short TTL. A database
 * round-trip on every single request — including ones that will never redirect,
 * which is nearly all of them — would put the whole site behind the latency of
 * a table that changes a few times a month.
 */
const REDIRECT_TTL_MS = 60_000;
let redirectCache: RedirectCache | null = null;

/**
 * Reduce a path to the form redirect rules are keyed by: lowercase, no trailing
 * slash. Both halves have to apply to every input — an earlier version returned
 * before lowercasing when the path ended in a slash, so a rule stored as `/foo`
 * was found for `/Foo` but missed for `/Foo/`.
 */
function normalizePath(path: string): string {
  const lowered = path.toLowerCase();
  if (lowered.length > 1 && lowered.endsWith("/")) return lowered.slice(0, -1);
  return lowered;
}

async function loadRedirects(request: NextRequest): Promise<Map<string, RedirectRule>> {
  const now = Date.now();
  if (redirectCache && redirectCache.expiresAt > now) return redirectCache.rules;

  const rules = new Map<string, RedirectRule>();

  try {
    // The response passed here is a throwaway: `seo_redirects` is world-
    // readable, so this call runs as `anon` and never needs to write a cookie.
    // The real session refresh happens in `sessionResponse` below.
    const supabase = createSupabaseClient(request, NextResponse.next());
    const { data, error } = await supabase
      .from("seo_redirects")
      .select("source_url, destination_url, status_code")
      .limit(2000);

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      rules.set(normalizePath(row.source_url), {
        destination: row.destination_url,
        statusCode: row.status_code === 302 ? 302 : 301,
      });
    }

    redirectCache = { rules, expiresAt: now + REDIRECT_TTL_MS };
  } catch (cause) {
    // A redirect table we can't read must not take the site down. Serve the
    // page as-is and retry on the next request rather than caching the failure.
    console.error("[proxy] redirect load failed:", cause);
    redirectCache = null;
  }

  return rules;
}

function createSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
}

/**
 * Header carrying the path the browser actually asked for.
 *
 * A Server Component cannot see its own URL — `redirect()` in a layout has no
 * idea whether the request was for `/dashboard` or `/dashboard/expert/requests`.
 * The dashboard layout is the single auth gate for ~30 routes, so without this
 * every signed-out deep link bounced to the overview after login instead of the
 * page that was asked for. The proxy is the one place that still has the URL.
 */
export const PATHNAME_HEADER = "x-pathname";

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  /* ── 0. OAuth PKCE recovery ───────────────────────────────────────────── */

  // Supabase falls back to Site URL when redirectTo is not allowlisted, landing
  // on `/?code=…` instead of `/auth/callback`. Forward the code so it is exchanged.
  //
  // Runs before locale handling on purpose: `/auth/callback` is a route handler
  // outside the `[locale]` segment, so the code must reach it unprefixed, and a
  // locale redirect in between would cost an extra hop on a one-shot credential.
  if (pathname !== "/auth/callback" && searchParams.has("code") && !searchParams.has("error")) {
    const callback = new URL("/auth/callback", request.nextUrl.origin);
    callback.search = search;
    return NextResponse.redirect(callback);
  }

  /* ── 1. Locale ────────────────────────────────────────────────────────── */

  const intlResponse = handleI18nRouting(request);

  /*
   * A non-ok response is a locale redirect — with `localePrefix: "as-needed"`
   * that is `/en/foo` being canonicalised to `/foo`. Return it untouched: there
   * is no point refreshing a session or reading the redirect table for a
   * response the browser will immediately replace, and doing the work here would
   * discard next-intl's own `Set-Cookie`.
   */
  if (!intlResponse.ok) return intlResponse;

  const { locale: prefix, pathname: bare } = splitLocale(pathname);
  const locale: Locale = prefix ?? DEFAULT_LOCALE;

  /* ── 2. Redirects ─────────────────────────────────────────────────────── */

  const rules = await loadRedirects(request);
  // Keyed on the DE-LOCALIZED path: rules are authored as `/foo`, so looking up
  // `/hi/foo` would match nothing and quietly disable the whole redirect table
  // for every non-English visitor.
  const rule = rules.get(normalizePath(bare));

  if (rule) {
    // Relative destinations resolve against the *current* origin, so a redirect
    // authored as "/new-path" works identically on preview and production.
    // Absolute destinations are honoured as written — that is the whole point
    // of being able to redirect to an external site — but anything that isn't
    // a valid URL is ignored rather than crashing the request.
    let target: URL;
    try {
      target = new URL(rule.destination, request.nextUrl.origin);
    } catch {
      console.error("[proxy] invalid redirect destination:", rule.destination);
      return sessionResponse(request, intlResponse, locale);
    }

    // An internal destination keeps the visitor in their language. Skipped for
    // external hosts, where our locale prefix would be meaningless or wrong.
    if (target.origin === request.nextUrl.origin) {
      target.pathname = withLocale(target.pathname, locale);
    }

    // Preserve the query string unless the rule specifies its own.
    if (!target.search && search) target.search = search;

    // A rule pointing at itself would loop forever through the CDN. Compared
    // against the *localized* request path, since that is what the browser asked
    // for and what a self-referencing rule would resolve back to.
    if (
      normalizePath(target.pathname) !== normalizePath(pathname) ||
      target.origin !== request.nextUrl.origin
    ) {
      const redirect = NextResponse.redirect(target, rule.statusCode);
      carryOver(intlResponse, redirect);
      return redirect;
    }
  }

  /* ── 3. Session refresh ───────────────────────────────────────────────── */

  return sessionResponse(request, intlResponse, locale);
}

/**
 * Copy next-intl's cookies and routing headers onto a response we built.
 *
 * Any response the proxy constructs itself replaces next-intl's, and with it the
 * locale cookie and the internal rewrite that maps `/search` onto the
 * `[locale]` segment. Dropping either means the visitor silently reverts to
 * English on the next navigation, or the route fails to match at all.
 *
 * This is the same trap the session code below documents for Supabase cookies —
 * a discarded response takes its `Set-Cookie` with it. There are now two sets of
 * cookies riding on one response and both matter.
 */
function carryOver(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  for (const header of ROUTING_HEADERS) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
}

/**
 * `x-middleware-rewrite` is how next-intl points an unprefixed URL at the
 * `[locale]` segment; `vary` keeps a locale-specific response from being served
 * from cache to the wrong visitor. `link` carries the alternates next-intl
 * advertises. `x-middleware-next` is deliberately excluded — it belongs to
 * whichever response is actually being returned.
 */
const ROUTING_HEADERS = ["x-middleware-rewrite", "vary", "link"] as const;

/**
 * Next encodes "middleware wants to add this REQUEST header" as a response
 * header called `x-middleware-request-<name>`.
 *
 * next-intl uses exactly that channel to tell `getRequestConfig` which locale it
 * settled on. Our own `NextResponse.next({ request: { headers } })` builds its
 * request headers from the original request, which never saw them — so without
 * this the locale is lost, `requestLocale` resolves to undefined, and every
 * string silently falls back to English while `<html lang>` still says `hi`,
 * because the layout reads the route param directly. A half-translated page with
 * no error anywhere.
 *
 * Copied by prefix rather than by name so this keeps working if next-intl
 * changes or adds to the headers it forwards.
 */
const MIDDLEWARE_REQUEST_PREFIX = "x-middleware-request-";

function forwardIntlRequestHeaders(from: NextResponse, headers: Headers): void {
  from.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (lower.startsWith(MIDDLEWARE_REQUEST_PREFIX)) {
      headers.set(lower.slice(MIDDLEWARE_REQUEST_PREFIX.length), value);
    }
  });
}

/**
 * Paths a signed-in user has no reason to see, and where they go instead.
 *
 * Only the marketing homepage. It exists to explain the product and convert a
 * visitor; someone who already has an account has done both, and landing there
 * after signing in reads as being signed out.
 *
 * `/login`, `/signup` and `/forgot-password` are deliberately NOT here even
 * though they redirect signed-in users too. Those pages do it themselves, and
 * they do it *better*: they honour `?next=`, so a deep link into
 * `/dashboard/bookings` survives the round-trip. Intercepting them here would
 * throw that away and send everyone to the overview instead.
 *
 * Everything else stays open. `/search`, `/expert/[slug]` and the CMS pages are
 * the product — a signed-in customer browsing shops is not a routing mistake.
 *
 * Keyed WITHOUT a locale prefix. `/hi` is the Hindi homepage and must redirect
 * exactly as `/` does; the lookup uses the de-localized path so one entry covers
 * all seven.
 */
const SIGNED_IN_REDIRECTS: Record<string, string> = {
  "/": "/dashboard",
};

async function sessionResponse(
  request: NextRequest,
  intlResponse: NextResponse,
  locale: Locale,
): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // Forwarded on the *request*, not the response: this is for the render on the
  // other side of the proxy, and it must not reach the browser.
  //
  // The value keeps its locale prefix. The dashboard layout feeds it to
  // `safeNextPath` and then into `?next=`, so stripping the locale here would
  // send a Hindi visitor to the English page after signing in.
  const headers = new Headers(request.headers);
  forwardIntlRequestHeaders(intlResponse, headers);
  headers.set(PATHNAME_HEADER, `${pathname}${search}`);

  const response = NextResponse.next({ request: { headers } });
  carryOver(intlResponse, response);

  const supabase = createSupabaseClient(request, response);

  // `getUser()` (not `getSession()`) is what actually validates the token with
  // the auth server and triggers the refresh-cookie write above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname: bare } = splitLocale(pathname);
  const destination = SIGNED_IN_REDIRECTS[normalizePath(bare)];

  if (user && destination) {
    const target = new URL(withLocale(destination, locale), request.nextUrl.origin);
    const redirect = NextResponse.redirect(target);

    /*
     * The refreshed cookies were written to `response`, which is now being
     * thrown away. They have to be copied across or this redirect *un-signs-in*
     * the user it was meant to route: the rotated token is lost, the old one is
     * already invalid, and they arrive at /dashboard as an anonymous visitor and
     * get bounced back to /login.
     */
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }

    return redirect;
  }

  return response;
}

export const config = {
  /**
   * Skip everything that can never be redirected and never carries a session:
   * build output, image optimiser, metadata files and static assets. This keeps
   * the proxy off the hot path for the majority of requests.
   *
   * A gap here now breaks localization as well as sessions, and it does so
   * silently: a path the proxy never sees is never rewritten onto the `[locale]`
   * segment, so it 404s or renders without messages rather than erroring
   * somewhere findable. Anything added to this list should be a URL that must
   * not be localized at all.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
