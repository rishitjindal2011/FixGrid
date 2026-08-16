"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";

import { WarrantyBadge } from "@/components/warranty-badge";
import { RatingStars } from "@/components/rating-stars";
import { StatusStrip } from "@/components/status-strip";
import { Badge } from "@/components/ui/badge";
import { useSelection } from "@/components/search/selection-context";
import type { HoursInput, ShopStatus } from "@/lib/hours";
import { cn } from "@/lib/utils";
import type { RepairCategoryRow } from "@/lib/types/database";

export interface ResultCardProps {
  id: string;
  slug: string;
  shopName: string;
  address: string;
  photo: string | null;
  verified: boolean;
  /** The shop’s standard warranty in days. 0 renders no badge. */
  warrantyDays: number;
  ratingAvg: number;
  ratingCount: number;
  categories: RepairCategoryRow[];
  hours: HoursInput;
  /** Computed on the server so the card is correct before hydration. */
  initialStatus: ShopStatus;
  /** Position in the result list, shown as a mono index. */
  index: number;
  hasCoordinates: boolean;
}

export function ResultCard({
  id,
  slug,
  shopName,
  address,
  photo,
  verified,
  warrantyDays,
  ratingAvg,
  ratingCount,
  categories,
  hours,
  initialStatus,
  index,
  hasCoordinates,
}: ResultCardProps) {
  const { hoveredId, selectedId, setHoveredId, setSelectedId } = useSelection();
  const isActive = hoveredId === id || selectedId === id;

  return (
    <li
      id={`result-${id}`}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
      className={cn(
        "group relative rounded-machined border bg-chalk transition-colors",
        isActive ? "border-signal/50 bg-signal-wash/40" : "border-hairline hover:border-steel-soft",
      )}
    >
      {/* The whole card is one link target; the interactive bits below sit on
          top of it with their own z-index so they stay independently clickable. */}
      <Link
        href={`/expert/${slug}`}
        className="absolute inset-0 rounded-machined focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        aria-label={`${shopName}, ${address}`}
      />

      <div className="pointer-events-none flex gap-4 p-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-machined bg-bench-sunk sm:size-28">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="schematic size-full" aria-hidden />
          )}
          <span className="absolute left-0 top-0 bg-enamel px-1.5 py-0.5 font-mono text-eyebrow text-bench">
            {String(index).padStart(2, "0")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base leading-tight">{shopName}</h3>
            {verified ? (
              <BadgeCheck aria-label="Verified" className="size-4 shrink-0 text-verdigris" />
            ) : null}
          </div>

          <div className="mt-1.5">
            <RatingStars rating={ratingAvg} count={ratingCount} />
          </div>

          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-steel">
            <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-steel-soft" />
            <span className="line-clamp-2">{address}</span>
          </p>

          <div className="mt-2">
            <StatusStrip hours={hours} initialStatus={initialStatus} />
          </div>

          {/*
            Above the categories, not among them.

            A warranty is a promise about the work; a category is a statement of
            what the shop touches. Mixing them into one row of grey pills would
            make the strongest thing on the card read as another tag.
          */}
          {warrantyDays ? (
            <div className="mt-2">
              <WarrantyBadge days={warrantyDays} />
            </div>
          ) : null}

          {categories.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {categories.slice(0, 3).map((category) => (
                <li key={category.id}>
                  <Badge>{category.name}</Badge>
                </li>
              ))}
              {categories.length > 3 ? (
                <li>
                  <Badge className="border-dashed">+{categories.length - 3}</Badge>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

      {hasCoordinates ? (
        <div className="relative flex justify-end px-4 pb-3">
          <button
            type="button"
            onClick={() => setSelectedId(id)}
            className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel underline decoration-hairline underline-offset-4 transition-colors hover:text-signal hover:decoration-signal"
          >
            Show on map
          </button>
        </div>
      ) : null}
    </li>
  );
}
