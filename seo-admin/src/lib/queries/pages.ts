import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CmsTemplateRow, SeoGlobalRow, SeoPageRow, SeoRedirectRow } from "@/lib/types/database";

/**
 * Every read and write in the admin app goes through the service-role client.
 *
 * `seo_pages` has RLS on and only exposes `status = 'published'` to anon, so
 * an admin using the anon key literally could not see the drafts it exists to
 * edit. `cms_templates` and `seo_admins` have RLS on with *zero* policies, so
 * they are invisible to anything but service-role.
 *
 * `import "server-only"` makes reaching this module from a Client Component a
 * build error rather than a runtime key leak.
 */

export interface PageListFilters {
  status: "all" | "draft" | "published" | "archived";
  query: string;
  page: number;
}

export const PAGE_SIZE = 25;

export interface PageListResult {
  rows: SeoPageRow[];
  total: number;
  pageCount: number;
}

export async function listPages(filters: PageListFilters): Promise<PageListResult> {
  const supabase = createAdminClient();
  const from = (filters.page - 1) * PAGE_SIZE;

  let query = supabase
    .from("seo_pages")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (filters.status !== "all") query = query.eq("status", filters.status);

  if (filters.query) {
    // `%` and `,` are the two characters that change PostgREST's `or` grammar
    // rather than being matched literally. Strip them instead of escaping:
    // nobody searches for a percent sign, and a mangled filter string is a
    // much worse outcome than a slightly narrower search.
    const safe = filters.query.replace(/[%,]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[pages] list failed:", error.message);
    return { rows: [], total: 0, pageCount: 1 };
  }

  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPage(id: string): Promise<SeoPageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("seo_pages").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[pages] get failed:", error.message);
    return null;
  }
  return data;
}

export async function listTemplates(): Promise<CmsTemplateRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[templates] list failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getTemplate(id: string): Promise<CmsTemplateRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[templates] get failed:", error.message);
    return null;
  }
  return data;
}

export async function listRedirects(): Promise<SeoRedirectRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seo_redirects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[redirects] list failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getGlobalSettings(): Promise<SeoGlobalRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("seo_global").select("*").eq("id", 1).maybeSingle();

  if (error) {
    console.error("[global] get failed:", error.message);
    return null;
  }
  return data;
}

export interface DashboardStats {
  published: number;
  draft: number;
  archived: number;
  redirects: number;
  noindex: number;
}

/**
 * Counts only — `head: true` means PostgREST returns the count header and no
 * rows at all, so this stays cheap even with tens of thousands of pages.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();

  const [published, draft, archived, redirects, noindex] = await Promise.all([
    supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("seo_redirects").select("id", { count: "exact", head: true }),
    supabase
      .from("seo_pages")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("is_indexed", false),
  ]);

  return {
    published: published.count ?? 0,
    draft: draft.count ?? 0,
    archived: archived.count ?? 0,
    redirects: redirects.count ?? 0,
    noindex: noindex.count ?? 0,
  };
}
