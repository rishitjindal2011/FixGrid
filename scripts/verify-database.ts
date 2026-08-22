import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types/database";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n  Missing ${name}.\n`);
    process.exit(1);
  }
  return value.trim();
}

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("=================================================");
  console.log("       FIXGRID SUPABASE DATABASE AUDIT           ");
  console.log("=================================================\n");

  // 1. Blog Posts
  const { data: blogs, error: blogErr } = await supabase
    .from("blog_posts")
    .select("id, title, slug, status, published_at")
    .order("published_at", { ascending: false });

  if (blogErr) {
    console.error("Error reading blog_posts:", blogErr.message);
  } else {
    console.log(`📌 BLOG POSTS (${blogs?.length || 0} total in DB):`);
    blogs?.forEach((b, i) => {
      console.log(`  ${i + 1}. [${b.status.toUpperCase()}] /blog/${b.slug}`);
      console.log(`     Title: "${b.title}"`);
    });
  }

  console.log("\n-------------------------------------------------\n");

  // 2. SEO Pages
  const { data: pages, error: pageErr } = await supabase
    .from("seo_pages")
    .select("id, title, path_prefix, slug, status, is_indexed, schema_type")
    .order("path_prefix", { ascending: true })
    .order("slug", { ascending: true });

  if (pageErr) {
    console.error("Error reading seo_pages:", pageErr.message);
  } else {
    console.log(`📌 SEO & CMS PAGES (${pages?.length || 0} total in DB):`);
    pages?.forEach((p, i) => {
      const fullPath = p.path_prefix ? `/${p.path_prefix}/${p.slug}` : `/${p.slug}`;
      console.log(`  ${i + 1}. [${p.status.toUpperCase()}] ${fullPath} (${p.schema_type}, indexed: ${p.is_indexed})`);
      console.log(`     Title: "${p.title}"`);
    });
  }

  console.log("\n-------------------------------------------------\n");

  // 3. Repair Categories
  const { data: categories, error: catErr } = await supabase
    .from("repair_categories")
    .select("id, name, slug, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (catErr) {
    console.error("Error reading repair_categories:", catErr.message);
  } else {
    console.log(`📌 REPAIR CATEGORIES (${categories?.length || 0} total in DB):`);
    categories?.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (slug: '${c.slug}', icon: '${c.icon}', order: ${c.sort_order})`);
    });
  }

  console.log("\n-------------------------------------------------\n");

  // 4. CMS Templates
  const { data: templates, error: tmplErr } = await supabase
    .from("cms_templates")
    .select("id, name, slug");

  if (tmplErr) {
    console.error("Error reading cms_templates:", tmplErr.message);
  } else {
    console.log(`📌 CMS TEMPLATES (${templates?.length || 0} total in DB):`);
    templates?.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name} (slug: '${t.slug}')`);
    });
  }

  console.log("\n=================================================");
  console.log("                  AUDIT COMPLETE                 ");
  console.log("=================================================");
}

main().catch(console.error);
