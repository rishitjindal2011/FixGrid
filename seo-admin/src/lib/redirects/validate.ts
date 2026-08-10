/**
 * URL validation for the redirect table.
 *
 * This table is read by the consumer app's proxy and turned directly into
 * `Response.redirect(...)`. That makes it the single highest-leverage row in the
 * database: whatever lands in `destination_url` is where a visitor's browser
 * goes, before any page code runs. Two failure modes matter.
 *
 *   • **Dangerous schemes.** `javascript:` and `data:` in a redirect are stored
 *     XSS — the browser executes them in the site's origin. These are rejected
 *     outright, not escaped, because there is no safe rendering of them here.
 *
 *   • **Protocol-relative bypass.** `//evil.com` looks like a path and passes a
 *     naive `startsWith("/")` check, but browsers read it as an absolute URL on
 *     another host. Every path check below rejects a second leading slash.
 *
 * External destinations *are* allowed. Only an authenticated editor can write
 * here, and pointing a retired URL at a partner site is a real requirement — so
 * this is a deliberate product decision, not the classic open-redirect hole
 * where an attacker supplies the target through a query parameter.
 */

/** Schemes that must never reach `Response.redirect`, checked before parsing. */
const BLOCKED_SCHEME = /^(javascript|data|vbscript|file|blob|about):/i;

export interface UrlCheck {
  ok: boolean;
  /** Normalised value to store. Only meaningful when `ok` is true. */
  value: string;
  error: string | null;
}

function reject(error: string): UrlCheck {
  return { ok: false, value: "", error };
}

/**
 * The source side must be a site-relative path. An absolute source would be
 * meaningless: the proxy only ever sees requests already routed to this site,
 * so a source of `https://other.example/x` could not match anything.
 */
export function checkSourcePath(raw: string): UrlCheck {
  const input = raw.trim();
  if (input === "") return reject("A source path is required.");
  if (input.length > 500) return reject("Source paths are limited to 500 characters.");
  if (BLOCKED_SCHEME.test(input)) return reject("That scheme is not allowed in a redirect.");
  if (!input.startsWith("/")) return reject("The source must be a path starting with “/”.");
  if (input.startsWith("//")) {
    return reject("“//” starts an absolute URL. Use a single leading slash.");
  }
  if (/\s/.test(input)) return reject("Paths cannot contain spaces.");

  // A query string on the source cannot be matched: the proxy compares
  // pathnames, and encoding the query into the key would silently never fire.
  if (input.includes("?")) return reject("Match on the path only — drop the query string.");
  if (input.includes("#")) return reject("Fragments never reach the server. Remove the “#” part.");

  // Trailing slashes are stripped so `/old` and `/old/` cannot both be stored
  // and disagree about which wins. Root stays `/`.
  const normalized = input.length > 1 ? input.replace(/\/+$/, "") : input;
  return { ok: true, value: normalized, error: null };
}

/**
 * The destination may be a site-relative path or an absolute http(s) URL.
 */
export function checkDestination(raw: string): UrlCheck {
  const input = raw.trim();
  if (input === "") return reject("A destination is required.");
  if (input.length > 500) return reject("Destinations are limited to 500 characters.");
  if (BLOCKED_SCHEME.test(input)) return reject("That scheme is not allowed in a redirect.");
  if (/\s/.test(input)) return reject("Destinations cannot contain spaces.");

  if (input.startsWith("//")) {
    return reject("“//” is ambiguous. Write the full https:// URL, or a single-slash path.");
  }

  if (input.startsWith("/")) return { ok: true, value: input, error: null };

  // Anything else has to parse as an absolute URL, and `URL` is the arbiter
  // rather than a regex — it resolves the same way the browser will.
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return reject("Enter a path starting with “/” or a full https:// URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return reject("Only http and https destinations are allowed.");
  }
  return { ok: true, value: parsed.toString(), error: null };
}

/**
 * Loop detection.
 *
 * A redirect whose destination is its own source is an infinite loop the browser
 * will surface as `ERR_TOO_MANY_REDIRECTS` — worth catching at save time, since
 * the symptom appears on the live site and not in the admin.
 *
 * Only the direct case is checked here. Detecting longer chains means walking
 * the whole table on every save, and a two-hop chain still resolves correctly
 * for visitors; it is a performance smell rather than an outage.
 */
export function isSelfLoop(source: string, destination: string): boolean {
  if (source === destination) return true;
  if (!destination.startsWith("/")) {
    try {
      return new URL(destination).pathname.replace(/\/+$/, "") === source;
    } catch {
      return false;
    }
  }
  return destination.replace(/\/+$/, "") === source;
}
