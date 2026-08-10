/**
 * Search, filter and sort for a stock list.
 *
 * Pure, dependency-free, and shared by both surfaces that render inventory: the
 * owner's table in `/dashboard/expert/inventory` and the public panel on
 * `/expert/[slug]`. Written once because the two must agree — an owner who
 * searches "SCR-14P" and finds a part, then hears a customer say the same
 * search found nothing, has a bug report that is really a duplicated
 * implementation.
 *
 * Not `server-only` and not a client component: it is called during render on
 * both sides. No imports from `@/lib/supabase` for the same reason.
 *
 * The row shape is declared structurally rather than imported from
 * `marketplace.ts`, so a caller can pass a narrowed public projection (which
 * has no `low_stock_threshold`) without inventing the missing fields.
 */

export type InventorySort =
  | "manual"
  | "name"
  | "price_low"
  | "price_high"
  | "quantity_high"
  | "quantity_low"
  | "recent";

/** Availability, as a shopper thinks about it rather than as a column. */
export type StockFilter = "all" | "in_stock" | "low" | "out";

/** The columns filtering and sorting actually read. */
export interface FilterableItem {
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  category_id: string | null;
  condition: string;
  /** Pence, or null for "price on request". */
  unit_price: number | null;
  quantity: number;
  sort_order: number;
  created_at: string;
}

export interface InventoryFilters {
  /** Free text. Matched against name, item ID, brand and description. */
  search: string;
  /** A `repair_categories.id`, or "" for every category. */
  categoryId: string;
  /** An `inventory_condition` value, or "" for every condition. */
  condition: string;
  stock: StockFilter;
  sort: InventorySort;
}

export const EMPTY_FILTERS: InventoryFilters = {
  search: "",
  categoryId: "",
  condition: "",
  stock: "all",
  sort: "manual",
};

/**
 * Is this row running low?
 *
 * A threshold of 0 turns the warning off — that is what the column's default
 * means — and a row already at zero is *out* of stock, which is a different
 * state with different wording. Both exclusions are deliberate: without the
 * first, every item a shop never configured would be permanently flagged, and
 * the badge would stop meaning anything.
 */
export function isLowStock(item: { quantity: number; low_stock_threshold: number }): boolean {
  return (
    item.low_stock_threshold > 0 &&
    item.quantity > 0 &&
    item.quantity <= item.low_stock_threshold
  );
}

/** Case- and whitespace-insensitive substring match across the text columns. */
function matchesSearch(item: FilterableItem, needle: string): boolean {
  if (needle === "") return true;

  const haystack = [item.name, item.sku, item.brand, item.description]
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ")
    .toLowerCase();

  // Every word must appear, in any order and any field. "apple screen" finds
  // the Apple-brand screen; a single-string `includes` would not, because the
  // brand and the name are different columns.
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function matchesStock(item: FilterableItem, stock: StockFilter, low: boolean): boolean {
  switch (stock) {
    case "in_stock":
      return item.quantity > 0;
    case "low":
      return low;
    case "out":
      return item.quantity === 0;
    default:
      return true;
  }
}

/**
 * Price comparison with nulls pinned to the bottom in *both* directions.
 *
 * An item priced on request is not the cheapest thing in the shop and it is not
 * the most expensive either — it has no price. Sorting it as 0 would put every
 * unpriced part at the top of "price: low to high", which is the first thing a
 * shopper clicks and the worst possible answer to it.
 */
function comparePrice(a: FilterableItem, b: FilterableItem, direction: 1 | -1): number {
  if (a.unit_price === null && b.unit_price === null) return 0;
  if (a.unit_price === null) return 1;
  if (b.unit_price === null) return -1;
  return (a.unit_price - b.unit_price) * direction;
}

function compare(a: FilterableItem, b: FilterableItem, sort: InventorySort): number {
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name);
    case "price_low":
      return comparePrice(a, b, 1);
    case "price_high":
      return comparePrice(a, b, -1);
    case "quantity_high":
      return b.quantity - a.quantity;
    case "quantity_low":
      return a.quantity - b.quantity;
    case "recent":
      // Lexicographic on an ISO-8601 timestamp is chronological, so no Date
      // objects are allocated per comparison.
      return b.created_at.localeCompare(a.created_at);
    default:
      return a.sort_order - b.sort_order;
  }
}

/**
 * Apply the whole set. Returns a new array — the input is never mutated,
 * because on the dashboard it is the props array and React compares by identity.
 *
 * Every sort falls back to name, so two items on the same price or the same
 * count come out in a stable order rather than whichever order Postgres
 * happened to return. `Array.prototype.sort` is stable in every engine this
 * ships to, but a stable sort over an arbitrary input order is still arbitrary.
 */
export function filterInventory<T extends FilterableItem>(
  items: readonly T[],
  filters: InventoryFilters,
  lowStock: (item: T) => boolean,
): T[] {
  const search = filters.search.trim();

  const kept = items.filter((item) => {
    if (!matchesSearch(item, search)) return false;
    if (filters.categoryId !== "" && item.category_id !== filters.categoryId) return false;
    if (filters.condition !== "" && item.condition !== filters.condition) return false;
    if (!matchesStock(item, filters.stock, lowStock(item))) return false;
    return true;
  });

  return kept.sort(
    (a, b) => compare(a, b, filters.sort) || a.name.localeCompare(b.name),
  );
}

/** Whether anything is narrowing the list — drives the "clear" control. */
export function hasActiveFilters(filters: InventoryFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.categoryId !== "" ||
    filters.condition !== "" ||
    filters.stock !== "all"
  );
}
