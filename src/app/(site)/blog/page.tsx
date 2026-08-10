import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog",
  description: "Read the latest news, guides, and tips from the experts.",
};

export default async function BlogIndexPage() {
  const posts = await getAllPublishedBlogPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <header className="mb-16 text-center">
        <h1 className="text-display mb-4">The Repair Blog</h1>
        <p className="text-steel max-w-2xl mx-auto text-lg">
          Expert guides, repair tips, and industry news from the technicians who fix it.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-24 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <p className="text-steel-soft">No published posts yet.</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgb(0,0,0,0.05)] ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            >
              {/* Optional image wrapper here if OG image exists, else a placeholder gradient */}
              <div className="aspect-[16/9] w-full bg-enamel relative overflow-hidden">
                {post.og_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.og_image_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-signal/40 via-enamel to-enamel transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                {post.published_at && (
                  <time className="mb-3 text-xs font-mono font-medium tracking-wider uppercase text-signal">
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
                <h2 className="mb-3 text-xl font-bold tracking-tight text-enamel group-hover:text-signal transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-steel line-clamp-3">
                  {post.meta_description || "Read more about this topic..."}
                </p>
                <div className="mt-auto flex items-center font-mono text-xs font-medium uppercase tracking-widest text-steel group-hover:text-signal transition-colors">
                  Read Article
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
