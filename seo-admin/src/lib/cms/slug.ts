/**
 * Slug and path-prefix normalisation.
 *
 * Deliberately not inside a `"use server"` module: the editor imports these to
 * show a live URL preview as you type, and the save action imports them to
 * normalise before writing. One implementation means the preview cannot
 * disagree with what actually lands in the database.
 */

/**
 * Normalise a single URL segment.
 *
 * Accents are folded rather than stripped so "réparation" becomes "reparation"
 * instead of "rparation". Everything else non-alphanumeric collapses to a
 * single hyphen, and leading/trailing hyphens are trimmed — `-foo--bar-` is a
 * valid path but an ugly one, and it makes duplicate detection unreliable.
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

/**
 * Normalise a path prefix into `segment/segment` form — no leading or trailing
 * slash. The empty string is legal and means "mount at the site root".
 *
 * Storing it without slashes keeps `joinCmsPath` simple and makes the
 * `UNIQUE (path_prefix, slug)` constraint meaningful: `repair` and `/repair/`
 * must not be two different prefixes that produce the same public URL.
 */
export function normalizePathPrefix(input: string): string {
  return input
    .split("/")
    .map((segment) => normalizeSlug(segment))
    .filter(Boolean)
    .join("/");
}

/** Reserved top-level prefixes that belong to the consumer app's own routes. */
const RESERVED_PREFIXES = new Set([
  "api",
  "_next",
  "expert",
  "search",
  "login",
  "signup",
  "dashboard",
  "sitemap.xml",
  "robots.txt",
]);

/**
 * Why this check exists: `seo_pages` is rendered by a catch-all route, so a CMS
 * page at `expert/anything` would sit underneath a real application route and
 * simply never render. Failing at save time is far easier to understand than a
 * page that saves cleanly and 404s forever.
 */
export function reservedPrefixError(pathPrefix: string, slug: string): string | null {
  const first = pathPrefix ? pathPrefix.split("/")[0] : slug;
  if (first && RESERVED_PREFIXES.has(first)) {
    return `"${first}" is used by the app's own routes. A CMS page there would never render.`;
  }
  return null;
}
