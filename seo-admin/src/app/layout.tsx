import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";

import "./globals.css";

/**
 * Root layout for the admin app.
 *
 * Deliberately thin: it owns `<html>`, the font variables and the document
 * metadata, nothing else. The signed-in chrome lives in `(dashboard)/layout.tsx`
 * so that `/login` can render on a bare page — a sidebar full of links you
 * cannot follow is worse than no sidebar.
 *
 * Same three faces as the consumer app. An internal tool that looks like the
 * product it edits is easier to trust: what you see in the block editor is
 * what the public page will look like.
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
 * API responses that never render a `<head>`, the meta tag survives if the app
 * is ever put behind a proxy that strips response headers.
 */
export const metadata: Metadata = {
  title: {
    default: "SEO Admin · FixGrid",
    template: "%s · SEO Admin",
  },
  description: "Internal CMS and technical-SEO console for FixGrid.",
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
