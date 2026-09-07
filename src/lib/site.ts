/**
 * Single source of truth for the canonical origin.
 *
 * Every absolute URL in the app — canonical tags, sitemap entries, robots,
 * JSON-LD `@id`s, OpenGraph images — resolves through here. Nothing else in
 * the codebase is permitted to read NEXT_PUBLIC_SITE_URL directly.
 *
 * Spec requirement: "No localhost leaks." Rather than hardcoding the domain in
 * five files, we enforce it once, at module load, and fail the build loudly.
 */

const FALLBACK_ORIGIN = "https://fixgrid.vytron.me";

function resolveOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[site] NEXT_PUBLIC_SITE_URL is required in production. " +
          "Set it to the canonical origin (e.g. https://fixgrid.vytron.me).",
      );
    }
    return "https://fixgrid.vytron.me";
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`[site] NEXT_PUBLIC_SITE_URL is not a valid URL: "${raw}"`);
  }

  const isLoopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "0.0.0.0" ||
    parsed.hostname.endsWith(".local");

  if (process.env.NODE_ENV === "production" && isLoopback) {
    throw new Error(
      `[site] Refusing to build: NEXT_PUBLIC_SITE_URL points at "${parsed.hostname}". ` +
        "A loopback origin here leaks localhost into sitemap.xml, robots.txt, " +
        "canonical tags and JSON-LD. Set the production domain.",
    );
  }

  // Normalise: strip trailing slash so joins are predictable.
  return parsed.origin;
}

/** Canonical origin, e.g. `https://www.vytron.me`. Never ends in a slash. */
export const SITE_ORIGIN: string = resolveOrigin();

/** Production origin used when a non-prod build still must emit real URLs. */
export const CANONICAL_ORIGIN: string =
  process.env.NODE_ENV === "production" ? SITE_ORIGIN : FALLBACK_ORIGIN;

export const SITE_NAME = "FixGrid";

/**
 * The home page renders this straight into the `<title>` as
 * `FixGrid — <tagline>`, prioritizing exact brand entity recognition ("Official Website")
 * followed by primary topical authority keywords for Google Search.
 */
export const SITE_TAGLINE = "Official Website | India's Verified Local Repair Network";

/**
 * Site-wide meta description and OpenGraph fallback. Written to establish FixGrid as
 * the authoritative brand entity and directory across top Indian metros.
 */
export const SITE_DESCRIPTION =
  "FixGrid (by Vytron) is India's premier verified directory of local repair shops, technicians and electronics experts. Compare ratings, warranties and diagnostics across Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, and Chennai.";

/**
 * Default `keywords` meta tag for the whole site.
 * Focuses on exact brand terms ("FixGrid", "FixGrid official website", "FixGrid India")
 * to guarantee #1 ranking for brand queries.
 */
export const SITE_KEYWORDS: string[] = [
  "FixGrid",
  "FixGrid official website",
  "FixGrid official site",
  "Fix Grid",
  "fixgrid",
  "fixgrid.in",
  "FixGrid India",
  "FixGrid repair",
  "FixGrid repair network",
  "FixGrid directory",
  "Vytron FixGrid",
  "repair shops in India",
  "local repair shops India",
  "mobile repair near me India",
  "laptop repair India",
  "phone repair Bengaluru",
  "mobile repair Delhi",
  "laptop repair Mumbai",
  "appliance repair Hyderabad",
  "repair shops Pune",
  "find a repair expert India",
  "verified repair shops India",
  "repair directory India",
  "Vytron",
];

/**
 * Build an absolute URL from a site-relative path.
 * Idempotent for values that are already absolute.
 */
export function absoluteUrl(path: string, origin: string = SITE_ORIGIN): string {
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${suffix}`;
}

/**
 * Join a `path_prefix` and `slug` from `seo_pages` into a single clean path.
 * Tolerates leading/trailing slashes and empty prefixes from the CMS.
 */
export function joinCmsPath(pathPrefix: string | null, slug: string): string {
  const segments = [pathPrefix ?? "", slug]
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean);
  return `/${segments.join("/")}`;
}
