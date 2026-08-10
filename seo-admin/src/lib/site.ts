/**
 * Where the *consumer* app lives, from the admin's point of view.
 *
 * The admin never links to itself with an absolute URL — it links out: "View"
 * buttons, the preview handoff, and the export-html fetch all target the public
 * app. So there is exactly one origin to resolve here, and every one of those
 * features goes through it.
 *
 * Spec requirement "No Localhost Leaks" applies with extra force in this
 * direction: a stale `http://localhost:3000` in the admin means the preview
 * button silently 404s for anyone who is not the developer who deployed it.
 * Failing at module load is louder and cheaper to diagnose.
 */

function resolveAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[site] NEXT_PUBLIC_APP_URL is required in production. " +
          "Set it to the consumer app's origin (e.g. https://www.vytron.me).",
      );
    }
    return "http://localhost:3000";
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`[site] NEXT_PUBLIC_APP_URL is not a valid URL: "${raw}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`[site] NEXT_PUBLIC_APP_URL must be http(s), got "${parsed.protocol}".`);
  }

  const isLoopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "0.0.0.0" ||
    parsed.hostname.endsWith(".local");

  if (process.env.NODE_ENV === "production" && isLoopback) {
    throw new Error(
      `[site] Refusing to build: NEXT_PUBLIC_APP_URL points at "${parsed.hostname}". ` +
        "Preview and export would target the admin's own container instead of the site.",
    );
  }

  // Normalise so joins are predictable — `origin` never carries a trailing slash.
  return parsed.origin;
}

/** Consumer app origin, e.g. `https://www.vytron.me`. Never ends in a slash. */
export const PUBLIC_APP_URL: string = resolveAppUrl();

export const SITE_NAME = "FixGrid";

/**
 * Join a `path_prefix` and `slug` from `seo_pages` into one clean path.
 *
 * Copied from the consumer app's `src/lib/site.ts` rather than shared, for the
 * same reason `lib/cms/blocks.ts` is copied: the two apps deploy independently.
 * If the joining rules change, change both. A mismatch here means the admin
 * links to a URL the renderer does not serve.
 */
export function joinCmsPath(pathPrefix: string | null, slug: string): string {
  const segments = [pathPrefix ?? "", slug]
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean);
  return `/${segments.join("/")}`;
}

/** Absolute public URL for a CMS row. */
export function publicPageUrl(pathPrefix: string | null, slug: string): string {
  return `${PUBLIC_APP_URL}${joinCmsPath(pathPrefix, slug)}`;
}
