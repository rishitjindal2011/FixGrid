import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { BlogPostRow } from "@/lib/types/database";

export interface BlogListFilters {
  status: "all" | "draft" | "published" | "archived";
  query: string;
  page: number;
}

export const PAGE_SIZE = 25;

export interface BlogListResult {
  rows: BlogPostRow[];
  total: number;
  pageCount: number;
}

export async function listBlogPosts(filters: BlogListFilters): Promise<BlogListResult> {
  const supabase = createAdminClient();
  const from = (filters.page - 1) * PAGE_SIZE;

  let query = supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (filters.status !== "all") query = query.eq("status", filters.status);

  if (filters.query) {
    const safe = filters.query.replace(/[%,]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[blog] list failed:", error.message);
    return { rows: [], total: 0, pageCount: 1 };
  }

  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getBlogPost(id: string): Promise<BlogPostRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[blog] get failed:", error.message);
    return null;
  }
  return data;
}
