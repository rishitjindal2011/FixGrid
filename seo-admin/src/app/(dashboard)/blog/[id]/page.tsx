import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";

import { ConfirmSubmit, SubmitButton } from "@/components/admin/confirm-submit";
import { BlogForm } from "@/components/admin/blog-form";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { deleteBlogPost, setBlogPostStatus } from "@/lib/blog/actions";
import { getBlogPost } from "@/lib/queries/blog";
import { getBlogTemplates } from "@/lib/queries/blog-templates";
import { publicPageUrl } from "@/lib/site";
import { formatDateTime, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getBlogPost(id);
  return { title: post ? truncate(post.title, 60) : "Post not found" };
}

export default async function EditBlogPost({
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

  const [post, templates] = await Promise.all([
    getBlogPost(id),
    getBlogTemplates(),
  ]);
  if (!post) notFound();

  const canEdit = session?.role === "editor" || session?.role === "owner";
  const path = `/blog/${post.slug}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <StatusBadge status={post.status} />
            <span className="font-mono">{path}</span>
          </span>
        }
        title={post.title}
        description={`Updated ${formatDateTime(post.updated_at)}${
          post.published_at ? ` · first published ${formatDateTime(post.published_at)}` : ""
        }`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/blog">
                <ArrowLeft aria-hidden />
                Back
              </Link>
            </Button>

            {post.status === "published" ? (
              <Button asChild variant="outline" size="sm">
                <a href={publicPageUrl("/blog/", post.slug)} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden />
                  View live
                </a>
              </Button>
            ) : null}

            {canEdit ? (
              <form action={setBlogPostStatus}>
                <input type="hidden" name="id" value={post.id} />
                <input
                  type="hidden"
                  name="status"
                  value={post.status === "published" ? "draft" : "published"}
                />
                <SubmitButton
                  size="sm"
                  variant={post.status === "published" ? "outline" : "primary"}
                  pendingLabel={post.status === "published" ? "Unpublishing…" : "Publishing…"}
                >
                  {post.status === "published" ? "Unpublish" : "Publish"}
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
          Post created. It is a draft until you publish it.
        </p>
      ) : null}

      {canEdit ? (
        <BlogForm post={post} templates={templates} />
      ) : (
        <p className="rounded-machined border border-hairline bg-chalk px-4 py-6 text-sm text-steel">
          Your account has view-only access. Ask an owner for the editor role to make changes.
        </p>
      )}

      {canEdit ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="text-lg">Post actions</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={deleteBlogPost}>
              <input type="hidden" name="id" value={post.id} />
              <ConfirmSubmit confirmLabel="Delete permanently">
                <Trash2 aria-hidden />
                Delete
              </ConfirmSubmit>
            </form>

            <p className="text-xs text-steel-soft">
              Deletion is permanent. Archive instead if you only want it off the site.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
