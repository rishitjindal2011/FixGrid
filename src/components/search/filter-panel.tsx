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
  const [isMobileExpanded, setIsMobileExpanded] = React.useState(false);

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

  return (
    <div className="mb-6 rounded-machined border border-hairline bg-bench-raised shadow-bench backdrop-blur">
      {/* Primary Discovery Row (Search, Location, Category) */}
      <div className="p-3 sm:p-4 border-b border-hairline/60">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* Global Search Input */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setParam(KEYS.q, queryDraft.trim());
            }}
            role="search"
            className="md:col-span-5 relative"
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel"
            />
            <Input
              id="search-q"
              name="q"
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Search service, issue, or workshop (e.g. Screen, PCB)..."
              className="pl-9 pr-8 text-xs bg-chalk"
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
          </form>

          {/* Location Input with Quick Geocode */}
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
            className="md:col-span-4 flex gap-1.5"
          >
            <div className="relative flex-1">
              <MapPin
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-steel"
              />
              <Input
                id="search-loc"
                name="location"
                type="search"
                placeholder="Locality, sector, or PIN..."
                maxLength={80}
                className="pl-8 text-xs bg-chalk"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="px-3 shrink-0 text-xs font-display uppercase tracking-wider"
            >
              Locate
            </Button>
          </form>

          {/* Category Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Select
              id="search-category"
              value={currentCategory}
              onChange={(event) => setParam(KEYS.category, event.target.value || null)}
              className="text-xs bg-chalk w-full"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>

            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="lg:hidden flex items-center gap-1 rounded-machined border border-hairline bg-chalk px-3 py-2 text-xs font-mono uppercase text-enamel"
            >
              <SlidersHorizontal className="size-3.5" />
              {activeCount > 0 && (
                <span className="size-1.5 rounded-full bg-signal" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Filter Ribbon (Rating, Warranty, Service Type & Clear) */}
      <div className={cn(
        "p-3 sm:px-4 sm:py-2.5 bg-bench-canvas/60 flex flex-wrap items-center justify-between gap-3 text-xs",
        "lg:flex",
        isMobileExpanded ? "flex" : "hidden"
      )}>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Rating Segmented Control */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-steel">
              Rating:
            </span>
            <div className="flex rounded-machined border border-hairline bg-chalk p-0.5">
              {RATING_CHOICES.map((c) => {
                const isSelected = currentRating === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setParam(KEYS.rating, c.value === 0 ? null : String(c.value))}
                    className={cn(
                      "rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase transition-all cursor-pointer",
                      isSelected
                        ? "bg-enamel text-bench font-bold shadow-xs"
                        : "text-steel hover:text-enamel"
                    )}
                  >
                    {"label" in c ? c.label : "Any"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warranty Segmented Control */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-steel">
              Warranty:
            </span>
            <div className="flex rounded-machined border border-hairline bg-chalk p-0.5">
              {WARRANTY_CHOICES.map((c) => {
                const isSelected = currentWarranty === c.value;
                const label = c.value === 0 ? "Any" : c.value === 1 ? "Offered" : `${c.value}D+`;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setParam(KEYS.warranty, c.value === 0 ? null : String(c.value))}
                    className={cn(
                      "rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase transition-all cursor-pointer",
                      isSelected
                        ? "bg-enamel text-bench font-bold shadow-xs"
                        : "text-steel hover:text-enamel"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Modality Checkboxes */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-steel hidden sm:inline">
              Mode:
            </span>
            {SERVICE_CHOICES.map((choice) => {
              const isChecked = searchParams.get(choice.key) === "1";
              return (
                <label
                  key={choice.key}
                  className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-enamel hover:text-signal transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) =>
                      setParam(choice.key, event.target.checked ? "1" : null)
                    }
                    className="size-3.5 rounded-[2px] border-hairline text-signal accent-signal"
                  />
                  <span>{t(choice.labelKey)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Clear All Action */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              commit((params) =>
                Array.from(params.keys()).forEach((key) => params.delete(key)),
              )
            }
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-rust hover:text-rust/80 cursor-pointer ml-auto"
          >
            <RotateCcw className="size-3" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
