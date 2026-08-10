"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth/session";
import { toKeywordList } from "@/lib/cms/keywords";
import { type FormState, formFailure, formSuccess } from "@/lib/redirects/state";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The single `seo_global` row.
 *
 * Owner-only. These values are the fallback for every page that does not set
 * its own, so a bad `canonical_domain` here mis-canonicalises the entire site
 * at once — a much larger blast radius than editing one page.
 *
 * The row is `id = 1` by convention and is upserted rather than updated, so a
 * fresh database does not need a seed step before the screen works.
 */

/**
 * The canonical domain is validated hard because it prefixes every canonical
 * tag, every sitemap entry, and every absolute OG URL.
 *
 * Rejecting loopback in production mirrors `lib/site.ts` and the spec's "no
 * localhost leaks" rule — the difference is that this value lives in the
 * database, so a build-time check cannot catch it.
 */
const LOOPBACK = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|.*\.local)$/i;

function checkDomain(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (input === "") return { ok: false, error: "A canonical domain is required." };

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "Include the scheme, e.g. https://vytron.me" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http and https are supported." };
  }
  if (process.env.NODE_ENV === "production" && LOOPBACK.test(parsed.hostname)) {
    return {
      ok: false,
      error: "That is a local address. Canonical URLs and the sitemap would point at nothing.",
    };
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return { ok: false, error: "Origin only — drop the path, query and fragment." };
  }

  // `origin` normalises away the trailing slash and lowercases the host, so
  // `https://Vytron.me/` and `https://vytron.me` cannot both be stored.
  return { ok: true, value: parsed.origin };
}

const SettingsSchema = z.object({
  site_title: z.string().trim().min(1, "A site title is required.").max(120),
  default_meta_title: z.string().trim().min(1, "A default meta title is required.").max(200),
  default_meta_description: z
    .string()
    .trim()
    .min(1, "A default meta description is required.")
    .max(400),
});

export async function updateGlobalSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = SettingsSchema.safeParse({
    site_title: formData.get("site_title"),
    default_meta_title: formData.get("default_meta_title"),
    default_meta_description: formData.get("default_meta_description"),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  const domain = checkDomain(String(formData.get("canonical_domain") ?? ""));
  if (!domain.ok) fieldErrors.canonical_domain = domain.error;

  // Optional, but if present it must be absolute — a relative OG image resolves
  // against the crawler's base, not ours, and silently 404s in link previews.
  const ogRaw = String(formData.get("default_og_image_url") ?? "").trim();
  let ogImage: string | null = null;
  if (ogRaw !== "") {
    try {
      const url = new URL(ogRaw);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("scheme");
      ogImage = url.toString();
    } catch {
      fieldErrors.default_og_image_url = "Must be a full URL starting with https://";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }
  if (!parsed.success || !domain.ok) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }

  // Parse JSON schemas
  let globalExpertSchema = null;
  let globalOrganizationSchema = null;
  try {
    const rawExpert = String(formData.get("global_expert_schema") ?? "").trim();
    if (rawExpert) globalExpertSchema = JSON.parse(rawExpert);
  } catch {
    fieldErrors.global_expert_schema = "Invalid JSON structure.";
  }
  
  try {
    const rawOrg = String(formData.get("global_organization_schema") ?? "").trim();
    if (rawOrg) globalOrganizationSchema = JSON.parse(rawOrg);
  } catch {
    fieldErrors.global_organization_schema = "Invalid JSON structure.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("seo_global").upsert(
    {
      id: 1,
      site_title: parsed.data.site_title,
      default_meta_title: parsed.data.default_meta_title,
      default_meta_description: parsed.data.default_meta_description,
      default_keywords: toKeywordList(formData.get("default_keywords")),
      canonical_domain: domain.value,
      default_og_image_url: ogImage,
      global_expert_schema: globalExpertSchema,
      global_organization_schema: globalOrganizationSchema,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[settings] upsert failed:", error.message);
    return formFailure("Could not save the settings. The error has been logged.");
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return formSuccess("Settings saved. The site picks these up on its next revalidation.");
}
