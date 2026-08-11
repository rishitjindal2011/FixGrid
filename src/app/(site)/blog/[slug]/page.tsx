import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { getPublishedBlogPost, getBlogPostForPreview, getPublishedBlogPaths } from "@/lib/queries/blog";
import { getSeoGlobal } from "@/lib/queries/cms";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
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
  if (!resolved) return { title: "Post not found" };

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
  
  // Sanitize HTML content before rendering
  const safeContent = sanitize(post.content || "");

  const dateString = post.published_at 
    ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) 
    : "";

  let finalHtml = "";

  if (post.blog_templates?.html_template) {
    let rawHtml = post.blog_templates.html_template;
    rawHtml = rawHtml.replace(/\{\{title\}\}/g, post.title);
    rawHtml = rawHtml.replace(/\{\{date\}\}/g, dateString);
    rawHtml = rawHtml.replace(/\{\{content\}\}/g, safeContent);
    
    // Sanitize the final template with content inside
    finalHtml = sanitize(rawHtml, { allowedAttributes: { ...sanitize.defaults.allowedAttributes, '*': ['style'] } });
  }

  return (
    <>
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
        <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
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
                Back to Home
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
            </div>
          </div>
        </article>
      )}
    </>
  );
}

function DraftBanner({ path }: { path: string }) {
  return (
    <div className="sticky top-16 z-30 border-b border-signal/30 bg-signal-wash">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
          Draft preview
        </span>
        <span className="font-mono text-eyebrow text-steel">{path}</span>
        <Link
          href="/api/disable-preview"
          prefetch={false}
          className="ml-auto font-mono text-eyebrow uppercase tracking-[0.14em] text-enamel underline underline-offset-2 hover:text-signal"
        >
          Exit preview
        </Link>
      </div>
    </div>
  );
}
