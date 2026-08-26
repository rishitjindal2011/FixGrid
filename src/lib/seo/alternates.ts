import type { Metadata } from "next";

import { DEFAULT_LOCALE, LOCALES, LOCALE_META, isLocale, withLocale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";

/**
 * Canonical + hreflang for one page, in every language.
 *
 * Every page under `src/app/[locale]/` exists at seven URLs. Without hreflang,
 * search engines see seven near-identical pages and pick one — usually the
 * English one, because that is what is linked to — and the six translations
 * either get filtered as duplicates or outrank each other at random.
 *
 * Three rules this encodes, each of which is easy to get wrong:
 *
 *   • The canonical is the URL of the page *you are on*, prefixed. A Tamil page
 *     whose canonical points at `/expert/foo` is telling Google to index the
 *     English page instead and drop the Tamil one. Self-canonical, always.
 *
 *   • `hreflang` values are region-qualified (`hi-IN`, `ta-IN`) from
 *     `LOCALE_META.tag`, not bare language codes. Every one of these audiences
 *     is in India, and `ta` alone would also claim Tamil readers in Sri Lanka
 *     and Singapore, whom this directory cannot serve.
 *
 *   • `x-default` points at the unprefixed English URL. That is the page a
 *     reader in an unlisted language should land on, and it is also the URL
 *     already in the submitted sitemap and in the printed UPI QR codes — so the
 *     one URL that must not move is the one named as the fallback.
 *
 * `path` is the locale-free path, exactly as `splitLocale` would return it:
 * `/expert/some-shop`, not `/hi/expert/some-shop`.
 */
export function localeAlternates(path: string, locale: string): Metadata["alternates"] {
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;

  const languages: Record<string, string> = {};
  for (const candidate of LOCALES) {
    languages[LOCALE_META[candidate].tag] = absoluteUrl(withLocale(path, candidate));
  }
  languages["x-default"] = absoluteUrl(withLocale(path, DEFAULT_LOCALE));

  return {
    canonical: absoluteUrl(withLocale(path, active)),
    languages,
  };
}
