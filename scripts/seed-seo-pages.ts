/**
 * Seeds `cms_templates` and `seo_pages` from the category fact tables in
 * `seed-content.ts`.
 *
 * Run with `npm run seed:seo`. Safe to run repeatedly: every write is an upsert
 * keyed on the natural unique constraint, so re-running updates copy in place
 * rather than duplicating rows or resetting anything an editor has changed by
 * hand — with one exception, described under "What this will overwrite".
 *
 * ## What this will overwrite
 *
 * `title`, `content_sections`, `keywords`, `meta_title` and `meta_description`
 * are regenerated from the fact tables. If someone has hand-edited those in the
 * admin, this script will replace their work.
 *
 * Everything an editor toggles is written once, at insert, and never updated:
 * `status`, `published_at`, `is_indexed`, `is_followed`, `schema_type`, and the
 * canonical/OG overrides. An editor who unpublished a page or set it noindex
 * meant it, and a seed script should not quietly put it back on the site or in
 * the sitemap. New rows are created as drafts for the same reason —
 * bulk-publishing generated pages without a human reading them is how thin
 * content reaches an index.
 *
 * ## Why validate before writing
 *
 * The blocks are hand-written above and typed as `Block[]`, but TypeScript only
 * checks the shape at the call site — it cannot catch a `.min(2)` on
 * `highlights_strip` or a `.min(1)` on an empty FAQ array. Those constraints
 * live in Zod, so the script parses its own output through the same schema the
 * renderer uses and refuses to write anything that fails. A seed script that
 * writes rows the renderer then silently drops is the worst of both worlds.
 */

import { createClient } from "@supabase/supabase-js";

import { ContentSectionsSchema } from "../src/lib/cms/blocks";
import type { Database, Json } from "../src/lib/types/database";
import { CATEGORY_SEEDS, buildBlocks, type CategorySeed } from "./seed-content";

/* ── Environment ──────────────────────────────────────────────────────────── */

/**
 * The service-role key, not the anon key.
 *
 * Seeding writes to tables whose RLS policies deliberately deny anonymous
 * writes. Reading this from the environment rather than accepting it as an
 * argument keeps it out of shell history.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n  Missing ${name}.\n`);
    console.error("  Set it in .env.local, then run with:");
    console.error("    npm run seed:seo\n");
    process.exit(1);
  }
  return value.trim();
}

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Metadata ─────────────────────────────────────────────────────────────── */

const PATH_PREFIX = "repair";

/**
 * Meta titles are built to a fixed pattern under 60 characters so they are not
 * truncated in results. Descriptions carry the price range, because a number in
 * the snippet measurably improves click-through against a generic summary.
 */
function metaFor(seed: CategorySeed) {
  return {
    meta_title: `${seed.label} Near You — Costs & Local Shops`,
    meta_description: `What ${seed.noun} repairs actually cost (${seed.priceRange}), how long they take, and which local shops are open now. Compare rated, verified repairers.`,
    keywords: [
      `${seed.slug} repair`,
      `${seed.slug} repair near me`,
      `${seed.slug} repair cost`,
      `fix ${seed.noun}`,
      `${seed.noun} repair shop`,
    ],
  };
}

/* ── Seeding ──────────────────────────────────────────────────────────────── */

interface Result {
  slug: string;
  action: "created" | "updated" | "skipped" | "failed";
  detail?: string;
  words?: number;
}

/** Rough word count over the rendered text, for the report at the end. */
function countWords(blocks: unknown): number {
  const text = JSON.stringify(blocks)
    .replace(/<[^>]+>/g, " ")
    .replace(/[^A-Za-z0-9'’-]+/g, " ");
  return text.split(" ").filter((word) => word.length > 1).length;
}

/** Returns the template id so a newly created page can record where it came from. */
async function seedTemplate(seed: CategorySeed, blocks: unknown): Promise<string> {
  const { data, error } = await supabase
    .from("cms_templates")
    .upsert(
      {
        slug: `${seed.slug}-guide`,
        name: `${seed.label} guide`,
        sections: blocks as Json,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`template ${seed.slug}: ${error.message}`);
  return data.id;
}

async function seedPage(
  seed: CategorySeed,
  blocks: unknown,
  templateId: string,
): Promise<Result> {
  // Existence is checked first so the editor-controlled columns can be left
  // alone on rows that already exist. An upsert alone cannot express "insert
  // these columns, but do not update them".
  const { data: existing, error: readError } = await supabase
    .from("seo_pages")
    .select("id, status")
    .eq("path_prefix", PATH_PREFIX)
    .eq("slug", seed.slug)
    .maybeSingle();

  if (readError) return { slug: seed.slug, action: "failed", detail: readError.message };

  // The copy, and the meta derived from it. This is the part the fact tables own.
  const regenerated = {
    title: `${seed.label} Near You`,
    ...metaFor(seed),
    content_sections: blocks as Json,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("seo_pages").update(regenerated).eq("id", existing.id);
    if (error) return { slug: seed.slug, action: "failed", detail: error.message };
    return { slug: seed.slug, action: "updated", words: countWords(blocks) };
  }

  // Insert-only, all of it editor-controlled once the row exists. `is_indexed`
  // and `is_followed` are toggles in the admin and re-seeding must not quietly
  // put a deliberately noindexed page back in the sitemap. The three overrides
  // start null so the page inherits global settings until someone sets them,
  // and `schema_markup` stays null because the renderer derives the Article and
  // FAQPage JSON-LD from the blocks rather than storing a second copy of it.
  const { error } = await supabase.from("seo_pages").insert({
    ...regenerated,
    path_prefix: PATH_PREFIX,
    slug: seed.slug,
    template_id: templateId,
    status: "draft",
    published_at: null,
    schema_type: "Article",
    is_indexed: true,
    is_followed: true,
    canonical_url: null,
    og_title: null,
    og_image_url: null,
    schema_markup: null,
  });
  if (error) return { slug: seed.slug, action: "failed", detail: error.message };
  return { slug: seed.slug, action: "created", words: countWords(blocks) };
}

async function main(): Promise<void> {
  console.log(`\n  Seeding ${CATEGORY_SEEDS.length} category pages under /${PATH_PREFIX}/…\n`);

  const results: Result[] = [];

  for (const seed of CATEGORY_SEEDS) {
    const blocks = buildBlocks(seed);

    // The same schema the renderer uses. Fail loudly and write nothing.
    const parsed = ContentSectionsSchema.safeParse(blocks);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first ? `${first.path.join(".")}: ${first.message}` : "unknown";
      results.push({ slug: seed.slug, action: "failed", detail: `invalid blocks — ${where}` });
      continue;
    }

    try {
      const templateId = await seedTemplate(seed, parsed.data);
      results.push(await seedPage(seed, parsed.data, templateId));
    } catch (error) {
      results.push({
        slug: seed.slug,
        action: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    const mark = result.action === "failed" ? "✗" : "✓";
    const words = result.words ? ` · ${result.words} words` : "";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`  ${mark} /${PATH_PREFIX}/${result.slug} ${result.action}${words}${detail}`);
  }

  const failed = results.filter((r) => r.action === "failed").length;
  const created = results.filter((r) => r.action === "created").length;

  console.log(
    `\n  ${results.length - failed} of ${results.length} written.` +
      (created > 0 ? ` ${created} new page${created === 1 ? "" : "s"} created as drafts.` : ""),
  );
  if (created > 0) {
    console.log("  Review them in the admin, then publish — nothing is live yet.\n");
  } else {
    console.log("");
  }

  // Non-zero exit on any failure so this is usable in CI without parsing output.
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("\n  Seeding failed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
