/**
 * Tell next-intl what a "locale" is.
 *
 * Without this augmentation `getLocale()`, `useLocale()` and the navigation
 * helpers all return a bare `string`, so anything that consumes a locale with a
 * stricter type — `withLocale`/`localizedTarget` (which take `Locale`),
 * `LOCALE_META[locale]` — needs a cast or a re-narrow at every call site. Naming
 * the union once here removes that friction across the whole app and turns a
 * mistyped locale into a compile error instead of a runtime surprise.
 *
 * `Locale` is deliberately the ONLY member declared. `Messages` is left off on
 * purpose: typing it to `en.json` would make every `t("…")` call a type error
 * until all six catalogues catch up, and catalogue parity is already enforced at
 * build time by `npm run i18n:check`.
 *
 * This file is never imported. It is a module (it has an `import`) and is
 * covered by the tsconfig `include` globs, which is all TypeScript needs to
 * apply the augmentation project-wide.
 */

import type { Locale } from "@/i18n/config";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
  }
}
