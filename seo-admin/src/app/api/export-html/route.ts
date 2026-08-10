import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  FETCH_TIMEOUT_MS,
  MAX_EXPORT_BYTES,
  draftModeUrl,
  exportFilename,
  extractDraftCookies,
  readCapped,
  resolveTarget,
} from "@/lib/preview";
import { getPage } from "@/lib/queries/pages";
import { joinCmsPath } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download a page's rendered HTML.
 *
 * Used for handing a client a static copy, and for diffing markup when a
 * structured-data change needs proving. The admin does not render the page
 * itself — it asks the consumer app, so what you download is exactly what a
 * crawler sees, including the JSON-LD the renderer emits.
 *
 * ── Why this route is written defensively ────────────────────────────────────
 *
 * It performs a server-side fetch to a URL, on behalf of an authenticated user,
 * from inside the deployment's network. That is the textbook shape of an SSRF
 * sink, so every degree of freedom a caller might have is closed:
 *
 *   • The only input is `?id=`. There is no `url`, `path`, or `host` parameter.
 *   • The path comes from Postgres via `joinCmsPath`, never from the request.
 *   • `resolveTarget` re-pins the origin to NEXT_PUBLIC_APP_URL after joining,
 *     which catches a protocol-relative `path_prefix` rewriting the host.
 *   • `redirect: "manual"` — a 30x is refused, not followed. Following one is
 *     precisely how a pinned origin gets escaped a hop later.
 *   • A 15s deadline, a 4MB ceiling, and a text/html content-type requirement,
 *     so a hung or hostile upstream cannot exhaust the admin process.
 *   • Only the two Next.js draft cookies are forwarded, never the whole header.
 *
 * None of these are hypothetical in combination: origin pinning without redirect
 * refusal buys nothing, and refusing redirects without a size cap still leaves a
 * denial-of-service.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return problem(401, "Sign in to export a page.");

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return problem(400, "Missing ?id.");

  const page = await getPage(id);
  if (!page) return problem(404, "That page no longer exists.");

  const path = joinCmsPath(page.path_prefix, page.slug);

  let target: URL;
  try {
    target = resolveTarget(path);
  } catch (error) {
    return problem(500, error instanceof Error ? error.message : "Could not resolve the page URL.");
  }

  // Drafts and archived pages are not publicly routable, so the export has to
  // borrow draft mode the same way a human preview does.
  let cookieHeader: string | null = null;
  if (page.status !== "published") {
    try {
      cookieHeader = await openDraftSession(page.id);
    } catch (error) {
      return problem(502, describeFetchFailure(error, "enable draft mode on"));
    }
  }

  let response: Response;
  try {
    response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/html",
        "User-Agent": "fix-it-registry-admin/1.0 (html export)",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
  } catch (error) {
    return problem(502, describeFetchFailure(error, "reach"));
  }

  if (response.status >= 300 && response.status < 400) {
    // Worth stating plainly to the operator: this is almost always a stale
    // `seo_redirects` row still pointing away from a path that now resolves.
    return problem(
      409,
      `The site redirected ${path} (${response.status}). Exports do not follow redirects — ` +
        "check for a redirect rule that shadows this page.",
    );
  }

  if (!response.ok) {
    return problem(502, `The site returned ${response.status} for ${path}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return problem(
      415,
      `Expected HTML from ${path} but got ${contentType || "no content type"}.`,
    );
  }

  let html: string;
  try {
    html = await readCapped(response, MAX_EXPORT_BYTES);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("RESPONSE_TOO_LARGE")) {
      return problem(413, `That page is larger than ${MAX_EXPORT_BYTES / 1024 / 1024}MB.`);
    }
    return problem(502, describeFetchFailure(error, "read"));
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(page.path_prefix, page.slug)}"`,
      // An unpublished page's markup should not sit in any shared cache.
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Ask the consumer app for a draft-mode cookie and return it as a `Cookie`
 * header value.
 *
 * `redirect: "manual"` again, for a second reason: the draft endpoint answers
 * with a 307 to the page, and following it here would fetch the page *before*
 * the cookies were captured, wasting a render and returning the published copy.
 */
async function openDraftSession(pageId: string): Promise<string> {
  const response = await fetch(draftModeUrl(pageId), {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "fix-it-registry-admin/1.0 (html export)" },
  });

  // A 401 here means PREVIEW_SECRET does not match between the two apps, which
  // is the single most common setup mistake in this pair of deployments.
  if (response.status === 401 || response.status === 403) {
    throw new Error("PREVIEW_SECRET does not match the consumer app.");
  }

  const cookies = extractDraftCookies(response.headers);
  if (!cookies) {
    throw new Error(
      `Draft mode returned ${response.status} without a draft cookie. ` +
        "Check /api/preview in the consumer app.",
    );
  }

  return cookies;
}

function describeFetchFailure(error: unknown, verb: string): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return `Timed out after ${FETCH_TIMEOUT_MS / 1000}s trying to ${verb} the site.`;
    }
    return `Could not ${verb} the site: ${error.message}`;
  }
  return `Could not ${verb} the site.`;
}

/** JSON, unlike the preview route: this endpoint is called from a fetch, not a tab. */
function problem(status: number, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
