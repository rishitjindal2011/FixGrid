import { getPublishedPagePaths } from "@/lib/queries/cms";
import { getAllExpertSlugs } from "@/lib/queries/expert";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";
import { absoluteUrl, CANONICAL_ORIGIN, joinCmsPath } from "@/lib/site";

export const revalidate = 3600;

interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: string;
  priority?: number;
  languages?: Record<string, string>;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

export async function GET(): Promise<Response> {
  const now = new Date();

  const staticEntries: SitemapItem[] = [
    {
      url: absoluteUrl("/", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
      languages: buildLanguages("/"),
    },
    {
      url: absoluteUrl("/search", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      languages: buildLanguages("/search"),
    },
    {
      url: absoluteUrl("/blog", CANONICAL_ORIGIN),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
      languages: buildLanguages("/blog"),
    },
  ];

  const [experts, cmsPages, blogPosts] = await Promise.all([
    getAllExpertSlugs(5000),
    getPublishedPagePaths(5000),
    getAllPublishedBlogPosts(),
  ]);

  const expertEntries: SitemapItem[] = experts.map((expert) => {
    const expertPath = `/expert/${expert.slug}`;
    return {
      url: absoluteUrl(expertPath, CANONICAL_ORIGIN),
      lastModified: new Date(expert.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
      languages: buildLanguages(expertPath),
    };
  });

  const blogEntries: SitemapItem[] = blogPosts.map((post) => {
    const blogPath = `/blog/${post.slug}`;
    return {
      url: absoluteUrl(blogPath, CANONICAL_ORIGIN),
      lastModified: new Date(post.updated_at || post.published_at || now),
      changeFrequency: "weekly",
      priority: 0.8,
      languages: buildLanguages(blogPath),
    };
  });

  const cmsEntries: SitemapItem[] = cmsPages
    .filter((page) => page.is_indexed)
    .map((page) => {
      const pagePath = joinCmsPath(page.path_prefix, page.slug);
      return {
        url: absoluteUrl(pagePath, CANONICAL_ORIGIN),
        lastModified: new Date(page.updated_at),
        changeFrequency: "monthly",
        priority: 0.7,
        languages: buildLanguages(pagePath),
      };
    });

  const allEntries = [...staticEntries, ...expertEntries, ...blogEntries, ...cmsEntries];

  const xmlUrls = allEntries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : "";
      const changefreq = entry.changeFrequency
        ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
        : "";
      const priority =
        typeof entry.priority === "number" ? `<priority>${entry.priority}</priority>` : "";

      const alternates = entry.languages
        ? Object.entries(entry.languages)
            .map(
              ([lang, href]) =>
                `  <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}" />`,
            )
            .join("\n")
        : "";

      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
${alternates ? alternates + "\n" : ""}${lastmod ? "    " + lastmod + "\n" : ""}${changefreq ? "    " + changefreq + "\n" : ""}${priority ? "    " + priority + "\n" : ""}  </url>`;
    })
    .join("\n");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlUrls}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
