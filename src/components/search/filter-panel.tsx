"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  warranty: "warranty",
  inShop: "in_shop",
  homeService: "home_service",
  pickupDrop: "pickup",
  bbox: "bbox",
  q: "q",
} as const;

/*
 * Choices carry a message KEY where the label is a word, and a literal where it
 * is a numeral. "3.0+" is the same in every language we ship; "Any" is not.
 * Resolving at the call site rather than here because this array is module-scope
 * and has no request — and therefore no locale — to translate against.
 */
const RATING_CHOICES = [
  { value: 0, labelKey: "ratingAny" },
  { value: 3, label: "3.0+" },
  { value: 4, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
] as const;

/**
 * Mirrors `WARRANTY_STEPS` in `@/lib/queries/search` — duplicated for the same
 * reason the keys are: that module is `server-only`.
 *
 * "Offered" is the 1-day floor. `default_warranty_days` is `not null default 3`,
 * so the useful first cut is not "how long" but "at all" — it is the step that
 * separates a shop standing behind its work from one that does not.
 */
const WARRANTY_CHOICES = [
  { value: 0, labelKey: "warrantyAny" },
  { value: 1, labelKey: "warrantyOffered" },
  { value: 30, labelKey: "warranty30" },
  { value: 90, labelKey: "warranty90" },
] as const;

const SERVICE_CHOICES = [
  { key: KEYS.inShop, labelKey: "inShop" },
  { key: KEYS.homeService, labelKey: "homeVisit" },
  { key: KEYS.pickupDrop, labelKey: "pickupDrop" },
] as const;

export interface FilterPanelProps {
  categories: RepairCategoryRow[];
  /** Number of filters currently applied, rendered in the mobile summary. */
  activeCount: number;
}

export function FilterPanel({ categories, activeCount }: FilterPanelProps) {
  // `useTranslations`, not `getTranslations`: this is a Client Component, and the
  // messages reach it through `NextIntlClientProvider` in the locale layout.
  const t = useTranslations("filters");
  const tc = useTranslations("common");
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
  const currentWarranty = Number.parseFloat(searchParams.get(KEYS.warranty) ?? "0") || 0;

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
          {t("queryLabel")}
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
            placeholder={t("queryPlaceholder")}
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
          {t("locationLabel")}
        </label>
        <div className="flex gap-2">
          <Input
            id="search-loc"
            name="location"
            type="search"
            placeholder={t("locationPlaceholder")}
            maxLength={80}
          />
          <Button type="submit" variant="outline" size="sm">{t("locationSearch")}</Button>
        </div>
      </form>

      <div>
        <label htmlFor="search-category" className="eyebrow mb-2 block">
          {t("categoryLabel")}
        </label>
        <Select
          id="search-category"
          value={currentCategory}
          onChange={(event) => setParam(KEYS.category, event.target.value || null)}
        >
          <option value="">{tc("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <FloorControl
        legend={t("ratingLabel")}
        choices={RATING_CHOICES.map((c) => ({
          value: c.value,
          label: "label" in c ? c.label : t(c.labelKey),
        }))}
        current={currentRating}
        onSelect={(value) => setParam(KEYS.rating, value === 0 ? null : String(value))}
      />

      {/*
        Directly under rating, above service type.

        Rating is what other customers thought; warranty is what the shop will
        commit to. Those are the two trust questions and they belong next to each
        other — service type is logistics and can follow.
      */}
      <FloorControl
        legend={t("warrantyLabel")}
        choices={WARRANTY_CHOICES.map((c) => ({
          value: c.value,
          label: t(c.labelKey),
        }))}
        current={currentWarranty}
        onSelect={(value) => setParam(KEYS.warranty, value === 0 ? null : String(value))}
      />

      <fieldset>
        <legend className="eyebrow mb-2">{t("serviceLabel")}</legend>
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
                {t(choice.labelKey)}
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
          {t("clearAll")}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile: collapsed by default so the results are the first thing seen. */}
      <details className="rounded-machined border border-hairline bg-chalk lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display uppercase tracking-[0.08em] text-enamel">
          {t("heading")}
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

interface FloorChoice {
  readonly value: number;
  readonly label: string;
}

/**
 * A segmented "at least this much" control.
 *
 * Shared by rating and warranty because they are the same control over a
 * different number, and two hand-rolled copies would drift the moment either
 * gained a state.
 *
 * The selected segment is resolved by snapping the URL value *down* to the
 * nearest choice, not by matching it exactly. A hand-edited or stale
 * `?warranty=14` is a real floor that is filtering real results, so leaving every
 * segment unlit would show a panel that disagrees with the list beside it.
 * Snapping down never overstates what is being filtered: it lights "Offered",
 * which is true, rather than "30d+", which would not be.
 */
function FloorControl({
  legend,
  choices,
  current,
  onSelect,
}: {
  legend: string;
  choices: readonly FloorChoice[];
  current: number;
  onSelect: (value: number) => void;
}) {
  const selected = choices.reduce(
    (best, choice) => (current >= choice.value && choice.value >= best ? choice.value : best),
    0,
  );

  return (
    <fieldset>
      <legend className="eyebrow mb-2">{legend}</legend>
      <div className="flex rounded-machined border border-hairline bg-chalk p-0.5">
        {choices.map((choice) => {
          const isSelected = selected === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(choice.value)}
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
  );
}
