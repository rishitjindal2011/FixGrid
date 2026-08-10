import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { BlogFilterBar } from "@/components/admin/blog-filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listBlogPosts, type BlogListFilters } from "@/lib/queries/blog";
import { publicPageUrl } from "@/lib/site";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

const STATUSES = new Set<BlogListFilters["status"]>(["all", "draft", "published", "archived"]);

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;

  const statusParam = firstValue(params.status) as BlogListFilters["status"];
  const status = STATUSES.has(statusParam) ? statusParam : "all";
  const query = firstValue(params.q).slice(0, 200);
  const parsedPage = Number.parseInt(firstValue(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { rows, total, pageCount } = await listBlogPosts({ status, query, page });

  function buildHref(nextPage: number): string {
    const search = new URLSearchParams();
    if (status !== "all") search.set("status", status);
    if (query) search.set("q", query);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/blog?${qs}` : "/blog";
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog Posts"
        description="Every row in blog_posts. Drafts are invisible to the public site until published."
        actions={
          <Button asChild>
            <Link href="/blog/new">
              <Plus aria-hidden />
              New post
            </Link>
          </Button>
        }
      />

      <BlogFilterBar status={status} query={query} total={total} />

      {rows.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <BookOpen className="size-5 text-steel-soft" aria-hidden />
          <div>
            <p className="font-display text-lg uppercase text-enamel">
              {query || status !== "all" ? "Nothing matches those filters" : "No posts yet"}
            </p>
            <p className="mt-1 text-sm text-steel">
              {query || status !== "all"
                ? "Widen the search or clear the status filter."
                : "Create a blog post to get started."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline bg-bench">
                <th scope="col" className="eyebrow px-4 py-3 font-normal">
                  Post
                </th>
                <th scope="col" className="eyebrow px-4 py-3 font-normal">
                  Status
                </th>
                <th scope="col" className="eyebrow hidden px-4 py-3 font-normal md:table-cell">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-bench/60">
                  <td className="max-w-0 px-4 py-3">
                    <Link
                      href={`/blog/${row.id}`}
                      className="block truncate font-display text-[1.05rem] uppercase text-enamel hover:text-signal"
                    >
                      {row.title}
                    </Link>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate font-mono text-xs text-steel-soft">
                        /blog/{row.slug}
                      </span>
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-steel md:table-cell">
                    {formatDateTime(row.updated_at)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-3">
                      <Link href={`/blog/${row.id}`} className="text-sm text-signal hover:underline">
                        Edit
                      </Link>
                      {row.status === "published" ? (
                        <a
                          href={publicPageUrl("/blog/", row.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-steel hover:text-enamel"
                        >
                          View
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
    </>
  );
}
