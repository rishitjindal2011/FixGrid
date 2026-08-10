import { createAdminClient } from "@/lib/supabase/admin";
import type { BlogTemplateRow } from "@/lib/types/database";

export async function getBlogTemplates(): Promise<BlogTemplateRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[blog-templates] getBlogTemplates failed", error.message);
    return [];
  }
  return data ?? [];
}

export async function getBlogTemplate(id: string): Promise<BlogTemplateRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[blog-templates] getBlogTemplate failed", { id, error: error.message });
    return null;
  }
  return data;
}
