import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";

import "./globals.css";

/**
 * Root layout for the platform admin.
 *
 * Deliberately thin: it owns `<html>`, the font variables and the document
 * metadata, nothing else. The signed-in chrome lives in `(admin)/layout.tsx` so
 * `/login` can render on a bare page — a sidebar full of links you cannot
 * follow is worse than no sidebar.
 *
 * Same three faces as the consumer app and the SEO admin. An operator who moves
 * between all three in one shift should not have to re-learn what a heading or
 * a number looks like.
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

/**
 * `robots` is set here *as well as* in the `X-Robots-Tag` header from
 * `next.config.ts`. Belt and braces on purpose: the header covers assets and
 * API responses that never render a `<head>`, and the meta tag survives if the
 * app is ever put behind a proxy that strips response headers.
 *
 * Setting it on the root layout means every route inherits it — a page agent
 * cannot forget to opt out of indexing, only explicitly opt back in.
 */
export const metadata: Metadata = {
  title: {
    default: "Platform Admin · Fix-It Registry",
    template: "%s · Platform Admin",
  },
  description: "Internal operations console for the Fix-It Registry marketplace.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#123b4a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${publicSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-bench antialiased">{children}</body>
    </html>
  );
}
