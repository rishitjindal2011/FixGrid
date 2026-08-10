import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { getPageById } from "@/lib/queries/cms";
import { joinCmsPath } from "@/lib/site";

/**
 * Enable draft mode, then redirect to the page being previewed.
 *
 * The SEO admin builds this URL server-side and 307s the browser here, so
 * PREVIEW_SECRET never reaches the client. Once the draft cookie is set, the
 * catch-all route reads via the service-role client and can see `draft` rows.
 *
 * Two things worth noting:
 *   • The redirect target is derived from the DATABASE ROW, never from a query
 *     parameter. Accepting a caller-supplied `redirect` here would be an open
 *     redirect on an endpoint that has just granted elevated read access.
 *   • The secret is compared in constant time. A plain `!==` on a route that
 *     can be hit repeatedly is a byte-at-a-time oracle.
 */
export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest) {
  const expected = process.env.PREVIEW_SECRET;
  if (!expected) {
    console.error("[preview] PREVIEW_SECRET is not configured; refusing to enable draft mode.");
    return new NextResponse("Preview is not configured.", { status: 500 });
  }

  const secret = request.nextUrl.searchParams.get("secret") ?? "";
  const id = request.nextUrl.searchParams.get("id");

  if (!timingSafeEqual(secret, expected)) {
    return new NextResponse("Invalid preview token.", { status: 401 });
  }
  if (!id) {
    return new NextResponse("Missing page id.", { status: 400 });
  }

  const page = await getPageById(id);
  if (!page) {
    return new NextResponse("That page no longer exists.", { status: 404 });
  }

  const draft = await draftMode();
  draft.enable();

  redirect(joinCmsPath(page.path_prefix, page.slug));
}
