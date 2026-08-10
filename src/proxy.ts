import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types/database";

/**
 * Next 16 renamed this convention from `middleware` to `proxy`; the file and the
 * exported function have to move together or the export is simply never called.
 *
 * The proxy does exactly two jobs, in this order:
 *
 *   1. Apply admin-managed redirects from `seo_redirects`. These must run
 *      before anything else, so a redirected URL never renders a page or
 *      touches the session.
 *
 *   2. Refresh the Supabase auth session. Server Components can read cookies
 *      but cannot set them, so a token that expires mid-visit can only be
 *      rotated here. Without this, a signed-in user silently becomes anonymous.
 *
 * The redirect table is cached in module scope with a short TTL. A database
 * round-trip on every single request — including ones that will never redirect,
 * which is nearly all of them — would put the whole site behind the latency of
 * a table that changes a few times a month.
 */

interface RedirectRule {
  destination: string;
  statusCode: number;
}

interface RedirectCache {
  rules: Map<string, RedirectRule>;
  expiresAt: number;
}

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
  const { pathname, search } = request.nextUrl;

  /* ── 1. Redirects ─────────────────────────────────────────────────────── */

  const rules = await loadRedirects(request);
  const rule = rules.get(normalizePath(pathname));

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
      return sessionResponse(request, `${pathname}${search}`);
    }

    // Preserve the query string unless the rule specifies its own.
    if (!target.search && search) target.search = search;

    // A rule pointing at itself would loop forever through the CDN.
    if (normalizePath(target.pathname) !== normalizePath(pathname) || target.origin !== request.nextUrl.origin) {
      return NextResponse.redirect(target, rule.statusCode);
    }
  }

  /* ── 2. Session refresh ───────────────────────────────────────────────── */

  return sessionResponse(request, `${pathname}${search}`);
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
 */
const SIGNED_IN_REDIRECTS: Record<string, string> = {
  "/": "/dashboard",
};

async function sessionResponse(
  request: NextRequest,
  requestedPath: string,
): Promise<NextResponse> {
  // Forwarded on the *request*, not the response: this is for the render on the
  // other side of the proxy, and it must not reach the browser.
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, requestedPath);

  const response = NextResponse.next({ request: { headers } });
  const supabase = createSupabaseClient(request, response);

  // `getUser()` (not `getSession()`) is what actually validates the token with
  // the auth server and triggers the refresh-cookie write above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = SIGNED_IN_REDIRECTS[normalizePath(request.nextUrl.pathname)];

  if (user && destination) {
    const target = new URL(destination, request.nextUrl.origin);
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
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
