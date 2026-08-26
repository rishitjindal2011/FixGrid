import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * The plugin links `src/i18n/request.ts` to next-intl. Without it,
 * `getTranslations` has no per-request configuration to read and every server
 * component throws at render time rather than at build time — so this wrapper
 * is not optional decoration.
 */
const withNextIntl = createNextIntlPlugin();

/**
 * Supabase Storage is the expected host for `fixer_profiles.photos` and
 * `seo_pages.og_image_url`. We derive the allowed remote image host from the
 * public Supabase URL so no hardcoded project ref leaks into the repo.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      ...(supabaseHost
        ? ([
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ])
        : []),
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
