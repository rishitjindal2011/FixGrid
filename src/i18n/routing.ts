import { defineRouting } from "next-intl/routing";

import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

/**
 * Routing rules for every locale.
 *
 * Two settings here are load-bearing decisions, not defaults worth skimming.
 *
 * `localePrefix: "as-needed"` — the default locale carries NO prefix, so every
 * URL that exists today keeps working byte-for-byte. That is not a stylistic
 * preference:
 *
 *   • `wallet_topups.pay_token` QR codes encode `<origin>/pay/<token>`. Some of
 *     those have been generated already, and a QR code cannot be re-issued once
 *     it is on someone's phone. `"always"` would turn each into a redirect.
 *   • `src/app/sitemap.ts` has been submitted to search engines.
 *   • Google brand verification for "FixGrid" is in progress; 301-ing the whole
 *     URL space mid-verification is a self-inflicted wound.
 *
 * `localeDetection: false` — we do NOT auto-redirect based on `Accept-Language`.
 * With detection on, a visitor whose phone is set to Hindi asking for `/search`
 * gets a 307 to `/hi/search`, which means the same URL serves different
 * responses to different clients and existing indexed URLs start bouncing. The
 * locale is chosen explicitly by the switcher and remembered in a cookie
 * instead. Turning detection on later is a one-line change once the URL space
 * has settled.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
});
