import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: "FixGrid Parts & Supply — Bench-Tested Replacement Hardware Exchange | parts.vytron.me",
  description:
    "Source bench-tested OLED assemblies, OEM battery pulls, PMIC power chips, and workshop overstock. 100% multimeter & jig verified with FixGrid Escrow Protection.",
  keywords: [
    "oem phone parts",
    "laptop screens",
    "workshop surplus parts",
    "pmic ic chips",
    "bench tested hardware",
    "FixGrid parts",
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
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

