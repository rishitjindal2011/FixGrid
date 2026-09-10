"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, Info, Package, Star } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Modern segmented tab control for the workshop profile.
 */
export function ExpertTabs({
  about,
  reviews,
  inventory,
  jobs,
  reviewCount,
  inventoryCount,
  jobsCount = 0,
}: {
  about: React.ReactNode;
  reviews: React.ReactNode;
  inventory: React.ReactNode;
  jobs?: React.ReactNode;
  reviewCount: number;
  inventoryCount: number;
  jobsCount?: number;
}) {
  const queryTab = useSearchParams().get("tab");
  const requested =
    queryTab === "reviews"
      ? "reviews"
      : queryTab === "inventory"
      ? "inventory"
      : queryTab === "jobs"
      ? "jobs"
      : "about";
  const t = useTranslations("expert");

  return (
    <Tabs key={requested} defaultValue={requested} className="w-full">
      {/* Modern Segmented Navigation Bar */}
      <TabsList className="flex flex-wrap items-center gap-1.5 p-1.5 bg-bench-sunk/50 rounded-xl border border-hairline/70 w-full justify-start">
        <TabsTrigger
          value="about"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-none -mb-0 pb-2 pt-2 text-steel hover:text-enamel data-[state=active]:bg-chalk data-[state=active]:text-enamel data-[state=active]:shadow-xs"
        >
          <Info className="size-3.5 text-signal" />
          <span>{t("tabAbout")}</span>
        </TabsTrigger>

        <TabsTrigger
          value="reviews"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-none -mb-0 pb-2 pt-2 text-steel hover:text-enamel data-[state=active]:bg-chalk data-[state=active]:text-enamel data-[state=active]:shadow-xs"
        >
          <Star className="size-3.5 text-amber-500" />
          <span>{t("tabReviews")}</span>
          <span className="ml-1 rounded-md bg-bench px-1.5 py-0.5 font-mono text-[10px] font-semibold text-steel tabular-nums border border-hairline/50">
            {reviewCount}
          </span>
        </TabsTrigger>

        {inventoryCount > 0 && (
          <TabsTrigger
            value="inventory"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-none -mb-0 pb-2 pt-2 text-steel hover:text-enamel data-[state=active]:bg-chalk data-[state=active]:text-enamel data-[state=active]:shadow-xs"
          >
            <Package className="size-3.5 text-verdigris" />
            <span>{t("tabInventory")}</span>
            <span className="ml-1 rounded-md bg-verdigris-wash px-1.5 py-0.5 font-mono text-[10px] font-semibold text-verdigris tabular-nums border border-verdigris/30">
              {inventoryCount}
            </span>
          </TabsTrigger>
        )}

        {jobsCount > 0 && (
          <TabsTrigger
            value="jobs"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-none -mb-0 pb-2 pt-2 text-steel hover:text-enamel data-[state=active]:bg-chalk data-[state=active]:text-enamel data-[state=active]:shadow-xs"
          >
            <Briefcase className="size-3.5 text-signal" />
            <span>Hiring</span>
            <span className="ml-1 rounded-md bg-signal-wash px-1.5 py-0.5 font-mono text-[10px] font-semibold text-signal tabular-nums border border-signal/30">
              {jobsCount}
            </span>
          </TabsTrigger>
        )}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="about">{about}</TabsContent>
        <TabsContent value="reviews">{reviews}</TabsContent>
        {inventoryCount > 0 && <TabsContent value="inventory">{inventory}</TabsContent>}
        {jobsCount > 0 && <TabsContent value="jobs">{jobs}</TabsContent>}
      </div>
    </Tabs>
  );
}
