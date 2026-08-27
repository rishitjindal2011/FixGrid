import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DynamicRenderer } from "@/components/cms/DynamicRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { collectFaqItems, parseContentSections } from "@/lib/cms/blocks";
import {
  getPageForPreview,
  getPublishedPage,
  getPublishedPagePaths,
  getSeoGlobal,
  splitPath,
} from "@/lib/queries/cms";
import {
  buildBreadcrumbs,
  buildFaqPage,
  buildService,
  buildWebPage,
  mergeCustomSchema,
  type Thing,
  type WithContext,
} from "@/lib/seo/jsonld";
import { absoluteUrl, joinCmsPath, SITE_NAME } from "@/lib/site";
import { toPlainText } from "@/lib/sanitize";

export const revalidate = 300;
/**
 * Paths not returned by `generateStaticParams` still render on demand — the
 * catalogue is expected to grow between deploys, and a newly seeded page
 * should not 404 until the next build.
 */
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string[] }> };

/** Pre-render the most recently updated pages; the long tail renders on demand. */
export async function generateStaticParams() {
  const pages = await getPublishedPagePaths(1000);
  return pages.map((page) => ({
    slug: joinCmsPath(page.path_prefix, page.slug).slice(1).split("/"),
  }));
}

async function resolvePage(segments: string[]) {
  const parts = splitPath(segments);
  if (!parts) return null;

  const { isEnabled } = await draftMode();
  const page = isEnabled
    ? await getPageForPreview(parts.pathPrefix, parts.slug)
    : await getPublishedPage(parts.pathPrefix, parts.slug);

  if (!page) return null;
  return { page, isDraft: isEnabled, path: joinCmsPath(page.path_prefix, page.slug) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolvePage(slug);
  if (!resolved) {
    const t = await getTranslations("common");
    return { title: t("pageNotFound") };
  }

  const { page, isDraft, path } = resolved;
  const globals = await getSeoGlobal();
  const canonical = page.canonical_url ?? absoluteUrl(path);

  const description =
    page.meta_description ?? globals?.default_meta_description ?? undefined;

  return {
    title: page.meta_title ?? page.title,
    description,
    keywords: pickKeywords(page.keywords, globals?.default_keywords),
    alternates: { canonical },
    // A draft is unreleased copy. Even behind a secret cookie it must never be
    // indexable, so draft mode overrides whatever the row says.
    robots: isDraft
      ? { index: false, follow: false, nocache: true }
      : { index: page.is_indexed, follow: page.is_followed },
    openGraph: {
      type: "article",
      siteName: globals?.site_title ?? SITE_NAME,
      title: page.og_title ?? page.meta_title ?? page.title,
      description,
      url: canonical,
      images: page.og_image_url ?? globals?.default_og_image_url ?? undefined,
      modifiedTime: page.updated_at,
    },
  };
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolvePage(slug);
  if (!resolved) notFound();

  const { page, isDraft, path } = resolved;
  const blocks = parseContentSections(page.content_sections);
  const url = page.canonical_url ?? absoluteUrl(path);

  /* ── Structured data ──────────────────────────────────────────────────── */

  const base =
    page.schema_type === "Service"
      ? buildService({
          name: page.title,
          description: page.meta_description,
          url,
        })
      : buildWebPage({
          name: page.title,
          description: page.meta_description,
          url,
          datePublished: page.published_at,
          dateModified: page.updated_at,
          schemaType: page.schema_type,
        });

  const schemas: WithContext<Thing>[] = [mergeCustomSchema(base, page.schema_markup)];

  // One consolidated FAQPage for the whole document, server-rendered. See the
  // note in `collectFaqItems` for why this doesn't live in the accordion.
  const faqItems = collectFaqItems(blocks);
  const faqSchema = buildFaqPage(
    faqItems.map((item) => ({ question: item.question, answer: toPlainText(item.answer) })),
    url,
  );
  if (faqSchema) schemas.push(faqSchema);

  const segments = path.slice(1).split("/");
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    ...segments.map((segment, index) => ({
      name: index === segments.length - 1 ? page.title : toTitleCase(segment),
      path: `/${segments.slice(0, index + 1).join("/")}`,
    })),
  ]);
  if (breadcrumbs) schemas.push(breadcrumbs);

  return (
    <>
      <JsonLd data={schemas} />

      {isDraft ? <DraftBanner path={path} /> : null}

      <article>
        <DynamicRenderer blocks={blocks} />
      </article>
    </>
  );
}

async function DraftBanner({ path }: { path: string }) {
  const t = await getTranslations("common");
  return (
    <div className="sticky top-16 z-30 border-b border-signal/30 bg-signal-wash">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
          {t("draftPreview")}
        </span>
        <span className="font-mono text-eyebrow text-steel">{path}</span>
        <Link
          href="/api/disable-preview"
          prefetch={false}
          className="ml-auto font-mono text-eyebrow uppercase tracking-[0.14em] text-enamel underline underline-offset-2 hover:text-signal"
        >
          {t("exitPreview")}
        </Link>
      </div>
    </div>
  );
}

function toTitleCase(segment: string): string {
  return segment
    .split("-")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * The page's own keywords, falling back to the site defaults when it has none.
 *
 * Typed `string[]`, but read defensively: `alter table … add column if not
 * exists` never inspects the type of a column that already exists, so a project
 * provisioned before `keywords` became `text[]` still returns a bare string —
 * or null, where an older schema allowed it. `Metadata.keywords` accepts a
 * string and an array equally, so the only shape that actually matters here is
 * the nullish one, which would otherwise throw on `.length` and take a public
 * page down over a field no engine reads.
 */
function pickKeywords(
  pageKeywords: unknown,
  defaults: unknown,
): string | string[] | undefined {
  for (const value of [pageKeywords, defaults]) {
    if (typeof value === "string" && value.trim() !== "") return value;
    if (Array.isArray(value) && value.length > 0) return value as string[];
  }
  return undefined;
}
