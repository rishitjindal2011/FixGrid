import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ExpertProfile,
  FixerProfileRow,
  RepairCategoryRow,
  ReviewWithAuthor,
} from "@/lib/types/database";
import type { PublicInventoryItem } from "@/components/expert/public-inventory";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Supabase returns many-to-many joins nested through the join table, so
 * `fixer_categories(repair_categories(*))` comes back as
 * `[{ repair_categories: {...} }]`. Flatten it to a plain category array.
 */
const SELECT = `
  *,
  category_links:fixer_categories(repair_categories(*)),
  reviews(*, customer:users(id, display_name, avatar_url))
` as const;

/**
 * The shop's standard warranty in days, or 0.
 *
 * `SELECT` above is `*`, so the column comes back — but `ExpertProfile` is built on
 * the *generated* row type in `database.ts`, which predates migration 001 and does
 * not declare it. Adding it there would be erased the next time
 * `supabase gen types typescript` runs, which is the whole reason
 * `marketplace.ts` exists as a separate file.
 *
 * So this is a narrow, documented read at the one place it is needed, rather than
 * a cast at each call site or a widened type that a regeneration would silently
 * revert. It returns 0 for anything unexpected, and `WarrantyBadge` renders nothing
 * at 0 — a missing column degrades to "no warranty shown", never to a wrong promise.
 */
export function profileWarrantyDays(profile: ExpertProfile): number {
  const value = (profile as { default_warranty_days?: number | null })
    .default_warranty_days;
  return typeof value === "number" && value > 0 ? value : 0;
}

interface RawProfile extends FixerProfileRow {
  category_links: Array<{ repair_categories: RepairCategoryRow | null }> | null;
  reviews: ReviewWithAuthor[] | null;
}

function shape(raw: RawProfile): ExpertProfile {
  const categories = (raw.category_links ?? [])
    .map((link) => link.repair_categories)
    .filter((category): category is RepairCategoryRow => category !== null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const reviews = (raw.reviews ?? [])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  const { category_links: _links, ...rest } = raw;
  return { ...rest, categories, reviews };
}

/**
 * Resolve a profile by slug, falling back to id.
 *
 * The spec asks for the id fallback so old numeric/UUID links keep working.
 * The UUID guard matters: Postgres raises `invalid input syntax for type uuid`
 * on a malformed value rather than returning zero rows, which would turn a
 * 404 into a 500.
 *
 * No `is_hidden` filter here on purpose. This runs on the request client, so
 * the `visible shops readable by all` policy already decides: a pending shop
 * returns zero rows for everyone except its owner, who gets to preview the real
 * page while they wait. Filtering in TypeScript as well would take that preview
 * away and duplicate a rule that already lives in one place.
 */
export async function getExpertBySlug(identifier: string): Promise<ExpertProfile | null> {
  const supabase = await createClient();

  const bySlug = await supabase
    .from("fixer_profiles")
    .select(SELECT)
    .eq("slug", identifier)
    .maybeSingle();

  if (bySlug.error) {
    console.error("[expert] slug lookup failed", { identifier, error: bySlug.error.message });
  }
  if (bySlug.data) return shape(bySlug.data as unknown as RawProfile);

  if (!UUID_RE.test(identifier)) return null;

  const byId = await supabase
    .from("fixer_profiles")
    .select(SELECT)
    .eq("id", identifier)
    .maybeSingle();

  if (byId.error) {
    console.error("[expert] id fallback failed", { identifier, error: byId.error.message });
    return null;
  }
  return byId.data ? shape(byId.data as unknown as RawProfile) : null;
}

/**
 * Slugs for `generateStaticParams` and the sitemap. Admin client: builds have
 * no request context.
 *
 * `is_hidden` MUST be filtered here in TypeScript. The admin client uses the
 * service-role key and bypasses RLS entirely, so the policy that protects every
 * other read does nothing on this path — without the filter, a shop nobody has
 * reviewed yet would be pre-rendered and submitted to search engines.
 */
export async function getAllExpertSlugs(limit = 5000): Promise<Array<{ slug: string; updated_at: string }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("slug, updated_at")
    .eq("is_hidden", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[expert] slug enumeration failed", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * The public projection of a shop's inventory.
 *
 * This reads `is_active = true` implicitly through the RLS policy "listed
 * inventory readable by all", but explicitly filtering it here is defensive and
 * lets TypeScript know the shape.
 */
export async function getPublicInventory(fixerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_inventory")
    .select(
      `id, sku, name, description, brand, condition, unit_price, currency,
       quantity, sort_order, created_at,
       category:repair_categories!shop_inventory_category_fkey ( id, name, slug )`
    )
    .eq("fixer_id", fixerId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<PublicInventoryItem[]>();

  if (error) {
    console.error("[expert] public inventory read failed", { fixerId, error: error.message });
    return [];
  }
  return data ?? [];
}

/**
 * The public projection of a shop's active job vacancies.
 */
export async function getPublicShopJobs(fixerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_jobs")
    .select("*")
    .eq("fixer_id", fixerId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[expert] public jobs read failed", { fixerId, error: error.message });
    return [];
  }
  return data ?? [];
}

