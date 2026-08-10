import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { BlogTemplateForm } from "@/components/admin/blog-template-form";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { deleteBlogTemplate } from "@/lib/blog-templates/actions";
import { getBlogTemplate } from "@/lib/queries/blog-templates";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const template = await getBlogTemplate(id);
  return { title: template ? template.name : "Template not found" };
}

export default async function EditBlogTemplate({
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

  const template = await getBlogTemplate(id);
  if (!template) notFound();

  const canEdit = session?.role === "editor" || session?.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono text-xs">{template.id}</span>}
        title={template.name}
        description={`Updated ${formatDateTime(template.updated_at)}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/blog-templates">
              <ArrowLeft aria-hidden />
              Back
            </Link>
          </Button>
        }
      />

      {created ? (
        <p
          role="status"
          className="mb-6 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
        >
          Template created.
        </p>
      ) : null}

      {canEdit ? (
        <BlogTemplateForm template={template} />
      ) : (
        <p className="rounded-machined border border-hairline bg-chalk px-4 py-6 text-sm text-steel">
          Your account has view-only access. Ask an owner for the editor role to make changes.
        </p>
      )}

      {canEdit ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="text-lg">Template actions</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={deleteBlogTemplate}>
              <input type="hidden" name="id" value={template.id} />
              <ConfirmSubmit confirmLabel="Delete permanently">
                <Trash2 aria-hidden />
                Delete
              </ConfirmSubmit>
            </form>

            <p className="text-xs text-steel-soft">
              Deletion is permanent. Posts using this template will fall back to rendering raw content.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
