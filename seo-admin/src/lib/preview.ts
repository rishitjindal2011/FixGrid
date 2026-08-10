import "server-only";

import { PUBLIC_APP_URL } from "@/lib/site";

/**
 * The preview handshake, and the rules for talking to the consumer app.
 *
 * Two routes need this: `/api/preview` (redirect the editor into draft mode)
 * and `/api/export-html` (fetch the rendered page server-side). Both cross an
 * app boundary, so both are shaped by the same two constraints.
 *
 * 1. The *destination* is never taken from the request.
 *    Every caller passes a page id. The path is looked up in Postgres and built
 *    with `joinCmsPath`. A `?url=` or `?path=` parameter would turn the admin
 *    into an open redirect and, worse, into an SSRF proxy that speaks from
 *    inside the deployment's network.
 *
 * 2. The origin is pinned to `NEXT_PUBLIC_APP_URL`.
 *    `resolveTarget` below re-checks the assembled URL's origin even though the
 *    path comes from the database, because `new URL("//evil.example", base)` is
 *    protocol-relative and silently changes host. That is one stray double
 *    slash in a `path_prefix` column away from being real.
 */

/** Ceiling on an exported document. A CMS page that exceeds this is a bug. */
export const MAX_EXPORT_BYTES = 4 * 1024 * 1024;

/** Requests to the consumer app get a hard deadline rather than hanging a route. */
export const FETCH_TIMEOUT_MS = 15_000;

export function resolvePreviewSecret(): string {
  const secret = process.env.PREVIEW_SECRET;

  // Same reasoning as ADMIN_JWT_SECRET: a blank shared secret means anybody who
  // finds the consumer app's draft endpoint can read unpublished content, and
  // the failure is invisible until someone goes looking.
  if (!secret || secret.length < 16) {
    throw new Error(
      "[preview] PREVIEW_SECRET is missing or too short. It must match the consumer app " +
        "and be at least 16 characters. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
    );
  }

  return secret;
}

/**
 * Resolve a database-derived path against the consumer app's origin.
 *
 * Throws rather than returning null: every call site treats a cross-origin
 * result as a bug in the data, not as a branch to handle gracefully.
 */
export function resolveTarget(dbPath: string): URL {
  const base = new URL(PUBLIC_APP_URL);
  const target = new URL(dbPath, base);

  if (target.origin !== base.origin) {
    throw new Error(
      `[preview] Refusing to resolve ${JSON.stringify(dbPath)} — it escapes ${base.origin}.`,
    );
  }

  return target;
}

/**
 * The consumer app's draft-mode enabler, addressed by page id.
 *
 * Path must stay in step with `src/app/api/preview/route.ts` in the consumer
 * app. That route verifies the secret in constant time, looks the row up again
 * itself, and derives its own redirect from `joinCmsPath` — so neither side
 * trusts a path from the other.
 */
export function draftModeUrl(pageId: string): URL {
  const url = resolveTarget("/api/preview");
  url.searchParams.set("secret", resolvePreviewSecret());
  url.searchParams.set("id", pageId);
  return url;
}

/**
 * Read a response body with a byte ceiling.
 *
 * `response.text()` buffers whatever arrives, so a misconfigured upstream
 * streaming gigabytes would take the admin process down. `content-length` is
 * checked first when present, then the stream is counted as it is consumed
 * because a chunked response has no length to check.
 */
export async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`RESPONSE_TOO_LARGE:${declared}`);
  }

  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) throw new Error(`RESPONSE_TOO_LARGE:${total}`);
      chunks.push(value);
    }
  } finally {
    // Releasing matters on the throw path — an abandoned lock keeps the socket
    // open until the process notices.
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(merged);
}

/**
 * Pull the cookies Next.js issues for draft mode out of a `set-cookie` header.
 *
 * Only the two draft-mode cookies are forwarded. Replaying the whole header
 * would hand the consumer app's session cookies — whatever they may be — to a
 * request the admin is making on an editor's behalf.
 */
const DRAFT_COOKIE_NAMES = ["__prerender_bypass", "__next_preview_data"] as const;

export function extractDraftCookies(headers: Headers): string | null {
  const raw = headers.getSetCookie();
  if (raw.length === 0) return null;

  const pairs: string[] = [];
  for (const line of raw) {
    const pair = line.split(";", 1)[0]?.trim();
    if (!pair) continue;

    const name = pair.split("=", 1)[0]?.trim();
    if (!name) continue;
    if (!DRAFT_COOKIE_NAMES.includes(name as (typeof DRAFT_COOKIE_NAMES)[number])) continue;

    pairs.push(pair);
  }

  return pairs.length > 0 ? pairs.join("; ") : null;
}

/** A filesystem-safe name for a downloaded export. */
export function exportFilename(pathPrefix: string | null, slug: string): string {
  const stem = [pathPrefix ?? "", slug]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return `${stem || "page"}.html`;
}
