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

const FALLBACK_ORIGIN = "https://vytron.me";

function resolveOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[site] NEXT_PUBLIC_SITE_URL is required in production. " +
          "Set it to the canonical origin (e.g. https://www.vytron.me).",
      );
    }
    return "https://vytron.me";
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
 * `FixGrid — <tagline>`, so it carries the primary keywords a search engine
 * looks for in the title tag: "repair", "shops" and "experts". The old
 * personality line ("Find someone who can actually fix it.") reads well but
 * named none of them, which is what a title-tag keyword audit flags.
 */
export const SITE_TAGLINE = "Find local repair shops and experts near you";

/**
 * Site-wide meta description and OpenGraph fallback. Written to distribute the
 * page's core keywords — repair, shop(s), verified, diagnostics — instead of
 * describing the login flow, and kept under ~160 characters so search engines
 * render it without truncation.
 */
export const SITE_DESCRIPTION =
  "FixGrid by Vytron is a directory of verified local repair shops and experts. Compare ratings, warranties and diagnostics, then book a repair shop near you.";

/**
 * Default `keywords` meta tag for the whole site.
 *
 * Google ignores this tag, but the SEO audits people actually run (and Bing)
 * still check that it exists and that it echoes the page's primary terms — an
 * empty keywords tag is a red mark in those reports. Set once here and applied
 * in the root layout so every route inherits it; pages with a narrower topic
 * (a shop, a category, a blog post) override with their own, more specific set.
 */
export const SITE_KEYWORDS: string[] = [
  "repair shops",
  "local repair shops",
  "repair shop near me",
  "find a repair expert",
  "repair experts",
  "phone repair",
  "laptop repair",
  "appliance repair",
  "bike repair",
  "watch repair",
  "repair diagnostics",
  "verified repair shops",
  "repair directory",
  "local fixers",
  "book a repair",
  "FixGrid",
  "Vytron",
  "Vytron FixGrid",
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
