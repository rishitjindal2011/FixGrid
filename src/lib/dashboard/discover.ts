import "server-only";

import {
  RATING_STEPS,
  WARRANTY_STEPS,
  getCategories,
  parseSearchParams,
  searchFixers,
  type BoundingBox,
  type SearchFilters,
  type SearchResult,
} from "@/lib/queries/search";
import { createClient } from "@/lib/supabase/server";
import type { FixerProfileRow, RepairCategoryRow } from "@/lib/types/database";
import type {
  DeliveryMode,
  FixerBookingSettings,
  ShopAvailabilityRow,
  ShopServiceRow,
  ShopTimeOffRow,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * The signed-in expert directory behind `/dashboard/discover`.
 *
 * This is `/search` with a booking layer on top, and it deliberately reuses
 * `@/lib/queries/search` rather than re-deriving it: `search_fixers` in Postgres
 * already owns the category join, the rating floor, the three delivery flags,
 * the free-text match and the result ordering. Re-implementing any of that here
 * would drift out of sync with the schema the moment either side changed.
 *
 * What the RPC cannot do is the reason this file exists. `accepts_bookings`,
 * the catalogue's cheapest price, "have I saved this shop" and the sort orders a
 * customer picking a shop actually wants are all booking-layer facts the search
 * function knows nothing about. So: Postgres narrows the field to at most
 * `SEARCH_RESULT_LIMIT` rows, and the refinement happens here, over a list small
 * enough that a pass in memory is free.
 *
 * The failure mode is chosen as carefully as the happy path. Every marketplace
 * table this file touches may not exist yet — the migration is a separate,
 * manual step — so the profile read (which predates the migration) is kept apart
 * from the enrichment reads (which do not). A missing `shop_services` costs the
 * page its "from ₹x" line; it must never cost the page its shops.
 */

/* ── Filter shape ─────────────────────────────────────────────────────────── */

export type DiscoverSort = "recommended" | "rating" | "price" | "response";

export const DISCOVER_SORT_LABELS: Record<DiscoverSort, string> = {
  recommended: "Recommended",
  rating: "Highest rated",
  price: "Lowest price",
  response: "Fastest reply",
};

const DISCOVER_SORTS = Object.keys(DISCOVER_SORT_LABELS) as DiscoverSort[];

export interface DiscoverFilters {
  /** Free-text shop-name / address query. */
  q?: string;
  /**
   * `repair_categories.id`, not its slug.
   *
   * The id is what a `<select>` built from `getCategories()` already has to
   * hand, and this URL is `robots: noindex` — the slug's only advantage is a
   * readable, shareable address, which a private dashboard route does not need.
   */
  categoryId?: string;
  /** Rating floor, one of `RATING_STEPS`. Absent means no minimum. */
  minRating?: number;
  /** Warranty floor in days, one of `WARRANTY_STEPS`. Absent means no minimum. */
  minWarrantyDays?: number;
  /** Ceiling on the cheapest active service a shop lists, in pence. */
  maxPricePence?: number;
  deliveryMode?: DeliveryMode;
  /** Only shops currently taking bookings. */
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  sort?: DiscoverSort;
  bbox?: BoundingBox | null;
}

export const DISCOVER_PARAM_KEYS = {
  q: "q",
  category: "category",
  rating: "rating",
  warranty: "warranty",
  maxPrice: "max_price",
  delivery: "delivery",
  available: "available",
  verified: "verified",
  sort: "sort",
  bbox: "bbox",
} as const;

/** ₹10,000. Above this the filter is meaningless — no repair is listed there. */
const MAX_PRICE_PENCE = 1_000_000;

/** How many shops the directory shows before the "refine your filters" nudge. */
export const DISCOVER_RESULT_LIMIT = 24;

const DELIVERY_MODES: readonly DeliveryMode[] = ["in_shop", "home_visit", "pickup_drop"];

/**
 * `q` and `rating` are shared with `/search` under the same key names, so those
 * two are parsed by `parseSearchParams` and inherit its clamping. Its `category`
 * is deliberately ignored — there it is a slug, here an id.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * `search.ts` keeps these private on purpose (see its header: a client component
 * must not be able to import from a `server-only` module), so they are restated
 * rather than exported from there.
 */
function firstValue(input: string | string[] | undefined): string | undefined {
  return Array.isArray(input) ? input[0] : input;
}

function readFlag(input: string | string[] | undefined): boolean {
  const value = firstValue(input)?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Snap a rating floor DOWN to the nearest offered step.
 *
 * Down rather than up: a hand-edited `?rating=4.2` should loosen to the "4+"
 * button the customer can see selected, not silently tighten to 4.5 and hide
 * shops they never chose to exclude.
 */
function snapRating(value: number): number | undefined {
  const step = [...RATING_STEPS].reverse().find((candidate) => value >= candidate);
  return step && step > 0 ? step : undefined;
}

/** Same downward snap as `snapRating`, for the same reason. */
function snapWarranty(value: number): number | undefined {
  const step = [...WARRANTY_STEPS].reverse().find((candidate) => value >= candidate);
  return step && step > 0 ? step : undefined;
}

function parsePrice(input: string | string[] | undefined): number | undefined {
  const raw = firstValue(input);
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, MAX_PRICE_PENCE);
}

export function parseDiscoverParams(sp: RawSearchParams): DiscoverFilters {
  const shared = parseSearchParams(sp);
  const categoryId = firstValue(sp[DISCOVER_PARAM_KEYS.category])?.trim();
  const delivery = firstValue(sp[DISCOVER_PARAM_KEYS.delivery])?.trim();
  const sort = firstValue(sp[DISCOVER_PARAM_KEYS.sort])?.trim();

  return {
    q: shared.q || undefined,
    // Anything that is not a uuid cannot match a category row, so it is dropped
    // rather than sent to Postgres, which raises 22P02 on a malformed uuid.
    categoryId: categoryId && UUID_RE.test(categoryId) ? categoryId : undefined,
    minRating: snapRating(shared.minRating),
    minWarrantyDays: snapWarranty(shared.minWarrantyDays),
    maxPricePence: parsePrice(sp[DISCOVER_PARAM_KEYS.maxPrice]),
    deliveryMode: DELIVERY_MODES.find((mode) => mode === delivery),
    availableOnly: readFlag(sp[DISCOVER_PARAM_KEYS.available]) || undefined,
    verifiedOnly: readFlag(sp[DISCOVER_PARAM_KEYS.verified]) || undefined,
    sort: DISCOVER_SORTS.find((candidate) => candidate === sort),
    bbox: shared.bbox,
  };
}

/**
 * Inverse of `parseDiscoverParams`. Only non-default values are emitted, always
 * in the same order, so one filter state has exactly one URL and the "clear
 * filters" link can just compare against the bare path.
 */
export function toDiscoverParams(filters: DiscoverFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q) params.set(DISCOVER_PARAM_KEYS.q, filters.q);
  if (filters.categoryId) params.set(DISCOVER_PARAM_KEYS.category, filters.categoryId);
  if (filters.minRating) params.set(DISCOVER_PARAM_KEYS.rating, String(filters.minRating));
  if (filters.minWarrantyDays) {
    params.set(DISCOVER_PARAM_KEYS.warranty, String(filters.minWarrantyDays));
  }
  if (filters.maxPricePence) {
    params.set(DISCOVER_PARAM_KEYS.maxPrice, String(filters.maxPricePence));
  }
  if (filters.deliveryMode) params.set(DISCOVER_PARAM_KEYS.delivery, filters.deliveryMode);
  if (filters.availableOnly) params.set(DISCOVER_PARAM_KEYS.available, "1");
  if (filters.verifiedOnly) params.set(DISCOVER_PARAM_KEYS.verified, "1");
  if (filters.sort && filters.sort !== "recommended") {
    params.set(DISCOVER_PARAM_KEYS.sort, filters.sort);
  }
  if (filters.bbox) {
    const { minLat, maxLat, minLng, maxLng } = filters.bbox;
    // Format degrees with fixed precision and remove trailing zeros
    const formatDegrees = (value: number) => value.toFixed(5).replace(/\.?0+$/, "");
    params.set(
      DISCOVER_PARAM_KEYS.bbox,
      [minLng, minLat, maxLng, maxLat].map(formatDegrees).join(","),
    );
  }

  return params;
}

/** `/dashboard/discover`, or `…?…` when anything is set. */
export function toDiscoverPath(
  filters: DiscoverFilters,
  pathname = "/dashboard/discover",
): string {
  const query = toDiscoverParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function countActiveDiscoverFilters(filters: DiscoverFilters): number {
  return [
    Boolean(filters.q),
    Boolean(filters.categoryId),
    Boolean(filters.minRating),
    Boolean(filters.minWarrantyDays),
    Boolean(filters.maxPricePence),
    Boolean(filters.deliveryMode),
    Boolean(filters.availableOnly),
    Boolean(filters.verifiedOnly),
    Boolean(filters.bbox),
  ].filter(Boolean).length;
}

/* ── The directory list ───────────────────────────────────────────────────── */

export interface DiscoverExpert {
  id: string;
  slug: string;
  shopName: string;
  address: string;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  acceptsBookings: boolean;
  /** Advertised reply time, in hours. */
  responseHours: number;
  /** Cheapest active service, in pence. Null when nothing is priced. */
  priceFromPence: number | null;
  categories: string[];
  isSaved: boolean;
}

/**
 * `search_fixers` returns `setof fixer_profiles`, so post-migration every one of
 * these columns is on the row. `database.ts` is regenerated from `schema.sql`
 * and does not know about them, hence `Partial` — and before the migration runs
 * they genuinely are absent, which is why every read below carries the same
 * default the migration itself declares.
 */
type BookableProfile = SearchResult & Partial<FixerBookingSettings>;

const DEFAULT_RESPONSE_HOURS = 24;

/**
 * Translate the booking-layer filters into the ones `search_fixers` understands.
 * Everything it cannot express is left for the in-memory pass below.
 */
function toSearchFilters(filters: DiscoverFilters, categorySlug: string | null): SearchFilters {
  return {
    category: categorySlug,
    minRating: filters.minRating ?? 0,
    minWarrantyDays: filters.minWarrantyDays ?? 0,
    services: {
      inShop: filters.deliveryMode === "in_shop",
      homeService: filters.deliveryMode === "home_visit",
      pickupDrop: filters.deliveryMode === "pickup_drop",
    },
    bbox: filters.bbox ?? null,
    q: filters.q ?? "",
  };
}

export async function listDiscoverExperts(
  filters: DiscoverFilters = {},
  limit = DISCOVER_RESULT_LIMIT,
): Promise<DiscoverExpert[]> {
  // The RPC filters by slug; the URL carries an id. `getCategories` is a
  // ten-row read the filter panel makes anyway, and resolving here means the
  // category predicate runs in Postgres *before* the row cap rather than after.
  const categories = filters.categoryId ? await getCategories() : [];
  const categorySlug =
    categories.find((category) => category.id === filters.categoryId)?.slug ?? null;

  const outcome = await searchFixers(toSearchFilters(filters, categorySlug));
  if (outcome.failed) return [];

  const rows: BookableProfile[] = outcome.results;

  // Belt and braces on the category. When `getCategories` fails the slug is
  // null and the RPC ran unfiltered, so this predicate is the one that holds —
  // at the cost of a possibly thin page, which beats an ignored filter.
  const scoped =
    filters.categoryId && !categorySlug
      ? rows.filter((row) => row.categories.some((c) => c.id === filters.categoryId))
      : rows;

  const matching = scoped.filter((row) => {
    if (filters.verifiedOnly && !row.verified) return false;
    // Absent means pre-migration, where the column's default is `true`. A shop
    // must not vanish from the directory because a migration has not been run.
    if (filters.availableOnly && row.accepts_bookings === false) return false;
    return true;
  });

  const [prices, saved] = await Promise.all([
    fetchPriceFloors(matching.map((row) => row.id)),
    listSavedExpertIds(),
  ]);

  const experts: DiscoverExpert[] = matching.map((row) => ({
    id: row.id,
    slug: row.slug,
    shopName: row.shop_name,
    address: row.address,
    verified: row.verified,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    acceptsBookings: row.accepts_bookings ?? true,
    responseHours: row.response_hours ?? DEFAULT_RESPONSE_HOURS,
    priceFromPence: prices.get(row.id) ?? null,
    categories: row.categories.map((category) => category.name),
    isSaved: saved.has(row.id),
  }));

  // Applied after the price lookup, because a shop with no priced services has
  // no price to compare — and dropping it here rather than above keeps
  // "unpriced" out of the "too expensive" bucket only when the filter is on.
  const priced =
    filters.maxPricePence === undefined
      ? experts
      : experts.filter(
          (expert) =>
            expert.priceFromPence !== null &&
            expert.priceFromPence <= (filters.maxPricePence ?? 0),
        );

  return sortExperts(priced, filters.sort ?? "recommended").slice(0, limit);
}

/**
 * `recommended` returns the list untouched: that ordering is verified-first,
 * then rating, then review volume, decided inside `search_fixers` so that "best
 * first" means one thing across the whole site.
 */
function sortExperts(experts: DiscoverExpert[], sort: DiscoverSort): DiscoverExpert[] {
  if (sort === "recommended") return experts;

  const sorted = [...experts];

  if (sort === "rating") {
    sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  } else if (sort === "price") {
    // Unpriced shops sink rather than disappear — "quote on inspection" is a
    // legitimate way to sell a repair, not a missing value.
    sorted.sort(
      (a, b) => (a.priceFromPence ?? Infinity) - (b.priceFromPence ?? Infinity),
    );
  } else {
    sorted.sort((a, b) => a.responseHours - b.responseHours);
  }

  return sorted;
}

/**
 * Cheapest active service per shop, in pence.
 *
 * A flat `in (...)` read rather than an embed on the profile query: the profile
 * query has to keep working before the migration, and one missing relation in a
 * PostgREST embed fails the whole select.
 *
 * The unpriced rows are dropped in the fold below rather than with a
 * `.not("price_min", "is", null)` predicate. `shop_services` is not in the
 * generated `database.ts` — that file is regenerated from `schema.sql`, which
 * predates this migration — and on an untyped relation `.not()` collapses the
 * `.returns<T>()` override to `never`, which is a compile error rather than a
 * runtime one. The fold has to test for null regardless, so the predicate was
 * only ever saving a handful of rows across at most `SEARCH_RESULT_LIMIT` shops.
 */
async function fetchPriceFloors(fixerIds: string[]): Promise<Map<string, number>> {
  const floors = new Map<string, number>();
  if (fixerIds.length === 0) return floors;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_services")
    .select("fixer_id, price_min")
    .in("fixer_id", fixerIds)
    .eq("is_active", true)
    .returns<Array<{ fixer_id: string; price_min: number | null }>>();

  if (error) {
    logReadFailure("[discover] price floors failed", error);
    return floors;
  }

  for (const row of data ?? []) {
    if (row.price_min === null) continue;
    const current = floors.get(row.fixer_id);
    if (current === undefined || row.price_min < current) {
      floors.set(row.fixer_id, row.price_min);
    }
  }

  return floors;
}

/**
 * The shops this user has hearted, as a Set for the toggle to test against.
 *
 * `userId` is optional because RLS on `saved_experts` is already
 * `user_id = auth.uid()` — passing it makes the query explicit and uses the
 * `(user_id, created_at)` index rather than scanning behind the policy, but the
 * list call above has no user to hand and does not need one.
 */
export async function listSavedExpertIds(userId?: string): Promise<Set<string>> {
  const supabase = await createClient();

  let query = supabase.from("saved_experts").select("fixer_id");
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.returns<Array<{ fixer_id: string }>>();

  if (error) {
    logReadFailure("[discover] saved expert ids failed", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.fixer_id));
}

/* ── One shop, everything the booking form needs ──────────────────────────── */

export interface BookingExpert {
  /**
   * The raw profile row, not a reshaped view of it, so `toHoursInput` and the
   * JSON-LD helpers take it unchanged.
   */
  profile: FixerProfileRow & Partial<FixerBookingSettings>;
  categories: RepairCategoryRow[];
  /** Active services only, in the order the shop sorted them. */
  services: ShopServiceRow[];
  /** Weekly bookable windows. Empty means "fall back to the profile's hours". */
  availability: ShopAvailabilityRow[];
  /**
   * Closures.
   *
   * Empty for everyone except the shop's own owner, and that is deliberate:
   * `shop_time_off.reason` is free text a shop writes for itself ("closed —
   * bereavement"), and RLS cannot hide one column of a readable row, so the
   * table has no public read policy at all. A customer-facing slot picker must
   * therefore get busy periods from the `shop_busy_periods(...)` definer
   * function, which returns merged ranges and no reason — treating an empty
   * array here as "never closed" would silently offer slots the shop cannot
   * work.
   */
  timeOff: ShopTimeOffRow[];
}

interface ProfileWithCategories extends FixerProfileRow, Partial<FixerBookingSettings> {
  category_links: Array<{ repair_categories: RepairCategoryRow | null }> | null;
}

/**
 * Everything `/dashboard/discover/[slug]/book` renders, in one call.
 *
 * Four reads rather than one embed, on purpose. `fixer_profiles`,
 * `fixer_categories` and `repair_categories` all predate the migration, so that
 * first select always resolves; the three marketplace tables are fetched
 * alongside it and each degrades to `[]` on its own. Embedding them would mean a
 * shop page that 404s on a database where the migration has not been run —
 * which is exactly the failure this whole layer is shaped to avoid.
 */
export async function getExpertForBooking(slug: string): Promise<BookingExpert | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("*, category_links:fixer_categories(repair_categories(*))")
    .eq("slug", slug)
    // Explicit, even though RLS already hides other people's pending shops. The
    // policy lets an *owner* read their own, which is right for previewing the
    // public page but wrong here: this is the booking form, and a shop that is
    // not in the directory yet should not be bookable by anyone, its owner
    // included.
    .eq("is_hidden", false)
    .maybeSingle<ProfileWithCategories>();

  if (error) {
    logReadFailure(`[discover] booking profile lookup failed (${slug})`, error);
    return null;
  }
  if (!data) return null;

  const { category_links: links, ...profile } = data;

  const [services, availability, timeOff] = await Promise.all([
    listActiveServices(profile.id),
    listAvailability(profile.id),
    listTimeOff(profile.id),
  ]);

  return {
    profile,
    categories: (links ?? [])
      .map((link) => link.repair_categories)
      .filter((category): category is RepairCategoryRow => category !== null)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    services,
    availability,
    timeOff,
  };
}

async function listActiveServices(fixerId: string): Promise<ShopServiceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_services")
    .select(
      `id, fixer_id, category_id, name, description, price_type, price_min, price_max,
       currency, duration_minutes, delivery_modes, warranty_days, is_active, sort_order,
       created_at, updated_at`,
    )
    .eq("fixer_id", fixerId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<ShopServiceRow[]>();

  if (error) {
    logReadFailure("[discover] services lookup failed", error);
    return [];
  }

  return data ?? [];
}

async function listAvailability(fixerId: string): Promise<ShopAvailabilityRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_availability")
    .select("id, fixer_id, weekday, starts_at, ends_at, buffer_minutes, capacity, created_at")
    .eq("fixer_id", fixerId)
    .order("starts_at", { ascending: true })
    .returns<ShopAvailabilityRow[]>();

  if (error) {
    logReadFailure("[discover] availability lookup failed", error);
    return [];
  }

  return data ?? [];
}

async function listTimeOff(fixerId: string): Promise<ShopTimeOffRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_time_off")
    .select("id, fixer_id, period, reason, created_at")
    .eq("fixer_id", fixerId)
    .returns<ShopTimeOffRow[]>();

  if (error) {
    logReadFailure("[discover] time off lookup failed", error);
    return [];
  }

  return data ?? [];
}
