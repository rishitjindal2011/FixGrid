import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Barlow_Condensed,
  Hind,
  Hind_Guntur,
  Hind_Madurai,
  Hind_Mysuru,
  Hind_Siliguri,
  IBM_Plex_Mono,
  Public_Sans,
} from "next/font/google";

import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganization, buildWebSite } from "@/lib/seo/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { isLocale, LOCALES, LOCALE_META, type Locale, type Script } from "@/i18n/config";

import "../globals.css";

/* ── Latin type, unchanged ──────────────────────────────────────────────────
 *
 * Per the original design direction:
 *   display — Barlow Condensed, transport/signage lineage, set uppercase
 *   body    — Public Sans, a utility neutral that doesn't fight the display
 *   mono    — IBM Plex Mono, reserved for measured data (hours, ratings, geo)
 * Weights are pinned to only what's used; every extra weight is a font file.
 */
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

/* ── Indic type ─────────────────────────────────────────────────────────────
 *
 * The Hind superfamily, one family per script, all from Indian Type Foundry and
 * all sharing a skeleton — so the brand reads as one system across five scripts
 * instead of a patchwork of unrelated Noto faces. Each ships Latin alongside its
 * Indic script, so mixed strings ("FixGrid पर") stay in a single voice.
 *
 * Every family is loaded under the SAME css variable, `--font-indic`. Only one
 * of them is ever referenced by a rendered page, because the locale layout
 * applies exactly one font class — so a visitor downloads one family, not five.
 *
 * Barlow Condensed is not used for these locales at all: it has no Indic glyphs
 * (subsets are latin/latin-ext/vietnamese), so a Devanagari heading set in it
 * would silently fall back to a system font and the identity would collapse.
 *
 * Every option below is written out as a literal, repetitively. `next/font`
 * parses these calls statically at build time and rejects anything it cannot
 * read directly — a shared `WEIGHTS` constant or a spread of common options
 * fails the build with "Font loader values must be explicitly written literals".
 */
const hind = Hind({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

const hindGuntur = Hind_Guntur({
  subsets: ["telugu"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

const hindMadurai = Hind_Madurai({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

const hindMysuru = Hind_Mysuru({
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

const INDIC_FONT: Record<Exclude<Script, "latin">, { variable: string }> = {
  devanagari: hind,
  bengali: hindSiliguri,
  telugu: hindGuntur,
  tamil: hindMadurai,
  kannada: hindMysuru,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${SITE_NAME} — find a repair expert near you`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_ORIGIN,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#123b4a",
  colorScheme: "light",
};

/** Pre-register the locale segment so `/hi`, `/bn`, … are known at build time. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // An unknown prefix is a 404, not a silent fall back to English: `/xx/search`
  // should not quietly serve the English page under a bogus URL.
  if (!isLocale(locale)) notFound();

  // Lets pages under this layout opt into static rendering.
  setRequestLocale(locale);

  const meta = LOCALE_META[locale as Locale];

  /*
   * Narrowed to the non-Latin scripts rather than indexed with `meta.script`
   * directly. `INDIC_FONT` has no `latin` key by design — Latin uses three
   * separate faces, not one — and TypeScript is right to refuse the lookup
   * until "latin" has been excluded.
   */
  const indic = meta.script === "latin" ? null : INDIC_FONT[meta.script];

  const fontClasses = indic
    // Plex Mono is still loaded for Indic locales — see the --font-mono override.
    ? `${indic.variable} ${plexMono.variable}`
    : `${barlowCondensed.variable} ${publicSans.variable} ${plexMono.variable}`;

  /*
   * Remap the theme's font variables instead of rewriting the ~15 rules in
   * globals.css that consume them. `--font-display` and `--font-sans` are
   * defined there as `var(--font-barlow-condensed), …` and
   * `var(--font-public-sans), …`, so pointing those two inner variables at the
   * Indic face redirects every heading and every paragraph in one move.
   *
   * `--font-mono` is replaced outright rather than remapped, and the order is
   * the point: Plex Mono first so digits, times and ratings keep their tabular
   * alignment, then the Indic face so a translated day name ("सोम") falls
   * through to Hind rather than to whatever the OS picks.
   */
  const fontVars = !indic
    ? undefined
    : ({
        "--font-barlow-condensed": "var(--font-indic)",
        "--font-public-sans": "var(--font-indic)",
        "--font-mono": "var(--font-plex-mono), var(--font-indic), ui-monospace, monospace",
      } as React.CSSProperties);

  return (
    <html lang={locale} dir={meta.dir} className={fontClasses} style={fontVars}>
      <body className="flex min-h-dvh flex-col antialiased">
        {/* Site-wide structured data. Page-level schemas add to this. */}
        <JsonLd data={[buildOrganization(), buildWebSite()]} />

        {/*
         * Messages reach Client Components through this provider. Server
         * Components read them directly via `getTranslations` and do not need it.
         *
         * Chrome lives one level down, in the route-group layouts: `(site)`
         * carries the marketing header/footer, `(dashboard)` carries the
         * sidebar shell. A dashboard should not inherit the marketing nav,
         * and the two do not share a skip-link target.
         */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
