import type { MetadataRoute } from "next";

import { getPublishedPagePaths } from "@/lib/queries/cms";
import { getAllExpertSlugs } from "@/lib/queries/expert";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";
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

function buildLanguages(path: string): Record<string, string> {
  const cleanPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return {
    "en-IN": absoluteUrl(cleanPath || "/", CANONICAL_ORIGIN),
    "hi-IN": absoluteUrl(`/hi${cleanPath}`, CANONICAL_ORIGIN),
    "bn-IN": absoluteUrl(`/bn${cleanPath}`, CANONICAL_ORIGIN),
    "mr-IN": absoluteUrl(`/mr${cleanPath}`, CANONICAL_ORIGIN),
    "te-IN": absoluteUrl(`/te${cleanPath}`, CANONICAL_ORIGIN),
    "ta-IN": absoluteUrl(`/ta${cleanPath}`, CANONICAL_ORIGIN),
    "kn-IN": absoluteUrl(`/kn${cleanPath}`, CANONICAL_ORIGIN),
    "x-default": absoluteUrl(cleanPath || "/", CANONICAL_ORIGIN),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: buildLanguages("/"),
      },
    },
    {
      url: absoluteUrl("/search", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: buildLanguages("/search"),
      },
    },
    {
      url: absoluteUrl("/blog", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
      alternates: {
        languages: buildLanguages("/blog"),
      },
    },
  ];

  const [experts, cmsPages, blogPosts] = await Promise.all([
    getAllExpertSlugs(5000),
    getPublishedPagePaths(5000),
    getAllPublishedBlogPosts(),
  ]);

  const expertEntries: MetadataRoute.Sitemap = experts.map((expert) => {
    const expertPath = `/expert/${expert.slug}`;
    return {
      url: absoluteUrl(expertPath, CANONICAL_ORIGIN),
      lastModified: new Date(expert.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: buildLanguages(expertPath),
      },
    };
  });

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => {
    const blogPath = `/blog/${post.slug}`;
    return {
      url: absoluteUrl(blogPath, CANONICAL_ORIGIN),
      lastModified: new Date(post.updated_at || post.published_at || now),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: buildLanguages(blogPath),
      },
    };
  });

  const cmsEntries: MetadataRoute.Sitemap = cmsPages
    .filter((page) => page.is_indexed)
    .map((page) => {
      const pagePath = joinCmsPath(page.path_prefix, page.slug);
      return {
        url: absoluteUrl(pagePath, CANONICAL_ORIGIN),
        lastModified: new Date(page.updated_at),
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: buildLanguages(pagePath),
        },
      };
    });

  return [...staticEntries, ...expertEntries, ...blogEntries, ...cmsEntries];
}
