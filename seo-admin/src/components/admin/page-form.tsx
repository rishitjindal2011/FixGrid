"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check } from "lucide-react";

import { BlockEditor } from "@/components/admin/block-editor";
import { CheckboxField, SelectField, TextField, TextareaField } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKeywords } from "@/lib/cms/keywords";
import { normalizePathPrefix, normalizeSlug } from "@/lib/cms/slug";
import { createPage, updatePage } from "@/lib/pages/actions";
import { IDLE_STATE } from "@/lib/pages/state";
import { PUBLIC_APP_URL } from "@/lib/site";
import type { CmsTemplateRow, SeoPageRow } from "@/lib/types/database";

/**
 * Schema.org types offered for the page. Kept short on purpose — the renderer
 * only knows how to emit these, and a free-text field would let someone type
 * `Artcile` and get no structured data with no warning.
 */
const SCHEMA_TYPES = ["WebPage", "Article", "FAQPage", "CollectionPage", "Service"] as const;

/** Google truncates around these lengths. Not hard limits — guidance. */
const TITLE_TARGET = 60;
const DESCRIPTION_TARGET = 158;

export function PageForm({
  page,
  templates,
  fromTemplate = null,
}: {
  /** `null` when creating. Drives which action runs and what defaults apply. */
  page: SeoPageRow | null;
  templates: CmsTemplateRow[];
  /**
   * Template to seed a *new* page from, resolved server-side from `?template=`.
   *
   * Copied once, here, and then owned by the page — which is why the Templates
   * screen is read-only. Ignored when editing, so re-opening an existing page
   * can never silently re-apply a template over saved work.
   */
  fromTemplate?: CmsTemplateRow | null;
}) {
  const isNew = page === null;
  const [state, formAction] = useActionState(isNew ? createPage : updatePage, IDLE_STATE);

  // A template only ever seeds a blank page. `page.content_sections` wins
  // whenever there is a page at all.
  const seedBlocks = page ? page.content_sections : (fromTemplate?.sections ?? []);

  // Mirrored locally so the URL preview and the SERP preview update as you
  // type. The server re-normalises on save — this is guidance, not the value.
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [pathPrefix, setPathPrefix] = useState(page?.path_prefix ?? "");
  const [title, setTitle] = useState(page?.title ?? "");
  const [metaTitle, setMetaTitle] = useState(page?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(page?.meta_description ?? "");

  const previewPath = `/${[normalizePathPrefix(pathPrefix), normalizeSlug(slug)]
    .filter(Boolean)
    .join("/")}`;

  const effectiveTitle = metaTitle.trim() || title.trim();
  const error = (field: string) => state.fieldErrors[field];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TextField
                label="Title"
                name="title"
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                error={error("title")}
                hint="Internal name, and the fallback for the meta title."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Path prefix"
                  name="path_prefix"
                  value={pathPrefix}
                  onChange={(event) => setPathPrefix(event.target.value)}
                  error={error("path_prefix")}
                  placeholder="repair/phones"
                  hint="Folder segments, no slashes needed. Leave blank for the site root."
                />
                <TextField
                  label="Slug"
                  name="slug"
                  required
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  error={error("slug")}
                  placeholder="iphone-screen-replacement"
                />
              </div>

              {/*
                The resolved URL is shown rather than described, because the
                normalisation rules (accent folding, hyphen collapsing) are
                impossible to guess and easy to demonstrate.
              */}
              <p className="rounded-machined bg-bench px-3 py-2 font-mono text-xs text-steel">
                <span className="text-steel-soft">{PUBLIC_APP_URL}</span>
                {previewPath}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockEditor
                name="content_sections"
                initialValue={seedBlocks}
                issues={state.blockIssues}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search appearance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TextField
                label="Meta title"
                name="meta_title"
                maxLength={200}
                value={metaTitle}
                onChange={(event) => setMetaTitle(event.target.value)}
                error={error("meta_title")}
                placeholder={title || "Falls back to the page title"}
                hint={lengthHint(metaTitle.length || title.length, TITLE_TARGET)}
              />

              <TextareaField
                label="Meta description"
                name="meta_description"
                rows={3}
                maxLength={400}
                value={metaDescription}
                onChange={(event) => setMetaDescription(event.target.value)}
                error={error("meta_description")}
                hint={lengthHint(metaDescription.length, DESCRIPTION_TARGET)}
              />

              <SerpPreview
                url={`${PUBLIC_APP_URL}${previewPath}`}
                title={effectiveTitle}
                description={metaDescription}
              />

              <TextField
                label="Keywords"
                name="keywords"
                defaultValue={formatKeywords(page?.keywords)}
                error={error("keywords")}
                placeholder="phone repair, screen replacement"
                hint="Comma separated. Stored for internal reporting — no engine reads the keywords meta tag."
              />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SelectField label="Status" name="status" defaultValue={page?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </SelectField>

              <SelectField
                label="Template"
                name="template_id"
                defaultValue={page?.template_id ?? fromTemplate?.id ?? ""}
                error={error("template_id")}
                hint="Recorded for reporting. Rendering is driven by the blocks."
              >
                <option value="">None</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </SelectField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indexing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CheckboxField
                label="Allow indexing"
                name="is_indexed"
                defaultChecked={page?.is_indexed ?? true}
                hint="Off emits noindex. The page stays reachable by URL."
              />
              <CheckboxField
                label="Follow links"
                name="is_followed"
                defaultChecked={page?.is_followed ?? true}
                hint="Off emits nofollow on the whole page."
              />

              <TextField
                label="Canonical URL"
                name="canonical_url"
                defaultValue={page?.canonical_url ?? ""}
                error={error("canonical_url")}
                placeholder="Defaults to this page's own URL"
                hint="Set only when this page duplicates another. A wrong value here de-indexes the page."
              />

              <SelectField
                label="Schema type"
                name="schema_type"
                defaultValue={page?.schema_type ?? "WebPage"}
              >
                {SCHEMA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TextField
                label="OG title"
                name="og_title"
                defaultValue={page?.og_title ?? ""}
                error={error("og_title")}
                placeholder="Falls back to the meta title"
              />
              <TextField
                label="OG image URL"
                name="og_image_url"
                defaultValue={page?.og_image_url ?? ""}
                error={error("og_image_url")}
                placeholder="https://…"
                hint="1200×630 renders best. Must be an absolute URL."
              />
            </CardContent>
          </Card>

          {/*
            Sticky so save is reachable from anywhere in a long page without
            scrolling back up — this form is tall by design.
          */}
          <div className="sticky bottom-4 rounded-machined border border-hairline bg-chalk p-3 shadow-lift">
            <SaveButton isNew={isNew} />
          </div>
        </aside>
      </div>
    </form>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create page" : "Save changes"}
    </Button>
  );
}

/** Counts toward the pixel-truncation point search engines use, roughly. */
function lengthHint(length: number, target: number): string {
  if (length === 0) return `Aim for about ${target} characters.`;
  if (length > target) return `${length} characters — likely truncated past ~${target}.`;
  return `${length} of about ${target} characters.`;
}

/**
 * A search-result mock.
 *
 * This is the one piece of chrome in the admin that earns its space: meta title
 * and description are written blind everywhere else, and seeing them laid out
 * the way a result actually appears catches truncation and repetition
 * immediately. Deliberately understated so it reads as a preview, not as a
 * component of the admin itself.
 */
function SerpPreview({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-machined border border-hairline bg-bench p-4">
      <p className="eyebrow mb-2.5">Result preview</p>
      <p className="truncate font-mono text-xs text-steel">{url}</p>
      <p className="mt-1 truncate text-lg text-[#1a0dab]">
        {title || "Untitled page"}
      </p>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-steel">
        {description || "No meta description. Search engines will invent one from the page copy."}
      </p>
    </div>
  );
}
