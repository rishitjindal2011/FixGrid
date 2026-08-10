import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlogPostRow } from "@/lib/types/database";

export type BlogPostWithTemplate = BlogPostRow & {
  blog_templates?: { html_template: string } | null;
};

export async function getPublishedBlogPost(slug: string): Promise<BlogPostWithTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, blog_templates(html_template)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog] getPublishedBlogPost failed", { slug, error: error.message });
    return null;
  }
  return data;
}

export async function getAllPublishedBlogPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] getAllPublishedBlogPosts failed", error.message);
    return [];
  }
  return data ?? [];
}

export async function getBlogPostForPreview(slug: string): Promise<BlogPostWithTemplate | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, blog_templates(html_template)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[blog] getBlogPostForPreview failed", { slug, error: error.message });
    return null;
  }
  return data;
}

export async function getPublishedBlogPaths(limit = 1000): Promise<Array<{ slug: string }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published")
    .limit(limit);

  if (error) {
    console.error("[blog] getPublishedBlogPaths failed", error.message);
    return [];
  }
  return data ?? [];
}
