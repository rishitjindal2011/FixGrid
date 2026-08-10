"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireEditor } from "@/lib/auth/session";
import { validateContentSections } from "@/lib/cms/blocks";
import { toKeywordList } from "@/lib/cms/keywords";
import { normalizePathPrefix, normalizeSlug, reservedPrefixError } from "@/lib/cms/slug";
import {
  failureState as failure,
  successState,
  type PageActionState,
} from "@/lib/pages/state";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, PageStatus } from "@/lib/types/database";

/**
 * Mutations for `seo_pages`.
 *
 * Three rules hold across every action in this file:
 *
 *   1. **Authorise first, always.** `requireEditor()` runs before anything is
 *      read or written. The proxy guards navigation, but a server action is a
 *      POST to a generated endpoint — it never passes through a route match, so
 *      it must check for itself.
 *
 *   2. **Validate before writing, strictly.** The renderer drops malformed
 *      blocks to keep a page up; the editor refuses to save them in the first
 *      place. Saving something the renderer will silently discard is the worst
 *      outcome: the editor believes the page has nine sections and the site
 *      shows eight, with no error anywhere.
 *
 *   3. **Return state, don't throw, for anything the user can fix.** Bad input
 *      comes back as `issues` the form renders inline. Only genuine faults
 *      (missing auth, database down) throw.
 */

/* ── Input schema ─────────────────────────────────────────────────────────── */

/**
 * `z.coerce.boolean()` is deliberately avoided: it treats the string "false" as
 * true, which is exactly what an unchecked-then-rechecked checkbox can produce.
 * Presence of the key is the signal instead, matching how HTML forms actually
 * submit checkboxes.
 */
const checkbox = (value: FormDataEntryValue | null) => value === "on" || value === "true";

const MetaSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(200),
  slug: z.string().trim().min(1, "A slug is required.").max(180),
  path_prefix: z.string().trim().max(200),
  status: z.enum(["draft", "published", "archived"]),
  template_id: z.string().uuid().nullable(),
  meta_title: z.string().trim().max(200).nullable(),
  meta_description: z.string().trim().max(400).nullable(),
  keywords: z.array(z.string().trim().min(1)).max(30),
  canonical_url: z.string().trim().max(500).nullable(),
  og_title: z.string().trim().max(200).nullable(),
  og_image_url: z.string().trim().max(500).nullable(),
  schema_type: z.string().trim().min(1).max(80),
});

type MetaInput = z.infer<typeof MetaSchema>;

/** Empty text inputs arrive as `""`; the columns are nullable, so normalise. */
function nullableText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

/**
 * Read the metadata half of the form.
 *
 * `template_id` comes from a `<select>` whose empty option means "none", so an
 * empty string must become null rather than failing the uuid check.
 */
function readMeta(formData: FormData) {
  const templateId = nullableText(formData.get("template_id"));

  return MetaSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    path_prefix: formData.get("path_prefix") ?? "",
    status: formData.get("status") ?? "draft",
    template_id: templateId,
    meta_title: nullableText(formData.get("meta_title")),
    meta_description: nullableText(formData.get("meta_description")),
    keywords: toKeywordList(formData.get("keywords")),
    canonical_url: nullableText(formData.get("canonical_url")),
    og_title: nullableText(formData.get("og_title")),
    og_image_url: nullableText(formData.get("og_image_url")),
    schema_type: (formData.get("schema_type") as string | null)?.trim() || "WebPage",
  });
}

/** Collapse Zod issues into `{ fieldName: message }` for inline rendering. */
function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * URLs are validated by hand rather than with `z.string().url()`.
 *
 * Two reasons. The canonical field legitimately accepts a site-relative path
 * like `/repair/phones`, which `url()` rejects. And `url()` accepts
 * `javascript:alert(1)` in some versions — a scheme allowlist is the actual
 * check that matters, since these values end up in `href` and `<link>` tags.
 */
function urlFieldError(value: string | null, { allowRelative }: { allowRelative: boolean }): string | null {
  if (value === null) return null;
  if (allowRelative && value.startsWith("/")) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return allowRelative
      ? "Enter a full https:// URL or a path starting with /."
      : "Enter a full https:// URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }
  return null;
}

/* ── Shared write path ────────────────────────────────────────────────────── */

interface PreparedPage {
  meta: MetaInput;
  slug: string;
  pathPrefix: string;
  contentSections: Json;
}

/**
 * Everything create and update have in common: validate the metadata, normalise
 * the URL parts, validate the blocks. Returns either a prepared row or the
 * state to hand back to the form.
 */
function preparePage(formData: FormData): { ok: true; data: PreparedPage } | { ok: false; state: PageActionState } {
  const parsed = readMeta(formData);
  if (!parsed.success) {
    return {
      ok: false,
      state: failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error)),
    };
  }
  const meta = parsed.data;

  const fieldErrors: Record<string, string> = {};

  const canonicalError = urlFieldError(meta.canonical_url, { allowRelative: true });
  if (canonicalError) fieldErrors.canonical_url = canonicalError;

  const ogImageError = urlFieldError(meta.og_image_url, { allowRelative: false });
  if (ogImageError) fieldErrors.og_image_url = ogImageError;

  // Normalising server-side rather than trusting the editor's live preview:
  // the preview is a convenience, this is the value that gets stored.
  const slug = normalizeSlug(meta.slug);
  const pathPrefix = normalizePathPrefix(meta.path_prefix);

  if (!slug) {
    fieldErrors.slug = "That slug contains no usable characters.";
  }

  const reserved = reservedPrefixError(pathPrefix, slug);
  if (reserved) fieldErrors[pathPrefix ? "path_prefix" : "slug"] = reserved;

  // The JSON textarea is the source of truth for blocks. Parse failures are
  // reported as a block issue at index -1 so they render with the rest.
  const rawSections = formData.get("content_sections");
  let candidate: unknown = [];
  if (typeof rawSections === "string" && rawSections.trim() !== "") {
    try {
      candidate = JSON.parse(rawSections);
    } catch (error) {
      return {
        ok: false,
        state: failure("The content JSON could not be parsed.", fieldErrors, [
          {
            index: -1,
            type: "document",
            message: error instanceof Error ? error.message : "Invalid JSON.",
          },
        ]),
      };
    }
  }

  const validated = validateContentSections(candidate);
  if (!validated.ok) {
    return {
      ok: false,
      state: failure("Some blocks are invalid and were not saved.", fieldErrors, validated.issues),
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: failure("Fix the highlighted fields.", fieldErrors) };
  }

  return {
    ok: true,
    data: {
      meta,
      slug,
      pathPrefix,
      // Store the *parsed* blocks, not the raw text: defaults are now applied
      // and unknown keys are gone, so what the renderer reads is what the
      // editor validated.
      contentSections: validated.blocks as unknown as Json,
    },
  };
}

/**
 * `published_at` is stamped on the first transition into `published` and left
 * alone afterwards, so re-publishing an edit does not reset the date that
 * appears in the sitemap and in `datePublished`.
 */
function publishedAtFor(status: PageStatus, existing: string | null): string | null {
  if (status !== "published") return existing;
  return existing ?? new Date().toISOString();
}

/** Postgres unique-violation. Surfaced as a field error, not a crash. */
const UNIQUE_VIOLATION = "23505";

/**
 * Revalidate the admin's own views after a write.
 *
 * The public site is *not* revalidated from here — the two apps are separate
 * deployments and do not share a cache. The consumer route uses a short
 * `revalidate` window instead, which is the reason the "Preview" button exists
 * for anything that must be seen immediately.
 */
function revalidateAdmin(id?: string) {
  revalidatePath("/");
  revalidatePath("/pages");
  if (id) revalidatePath(`/pages/${id}`);
}

/* ── Actions ──────────────────────────────────────────────────────────────── */

export async function createPage(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  await requireEditor();

  const prepared = preparePage(formData);
  if (!prepared.ok) return prepared.state;

  const { meta, slug, pathPrefix, contentSections } = prepared.data;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("seo_pages")
    .insert({
      title: meta.title,
      slug,
      path_prefix: pathPrefix,
      status: meta.status,
      template_id: meta.template_id,
      content_sections: contentSections,
      meta_title: meta.meta_title,
      meta_description: meta.meta_description,
      keywords: meta.keywords,
      canonical_url: meta.canonical_url,
      is_indexed: checkbox(formData.get("is_indexed")),
      is_followed: checkbox(formData.get("is_followed")),
      og_title: meta.og_title,
      og_image_url: meta.og_image_url,
      schema_type: meta.schema_type,
      schema_markup: null,
      published_at: publishedAtFor(meta.status, null),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return failure("That URL is already taken.", {
        slug: `${pathPrefix ? `/${pathPrefix}/` : "/"}${slug} already exists.`,
      });
    }
    console.error("[pages] insert failed:", error.message);
    return failure("The page could not be created. Check the server logs.");
  }

  revalidateAdmin();
  // Outside the try/catch shape above on purpose: `redirect` works by throwing,
  // so it must be the last thing that runs.
  redirect(`/pages/${data.id}?created=1`);
}

export async function updatePage(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  await requireEditor();

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return failure("Missing page id.");
  }

  const prepared = preparePage(formData);
  if (!prepared.ok) return prepared.state;

  const { meta, slug, pathPrefix, contentSections } = prepared.data;
  const supabase = createAdminClient();

  // Read the existing row first, for `published_at`. Doing this in one
  // statement would need a trigger or a CTE; two queries against a primary key
  // is cheaper than either, and it also confirms the row exists.
  const { data: existing, error: readError } = await supabase
    .from("seo_pages")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("[pages] pre-update read failed:", readError.message);
    return failure("The page could not be saved. Check the server logs.");
  }
  if (!existing) return failure("That page no longer exists.");

  const { error } = await supabase
    .from("seo_pages")
    .update({
      title: meta.title,
      slug,
      path_prefix: pathPrefix,
      status: meta.status,
      template_id: meta.template_id,
      content_sections: contentSections,
      meta_title: meta.meta_title,
      meta_description: meta.meta_description,
      keywords: meta.keywords,
      canonical_url: meta.canonical_url,
      is_indexed: checkbox(formData.get("is_indexed")),
      is_followed: checkbox(formData.get("is_followed")),
      og_title: meta.og_title,
      og_image_url: meta.og_image_url,
      schema_type: meta.schema_type,
      published_at: publishedAtFor(meta.status, existing.published_at),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return failure("That URL is already taken.", {
        slug: `${pathPrefix ? `/${pathPrefix}/` : "/"}${slug} already exists.`,
      });
    }
    console.error("[pages] update failed:", error.message);
    return failure("The page could not be saved. Check the server logs.");
  }

  revalidateAdmin(id);
  return successState("Saved.");
}

/**
 * Status-only transitions, used by the buttons in the editor header.
 *
 * Separate from `updatePage` so publishing does not require the whole form to
 * be valid — and, more importantly, so publishing cannot quietly save unrelated
 * edits that happen to be sitting in the form.
 *
 * Takes `FormData` rather than `(id, status)` so each button is a real `<form>`
 * with a hidden field. That keeps them working without JavaScript and means the
 * action is never invoked from a GET, which a bare link would allow.
 */
const StatusSchema = z.enum(["draft", "published", "archived"]);

export async function setPageStatus(formData: FormData): Promise<void> {
  await requireEditor();

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("MISSING_ID");

  const parsedStatus = StatusSchema.safeParse(formData.get("status"));
  if (!parsedStatus.success) throw new Error("INVALID_STATUS");
  const status = parsedStatus.data;

  const supabase = createAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("seo_pages")
    .select("published_at, content_sections")
    .eq("id", id)
    .maybeSingle();

  if (readError || !existing) {
    console.error("[pages] status read failed:", readError?.message ?? "row not found");
    throw new Error("STATUS_CHANGE_FAILED");
  }

  // Publishing is the one transition that re-validates. A draft can be saved
  // half-finished on purpose; going live with blocks the renderer will drop is
  // never intentional. Editing is not blocked — only the transition is.
  if (status === "published") {
    const validated = validateContentSections(existing.content_sections);
    if (!validated.ok) throw new Error("INVALID_BLOCKS");
  }

  const { error } = await supabase
    .from("seo_pages")
    .update({
      status,
      published_at: publishedAtFor(status, existing.published_at),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[pages] status update failed:", error.message);
    throw new Error("STATUS_CHANGE_FAILED");
  }

  revalidateAdmin(id);
}

/**
 * Deletion is hard, not soft — `archived` already exists as the soft option, so
 * a second "deleted but still there" state would just be a place for rows to
 * accumulate unseen.
 *
 * The id arrives from a hidden field, so it is a string from the browser like
 * any other. It is only ever used as an equality filter on a uuid column: a
 * malformed value fails the type check at the database, and a valid-but-other
 * uuid still requires an editor session to get this far.
 */
export async function deletePage(formData: FormData): Promise<void> {
  await requireEditor();

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("MISSING_ID");

  const supabase = createAdminClient();
  const { error } = await supabase.from("seo_pages").delete().eq("id", id);

  if (error) {
    console.error("[pages] delete failed:", error.message);
    throw new Error("DELETE_FAILED");
  }

  revalidateAdmin();
  redirect("/pages?deleted=1");
}

/**
 * Duplicate a page as a draft.
 *
 * The main reason this exists: the fastest way to author a new programmatic
 * page is to copy one that already works. The copy is forced to `draft` with a
 * `-copy` slug and no `published_at`, so it can never collide with the original
 * or go live by accident.
 */
export async function duplicatePage(formData: FormData): Promise<void> {
  await requireEditor();

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("MISSING_ID");

  const supabase = createAdminClient();
  const { data: source, error: readError } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError || !source) {
    console.error("[pages] duplicate read failed:", readError?.message ?? "row not found");
    throw new Error("DUPLICATE_FAILED");
  }

  // Try `-copy`, then `-copy-2`, `-copy-3`… rather than relying on the unique
  // constraint to reject and giving up. Bounded, because an unbounded loop
  // against a unique index is a denial-of-service waiting to happen.
  const baseSlug = normalizeSlug(`${source.slug}-copy`);
  let candidateSlug = baseSlug;

  for (let attempt = 2; attempt <= 20; attempt += 1) {
    const { data: clash } = await supabase
      .from("seo_pages")
      .select("id")
      .eq("path_prefix", source.path_prefix)
      .eq("slug", candidateSlug)
      .maybeSingle();

    if (!clash) break;
    candidateSlug = `${baseSlug}-${attempt}`;
  }

  const { data: created, error } = await supabase
    .from("seo_pages")
    .insert({
      title: `${source.title} (copy)`,
      slug: candidateSlug,
      path_prefix: source.path_prefix,
      status: "draft",
      template_id: source.template_id,
      content_sections: source.content_sections,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      // Normalised rather than copied through: if the source row predates the
      // `text[]` column it holds a bare string, and inserting that verbatim
      // would either fail the copy or propagate the bad shape to a second row.
      keywords: toKeywordList(source.keywords),
      // Deliberately dropped: a copy that inherits the original's canonical URL
      // tells search engines the new page is the old one.
      canonical_url: null,
      is_indexed: source.is_indexed,
      is_followed: source.is_followed,
      og_title: source.og_title,
      og_image_url: source.og_image_url,
      schema_type: source.schema_type,
      schema_markup: source.schema_markup,
      published_at: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pages] duplicate insert failed:", error.message);
    throw new Error("DUPLICATE_FAILED");
  }

  revalidateAdmin();
  redirect(`/pages/${created.id}`);
}
