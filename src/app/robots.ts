import type { MetadataRoute } from "next";

import { absoluteUrl, CANONICAL_ORIGIN } from "@/lib/site";

/**
 * robots.txt
 *
 * The disallow list is deliberately short. Blocking a URL in robots.txt stops
 * the crawl but does *not* remove the URL from the index — a blocked page can
 * still rank as a bare link. So anything that merely shouldn't be *indexed*
 * (filtered `/search` permutations, draft previews) carries a `noindex` meta
 * tag instead, and robots.txt is reserved for routes that should never be
 * fetched at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // no crawlable surface, and /api/preview grants draft access
          "/_next/", // build assets; crawling them wastes budget
        ],
      },
    ],
    // Always the canonical production origin — see the note in sitemap.ts.
    sitemap: absoluteUrl("/sitemap.xml", CANONICAL_ORIGIN),
    host: CANONICAL_ORIGIN,
  };
}
