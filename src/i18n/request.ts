import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

/**
 * Per-request i18n configuration, discovered automatically by the next-intl
 * plugin (see `next.config.ts`).
 *
 * Messages are loaded per locale, so a visitor downloads one catalogue rather
 * than all seven.
 *
 * `timeZone` is pinned to `Asia/Kolkata` rather than left to the server's
 * default. Vercel runs in UTC, so without this a relative date rendered on the
 * server and re-rendered on the client could disagree about which day it is —
 * and every shop and customer on this platform is in India. Booking slots are
 * unaffected: `src/lib/bookings/slots.ts` works from the shop's own
 * `fixer_profiles.timezone` and does not read this.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    timeZone: "Asia/Kolkata",
    /*
     * English is loaded alongside any other locale and spread underneath it, so
     * a key that has not been translated yet renders the English string instead
     * of a `MISSING_MESSAGE` error in the middle of the page.
     *
     * The catalogues are two levels deep (namespace -> key), so a shallow spread
     * would let a partially-translated namespace hide every English sibling
     * inside it. Merge one level down.
     */
    messages: locale === DEFAULT_LOCALE
      ? (await import(`../../messages/en.json`)).default
      : mergeNamespaces(
          (await import(`../../messages/en.json`)).default,
          (await import(`../../messages/${locale}.json`)).default,
        ),
    onError(error) {
      // A missing key falls back to English above, so anything reaching here is
      // a real fault (malformed ICU, unknown namespace) and should be loud in
      // development but must never take a page down in production.
      if (process.env.NODE_ENV === "development") console.error("[i18n]", error);
    },
    getMessageFallback({ namespace, key }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});

type Catalogue = Record<string, Record<string, unknown> | unknown>;

/** Shallow-merge each namespace so partial translations fall back key by key. */
function mergeNamespaces(base: Catalogue, override: Catalogue): Catalogue {
  const merged: Catalogue = { ...base };

  for (const [namespace, value] of Object.entries(override)) {
    const existing = merged[namespace];
    if (isRecord(existing) && isRecord(value)) {
      merged[namespace] = { ...existing, ...value };
    } else {
      merged[namespace] = value;
    }
  }

  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Re-exported so callers do not need two imports to know the locale's metadata. */
export { LOCALE_META };
