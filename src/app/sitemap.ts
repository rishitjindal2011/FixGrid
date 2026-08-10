import type { MetadataRoute } from "next";

import { getPublishedPagePaths } from "@/lib/queries/cms";
import { getAllExpertSlugs } from "@/lib/queries/expert";
import { absoluteUrl, CANONICAL_ORIGIN, joinCmsPath } from "@/lib/site";

/**
 * Sitemap.
 *
 * Three rules, all of them things that quietly break sitemaps in production:
 *
 *   1. Every URL is built from `CANONICAL_ORIGIN`, never from the incoming
 *      request. A sitemap generated behind a preview URL or on localhost that
 *      lists `http://localhost:3000/...` is worse than no sitemap at all —
 *      `@/lib/site` throws at boot in production rather than let that ship.
 *
 *   2. Only genuinely indexable URLs are listed. A page marked `is_indexed:
 *      false` carries a `noindex` tag, and listing a noindexed URL in the
 *      sitemap is a direct contradiction that Search Console reports as an
 *      error.
 *
 *   3. A failing data source yields fewer URLs, never a failed build. The
 *      query helpers already swallow and log their own errors.
 */

// Regenerated hourly. Frequent enough that a newly published page is picked up
// the same day; cheap enough that crawler traffic can't hammer the database.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/search", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const [experts, cmsPages] = await Promise.all([
    getAllExpertSlugs(5000),
    getPublishedPagePaths(5000),
  ]);

  const expertEntries: MetadataRoute.Sitemap = experts.map((expert) => ({
    url: absoluteUrl(`/expert/${expert.slug}`, CANONICAL_ORIGIN),
    lastModified: new Date(expert.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cmsEntries: MetadataRoute.Sitemap = cmsPages
    .filter((page) => page.is_indexed)
    .map((page) => ({
      url: absoluteUrl(joinCmsPath(page.path_prefix, page.slug), CANONICAL_ORIGIN),
      lastModified: new Date(page.updated_at),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticEntries, ...expertEntries, ...cmsEntries];
}
