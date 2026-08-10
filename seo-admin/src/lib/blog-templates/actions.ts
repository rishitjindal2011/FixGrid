"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireEditor } from "@/lib/auth/session";
import { type FormState, formFailure, formSuccess } from "@/lib/redirects/state";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteBlogTemplate(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id"));

  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_templates").delete().eq("id", id);

  if (error) {
    console.error("[blog-templates] delete failed:", error.message);
    throw new Error("Could not delete template");
  }

  revalidatePath("/blog-templates");
  redirect("/blog-templates");
}

export async function createBlogTemplate(formData: FormData) {
  await requireEditor();

  const name = String(formData.get("name") ?? "Untitled Template").trim() || "Untitled Template";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_templates")
    .insert({
      name,
      html_template: "<h1>{{title}}</h1>\n<p>{{date}}</p>\n<div>{{content}}</div>",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog-templates] create failed:", error.message);
    throw new Error("Could not create template");
  }

  revalidatePath("/blog-templates");
  redirect(`/blog-templates/${data.id}?created=1`);
}

const TemplateSchema = z.object({
  name: z.string().trim().min(1, "A name is required."),
  html_template: z.string().trim().min(1, "An HTML template is required."),
});

export async function updateBlogTemplate(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireEditor();

  const id = String(formData.get("id"));

  const parsed = TemplateSchema.safeParse({
    name: formData.get("name"),
    html_template: formData.get("html_template"),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }

  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("blog_templates")
    .update({
      name: parsed.data.name,
      html_template: parsed.data.html_template,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[blog-templates] update failed:", error.message);
    return formFailure("Could not save the template. The error has been logged.");
  }

  revalidatePath("/blog-templates");
  revalidatePath(`/blog-templates/${id}`);
  return formSuccess("Template saved successfully.");
}
