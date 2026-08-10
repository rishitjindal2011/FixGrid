import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, EyeOff, FileText, Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { PagesFilterBar } from "@/components/admin/pages-filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPages, type PageListFilters } from "@/lib/queries/pages";
import { joinCmsPath, publicPageUrl } from "@/lib/site";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

/**
 * `force-dynamic` for the same reason as the overview: this list is the tool's
 * primary surface and a cached version of it would show stale statuses right
 * after an edit.
 */
export const dynamic = "force-dynamic";

const STATUSES = new Set<PageListFilters["status"]>(["all", "draft", "published", "archived"]);

/** Coerce one search param that may arrive as a string, an array, or not at all. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PagesIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;

  // Anything unrecognised falls back to a valid default rather than erroring.
  // A hand-edited URL should narrow the list or show everything, never 500.
  const statusParam = firstValue(params.status) as PageListFilters["status"];
  const status = STATUSES.has(statusParam) ? statusParam : "all";
  const query = firstValue(params.q).slice(0, 200);
  const parsedPage = Number.parseInt(firstValue(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { rows, total, pageCount } = await listPages({ status, query, page });

  function buildHref(nextPage: number): string {
    const search = new URLSearchParams();
    if (status !== "all") search.set("status", status);
    if (query) search.set("q", query);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/pages?${qs}` : "/pages";
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Pages"
        description="Every row in seo_pages. Drafts are invisible to the public site until published."
        actions={
          <Button asChild>
            <Link href="/pages/new">
              <Plus aria-hidden />
              New page
            </Link>
          </Button>
        }
      />

      <PagesFilterBar status={status} query={query} total={total} />

      {rows.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <FileText className="size-5 text-steel-soft" aria-hidden />
          <div>
            <p className="font-display text-lg uppercase text-enamel">
              {query || status !== "all" ? "Nothing matches those filters" : "No pages yet"}
            </p>
            <p className="mt-1 text-sm text-steel">
              {query || status !== "all"
                ? "Widen the search or clear the status filter."
                : "Create one by hand, or run the seeding script in the consumer app."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/*
            A real <table> rather than a grid of divs: this is tabular data, and
            screen readers announce row and column relationships for free.
            `hidden md:table-cell` drops the least useful columns on narrow
            screens instead of horizontally scrolling the whole thing.
          */}
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline bg-bench">
                <th scope="col" className="eyebrow px-4 py-3 font-normal">
                  Page
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
                      href={`/pages/${row.id}`}
                      className="block truncate font-display text-[1.05rem] uppercase text-enamel hover:text-signal"
                    >
                      {row.title}
                    </Link>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate font-mono text-xs text-steel-soft">
                        {joinCmsPath(row.path_prefix, row.slug)}
                      </span>
                      {/* Only meaningful once live, so it is scoped to published. */}
                      {row.status === "published" && !row.is_indexed ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono text-xs text-signal"
                          title="Published but excluded from search engines"
                        >
                          <EyeOff className="size-3" aria-hidden />
                          noindex
                        </span>
                      ) : null}
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
                      <Link href={`/pages/${row.id}`} className="text-sm text-signal hover:underline">
                        Edit
                      </Link>
                      {row.status === "published" ? (
                        <a
                          href={publicPageUrl(row.path_prefix, row.slug)}
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
