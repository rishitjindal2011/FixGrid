"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RepairCategoryRow } from "@/lib/types/database";

/**
 * The filter panel writes to the URL and nothing else.
 *
 * Every control is a controlled input over `useSearchParams()`, so the browser
 * back button, a shared link and a hard refresh all reproduce the same view.
 * The results list stays a Server Component — it simply re-renders when the
 * query string changes.
 *
 * The parameter names are duplicated from `@/lib/queries/search` on purpose:
 * that module is `server-only`, and importing it here would break the build.
 * The pair is covered by the round-trip described in that file's header.
 */

const KEYS = {
  category: "category",
  rating: "rating",
  inShop: "in_shop",
  homeService: "home_service",
  pickupDrop: "pickup",
  bbox: "bbox",
  q: "q",
} as const;

const RATING_CHOICES = [
  { value: 0, label: "Any" },
  { value: 3, label: "3.0+" },
  { value: 4, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
] as const;

const SERVICE_CHOICES = [
  { key: KEYS.inShop, label: "In-shop" },
  { key: KEYS.homeService, label: "Home visit" },
  { key: KEYS.pickupDrop, label: "Pickup & drop" },
] as const;

export interface FilterPanelProps {
  categories: RepairCategoryRow[];
  /** Number of filters currently applied, rendered in the mobile summary. */
  activeCount: number;
}

export function FilterPanel({ categories, activeCount }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Local mirror of the text box so typing stays responsive; the URL is only
  // written on submit (or on clear), not on every keystroke.
  const urlQuery = searchParams.get(KEYS.q) ?? "";
  const [queryDraft, setQueryDraft] = React.useState(urlQuery);

  // When the URL changes underneath the box — back/forward, or "clear all" —
  // the draft has to follow. Adjusted during render against the previous value
  // rather than in an effect: an effect would commit the stale text first and
  // repaint over it, and the lint rule against setState-in-effect is pointing
  // at exactly that.
  const [syncedQuery, setSyncedQuery] = React.useState(urlQuery);
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery);
    setQueryDraft(urlQuery);
  }

  const commit = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      startTransition(() => {
        // `scroll: false` keeps the visitor's place in a long result list when
        // they toggle a checkbox halfway down the page.
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      commit((params) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
    },
    [commit],
  );

  const currentCategory = searchParams.get(KEYS.category) ?? "";
  const currentRating = Number.parseFloat(searchParams.get(KEYS.rating) ?? "0") || 0;

  const body = (
    <div
      className={cn(
        "space-y-6 transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
      aria-busy={isPending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setParam(KEYS.q, queryDraft.trim());
        }}
        role="search"
      >
        <label htmlFor="search-q" className="eyebrow mb-2 block">
          Shop, service or street
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
          />
          <Input
            id="search-q"
            name="q"
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Screen repair, Elm St…"
            className="pl-9"
            maxLength={80}
          />
        </div>
      </form>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const target = event.currentTarget;
          const locInput = target.elements.namedItem("location") as HTMLInputElement;
          const val = locInput.value.trim();
          if (!val) {
            setParam(KEYS.bbox, null);
            return;
          }
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`);
            const data = await res.json();
            if (data && data.length > 0) {
              // Nominatim returns boundingbox as [south, north, west, east]
              const [south, north, west, east] = data[0].boundingbox;
              // Our bbox format: west,south,east,north
              setParam(KEYS.bbox, `${west},${south},${east},${north}`);
            }
          } catch (e) {
            console.error("Geocoding failed", e);
          }
        }}
        role="search"
      >
        <label htmlFor="search-loc" className="eyebrow mb-2 block">
          Location
        </label>
        <div className="flex gap-2">
          <Input
            id="search-loc"
            name="location"
            type="search"
            placeholder="City, Zip or Area..."
            maxLength={80}
          />
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </div>
      </form>

      <div>
        <label htmlFor="search-category" className="eyebrow mb-2 block">
          Category
        </label>
        <Select
          id="search-category"
          value={currentCategory}
          onChange={(event) => setParam(KEYS.category, event.target.value || null)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <fieldset>
        <legend className="eyebrow mb-2">Minimum rating</legend>
        <div className="flex rounded-machined border border-hairline bg-chalk p-0.5">
          {RATING_CHOICES.map((choice) => {
            const isSelected = currentRating === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setParam(KEYS.rating, choice.value === 0 ? null : String(choice.value))
                }
                className={cn(
                  "flex-1 rounded-[2px] py-1.5 font-mono text-eyebrow uppercase tracking-[0.12em] transition-colors",
                  isSelected
                    ? "bg-enamel text-bench"
                    : "text-steel hover:bg-bench-sunk hover:text-enamel",
                )}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Service type</legend>
        <div className="space-y-2">
          {SERVICE_CHOICES.map((choice) => {
            const isChecked = searchParams.get(choice.key) === "1";
            return (
              <label
                key={choice.key}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-enamel"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) =>
                    setParam(choice.key, event.target.checked ? "1" : null)
                  }
                  className="size-4 rounded-[2px] border-hairline text-signal accent-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                />
                {choice.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => commit((params) => Array.from(params.keys()).forEach((key) => params.delete(key)))}
          className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-rust"
        >
          <X aria-hidden className="size-3" />
          Clear all filters
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile: collapsed by default so the results are the first thing seen. */}
      <details className="rounded-machined border border-hairline bg-chalk lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display uppercase tracking-[0.08em] text-enamel">
          Filters
          {activeCount > 0 ? (
            <span className="rounded-machined bg-signal px-1.5 py-0.5 font-mono text-eyebrow text-chalk">
              {activeCount}
            </span>
          ) : null}
        </summary>
        <div className="border-t border-hairline p-4">{body}</div>
      </details>

      <div className="hidden lg:block">{body}</div>
    </>
  );
}
