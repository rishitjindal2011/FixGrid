import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HoursInput } from "@/lib/hours";
import type { FixerProfileRow, RepairCategoryRow } from "@/lib/types/database";
import type { AppDatabase } from "@/lib/types/supabase";

/**
 * Search / directory query layer.
 *
 * Two rules shape this file:
 *
 *   1. The URL is hostile input. `/search` is crawled, shared, and hand-edited,
 *      so every parameter is parsed defensively and clamped into a legal range
 *      before it reaches the database. A bad `rating=NaN` or `bbox=<script>`
 *      degrades to the default, it never throws and never reaches Postgres.
 *
 *   2. Filtering happens in Postgres, via the `search_fixers(...)` function in
 *      supabase/schema.sql. That function already knows about the bounding box,
 *      the category join, the rating floor, the warranty floor, the three
 *      service flags, and the result ordering (verified first, then rating, then
 *      review volume). Re-implementing any of that in TypeScript would mean
 *      pulling whole tables over the wire and drifting out of sync with the
 *      schema.
 *
 * `import "server-only"` is deliberate: this module reaches for `next/headers`
 * through the Supabase server client. If a client component ever imports it,
 * the build fails immediately with a clear message instead of leaking a service
 * boundary. That is also why `filter-panel.tsx` writes URL parameters with its
 * own local key constants rather than importing `SEARCH_PARAM_KEYS` from here.
 */

/* ── Filter shape ─────────────────────────────────────────────────────────── */

export interface ServiceFilters {
  /** Customer brings the item to the shop. */
  inShop: boolean;
  /** Fixer travels to the customer. */
  homeService: boolean;
  /** Fixer collects and returns the item. */
  pickupDrop: boolean;
}

/** Map viewport, in degrees. Mirrors the four arguments `search_fixers` takes. */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SearchFilters {
  /** `repair_categories.slug`, or null for "every category". */
  category: string | null;
  /** Rating floor, 0–5. 0 means "no minimum". */
  minRating: number;
  /**
   * Warranty floor in days. 0 means "no minimum".
   *
   * A required field rather than an optional one on purpose: every construction
   * site for `SearchFilters` — including `discover.ts` — then has to say what it
   * wants, instead of silently inheriting a floor it never considered.
   */
  minWarrantyDays: number;
  services: ServiceFilters;
  /** null means "the whole world" — the RPC defaults cover the globe. */
  bbox: BoundingBox | null;
  /** Free-text shop-name / address query. "" when absent. */
  q: string;
}

/**
 * URL parameter names.
 *
 * Kept in one place so `toSearchParams` and `parseSearchParams` cannot drift.
 * `filter-panel.tsx` duplicates these literals — see the note at the top of
 * this file for why that duplication is intentional.
 */
export const SEARCH_PARAM_KEYS = {
  category: "category",
  rating: "rating",
  warranty: "warranty",
  inShop: "in_shop",
  homeService: "home_service",
  pickupDrop: "pickup",
  bbox: "bbox",
  q: "q",
} as const;

export const DEFAULT_FILTERS: SearchFilters = {
  category: null,
  minRating: 0,
  minWarrantyDays: 0,
  services: { inShop: false, homeService: false, pickupDrop: false },
  bbox: null,
  q: "",
};

/** The rating floors the segmented control offers. 0 = "Any". */
export const RATING_STEPS: readonly number[] = [0, 3, 4, 4.5];

/**
 * The warranty floors the segmented control offers, in days. 0 = "Any".
 *
 * 1 is a deliberate step, not a placeholder. `fixer_profiles.default_warranty_days`
 * is `not null default 3`, so almost every shop has *some* cover and the question a
 * customer actually asks first is "does this shop stand behind the work at all" —
 * which is the 1-day floor. 30 and 90 are the floors that separate the shops making
 * a real promise.
 */
export const WARRANTY_STEPS: readonly number[] = [0, 1, 30, 90];

/** Nothing sensible is longer than a decade, and it bounds the parser. */
const MAX_WARRANTY_DAYS = 3650;

/**
 * How many results we show. Well under the RPC's own hard ceiling of 250.
 *
 * We ask Postgres for one more than we render, purely so we can tell "exactly
 * 60 matches" apart from "60 shown, more behind them" without a second
 * `count` round-trip.
 */
export const SEARCH_RESULT_LIMIT = 60;

const MAX_QUERY_LENGTH = 80;
const MAX_CATEGORY_SLUG_LENGTH = 64;
/** Matches the `slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'` shape used in the schema. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ── Parsing ──────────────────────────────────────────────────────────────── */

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Repeated parameters (`?rating=4&rating=1`) arrive as an array. Take the first
 * value and ignore the rest — the last-one-wins alternative lets a crafted URL
 * override a value a user just picked in the UI.
 */
function firstValue(input: string | string[] | undefined): string | undefined {
  if (Array.isArray(input)) return input[0];
  return input;
}

/** Accepts the shapes a checkbox realistically serialises to. */
function readFlag(input: string | string[] | undefined): boolean {
  const value = firstValue(input)?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseCategory(input: string | string[] | undefined): string | null {
  const raw = firstValue(input)?.trim().toLowerCase();
  if (!raw || raw.length > MAX_CATEGORY_SLUG_LENGTH) return null;
  // Anything that is not a legal slug cannot match a row, so treat it as absent
  // rather than running a guaranteed-empty query.
  return SLUG_PATTERN.test(raw) ? raw : null;
}

function parseMinRating(input: string | string[] | undefined): number {
  const raw = firstValue(input);
  if (raw === undefined) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  // Clamped to the rating domain and rounded to one decimal, which is the
  // precision `fixer_profiles.rating_avg` (numeric(2,1)) actually stores.
  // Rounding also keeps canonical URLs from multiplying: 4.0001 and 4.0002
  // would otherwise be two distinct addresses for the same result set.
  return Math.round(clamp(parsed, 0, 5) * 10) / 10;
}

/**
 * Warranty floor in whole days.
 *
 * Floored rather than snapped to `WARRANTY_STEPS`, so a hand-edited
 * `?warranty=14` does the obvious thing instead of being rounded to a value the
 * visitor did not ask for. The facet permutations that allows are harmless
 * because `isIndexable` in the search page keeps every non-zero floor out of the
 * index.
 */
function parseMinWarrantyDays(input: string | string[] | undefined): number {
  const raw = firstValue(input);
  if (raw === undefined) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.floor(clamp(parsed, 0, MAX_WARRANTY_DAYS));
}

/**
 * `bbox=west,south,east,north` — the OGC / GeoJSON ordering, so the value can
 * be pasted between mapping tools without reshuffling.
 *
 * Rejects the whole box if any component is unparseable or out of range: a
 * half-valid viewport is worse than none, because it would silently hide shops.
 */
function parseBbox(input: string | string[] | undefined): BoundingBox | null {
  const raw = firstValue(input)?.trim();
  if (!raw) return null;

  const parts = raw.split(",");
  if (parts.length !== 4) return null;

  const [westRaw, southRaw, eastRaw, northRaw] = parts;
  if (
    westRaw === undefined ||
    southRaw === undefined ||
    eastRaw === undefined ||
    northRaw === undefined
  ) {
    return null;
  }

  const west = Number.parseFloat(westRaw);
  const south = Number.parseFloat(southRaw);
  const east = Number.parseFloat(eastRaw);
  const north = Number.parseFloat(northRaw);

  if (![west, south, east, north].every((value) => Number.isFinite(value))) return null;
  if (Math.abs(south) > 90 || Math.abs(north) > 90) return null;
  if (Math.abs(west) > 180 || Math.abs(east) > 180) return null;

  // Tolerate a flipped box instead of returning nothing; users drag maps in
  // both directions and some tools emit north/south reversed.
  const minLat = Math.min(south, north);
  const maxLat = Math.max(south, north);
  const minLng = Math.min(west, east);
  const maxLng = Math.max(west, east);

  // A degenerate box (a point or a line) would match nothing useful.
  if (minLat === maxLat || minLng === maxLng) return null;

  return { minLat, maxLat, minLng, maxLng };
}

function parseQuery(input: string | string[] | undefined): string {
  const raw = firstValue(input);
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

/** Parse and clamp the raw `searchParams` object into a trustworthy filter set. */
export function parseSearchParams(sp: RawSearchParams): SearchFilters {
  return {
    category: parseCategory(sp[SEARCH_PARAM_KEYS.category]),
    minRating: parseMinRating(sp[SEARCH_PARAM_KEYS.rating]),
    minWarrantyDays: parseMinWarrantyDays(sp[SEARCH_PARAM_KEYS.warranty]),
    services: {
      inShop: readFlag(sp[SEARCH_PARAM_KEYS.inShop]),
      homeService: readFlag(sp[SEARCH_PARAM_KEYS.homeService]),
      pickupDrop: readFlag(sp[SEARCH_PARAM_KEYS.pickupDrop]),
    },
    bbox: parseBbox(sp[SEARCH_PARAM_KEYS.bbox]),
    q: parseQuery(sp[SEARCH_PARAM_KEYS.q]),
  };
}

/* ── Serialising ──────────────────────────────────────────────────────────── */

/** Trim float noise so two identical viewports produce one identical URL. */
function formatDegrees(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "");
}

/**
 * Inverse of `parseSearchParams`.
 *
 * Only non-default values are emitted, and always in the same order. Both
 * properties matter for SEO: it means one filter state has exactly one URL, so
 * the canonical tag on `/search` is stable and `?rating=0&category=` collapses
 * to the bare path.
 */
export function toSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category) params.set(SEARCH_PARAM_KEYS.category, filters.category);
  if (filters.minRating > 0) params.set(SEARCH_PARAM_KEYS.rating, String(filters.minRating));
  if (filters.minWarrantyDays > 0) {
    params.set(SEARCH_PARAM_KEYS.warranty, String(filters.minWarrantyDays));
  }
  if (filters.services.inShop) params.set(SEARCH_PARAM_KEYS.inShop, "1");
  if (filters.services.homeService) params.set(SEARCH_PARAM_KEYS.homeService, "1");
  if (filters.services.pickupDrop) params.set(SEARCH_PARAM_KEYS.pickupDrop, "1");
  if (filters.bbox) {
    const { minLat, maxLat, minLng, maxLng } = filters.bbox;
    params.set(
      SEARCH_PARAM_KEYS.bbox,
      [minLng, minLat, maxLng, maxLat].map(formatDegrees).join(","),
    );
  }
  if (filters.q) params.set(SEARCH_PARAM_KEYS.q, filters.q);

  return params;
}

/** `/search`, or `/search?…` when anything is set. */
export function toSearchPath(filters: SearchFilters, pathname = "/search"): string {
  const query = toSearchParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** True when the visitor has narrowed the directory in any way. */
export function isFilterActive(filters: SearchFilters): boolean {
  return toSearchParams(filters).toString().length > 0;
}

/** How many distinct filters are set — used for the mobile "Filters (2)" badge. */
export function countActiveFilters(filters: SearchFilters): number {
  return [
    filters.category !== null,
    filters.minRating > 0,
    filters.minWarrantyDays > 0,
    filters.services.inShop,
    filters.services.homeService,
    filters.services.pickupDrop,
    filters.bbox !== null,
    filters.q.length > 0,
  ].filter(Boolean).length;
}

/* ── Queries ──────────────────────────────────────────────────────────────── */

/** A search hit: the profile row plus the categories it is listed under. */
export interface SearchResult extends FixerProfileRow {
  categories: RepairCategoryRow[];
  /**
   * The shop's standard warranty, in days.
   *
   * Declared here rather than relied on from `FixerProfileRow`, because that type
   * comes from the generated `database.ts` — which predates migration 001 and so
   * has no `default_warranty_days`. `search_fixers` returns `setof fixer_profiles`,
   * so the column is present at runtime; this is the type catching up with it.
   *
   * Non-nullable, matching the column: `not null default 3`. Checked rather than
   * assumed — declaring it nullable would have collided with
   * `Partial<FixerBookingSettings>` in `discover.ts`, and widening that shared type
   * to accommodate a null the database cannot produce would have been the wrong fix.
   */
  default_warranty_days: number;
}

export interface SearchOutcome {
  results: SearchResult[];
  /** The cap that was applied, so the UI can say "showing the first 60". */
  limit: number;
  /** True when the result set was cut off by `limit`. */
  truncated: boolean;
  /**
   * True when the database call failed. The page renders an explanatory panel
   * rather than an empty state — "no shops here" and "we could not look" are
   * different messages and conflating them erodes trust.
   */
  failed: boolean;
}

/** Everything `@/lib/hours` needs, lifted off a profile row. */
export function toHoursInput(row: FixerProfileRow): HoursInput {
  return {
    working_days: row.working_days,
    opening_time: row.opening_time,
    closing_time: row.closing_time,
    hours: row.hours,
    timezone: row.timezone,
  };
}

/**
 * Read off `AppDatabase`, not the generated `Database`.
 *
 * `min_warranty_days` is added by migration 011 and declared in the composed
 * schema in `types/supabase.ts`; the generated half predates it. Using the
 * generated Args here would make a correct call a compile error.
 */
type SearchFixersArgs = AppDatabase["public"]["Functions"]["search_fixers"]["Args"];

function toRpcArgs(filters: SearchFilters): SearchFixersArgs {
  const args: SearchFixersArgs = {
    min_rating: filters.minRating,
    require_in_shop: filters.services.inShop,
    require_home_service: filters.services.homeService,
    require_pickup_drop: filters.services.pickupDrop,
    result_limit: SEARCH_RESULT_LIMIT + 1,
  };

  // Omitted arguments fall back to the function's own defaults (the whole
  // globe, every category, no text filter), which is exactly what
  // "unfiltered" means here.
  if (filters.category) args.category_slug = filters.category;
  if (filters.q) args.search_query = filters.q;
  // Sent only when set, so an unfiltered search produces byte-for-byte the same
  // request body it did before migration 011.
  if (filters.minWarrantyDays > 0) args.min_warranty_days = filters.minWarrantyDays;
  if (filters.bbox) {
    args.min_lat = filters.bbox.minLat;
    args.max_lat = filters.bbox.maxLat;
    args.min_lng = filters.bbox.minLng;
    args.max_lng = filters.bbox.maxLng;
  }

  return args;
}

/**
 * Run a directory search.
 *
 * Every predicate — bounding box, category, rating floor, warranty floor, service
 * flags, free text, ordering and the row cap — is resolved by `search_fixers` in
 * Postgres. Nothing is re-filtered here, so the "showing the first N" count is
 * honest and the page never pulls rows it will throw away.
 */
export async function searchFixers(filters: SearchFilters): Promise<SearchOutcome> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_fixers", toRpcArgs(filters));

  if (error) {
    console.error("[search] search_fixers failed", error);
    return { results: [], limit: SEARCH_RESULT_LIMIT, truncated: false, failed: true };
  }

  const rows = data ?? [];
  const truncated = rows.length > SEARCH_RESULT_LIMIT;
  const visible = truncated ? rows.slice(0, SEARCH_RESULT_LIMIT) : rows;

  const categoriesByFixer = await fetchCategoriesFor(visible.map((row) => row.id));

  return {
    results: visible.map((row) => ({
      ...row,
      categories: categoriesByFixer.get(row.id) ?? [],
    })),
    limit: SEARCH_RESULT_LIMIT,
    truncated,
    failed: false,
  };
}

/**
 * Attach categories to the visible rows.
 *
 * Two flat queries rather than one nested `select("…, repair_categories(*)")`:
 * `search_fixers` returns `setof fixer_profiles`, and PostgREST cannot traverse
 * a relationship out of a function result, so the embed would fail at runtime.
 * Joining in memory over at most `SEARCH_RESULT_LIMIT` rows is cheap.
 */
async function fetchCategoriesFor(
  fixerIds: string[],
): Promise<Map<string, RepairCategoryRow[]>> {
  const byFixer = new Map<string, RepairCategoryRow[]>();
  if (fixerIds.length === 0) return byFixer;

  const supabase = await createClient();

  const { data: links, error: linkError } = await supabase
    .from("fixer_categories")
    .select("fixer_id, category_id")
    .in("fixer_id", fixerIds);

  if (linkError || !links || links.length === 0) {
    if (linkError) console.error("[search] fixer_categories lookup failed", linkError);
    return byFixer;
  }

  const categoryIds = Array.from(new Set(links.map((link) => link.category_id)));

  const { data: categories, error: categoryError } = await supabase
    .from("repair_categories")
    .select("*")
    .in("id", categoryIds)
    .order("sort_order", { ascending: true });

  if (categoryError || !categories) {
    if (categoryError) console.error("[search] repair_categories lookup failed", categoryError);
    return byFixer;
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  for (const link of links) {
    const category = categoryById.get(link.category_id);
    if (!category) continue;
    const existing = byFixer.get(link.fixer_id);
    if (existing) existing.push(category);
    else byFixer.set(link.fixer_id, [category]);
  }

  return byFixer;
}

/**
 * A short list for the home page: verified shops first, then by rating.
 *
 * Reuses `search_fixers` with no filters rather than a second hand-written
 * query, so "best first" means the same thing everywhere on the site.
 */
export async function getFeaturedFixers(limit = 6): Promise<SearchResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_fixers", { result_limit: limit });

  if (error) {
    console.error("[search] getFeaturedFixers failed", error);
    return [];
  }

  const rows = data ?? [];
  const categoriesByFixer = await fetchCategoriesFor(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    categories: categoriesByFixer.get(row.id) ?? [],
  }));
}

/** Every category, in the order the CMS wants them listed. */
export async function getCategories(): Promise<RepairCategoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("repair_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    // A failed category list must not take the whole search page down; the
    // select simply renders with "All categories" only.
    console.error("[search] getCategories failed", error);
    return [];
  }

  return data ?? [];
}

export interface DirectoryStats {
  shopCount: number;
  categoryCount: number;
  verifiedCount: number;
}

/**
 * Live counts for the home-page trust bar.
 *
 * Deliberately kept simple — three COUNT queries that Postgres resolves in
 * milliseconds and that we cache with the page's 15-minute revalidation window.
 * No RPC, no joins; the numbers are honest and never fabricated.
 */
export async function getDirectoryStats(): Promise<DirectoryStats> {
  const supabase = await createClient();

  const [shopRes, catRes, verRes] = await Promise.all([
    supabase
      .from("fixer_profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("repair_categories")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("fixer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verified", true),
  ]);

  return {
    shopCount: shopRes.count ?? 0,
    categoryCount: catRes.count ?? 0,
    verifiedCount: verRes.count ?? 0,
  };
}

