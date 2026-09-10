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
  Building2,
  Home,
  Truck,
  Zap,
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
  bio?: string | null;
  offersInShop?: boolean;
  offersHomeService?: boolean;
  offersPickupDrop?: boolean;
  responseHours?: number;
  workingDays?: string[];
  openingTime?: string;
  closingTime?: string;
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
  bio,
  offersInShop = true,
  offersHomeService = false,
  offersPickupDrop = false,
  responseHours,
  workingDays,
  openingTime,
  closingTime,
}: ResultCardProps) {
  const { hoveredId, selectedId, setHoveredId, setSelectedId } = useSelection();
  const t = useTranslations("common");
  const ts = useTranslations("search");
  const isActive = hoveredId === id || selectedId === id;

  const formattedSchedule = React.useMemo(() => {
    const daysLabel = (() => {
      if (!workingDays || workingDays.length === 0) return null;
      if (workingDays.length === 7) return "Open 7 Days";
      if (workingDays.length === 5 && !workingDays.includes("sat") && !workingDays.includes("sun")) {
        return "Mon – Fri";
      }
      if (workingDays.length === 6 && !workingDays.includes("sun")) {
        return "Mon – Sat";
      }
      return `${workingDays.length} Days/Wk`;
    })();

    const hoursLabel = (() => {
      const ot = openingTime;
      const ct = closingTime;
      if (!ot || !ct || ot === "00:00:00") return null;
      const fmt = (tStr: string) => {
        const parts = tStr.split(":");
        const hourPart = parts[0] ?? "0";
        const minPart = parts[1] ?? "00";
        let h = parseInt(hourPart, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${minPart} ${ampm}`;
      };
      return `${fmt(ot)} – ${fmt(ct)}`;
    })();

    if (daysLabel && hoursLabel) return `${daysLabel} · ${hoursLabel}`;
    return daysLabel || hoursLabel || null;
  }, [workingDays, openingTime, closingTime]);

  return (
    <li
      id={`result-${id}`}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-chalk transition-all duration-200",
        isActive
          ? "border-signal bg-signal-wash/20 shadow-lift scale-[1.008] ring-1 ring-signal"
          : "border-hairline hover:border-signal/50 hover:shadow-bench",
      )}
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Visual Media Identity Column */}
        <div className="relative w-full sm:w-52 md:w-56 min-h-[160px] sm:min-h-[210px] shrink-0 overflow-hidden bg-bench-sunk">
          {photo ? (
            <Image
              src={photo}
              alt={shopName}
              fill
              sizes="(max-width: 640px) 100vw, 240px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full min-h-[160px] flex-col items-center justify-center bg-gradient-to-br from-enamel to-enamel-lift p-4 text-center text-bench">
              <Wrench className="size-8 text-signal" />
              <span className="mt-2 font-mono text-[11px] font-bold uppercase tracking-widest text-bench">
                FixGrid Bench Lab
              </span>
              <span className="mt-0.5 font-mono text-[9px] text-bench/70">
                Verified Workshop
              </span>
            </div>
          )}

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Floating Media Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="rounded bg-black/80 backdrop-blur-md px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm border border-white/10">
              #{String(index).padStart(2, "0")}
            </span>
          </div>

          {verified && (
            <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1 rounded bg-verdigris/95 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white shadow-sm border border-verdigris/30">
                <BadgeCheck className="size-3.5" />
                Verified Partner
              </span>
            </div>
          )}
        </div>

        {/* Details & Telemetry Column */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
          {/* Header Bar: Shop Name, Location & Live Status */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline/50 pb-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-enamel group-hover:text-signal transition-colors">
                <Link href={`/expert/${slug}`} className="hover:underline focus:outline-none">
                  {shopName}
                </Link>
              </h3>
              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-steel">
                <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-signal" />
                <span className="line-clamp-1 font-medium text-enamel">{address}</span>
              </p>
            </div>

            <div className="shrink-0 rounded bg-bench px-2.5 py-1 border border-hairline/60">
              <StatusStrip hours={hours} initialStatus={initialStatus} />
            </div>
          </div>

          {/* Trust Guarantees & Ratings */}
          <div className="flex flex-wrap items-center gap-2">
            {ratingCount > 0 ? (
              <RatingStars rating={ratingAvg} count={ratingCount} />
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded bg-bench px-2 py-0.5 font-mono text-[10px] uppercase font-semibold text-steel border border-hairline/70">
                <Sparkles className="size-3 text-signal" />
                New Verified Listing · Awaiting First Review
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-verdigris">
              <ShieldCheck className="size-3.5" />
              Smart Escrow Protected
            </span>

            <span className="inline-flex items-center gap-1 rounded bg-enamel/5 border border-enamel/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-enamel">
              <Zap className="size-3 text-signal" />
              {responseHours ? `~${responseHours}h Response` : "Direct Booking"}
            </span>

            {warrantyDays > 0 ? <WarrantyBadge days={warrantyDays} /> : null}
          </div>

          {/* Service Capabilities (Real DB Flags) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {offersInShop && (
              <span className="inline-flex items-center gap-1.5 rounded bg-bench-sunk/50 border border-hairline px-2.5 py-1 text-xs font-semibold text-enamel shadow-2xs">
                <Building2 className="size-3.5 text-signal" />
                <span>In-Shop Lab &amp; Bench</span>
              </span>
            )}
            {offersHomeService && (
              <span className="inline-flex items-center gap-1.5 rounded bg-verdigris-wash/80 border border-verdigris/30 px-2.5 py-1 text-xs font-semibold text-verdigris shadow-2xs">
                <Home className="size-3.5" />
                <span>Home Visit Service</span>
              </span>
            )}
            {offersPickupDrop && (
              <span className="inline-flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
                <Truck className="size-3.5 text-amber-600" />
                <span>Pickup &amp; Return Courier</span>
              </span>
            )}
            {formattedSchedule && (
              <span className="inline-flex items-center gap-1.5 rounded bg-bench px-2 py-1 text-xs text-steel font-mono border border-hairline/60">
                <Clock className="size-3.5 text-steel-soft" />
                <span>{formattedSchedule}</span>
              </span>
            )}
          </div>

          {/* Categories or Hardware Bench Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.length > 0 ? (
              <>
                {categories.slice(0, 3).map((category) => (
                  <Badge
                    key={category.id}
                    className="border-hairline bg-bench-sunk/50 text-[10px] text-steel font-mono uppercase hover:bg-bench-sunk"
                  >
                    {category.name}
                  </Badge>
                ))}
                {categories.length > 3 && (
                  <Badge className="border-dashed border-hairline text-[10px] text-steel-soft font-mono">
                    +{categories.length - 3} more
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Badge className="border-hairline bg-bench-sunk/40 text-[10px] text-steel font-mono uppercase">
                  Hardware Diagnostics
                </Badge>
                <Badge className="border-hairline bg-bench-sunk/40 text-[10px] text-steel font-mono uppercase">
                  Component Testing
                </Badge>
                <Badge className="border-hairline bg-bench-sunk/40 text-[10px] text-steel font-mono uppercase">
                  Direct Technician Access
                </Badge>
              </>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-hairline/60 pt-3">
            <div>
              {hasCoordinates ? (
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-steel hover:text-signal transition-colors cursor-pointer font-bold"
                >
                  <Navigation className="size-3.5 text-signal" />
                  <span>{ts("showOnMap")}</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-steel-soft uppercase tracking-wider">
                  FixGrid Certified Workshop
                </span>
              )}
            </div>

            <Button
              asChild
              size="sm"
              className="bg-signal hover:bg-signal-lift text-chalk font-display uppercase tracking-wider text-xs font-bold px-5 py-2 rounded shadow-sm hover:shadow-md transition-all group-hover:scale-[1.02]"
            >
              <Link href={`/expert/${slug}`} className="inline-flex items-center gap-1.5">
                <span>View Workshop &amp; Book</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
