import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { HiringJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  metadataBase: new URL("https://hiring.vytron.me"),
  title: {
    default: "FixGrid Careers — India's Verified Hardware Artisan & Bench Exchange",
    template: "%s | FixGrid Careers",
  },
  description:
    "Direct bench placement with verified micro-soldering labs, Apple logic board facilities, and electronics diagnostic workshops across India. Zero recruiter commissions, 100% escrow-backed compensation, and accredited stereoscope workstations.",
  keywords: [
    "micro-soldering jobs India",
    "electronics repair technician jobs",
    "bga reballing technician vacancies",
    "apple logic board repair engineer",
    "oled screen refurbishing specialist",
    "console hdmi port repair technician",
    "inverter pcb repair jobs",
    "nehru place technician jobs",
    "lamington road electronics jobs",
    "sp road hardware repair careers",
    "FixGrid careers",
    "artisan bench exchange",
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
    url: "https://hiring.vytron.me",
    siteName: "FixGrid Careers",
    title: "FixGrid Careers — India's Verified Hardware Artisan & Bench Exchange",
    description:
      "Direct bench placement with verified micro-soldering labs. 100% escrow-backed compensation, zero recruiter markups, audited stereoscope workstations across India.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FixGrid Careers — Verified Hardware Technician & Bench Exchange",
    description:
      "Direct bench placements with certified micro-soldering laboratories across India. 100% escrow-backed pay with zero recruiter deductions.",
  },
  alternates: {
    canonical: "https://hiring.vytron.me",
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
        <HiringJsonLd />
      </head>
      <body className="min-h-screen bg-bench text-enamel flex flex-col antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
