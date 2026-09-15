import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { PartsJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  metadataBase: new URL("https://parts.vytron.me"),
  title: {
    default: "FixGrid Parts & Supply — Certified Electronics Components & Lab Silicon",
    template: "%s | FixGrid Parts & Supply",
  },
  description:
    "Source authentic OEM donor screen pulls, tested PMIC silicon chips, battery modules, and repair lab consumables directly from certified workshop benches across India. Verified with multi-point multimeter impedance testing and escrow protection.",
  keywords: [
    "oem screen pulls India",
    "genuine iphone display pull",
    "pmic ic chips bga",
    "tristar u2 charging ic",
    "ps5 hdmi 2.1 port replacement",
    "macbook power controller ic",
    "amtech nc-559 flux genuine",
    "laptop donor logic boards",
    "nehru place component suppliers",
    "lamington road ic parts",
    "sp road electronics components",
    "FixGrid parts and supply",
    "bench tested hardware",
  ],
  authors: [{ name: "FixGrid by Vytron", url: "https://fixgrid.vytron.me" }],
  creator: "FixGrid by Vytron",
  publisher: "FixGrid by Vytron",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://parts.vytron.me",
    siteName: "FixGrid Parts & Supply",
    title: "FixGrid Parts & Supply — Certified Electronics Components & Lab Silicon",
    description:
      "Source genuine OEM donor screen pulls, tested PMIC silicon, battery modules, and repair lab consumables directly from verified workshop benches across India.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FixGrid Parts & Supply — Bench-Tested Replacement Hardware",
    description:
      "100% multimeter & jig verified OEM pulls, rare PMIC silicon, and lab rework supplies with escrow protection.",
  },
  alternates: {
    canonical: "https://parts.vytron.me",
  },
};

export const viewport: Viewport = {
  themeColor: "#123b4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <PartsJsonLd />
      </head>
      <body className="min-h-screen bg-bench text-enamel flex flex-col antialiased">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
