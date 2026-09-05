import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { getPublishedBlogPost, getBlogPostForPreview, getPublishedBlogPaths } from "@/lib/queries/blog";
import { getSeoGlobal } from "@/lib/queries/cms";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildArticle, buildBreadcrumbs } from "@/lib/seo/jsonld";
import sanitize from "sanitize-html";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedBlogPaths(100);
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

async function resolvePost(slug: string) {
  const { isEnabled } = await draftMode();
  const post = isEnabled
    ? await getBlogPostForPreview(slug)
    : await getPublishedBlogPost(slug);

  if (!post) return null;
  return { post, isDraft: isEnabled, path: `/blog/${slug}` };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolvePost(slug);
  if (!resolved) {
    const t = await getTranslations("blog");
    return { title: t("postNotFound") };
  }

  const { post, isDraft, path } = resolved;
  const globals = await getSeoGlobal();
  const canonical = absoluteUrl(path);

  const description = post.meta_description ?? globals?.default_meta_description ?? undefined;

  return {
    title: post.meta_title ?? post.title,
    description,
    keywords: post.keywords?.length ? post.keywords : globals?.default_keywords,
    alternates: { canonical },
    robots: isDraft
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: "article",
      siteName: globals?.site_title ?? SITE_NAME,
      title: post.meta_title ?? post.title,
      description,
      url: canonical,
      images: post.og_image_url ?? globals?.default_og_image_url ?? undefined,
      modifiedTime: post.updated_at,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolvePost(slug);
  if (!resolved) notFound();

  const { post, isDraft, path } = resolved;
  const locale = await getLocale();
  const t = await getTranslations("blog");

  // Sanitize HTML content before rendering
  const safeContent = sanitize(post.content || "");

  const dateString = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
    : "";

  let finalHtml = "";

  if (post.blog_templates?.html_template) {
    let rawHtml = post.blog_templates.html_template;
    rawHtml = rawHtml.replace(/\{\{title\}\}/g, post.title);
    rawHtml = rawHtml.replace(/\{\{date\}\}/g, dateString);
    rawHtml = rawHtml.replace(/\{\{content\}\}/g, safeContent);
    
    /*
     * Sanitise the assembled template.
     *
     * The `"*"` key REPLACES sanitize-html's wildcard entry rather than adding to
     * it, and `class` is not in its defaults — so allowing only `style` here
     * stripped every class in the template and the article rendered as naked HTML:
     * no layout, no card, no prose styling. The spread of `defaults` looks like it
     * preserves everything, which is what makes this an easy one to write and a
     * hard one to spot.
     *
     * `class` is safe to allow. These templates are authored in the admin by staff,
     * the classes are Tailwind utilities, and every one of them is already in the
     * compiled CSS because the fallback markup below uses the same set in source —
     * which is also why a DB-authored template can be styled at all: Tailwind's
     * scanner never sees the database, so anything the fallback does not also use
     * would not be generated.
     *
     * `svg`/`path` are allowed so the back-arrow survives; without them the link
     * renders as bare text.
     */
    finalHtml = sanitize(rawHtml, {
      allowedTags: [...sanitize.defaults.allowedTags, "svg", "path", "time"],
      allowedAttributes: {
        ...sanitize.defaults.allowedAttributes,
        "*": ["class", "style", "id", "lang", "dir"],
        svg: ["width", "height", "viewbox", "fill", "xmlns", "class"],
        path: [
          "d",
          "stroke",
          "stroke-width",
          "stroke-linecap",
          "stroke-linejoin",
          "fill",
        ],
      },
    });
  }

  const url = absoluteUrl(path);
  const articleSchema = buildArticle({
    headline: post.title,
    description: post.meta_description,
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    image: post.og_image_url,
    keywords: post.keywords,
  });

  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path },
  ]);

  const schemas = [articleSchema, ...(breadcrumbs ? [breadcrumbs] : [])];

  return (
    <>
      <JsonLd data={schemas} />
      {isDraft ? <DraftBanner path={path} /> : null}

      {/* Reading Progress Bar (Scroll-driven Animation) */}
      <div 
        className="fixed top-0 left-0 h-1 bg-signal z-50 origin-left"
        style={{
          animation: "scaleProgress auto linear",
          animationTimeline: "scroll(root block)"
        } as React.CSSProperties}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scaleProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}} />

      {finalHtml ? (
        /*
         * `blog-article` carries the typography, defined in `globals.css`.
         *
         * Not done with Tailwind classes inside the template, because Tailwind's
         * scanner never sees the database — a utility used only in a stored
         * template is never generated, so `prose-headings:font-display` in the
         * template HTML would compile to nothing at all. Real CSS on a wrapper this
         * file owns applies to every template, including ones written later.
         */
        <div className="blog-article" dangerouslySetInnerHTML={{ __html: finalHtml }} />
      ) : (
        <article className="min-h-screen bg-wash pb-24">
          <header className="relative overflow-hidden bg-enamel pt-32 pb-32 px-4 text-center isolate">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-signal/20 via-enamel to-enamel"></div>
            <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] bg-gradient-to-tr from-signal to-blue-500 rounded-full mix-blend-screen"></div>

            <div className="mx-auto max-w-4xl">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-steel hover:text-white transition-colors duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("backToHome")}
              </Link>
              
              <h1 
                className="mb-8 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-sans normal-case leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {post.title}
              </h1>
              
              {post.published_at && (
                <div className="flex items-center justify-center gap-3 text-steel">
                  <time className="text-sm font-medium tracking-wide uppercase text-white/80" dateTime={post.published_at}>
                    {dateString}
                  </time>
                </div>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-4xl px-4 -mt-16 relative z-10">
            <div className="rounded-2xl bg-white p-8 md:p-12 lg:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-black/5">
              <div 
                className="prose prose-slate prose-lg md:prose-xl max-w-none text-enamel prose-headings:font-sans prose-headings:normal-case prose-headings:font-bold prose-headings:tracking-tight prose-a:text-signal prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-strong:text-enamel prose-strong:font-bold"
                style={{ textWrap: 'pretty' }}
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />

              {/* High-Converting Local Repair Service CTA & Internal Link Hub */}
              <div className="mt-14 pt-10 border-t border-steel/15 not-prose">
                <div className="rounded-2xl bg-gradient-to-br from-enamel to-slate-900 p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-signal/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/20 border border-signal/30 text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-4">
                      <span>🛡️ FixGrid Verified Repair Network</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
                      Need a Trusted Repair Expert Near You?
                    </h3>

                    <p className="text-steel max-w-2xl text-base md:text-lg mb-6 leading-relaxed">
                      Don't risk temporary fixes or unverified shops. Book certified local technicians with upfront fixed pricing, 
                      tamper-proof digital diagnostic audits, and guaranteed <strong>30–90 day platform warranty protection</strong>.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mb-8">
                      <Link
                        href="/search"
                        className="inline-flex items-center justify-center rounded-xl bg-signal px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-signal/30 hover:bg-signal/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Find Verified Repair Shops Near You
                      </Link>
                      <Link
                        href="/repair/desktops"
                        className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-3.5 text-base font-semibold text-white transition-all"
                      >
                        Desktop PC Repair
                      </Link>
                      <Link
                        href="/repair/phones"
                        className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-3.5 text-base font-semibold text-white transition-all"
                      >
                        Phone Repair
                      </Link>
                      <Link
                        href="/repair/laptops"
                        className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-3.5 text-base font-semibold text-white transition-all"
                      >
                        Laptop Repair
                      </Link>
                    </div>

                    {/* Local SEO Hub Anchor Links (Mumbai, Delhi, Bengaluru) */}
                    <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-steel">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="font-semibold text-white/80">Available in Local Hubs:</span>
                        <Link href="/search?q=Mumbai" className="hover:text-cyan-300 underline underline-offset-2">Repair in Mumbai</Link>
                        <span>•</span>
                        <Link href="/search?q=Delhi" className="hover:text-cyan-300 underline underline-offset-2">Repair in Delhi NCR</Link>
                        <span>•</span>
                        <Link href="/search?q=Bengaluru" className="hover:text-cyan-300 underline underline-offset-2">Repair in Bengaluru</Link>
                        <span>•</span>
                        <Link href="/repair/audio-equipment" className="hover:text-cyan-300 underline underline-offset-2">Audio Equipment Repair</Link>
                        <span>•</span>
                        <Link href="/repair/appliances" className="hover:text-cyan-300 underline underline-offset-2">Appliance Repair</Link>
                      </div>
                      <span className="text-white/60">100% Escrow Payment Protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      )}
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
