"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Wrench,
  Clock,
  Navigation,
} from "lucide-react";

import { WarrantyBadge } from "@/components/warranty-badge";
import { RatingStars } from "@/components/rating-stars";
import { StatusStrip } from "@/components/status-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  warrantyDays: number;
  ratingAvg: number;
  ratingCount: number;
  categories: RepairCategoryRow[];
  hours: HoursInput;
  initialStatus: ShopStatus;
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
  const t = useTranslations("common");
  const ts = useTranslations("search");
  const isActive = hoveredId === id || selectedId === id;

  return (
    <li
      id={`result-${id}`}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
      className={cn(
        "group relative overflow-hidden rounded-machined border bg-chalk transition-all",
        isActive
          ? "border-signal bg-signal-wash/30 shadow-lift scale-[1.008]"
          : "border-hairline hover:border-signal/50 hover:shadow-bench",
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header Bar: Index, Name, Verified Badge & Status */}
        <div className="flex items-start justify-between gap-3 border-b border-hairline/60 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 rounded bg-enamel px-2 py-0.5 font-mono text-[11px] font-bold text-bench">
              #{String(index).padStart(2, "0")}
            </span>
            <h3 className="truncate font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-enamel group-hover:text-signal transition-colors">
              <Link href={`/expert/${slug}`} className="hover:underline focus:outline-none">
                {shopName}
              </Link>
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-verdigris">
                <BadgeCheck className="size-3.5" />
                Verified
              </span>
            ) : null}
            <StatusStrip hours={hours} initialStatus={initialStatus} />
          </div>
        </div>

        {/* Content Body: Media Avatar & Workshop Details */}
        <div className="mt-3.5 flex flex-col sm:flex-row gap-4">
          {/* Workshop Media Frame */}
          <div className="relative size-24 sm:size-28 shrink-0 overflow-hidden rounded-machined border border-hairline bg-bench-sunk">
            {photo ? (
              <Image
                src={photo}
                alt={shopName}
                fill
                sizes="112px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-enamel to-enamel-lift p-2 text-center text-bench">
                <Wrench className="size-6 text-signal" />
                <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-bench/80">
                  Bench Lab
                </span>
              </div>
            )}
          </div>

          {/* Details & Guarantees */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Rating / Review Status */}
            <div className="flex flex-wrap items-center gap-2">
              {ratingCount > 0 ? (
                <RatingStars rating={ratingAvg} count={ratingCount} />
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-bench px-2 py-0.5 font-mono text-[10px] uppercase font-semibold text-steel">
                  <Sparkles className="size-3 text-signal" />
                  New Verified Listing · Awaiting First Review
                </span>
              )}

              {/* Escrow Guarantee Pill */}
              <span className="inline-flex items-center gap-1 rounded bg-verdigris-wash/80 border border-verdigris/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-verdigris">
                <ShieldCheck className="size-3" />
                Smart Escrow Protected
              </span>
            </div>

            {/* Address */}
            <p className="flex items-start gap-1.5 text-xs text-steel">
              <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-signal" />
              <span className="line-clamp-2 text-enamel font-medium">{address}</span>
            </p>

            {/* Warranty Badge if applicable */}
            {warrantyDays ? (
              <div className="pt-0.5">
                <WarrantyBadge days={warrantyDays} />
              </div>
            ) : null}

            {/* Categories / Repair Specialties */}
            {categories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {categories.slice(0, 4).map((category) => (
                  <Badge
                    key={category.id}
                    className="border-hairline bg-bench-sunk/50 text-[10px] text-steel font-mono uppercase hover:bg-bench-sunk"
                  >
                    {category.name}
                  </Badge>
                ))}
                {categories.length > 4 ? (
                  <Badge className="border-dashed border-hairline text-[10px] text-steel-soft font-mono">
                    +{categories.length - 4} more
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline/60 pt-3">
          <div className="flex items-center gap-3">
            {hasCoordinates ? (
              <button
                type="button"
                onClick={() => setSelectedId(id)}
                className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal transition-colors cursor-pointer"
              >
                <Navigation className="size-3 text-signal" />
                <span>{ts("showOnMap")}</span>
              </button>
            ) : null}
          </div>

          <Button
            asChild
            size="sm"
            className="bg-enamel hover:bg-enamel-lift text-bench font-display uppercase tracking-wider text-xs px-4 shadow-sm group-hover:bg-signal group-hover:text-chalk transition-colors"
          >
            <Link href={`/expert/${slug}`} className="inline-flex items-center gap-1.5">
              <span>View Workshop &amp; Book</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
