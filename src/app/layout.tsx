import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";

import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganization, buildWebSite } from "@/lib/seo/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

import "./globals.css";

/**
 * Type pairing, per the design direction:
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
    title: `${SITE_NAME} — find a repair expert near you`,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${publicSans.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col antialiased">
        {/* Site-wide structured data. Page-level schemas add to this. */}
        <JsonLd data={[buildOrganization(), buildWebSite()]} />

        {/*
         * Chrome lives one level down, in the route-group layouts: `(site)`
         * carries the marketing header/footer, `(dashboard)` carries the
         * sidebar shell. A dashboard should not inherit the marketing nav,
         * and the two do not share a skip-link target.
         */}
        {children}
      </body>
    </html>
  );
}
