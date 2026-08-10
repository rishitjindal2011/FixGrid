import type { NextConfig } from "next";

/**
 * The admin app is an internal tool. Everything below assumes it should be
 * invisible to the outside world: it is never linked from the consumer site,
 * never crawled, and never framed.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Belt and braces alongside the `robots` metadata: even a
          // misconfigured proxy that exposes this host won't get it indexed.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
