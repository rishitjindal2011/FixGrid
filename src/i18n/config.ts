/**
 * The locale table. One source of truth.
 *
 * Deliberately free of `next-intl` imports and of anything server-only, because
 * four very different consumers need this data and they cannot all import from
 * the same places:
 *
 *   • `src/i18n/routing.ts`      — the locale codes, for routing
 *   • `src/app/[locale]/layout.tsx` — the font per script, on the server
 *   • the language switcher      — the native name, in a Client Component
 *   • `src/lib/format.ts`        — the BCP-47 tag for Intl
 *
 * Adding a language is one entry here, one font import in the locale layout, and
 * one `messages/<code>.json`. Nothing else should need to know the list.
 */

/** Locale codes, in the order the switcher lists them. */
export const LOCALES = ["en", "hi", "bn", "mr", "te", "ta", "kn"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Scripts, not languages.
 *
 * Hindi and Marathi both use Devanagari, so they share a font. This is why the
 * six added languages need only five typefaces — and why the font map is keyed
 * by locale but may point at the same family twice.
 */
export type Script = "latin" | "devanagari" | "bengali" | "telugu" | "tamil" | "kannada";

export interface LocaleMeta {
  /** The language's name in its own script — never "Hindi", always "हिन्दी". */
  nativeName: string;
  /** English name, for `aria-label` and admin surfaces. */
  englishName: string;
  /**
   * BCP-47 tag for `Intl`. Always region-qualified to India: `hi` alone would
   * let ICU pick a default region, and we want Indian digit grouping
   * (1,00,000 rather than 100,000) everywhere.
   */
  tag: string;
  script: Script;
  /** `dir` attribute. All seven are LTR; the field exists so adding Urdu is data, not surgery. */
  dir: "ltr" | "rtl";
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: "English", englishName: "English", tag: "en-IN", script: "latin", dir: "ltr" },
  hi: { nativeName: "हिन्दी", englishName: "Hindi", tag: "hi-IN", script: "devanagari", dir: "ltr" },
  bn: { nativeName: "বাংলা", englishName: "Bengali", tag: "bn-IN", script: "bengali", dir: "ltr" },
  mr: { nativeName: "मराठी", englishName: "Marathi", tag: "mr-IN", script: "devanagari", dir: "ltr" },
  te: { nativeName: "తెలుగు", englishName: "Telugu", tag: "te-IN", script: "telugu", dir: "ltr" },
  ta: { nativeName: "தமிழ்", englishName: "Tamil", tag: "ta-IN", script: "tamil", dir: "ltr" },
  kn: { nativeName: "ಕನ್ನಡ", englishName: "Kannada", tag: "kn-IN", script: "kannada", dir: "ltr" },
};

/** Narrow an untrusted string to a locale. */
export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Split a pathname into its locale prefix and the path beneath it.
 *
 * This is the workhorse of the proxy. With `localePrefix: "as-needed"` the
 * default locale carries no prefix, so `/search` and `/hi/search` are the same
 * page and anything keyed on the path — the `seo_redirects` table, the
 * `AUTH_ROUTES` allowlist, the signed-in redirect map — has to compare against
 * the unprefixed form or it silently stops matching for six of seven locales.
 *
 *   /hi/search -> { locale: "hi", pathname: "/search" }
 *   /search    -> { locale: null, pathname: "/search" }
 *   /hi        -> { locale: "hi", pathname: "/" }
 */
export function splitLocale(pathname: string): { locale: Locale | null; pathname: string } {
  const segments = pathname.split("/");
  // segments[0] is "" for any absolute path.
  const first = segments[1];

  if (!isLocale(first)) return { locale: null, pathname };

  const rest = "/" + segments.slice(2).join("/");
  return { locale: first, pathname: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
}

/**
 * Put a locale prefix back on a path.
 *
 * The inverse of `splitLocale`, and the default locale is deliberately left bare
 * so URLs that exist today keep working byte-for-byte — including the
 * `wallet_topups.pay_token` links already encoded into printed UPI QR codes.
 */
export function withLocale(pathname: string, locale: Locale): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
