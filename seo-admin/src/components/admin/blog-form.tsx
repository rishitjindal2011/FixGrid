"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check } from "lucide-react";

import { TextField, TextareaField } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKeywords } from "@/lib/cms/keywords";
import { IDLE_FORM_STATE } from "@/lib/redirects/state";
import { updateBlogPost } from "@/lib/blog/actions";
import type { BlogPostRow, BlogTemplateRow } from "@/lib/types/database";

export function BlogForm({ 
  post, 
  templates = []
}: { 
  post: BlogPostRow;
  templates?: BlogTemplateRow[];
}) {
  const [state, formAction] = useActionState(updateBlogPost, IDLE_FORM_STATE);
  const error = (field: string) => state.fieldErrors[field];

  return (
    <form action={formAction} className="flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
      <input type="hidden" name="id" value={post.id} />

      <div className="flex flex-1 flex-col gap-6">
        {state.status !== "idle" && state.message ? (
          <p
            role="status"
            aria-live="polite"
            className={
              state.status === "error"
                ? "flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
                : "flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
            }
          >
            {state.status === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            {state.message}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TextField
              label="Title"
              name="title"
              required
              defaultValue={post.title}
              error={error("title")}
              hint="The H1 of the blog post."
            />

            <TextField
              label="Slug"
              name="slug"
              required
              defaultValue={post.slug}
              error={error("slug")}
              hint="The URL path under /blog/. Must be unique."
            />

            <TextareaField
              label="Content (Markdown/HTML)"
              name="content"
              rows={15}
              defaultValue={post.content ?? ""}
              error={error("content")}
              hint="The body of the post."
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="template_id" className="text-sm font-medium">
                Template
              </label>
              <select
                id="template_id"
                name="template_id"
                defaultValue={post.template_id ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No Template (Raw HTML)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">Select a layout template to wrap this post.</p>
            </div>
          </CardContent>
        </Card>

        <SavePost />
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-80 shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SEO & Meta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TextField
              label="Meta title"
              name="meta_title"
              defaultValue={post.meta_title ?? ""}
              error={error("meta_title")}
              hint="Overrides the post title in search results if set."
            />

            <TextareaField
              label="Meta description"
              name="meta_description"
              rows={3}
              defaultValue={post.meta_description ?? ""}
              error={error("meta_description")}
            />

            <TextField
              label="Keywords"
              name="keywords"
              defaultValue={formatKeywords(post.keywords)}
              hint="Comma separated."
            />

            <TextField
              label="OG Image URL"
              name="og_image_url"
              defaultValue={post.og_image_url ?? ""}
              error={error("og_image_url")}
              placeholder="https://..."
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function SavePost() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="self-start" disabled={pending}>
      {pending ? "Saving…" : "Save post"}
    </Button>
  );
}
