import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "FixGrid Careers — India's Verified Hardware Artisan & Bench Exchange | hiring.vytron.me",
  description:
    "Direct bench placement with verified micro-soldering labs, logic board repair facilities, and diagnostic workshops. Zero agency markups, escrow-protected compensation, and direct WhatsApp connect.",
  keywords: [
    "micro-soldering jobs",
    "hardware repair technician",
    "bga reballing careers",
    "smartphone motherboard engineer",
    "FixGrid careers",
    "electronics technician jobs India",
  ],
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
      </head>
      <body className="min-h-screen bg-bench text-enamel flex flex-col antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

