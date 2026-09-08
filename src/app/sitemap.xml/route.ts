import { NextResponse } from "next/server";

import { getPublishedPagePaths } from "@/lib/queries/cms";
import { getAllExpertSlugs } from "@/lib/queries/expert";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";
import { absoluteUrl, CANONICAL_ORIGIN, joinCmsPath } from "@/lib/site";

export const revalidate = 3600;

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

export async function GET() {
  const today = formatDate(new Date());

  const staticUrls: SitemapUrl[] = [
    {
      loc: absoluteUrl("/", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "daily",
      priority: "1.0",
    },
    {
      loc: absoluteUrl("/search", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "daily",
      priority: "0.9",
    },
    {
      loc: absoluteUrl("/blog", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "daily",
      priority: "0.9",
    },
    {
      loc: absoluteUrl("/join", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: absoluteUrl("/login", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: absoluteUrl("/signup", CANONICAL_ORIGIN),
      lastmod: today,
      changefreq: "monthly",
      priority: "0.6",
    },
  ];

  // Localized homepages
  const localeHomeUrls: SitemapUrl[] = ["hi", "bn", "mr", "te", "ta", "kn"].map((lang) => ({
    loc: absoluteUrl(`/${lang}`, CANONICAL_ORIGIN),
    lastmod: today,
    changefreq: "daily",
    priority: "0.9",
  }));

  const [experts, cmsPages, blogPosts] = await Promise.all([
    getAllExpertSlugs(5000),
    getPublishedPagePaths(5000),
    getAllPublishedBlogPosts(),
  ]);

  const expertUrls: SitemapUrl[] = experts.map((expert) => ({
    loc: absoluteUrl(`/expert/${expert.slug}`, CANONICAL_ORIGIN),
    lastmod: formatDate(expert.updated_at),
    changefreq: "weekly",
    priority: "0.8",
  }));

  const blogUrls: SitemapUrl[] = blogPosts.map((post) => ({
    loc: absoluteUrl(`/blog/${post.slug}`, CANONICAL_ORIGIN),
    lastmod: formatDate(post.updated_at || post.published_at),
    changefreq: "weekly",
    priority: "0.8",
  }));

  const cmsUrls: SitemapUrl[] = cmsPages
    .filter((page) => page.is_indexed)
    .map((page) => ({
      loc: absoluteUrl(joinCmsPath(page.path_prefix, page.slug), CANONICAL_ORIGIN),
      lastmod: formatDate(page.updated_at),
      changefreq: "monthly",
      priority: "0.7",
    }));

  const allUrls = [
    ...staticUrls,
    ...localeHomeUrls,
    ...expertUrls,
    ...blogUrls,
    ...cmsUrls,
  ];

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const item of allUrls) {
    xmlLines.push("  <url>");
    xmlLines.push(`    <loc>${escapeXml(item.loc)}</loc>`);
    xmlLines.push(`    <lastmod>${item.lastmod}</lastmod>`);
    xmlLines.push(`    <changefreq>${item.changefreq}</changefreq>`);
    xmlLines.push(`    <priority>${item.priority}</priority>`);
    xmlLines.push("  </url>");
  }

  xmlLines.push("</urlset>");
  xmlLines.push("");

  return new NextResponse(xmlLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
