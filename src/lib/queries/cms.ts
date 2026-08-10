import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SeoGlobalRow, SeoPageRow } from "@/lib/types/database";

/**
 * Data access for the programmatic SEO surface.
 *
 * Two clients, deliberately:
 *   • Public reads go through the RLS-bound server client. The "published
 *     pages readable" policy is then a second lock behind the query filter, so
 *     a missing `.eq("status", "published")` can't leak a draft.
 *   • Draft-mode reads and sitemap enumeration use the service-role client,
 *     because they must see rows that RLS is specifically designed to hide.
 */

/** Split a catch-all segment array into the `path_prefix` / `slug` pair. */
export function splitPath(segments: string[]): { pathPrefix: string; slug: string } | null {
  const clean = segments.map((segment) => decodeURIComponent(segment).trim()).filter(Boolean);
  const slug = clean[clean.length - 1];
  if (!slug) return null;
  return { pathPrefix: clean.slice(0, -1).join("/"), slug };
}

export async function getPublishedPage(
  pathPrefix: string,
  slug: string,
): Promise<SeoPageRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("path_prefix", pathPrefix)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[cms] getPublishedPage failed", { pathPrefix, slug, error: error.message });
    return null;
  }
  return data;
}

/**
 * Draft-mode read. Resolves any status, including `draft` and `archived`.
 * Only ever called when `draftMode().isEnabled` is true, which in turn is only
 * set by `/api/preview` after verifying PREVIEW_SECRET.
 */
export async function getPageForPreview(
  pathPrefix: string,
  slug: string,
): Promise<SeoPageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("path_prefix", pathPrefix)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[cms] getPageForPreview failed", { pathPrefix, slug, error: error.message });
    return null;
  }
  return data;
}

export async function getPageById(id: string): Promise<SeoPageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("seo_pages").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[cms] getPageById failed", { id, error: error.message });
    return null;
  }
  return data;
}

/** Global SEO defaults. Cached per request; the row changes rarely. */
export async function getSeoGlobal(): Promise<SeoGlobalRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("seo_global").select("*").eq("id", 1).maybeSingle();
  return data;
}

/**
 * All published, indexable pages — for `generateStaticParams` and the sitemap.
 * Uses the admin client because enumeration must not depend on RLS evaluating
 * correctly during a build, where there is no request context at all.
 */
export async function getPublishedPagePaths(
  limit = 5000,
): Promise<Array<Pick<SeoPageRow, "path_prefix" | "slug" | "updated_at" | "is_indexed">>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seo_pages")
    .select("path_prefix, slug, updated_at, is_indexed")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[cms] getPublishedPagePaths failed", error.message);
    return [];
  }
  return data ?? [];
}
