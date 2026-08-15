"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Input, Select } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import type { DiscoverFilters } from "@/lib/dashboard/discover";
import type { RepairCategoryRow } from "@/lib/types/database";
import { DELIVERY_MODE_LABELS, type DeliveryMode } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * The filter rail. It writes to the URL and owns no filter state.
 *
 * Every control is driven by the filters the server already parsed out of the
 * query string, and every change pushes a new URL. That is what makes a filtered
 * view shareable, makes the back button undo one filter at a time, and keeps the
 * grid a Server Component — the same arrangement as `search/filter-panel.tsx`,
 * which is this pattern for the public directory.
 *
 * It is a real `<form method="get" action="/dashboard/discover">` whose fields
 * carry the parameter names, so with scripting off it still submits natively to
 * exactly the address the JS path would have pushed.
 *
 * `DISCOVER_PARAM_KEYS` is restated here rather than imported: `discover.ts` is
 * `server-only`, and importing it into a client component fails the build. Same
 * arrangement, and the same reason, as the public filter panel.
 */

const PATH = "/dashboard/discover";

const KEYS = {
  q: "q",
  category: "category",
  rating: "rating",
  maxPrice: "max_price",
  delivery: "delivery",
  available: "available",
  verified: "verified",
  sort: "sort",
  bbox: "bbox",
} as const;

/** Mirrors `RATING_STEPS` in `@/lib/queries/search`; "" is "no minimum". */
const RATING_CHOICES = [
  { value: "", label: "Any" },
  { value: "3", label: "3.0+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
] as const;

/**
 * Price ceilings in **pence**, because that is the unit the parameter carries
 * and the schema stores. Bands rather than a free number field keep rupees out
 * of the URL entirely, so there is nowhere for a decimal to creep in.
 */
const PRICE_CHOICES = [2_500, 5_000, 10_000, 25_000, 50_000] as const;

const DELIVERY_CHOICES = Object.entries(DELIVERY_MODE_LABELS) as [DeliveryMode, string][];

/** The rail's controls, as strings — one field per URL parameter. */
interface RailState {
  q: string;
  category: string;
  rating: string;
  maxPrice: string;
  delivery: string;
  available: boolean;
  verified: boolean;
  sort: string;
  bbox: string;
}

function toRailState(filters: DiscoverFilters): RailState {
  return {
    q: filters.q ?? "",
    category: filters.categoryId ?? "",
    rating: filters.minRating ? String(filters.minRating) : "",
    maxPrice: filters.maxPricePence ? String(filters.maxPricePence) : "",
    delivery: filters.deliveryMode ?? "",
    available: Boolean(filters.availableOnly),
    verified: Boolean(filters.verifiedOnly),
    sort: filters.sort ?? "recommended",
    bbox: filters.bbox 
      ? `${filters.bbox.minLng},${filters.bbox.minLat},${filters.bbox.maxLng},${filters.bbox.maxLat}`
      : "",
  };
}

/** Same key order as `toDiscoverParams`, so one filter state has one URL. */
function toPath(state: RailState): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set(KEYS.q, state.q.trim());
  if (state.category) params.set(KEYS.category, state.category);
  if (state.rating) params.set(KEYS.rating, state.rating);
  if (state.maxPrice) params.set(KEYS.maxPrice, state.maxPrice);
  if (state.delivery) params.set(KEYS.delivery, state.delivery);
  if (state.available) params.set(KEYS.available, "1");
  if (state.verified) params.set(KEYS.verified, "1");
  if (state.sort && state.sort !== "recommended") params.set(KEYS.sort, state.sort);
  if (state.bbox) params.set(KEYS.bbox, state.bbox);

  const query = params.toString();
  return query ? `${PATH}?${query}` : PATH;
}

function sameState(a: RailState, b: RailState): boolean {
  return (
    a.q === b.q &&
    a.category === b.category &&
    a.rating === b.rating &&
    a.maxPrice === b.maxPrice &&
    a.delivery === b.delivery &&
    a.available === b.available &&
    a.verified === b.verified &&
    a.sort === b.sort &&
    a.bbox === b.bbox
  );
}

export interface DiscoverFilterRailProps {
  categories: RepairCategoryRow[];
  filters: DiscoverFilters;
  /** Sort choices, passed in so the labels stay owned by `discover.ts`. */
  sortOptions: readonly { value: string; label: string }[];
  activeCount: number;
}

export function DiscoverFilterRail({
  categories,
  filters,
  sortOptions,
  activeCount,
}: DiscoverFilterRailProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const urlState = toRailState(filters);

  // The controls render from a draft, not straight from the URL, for one
  // reason: a transition re-renders this component *before* the new page
  // arrives, and a purely URL-driven `<select>` would snap back to its old
  // value for that beat. The draft holds the choice the customer just made.
  //
  // Reconciling it with an incoming URL happens during render, against the
  // previously-seen value — never in an effect. An effect would paint the stale
  // value first, which is precisely what `react-hooks/set-state-in-effect`
  // exists to prevent. This mirrors `search/filter-panel.tsx`.
  const [draft, setDraft] = React.useState(urlState);
  const [synced, setSynced] = React.useState(urlState);
  if (!sameState(synced, urlState)) {
    setSynced(urlState);
    setDraft(urlState);
  }

  const commit = (next: RailState) => {
    setDraft(next);
    startTransition(() => {
      // `scroll: false` keeps the reader's place when they toggle something
      // with a long grid already scrolled past.
      router.push(toPath(next), { scroll: false });
    });
  };

  // Rendered twice — once in the mobile disclosure, once in the desktop rail —
  // so the field ids are namespaced. Two elements sharing an id would leave
  // every `<label for>` on the page pointing at whichever came first.
  const renderForm = (idPrefix: string) => (
    <form
      method="get"
      action={PATH}
      onSubmit={(event) => {
        event.preventDefault();
        commit(draft);
      }}
      aria-busy={isPending}
      className={cn("space-y-6 transition-opacity", isPending && "opacity-60")}
    >
      <div role="search">
        <label htmlFor={`${idPrefix}-q`} className="eyebrow mb-2 block">
          Shop or street
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
          />
          {/* The only control that waits for a submit. Pushing per keystroke
              would put one history entry per letter typed. */}
          <Input
            id={`${idPrefix}-q`}
            name={KEYS.q}
            type="search"
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            placeholder="Screen repair, Elm St…"
            maxLength={80}
            className="pl-9"
          />
        </div>
      </div>

      <div role="search">
        <label htmlFor={`${idPrefix}-location`} className="eyebrow mb-2 block">
          Location
        </label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-location`}
            name="location-search"
            type="search"
            placeholder="City, Zip or Area..."
            maxLength={80}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (!val) {
                  commit({ ...draft, bbox: "" });
                  return;
                }
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`);
                  const data = await res.json();
                  if (data && data.length > 0) {
                    const [south, north, west, east] = data[0].boundingbox;
                    commit({ ...draft, bbox: `${west},${south},${east},${north}` });
                  }
                } catch (err) {
                  console.error("Geocoding failed", err);
                }
              }
            }}
          />
        </div>
        <p className="pt-1.5 text-xs leading-snug text-steel-soft">
          Press Enter to search
        </p>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-category`} className="eyebrow mb-2 block">
          Category
        </label>
        <Select
          id={`${idPrefix}-category`}
          name={KEYS.category}
          value={draft.category}
          onChange={(event) => commit({ ...draft, category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-price`} className="eyebrow mb-2 block">
          Price up to
        </label>
        <Select
          id={`${idPrefix}-price`}
          name={KEYS.maxPrice}
          value={draft.maxPrice}
          onChange={(event) => commit({ ...draft, maxPrice: event.target.value })}
        >
          <option value="">Any price</option>
          {PRICE_CHOICES.map((pence) => (
            <option key={pence} value={pence}>
              {formatMoney(pence)}
            </option>
          ))}
        </Select>
        <p className="pt-1.5 text-xs leading-snug text-steel-soft">
          Compared against the cheapest service each shop lists.
        </p>
      </div>

      <fieldset>
        <legend className="eyebrow mb-2">Minimum rating</legend>
        <div className="flex rounded-machined border border-hairline bg-chalk p-0.5">
          {RATING_CHOICES.map((choice) => (
            <label key={choice.label} className="flex-1">
              <input
                type="radio"
                name={KEYS.rating}
                value={choice.value}
                checked={draft.rating === choice.value}
                onChange={() => commit({ ...draft, rating: choice.value })}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block cursor-pointer rounded-[2px] py-1.5 text-center font-mono text-eyebrow uppercase tracking-[0.12em] transition-colors",
                  "text-steel hover:bg-bench-sunk hover:text-enamel",
                  "peer-checked:bg-enamel peer-checked:text-bench",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal",
                )}
              >
                {choice.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-delivery`} className="eyebrow mb-2 block">
          How it gets fixed
        </label>
        <Select
          id={`${idPrefix}-delivery`}
          name={KEYS.delivery}
          value={draft.delivery}
          onChange={(event) => commit({ ...draft, delivery: event.target.value })}
        >
          <option value="">Any arrangement</option>
          {DELIVERY_CHOICES.map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="eyebrow mb-2">Only show</legend>

        <ToggleRow
          id={`${idPrefix}-verified`}
          name={KEYS.verified}
          checked={draft.verified}
          onChange={(checked) => commit({ ...draft, verified: checked })}
          label="Verified shops"
        />
        <ToggleRow
          id={`${idPrefix}-available`}
          name={KEYS.available}
          checked={draft.available}
          onChange={(checked) => commit({ ...draft, available: checked })}
          label="Taking bookings now"
        />
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-sort`} className="eyebrow mb-2 block">
          Sort by
        </label>
        <Select
          id={`${idPrefix}-sort`}
          name={KEYS.sort}
          value={draft.sort}
          onChange={(event) => commit({ ...draft, sort: event.target.value })}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Submit exists for the no-JS path and for Enter in the search box; on
          screen the controls apply themselves, so it stays off-canvas. */}
      <button type="submit" className="sr-only">
        Apply filters
      </button>

      {activeCount > 0 ? (
        <Link
          href={PATH}
          className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-rust"
        >
          <X aria-hidden className="size-3" />
          Clear all filters
        </Link>
      ) : null}
    </form>
  );

  return (
    <>
      {/* Mobile: collapsed, so the shops are the first thing on screen. The
          count sits on the summary because a closed panel that is silently
          filtering is how a customer concludes the directory is empty. */}
      <details className="rounded-machined border border-hairline bg-chalk lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display uppercase tracking-[0.08em] text-enamel">
          Filters
          {activeCount > 0 ? (
            <span className="rounded-machined bg-signal px-1.5 py-0.5 font-mono text-eyebrow text-chalk">
              {activeCount}
            </span>
          ) : null}
        </summary>
        <div className="border-t border-hairline p-4">{renderForm("discover-m")}</div>
      </details>

      <div className="hidden lg:block">{renderForm("discover-d")}</div>
    </>
  );
}

/**
 * A native checkbox, not the Radix `Checkbox`: that one renders a
 * `<button role="checkbox">`, which never appears in a native form post — and
 * the no-JS submit is the whole reason this rail is a form.
 */
function ToggleRow({
  id,
  name,
  checked,
  onChange,
  label,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        value="1"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded-[2px] border-hairline accent-signal"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-enamel">
        {label}
      </label>
    </div>
  );
}
