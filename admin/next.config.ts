import type { NextConfig } from "next";

/**
 * The platform admin is the most sensitive surface in the system: it reads
 * every customer's bookings, every shop's payouts and every dispute, through a
 * service-role key that bypasses RLS. Everything below assumes it should be
 * invisible to the outside world — never linked, never crawled, never framed.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  /**
   * Pin the workspace root to this app.
   *
   * There are two lockfiles above this directory — the consumer app's and this
   * one's — and Turbopack's inference picks the outermost, so it was treating
   * `fix-it-registry/` as the root and watching all three apps. That widens the
   * file-watch scope and, more importantly, resolves modules from the wrong
   * `node_modules` when the two trees disagree on a version.
   *
   * `process.cwd()` rather than `__dirname`: this config is TypeScript and may
   * be loaded as ESM, where `__dirname` does not exist. Every npm script here
   * runs from the package directory, so the two are the same value.
   */
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Belt and braces alongside the `robots` metadata: even a
          // misconfigured proxy that exposes this host won't get it indexed.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // DENY, not SAMEORIGIN. Nothing in this app is meant to be embedded,
          // and every screen carries a destructive action a clickjack could aim at.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
