import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { draftModeUrl } from "@/lib/preview";
import { getPage } from "@/lib/queries/pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Preview a page as the consumer app renders it.
 *
 * The editor's "Preview" button is a plain `<a>` to this route, which:
 *   1. checks the admin session (viewers included — reading a draft is a read),
 *   2. looks the row up by id with the service-role key, so drafts are visible,
 *   3. redirects to the consumer app's `/api/preview` carrying the id and the
 *      shared secret.
 *
 * The consumer app then sets its own draft cookie and redirects to the real
 * path, which it derives from the same row. At no point does a caller-supplied
 * string become a redirect target — that is the whole design. `?id=` is the
 * only input, and a bad id produces a 404 rather than a redirect to nowhere.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    // The proxy normally catches this. If a stale tab fires the request after
    // the cookie expired, send them through login rather than 500-ing on a
    // missing session downstream.
    return NextResponse.redirect(new URL("/login?next=/pages", request.url), 303);
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return problem(400, "Missing ?id.");

  const page = await getPage(id);
  if (!page) return problem(404, "That page no longer exists. It may have been deleted.");

  let destination: URL;
  try {
    destination = draftModeUrl(page.id);
  } catch (error) {
    // Thrown by `resolvePreviewSecret` / `resolveTarget`: configuration, not
    // user input. Surfacing the message is safe here because the route is
    // behind the admin session, and it saves a trip to the server logs.
    return problem(500, error instanceof Error ? error.message : "Preview is not configured.");
  }

  // 307, not 302: keeps the method and, more importantly, tells intermediaries
  // not to cache the hop. The URL carries the shared secret.
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

/**
 * Preview opens in a new tab, so failures are read by a person, not by code.
 * A short HTML page with the resolved path is more useful there than JSON.
 */
function problem(status: number, message: string): NextResponse {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Preview unavailable</title>
<style>
  :root { color-scheme: light }
  body { margin:0; display:grid; place-items:center; min-height:100vh;
         font:15px/1.6 ui-sans-serif,system-ui,sans-serif; background:#f4f5f6; color:#1c1f22 }
  main { max-width:34rem; padding:2rem; background:#fff; border:1px solid #dcdfe3; border-radius:4px }
  h1 { margin:0 0 .5rem; font-size:1rem; text-transform:uppercase; letter-spacing:.12em }
  p { margin:0; color:#4d545b }
</style></head><body><main>
<h1>Preview unavailable</h1><p>${escapeHtml(message)}</p>
</main></body></html>`;

  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
