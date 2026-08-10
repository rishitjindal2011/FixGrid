import Link from "next/link";
import { EyeOff, FileText, Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardStats, listPages } from "@/lib/queries/pages";
import { joinCmsPath, publicPageUrl } from "@/lib/site";
import { formatDateTime } from "@/lib/utils";

/**
 * Counts and the five most recently touched pages.
 *
 * `force-dynamic` because a cached dashboard in a CMS is actively misleading:
 * you publish a page, come back to the overview, and it still says 40 drafts.
 * The five count queries are `head: true`, so the cost is small.
 */
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    listPages({ status: "all", query: "", page: 1 }),
  ]);

  const tiles = [
    { label: "Published", value: stats.published, href: "/pages?status=published" },
    { label: "Drafts", value: stats.draft, href: "/pages?status=draft" },
    { label: "Archived", value: stats.archived, href: "/pages?status=archived" },
    { label: "Redirects", value: stats.redirects, href: "/redirects" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Content health"
        description="Programmatic SEO surface at a glance. Counts are live on every load."
        actions={
          <Button asChild>
            <Link href="/pages/new">
              <Plus aria-hidden />
              New page
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="group rounded-machined border border-hairline bg-chalk p-5 shadow-bench transition-colors hover:border-steel-soft"
          >
            <p className="eyebrow">{tile.label}</p>
            <p className="mt-3 font-mono text-display-sm tabular-nums text-enamel">{tile.value}</p>
          </Link>
        ))}
      </div>

      {/*
        Noindex published pages are called out on their own rather than living in
        a tile. A published page that excludes itself from search is almost always
        an accident, and it is invisible in every other view.
      */}
      {stats.noindex > 0 ? (
        <Card className="mt-3 flex flex-wrap items-center gap-3 border-signal/30 bg-signal-wash p-4">
          <EyeOff className="size-4 shrink-0 text-signal" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-enamel">
            <strong className="font-semibold">{stats.noindex}</strong>{" "}
            {stats.noindex === 1 ? "published page is" : "published pages are"} marked{" "}
            <code className="font-mono text-[0.85em]">noindex</code>. They are live but excluded
            from search.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/pages?status=published">Review</Link>
          </Button>
        </Card>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-lg">Recently edited</h2>
          <Link href="/pages" className="text-sm text-signal hover:underline">
            All pages
          </Link>
        </div>

        {recent.rows.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 p-6">
            <FileText className="size-5 text-steel-soft" aria-hidden />
            <div>
              <p className="font-display text-lg uppercase text-enamel">No pages yet</p>
              <p className="mt-1 text-sm text-steel">
                Create one by hand, or run{" "}
                <code className="font-mono text-[0.85em]">npm run seed:seo</code> in the consumer
                app to generate the programmatic set.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/pages/new">Create the first page</Link>
            </Button>
          </Card>
        ) : (
          <Card className="divide-y divide-hairline overflow-hidden p-0">
            {recent.rows.slice(0, 5).map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/pages/${row.id}`}
                    className="block truncate font-display text-[1.05rem] uppercase text-enamel hover:text-signal"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-xs text-steel-soft">
                    {joinCmsPath(row.path_prefix, row.slug)}
                  </p>
                </div>

                <StatusBadge status={row.status} />

                <span className="font-mono text-xs tabular-nums text-steel-soft">
                  {formatDateTime(row.updated_at)}
                </span>

                {row.status === "published" ? (
                  <a
                    href={publicPageUrl(row.path_prefix, row.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-signal hover:underline"
                  >
                    View
                  </a>
                ) : null}
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
