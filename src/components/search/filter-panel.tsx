"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X, SlidersHorizontal, MapPin, RotateCcw, ShieldCheck } from "lucide-react";

import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RepairCategoryRow } from "@/lib/types/database";

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

const RATING_CHOICES = [
  { value: 0, labelKey: "ratingAny" },
  { value: 3, label: "3.0+" },
  { value: 4, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
] as const;

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
  activeCount: number;
}

export function FilterPanel({ categories, activeCount }: FilterPanelProps) {
  const t = useTranslations("filters");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const urlQuery = searchParams.get(KEYS.q) ?? "";
  const [queryDraft, setQueryDraft] = React.useState(urlQuery);

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
        "space-y-5 transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
      aria-busy={isPending}
    >
      {/* Search Input */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setParam(KEYS.q, queryDraft.trim());
        }}
        role="search"
      >
        <label htmlFor="search-q" className="eyebrow mb-1.5 block font-bold text-enamel">
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
            placeholder="e.g. Screen, Battery, PCB..."
            className="pl-9 text-xs"
            maxLength={80}
          />
          {queryDraft.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQueryDraft("");
                setParam(KEYS.q, null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel hover:text-enamel p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Location Input */}
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
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`,
            );
            const data = await res.json();
            if (data && data.length > 0) {
              const [south, north, west, east] = data[0].boundingbox;
              setParam(KEYS.bbox, `${west},${south},${east},${north}`);
            }
          } catch (e) {
            console.error("Geocoding failed", e);
          }
        }}
        role="search"
      >
        <label htmlFor="search-loc" className="eyebrow mb-1.5 block font-bold text-enamel">
          {t("locationLabel")}
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <MapPin
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-steel-soft"
            />
            <Input
              id="search-loc"
              name="location"
              type="search"
              placeholder="City, area or PIN..."
              maxLength={80}
              className="pl-8 text-xs"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="px-3 shrink-0 text-xs font-display uppercase tracking-wider">
            {t("locationSearch")}
          </Button>
        </div>
      </form>

      {/* Category Dropdown */}
      <div>
        <label htmlFor="search-category" className="eyebrow mb-1.5 block font-bold text-enamel">
          {t("categoryLabel")}
        </label>
        <Select
          id="search-category"
          value={currentCategory}
          onChange={(event) => setParam(KEYS.category, event.target.value || null)}
          className="text-xs"
        >
          <option value="">{tc("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Minimum Rating */}
      <FloorControl
        legend={t("ratingLabel")}
        choices={RATING_CHOICES.map((c) => ({
          value: c.value,
          label: "label" in c ? c.label : t(c.labelKey),
        }))}
        current={currentRating}
        onSelect={(value) => setParam(KEYS.rating, value === 0 ? null : String(value))}
      />

      {/* Warranty Floor */}
      <FloorControl
        legend={t("warrantyLabel")}
        choices={WARRANTY_CHOICES.map((c) => ({
          value: c.value,
          label: t(c.labelKey),
        }))}
        current={currentWarranty}
        onSelect={(value) => setParam(KEYS.warranty, value === 0 ? null : String(value))}
      />

      {/* Service Types */}
      <fieldset>
        <legend className="eyebrow mb-2 font-bold text-enamel">{t("serviceLabel")}</legend>
        <div className="space-y-2 rounded-machined border border-hairline bg-bench/30 p-2.5">
          {SERVICE_CHOICES.map((choice) => {
            const isChecked = searchParams.get(choice.key) === "1";
            return (
              <label
                key={choice.key}
                className="flex cursor-pointer items-center gap-2 text-xs text-enamel hover:text-signal transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) =>
                    setParam(choice.key, event.target.checked ? "1" : null)
                  }
                  className="size-3.5 rounded-[2px] border-hairline text-signal accent-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                />
                <span className="font-medium">{t(choice.labelKey)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Reset Filters */}
      {activeCount > 0 ? (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              commit((params) =>
                Array.from(params.keys()).forEach((key) => params.delete(key)),
              )
            }
            className="w-full inline-flex items-center justify-center gap-1.5 font-display text-xs uppercase tracking-wider text-rust border-rust/30 hover:bg-rust-wash cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>{t("clearAll")}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile: Collapsed Accordion */}
      <details className="rounded-machined border border-hairline bg-chalk lg:hidden shadow-bench">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display uppercase tracking-[0.08em] text-enamel">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-signal" />
            <span>{t("heading")}</span>
          </div>
          {activeCount > 0 ? (
            <span className="rounded bg-signal px-2 py-0.5 font-mono text-eyebrow font-bold text-chalk">
              {activeCount} active
            </span>
          ) : null}
        </summary>
        <div className="border-t border-hairline p-4">{body}</div>
      </details>

      {/* Desktop: Machined Panel Housing */}
      <div className="hidden lg:block rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-signal" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-enamel">
              {t("heading")}
            </h2>
          </div>
          {activeCount > 0 ? (
            <span className="rounded bg-signal px-2 py-0.5 font-mono text-[10px] font-bold text-chalk uppercase">
              {activeCount} active
            </span>
          ) : null}
        </div>
        {body}
      </div>
    </>
  );
}

interface FloorChoice {
  readonly value: number;
  readonly label: string;
}

/**
 * Modern, non-breaking segmented control that prevents label text wrapping.
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
      <legend className="eyebrow mb-1.5 font-bold text-enamel">{legend}</legend>
      <div className="grid grid-cols-4 rounded-machined border border-hairline bg-bench-sunk/40 p-0.5 gap-0.5">
        {choices.map((choice) => {
          const isSelected = selected === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(choice.value)}
              className={cn(
                "w-full rounded-[2px] py-1.5 px-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-center truncate cursor-pointer transition-all",
                isSelected
                  ? "bg-enamel text-bench shadow-sm font-bold scale-[1.02]"
                  : "text-steel hover:bg-chalk hover:text-enamel",
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
