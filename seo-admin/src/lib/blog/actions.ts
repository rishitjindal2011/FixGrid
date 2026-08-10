"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireEditor, getSession } from "@/lib/auth/session";
import { toKeywordList } from "@/lib/cms/keywords";
import { type FormState, formFailure, formSuccess } from "@/lib/redirects/state";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setBlogPostStatus(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id"));
  const status = formData.get("status") === "published" ? "published" : "draft";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("blog_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[blog] status update failed:", error.message);
    throw new Error("Could not update status");
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${id}`);
}

export async function deleteBlogPost(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id"));

  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("[blog] delete failed:", error.message);
    throw new Error("Could not delete post");
  }

  revalidatePath("/blog");
  redirect("/blog");
}

export async function createBlogPost(formData: FormData) {
  const session = await requireEditor();

  const title = String(formData.get("title") ?? "Untitled Post").trim() || "Untitled Post";
  const slug = String(formData.get("slug") ?? `post-${Date.now()}`).trim() || `post-${Date.now()}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title,
      slug,
      status: "draft",
      author_id: null,
      content: "",
      meta_title: null,
      meta_description: null,
      keywords: null,
      og_image_url: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog] create failed:", error.message);
    throw new Error("Could not create post");
  }

  revalidatePath("/blog");
  redirect(`/blog/${data.id}?created=1`);
}

const PostSchema = z.object({
  title: z.string().trim().min(1, "A title is required."),
  slug: z
    .string()
    .trim()
    .min(1, "A slug is required.")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens."),
  content: z.string().trim(),
  meta_title: z.string().trim(),
  meta_description: z.string().trim(),
  og_image_url: z.string().trim(),
  template_id: z.string().trim().optional(),
});

export async function updateBlogPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireEditor();

  const id = String(formData.get("id"));

  const parsed = PostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
    meta_title: formData.get("meta_title"),
    meta_description: formData.get("meta_description"),
    og_image_url: formData.get("og_image_url"),
    template_id: formData.get("template_id"),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }
  if (!parsed.success) {
    return formFailure("Fix the highlighted fields.");
  }

  const supabase = createAdminClient();
  
  // Enforce unique slug
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return formFailure("Fix the highlighted fields.", { slug: "Slug is already in use." });
  }

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: parsed.data.content,
      meta_title: parsed.data.meta_title || null,
      meta_description: parsed.data.meta_description || null,
      keywords: toKeywordList(formData.get("keywords")),
      og_image_url: parsed.data.og_image_url || null,
      template_id: parsed.data.template_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[blog] update failed:", error.message);
    return formFailure("Could not save the post. The error has been logged.");
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${id}`);
  return formSuccess("Post saved successfully.");
}
