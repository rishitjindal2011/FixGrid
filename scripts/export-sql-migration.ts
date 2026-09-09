import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import type { Database } from "../src/lib/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return "null";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportSql() {
  console.log("Generating idempotent SQL migration file...");
  const { data: blogs } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false });
  const { data: pages } = await supabase.from("seo_pages").select("*").order("path_prefix").order("slug");
  const { data: cats } = await supabase.from("repair_categories").select("*").order("sort_order");

  let sql = `-- ==========================================================================\n`;
  sql += `-- 015_seo_pages_and_blogs.sql\n`;
  sql += `-- Complete Idempotent Sync for Programmatic SEO Pages, City Hubs & Technical Blogs\n`;
  sql += `-- 100% Authentic Content - Zero Fake Reviews, Zero Fake Shops\n`;
  sql += `-- ==========================================================================\n\n`;

  // 1. Repair Categories
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n`;
  sql += `-- 1. REPAIR CATEGORIES (${cats?.length || 0} total)\n`;
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n\n`;

  for (const c of cats || []) {
    sql += `insert into public.repair_categories (name, slug, description, icon, sort_order)
values (${escapeSql(c.name)}, ${escapeSql(c.slug)}, ${escapeSql(c.description)}, ${escapeSql(c.icon)}, ${c.sort_order})
on conflict (slug) do update
set name = excluded.name, description = excluded.description, icon = excluded.icon, sort_order = excluded.sort_order;\n\n`;
  }

  // 2. SEO & CMS Pages
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n`;
  sql += `-- 2. SEO & CMS PAGES (${pages?.length || 0} total: Core Pages, Categories, City Hubs)\n`;
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n\n`;

  for (const p of pages || []) {
    const sectionsJson = JSON.stringify(p.content_sections).replace(/'/g, "''");
    const keywordsArr = (p.keywords || []).map((k: string) => "'" + k.replace(/'/g, "''") + "'").join(", ");
    sql += `insert into public.seo_pages (title, slug, path_prefix, status, is_indexed, is_followed, schema_type, meta_title, meta_description, keywords, content_sections, published_at, updated_at)
values (
  ${escapeSql(p.title)},
  ${escapeSql(p.slug)},
  ${escapeSql(p.path_prefix)},
  '${p.status}',
  ${p.is_indexed},
  ${p.is_followed},
  ${escapeSql(p.schema_type)},
  ${escapeSql(p.meta_title)},
  ${escapeSql(p.meta_description)},
  array[${keywordsArr}],
  '${sectionsJson}'::jsonb,
  '${p.published_at || new Date().toISOString()}',
  now()
)
on conflict (lower(path_prefix), lower(slug)) do update
set title = excluded.title,
    status = excluded.status,
    is_indexed = excluded.is_indexed,
    is_followed = excluded.is_followed,
    schema_type = excluded.schema_type,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description,
    keywords = excluded.keywords,
    content_sections = excluded.content_sections,
    updated_at = now();\n\n`;
  }

  // 3. Blog Posts
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n`;
  sql += `-- 3. AUTHENTIC TECHNICAL BLOG POSTS (${blogs?.length || 0} total)\n`;
  sql += `-- ──────────────────────────────────────────────────────────────────────────\n\n`;

  for (const b of blogs || []) {
    const keywordsArr = (b.keywords || []).map((k: string) => "'" + k.replace(/'/g, "''") + "'").join(", ");
    sql += `insert into public.blog_posts (title, slug, status, content, meta_title, meta_description, keywords, published_at, updated_at)
values (
  ${escapeSql(b.title)},
  ${escapeSql(b.slug)},
  '${b.status}',
  ${escapeSql(b.content)},
  ${escapeSql(b.meta_title)},
  ${escapeSql(b.meta_description)},
  array[${keywordsArr}],
  '${b.published_at || new Date().toISOString()}',
  now()
)
on conflict (slug) do update
set title = excluded.title,
    status = excluded.status,
    content = excluded.content,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description,
    keywords = excluded.keywords,
    updated_at = now();\n\n`;
  }

  const outPath = "supabase/migrations/015_seo_pages_and_blogs.sql";
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`✓ Generated ${outPath} (${(sql.length / 1024).toFixed(1)} KB) with ${pages?.length} pages and ${blogs?.length} blogs.`);
}

exportSql().catch(console.error);
