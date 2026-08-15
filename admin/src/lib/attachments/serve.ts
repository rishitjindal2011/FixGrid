import "server-only";

/**
 * Response construction for privately-stored files.
 *
 * NOTE: this file is a copy of `src/lib/attachments/serve.ts` in the consumer
 * app. Duplicated for the reason `seo-admin/src/lib/cms/blocks.ts` documents at
 * its head: the apps deploy independently and share no package, and a symlink
 * breaks on Windows and in most CI checkouts. If the allowlist or the headers
 * change, change both — the consumer app is the source of truth.
 *
 * The one job of this module: attachments used to be handed to the browser as a
 * signed `supabase.co` URL, and are now streamed from our own origin instead.
 * That removes a bearer token from the address bar, and introduces a risk the
 * third-party origin never had — a malicious upload now runs *next to our admin
 * session cookie* rather than on somebody else's domain. Which matters more here
 * than in the consumer app: this cookie can approve shop claims and resolve
 * refunds.
 *
 * So every header below is load-bearing, and none of them are derived from
 * anything a user controls:
 *
 *   • **`Content-Type` comes from a fixed allowlist, never from the database.**
 *     `booking_attachments.mime_type` is written by the client at insert time, so
 *     echoing it would let an uploader nominate `text/html` and get stored XSS on
 *     our origin. Both buckets restrict `allowed_mime_types` at upload, but that
 *     is a second system's setting and this one must hold on its own.
 *
 *   • **SVG is deliberately absent from the allowlist.** It is an image to a
 *     human and a script host to a browser.
 *
 *   • **`nosniff`**, so a mislabelled body is not re-interpreted as markup.
 *
 *   • **`sandbox`**, which neutralises scripts, forms and plugins for anything
 *     that reaches the browser despite the above.
 *
 *   • **`no-store`**, because these bytes are evidence in somebody's dispute and
 *     a shared cache anywhere on the path would outlive the session that was
 *     authorised to see them.
 */

/** What we are willing to name in a `Content-Type`. Mirrors both buckets' `allowed_mime_types`. */
const SERVABLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

/** Anything not on the allowlist is served as opaque bytes. */
const FALLBACK_TYPE = "application/octet-stream";

function resolveContentType(blobType: string | undefined, claimed: string | null): string {
  const candidates = [blobType, claimed];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const bare = candidate.split(";")[0]?.trim().toLowerCase();
    if (bare && SERVABLE_TYPES.has(bare)) return bare;
  }

  return FALLBACK_TYPE;
}

/**
 * Strip a filename down to something safe to put in a header.
 *
 * `file_name` is client-supplied. Quotes and control characters would let it
 * break out of the quoted-string and inject header content; path separators
 * would suggest a directory to whatever saves it.
 */
function safeFilename(name: string | null, fallback: string): string {
  if (!name) return fallback;

  const cleaned = name
    .replace(/[\r\n"\\]/g, "")
    // Control characters too: a filename is not a place to smuggle header bytes.
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[/\\]/g, "-")
    .trim()
    .slice(0, 120);

  return cleaned || fallback;
}

/**
 * Build the response for one stored file.
 *
 * Images render in place; everything else downloads. That is a deliberate choice
 * rather than a limitation: the browser's PDF viewer is a scripting engine, and
 * there is no reason to host one on the same origin as the console that approves
 * claims when the alternative costs the reviewer one click.
 */
export function attachmentResponse(
  body: Blob,
  options: { mimeType: string | null; fileName: string | null },
): Response {
  const contentType = resolveContentType(body.type, options.mimeType);
  const isImage = contentType.startsWith("image/");
  const filename = safeFilename(options.fileName, isImage ? "attachment" : "download");

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": isImage
        ? "inline"
        : `attachment; filename="${filename}"`,
      "content-length": String(body.size),
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
      "cache-control": "private, no-store, max-age=0",
      "referrer-policy": "no-referrer",
    },
  });
}

/**
 * The only failure response these routes give.
 *
 * 404 for "no such row", "not signed in" and "storage is down" alike. Admins are
 * trusted, but the console is reachable from the internet and a distinguishable
 * 403 would confirm to an unauthenticated caller that a given id exists.
 */
export function attachmentNotFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
