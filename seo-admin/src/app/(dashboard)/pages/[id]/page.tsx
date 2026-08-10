import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Eye, Trash2 } from "lucide-react";

import { ConfirmSubmit, SubmitButton } from "@/components/admin/confirm-submit";
import { ExportHtmlButton } from "@/components/admin/export-html-button";
import { PageForm } from "@/components/admin/page-form";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { deletePage, duplicatePage, setPageStatus } from "@/lib/pages/actions";
import { getPage, listTemplates } from "@/lib/queries/pages";
import { joinCmsPath, publicPageUrl } from "@/lib/site";
import { formatDateTime, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The page title is used in the browser tab, so it comes from the row. Falls
 * back rather than throwing — `generateMetadata` running before the page body
 * means a missing row here is a normal 404, not an error.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getPage(id);
  return { title: page ? truncate(page.title, 60) : "Page not found" };
}

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);

  const [page, templates] = await Promise.all([getPage(id), listTemplates()]);
  if (!page) notFound();

  // Viewers reach the editor read-only; the form's action would reject them
  // anyway, so this is about not offering buttons that cannot work.
  const canEdit = session?.role === "editor" || session?.role === "owner";
  const path = joinCmsPath(page.path_prefix, page.slug);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <StatusBadge status={page.status} />
            <span className="font-mono">{path}</span>
          </span>
        }
        title={page.title}
        description={`Updated ${formatDateTime(page.updated_at)}${
          page.published_at ? ` · first published ${formatDateTime(page.published_at)}` : ""
        }`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/pages">
                <ArrowLeft aria-hidden />
                Back
              </Link>
            </Button>

            {/*
              Preview is a GET to the admin's own API, which looks up the row
              server-side and hands off to the consumer app's draft-mode
              endpoint. The destination is never taken from the URL — see the
              route handler for why that matters.
            */}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/preview?id=${encodeURIComponent(page.id)}`} target="_blank" rel="noreferrer">
                <Eye aria-hidden />
                Preview
              </a>
            </Button>

            {page.status === "published" ? (
              <Button asChild variant="outline" size="sm">
                <a href={publicPageUrl(page.path_prefix, page.slug)} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden />
                  View live
                </a>
              </Button>
            ) : null}

            <ExportHtmlButton pageId={page.id} status={page.status} />

            {canEdit ? (
              <form action={setPageStatus}>
                <input type="hidden" name="id" value={page.id} />
                <input
                  type="hidden"
                  name="status"
                  value={page.status === "published" ? "draft" : "published"}
                />
                <SubmitButton
                  size="sm"
                  variant={page.status === "published" ? "outline" : "primary"}
                  pendingLabel={page.status === "published" ? "Unpublishing…" : "Publishing…"}
                >
                  {page.status === "published" ? "Unpublish" : "Publish"}
                </SubmitButton>
              </form>
            ) : null}
          </>
        }
      />

      {created ? (
        <p
          role="status"
          className="mb-6 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
        >
          Page created. It is a draft until you publish it.
        </p>
      ) : null}

      {canEdit ? (
        <PageForm page={page} templates={templates} />
      ) : (
        <p className="rounded-machined border border-hairline bg-chalk px-4 py-6 text-sm text-steel">
          Your account has view-only access. Ask an owner for the editor role to make changes.
        </p>
      )}

      {canEdit ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="text-lg">Page actions</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={duplicatePage}>
              <input type="hidden" name="id" value={page.id} />
              <SubmitButton variant="outline" size="sm" pendingLabel="Duplicating…">
                <Copy aria-hidden />
                Duplicate as draft
              </SubmitButton>
            </form>

            <form action={deletePage}>
              <input type="hidden" name="id" value={page.id} />
              <ConfirmSubmit confirmLabel="Delete permanently">
                <Trash2 aria-hidden />
                Delete
              </ConfirmSubmit>
            </form>

            <p className="text-xs text-steel-soft">
              Deletion is permanent. Archive instead if you only want it off the site — an archived
              page keeps its URL reserved.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
