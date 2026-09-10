"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { type ShopInventoryItem } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { PartFilters } from "@/components/part-filters";
import { PartCard } from "@/components/part-card";
import { PartInquiryModal } from "@/components/part-inquiry-modal";
import { QualityBanner } from "@/components/quality-banner";
import { Footer } from "@/components/footer";
import {
  Package,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Cpu,
  Smartphone,
  BatteryCharging,
  Zap,
  Flame,
  Wrench,
} from "lucide-react";

interface PartsCatalogProps {
  initialItems: ShopInventoryItem[];
}

const CATEGORIES = [
  {
    icon: Smartphone,
    title: "OLED & Retina Displays",
    badge: "ORIGINAL PULL",
    desc: "Service center pulls, digitizer assemblies, and flexgate cable replacements.",
    filter: "OLED",
  },
  {
    icon: BatteryCharging,
    title: "OEM Battery Modules",
    badge: "0-CYCLE OEM",
    desc: "Genuine cells with original BMS boards retained. Zero battery warning health errors.",
    filter: "Battery",
  },
  {
    icon: Cpu,
    title: "PMIC & Power Management",
    badge: "BGA CHIP",
    desc: "Tristar, Hydra, charging ICs, audio codecs, and backlight driver ICs.",
    filter: "PMIC",
  },
  {
    icon: Zap,
    title: "Port & Sub-Board Modules",
    badge: "HDMI/FPC",
    desc: "PS5 HDMI 2.1 ports, USB-C fast charge sub-boards, and microphone flexes.",
    filter: "HDMI",
  },
  {
    icon: Flame,
    title: "Thermal Interface Materials",
    badge: "PTM7950",
    desc: "Phase change pads, liquid metal barrier sets, and high-performance copper shims.",
    filter: "Thermal",
  },
  {
    icon: Wrench,
    title: "Bench Consumables",
    badge: "WORKSHOP JIG",
    desc: "Mechanic solder paste, Relife wick, Amtech NC-559-V2-TF flux, and UV solder mask.",
    filter: "Consumables",
  },
];

export function PartsCatalog({ initialItems }: PartsCatalogProps) {
  const [items, setItems] = useState<ShopInventoryItem[]>(initialItems);
  const [partInput, setPartInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [condition, setCondition] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const [activeItemForInquiry, setActiveItemForInquiry] = useState<ShopInventoryItem | null>(null);

  const refreshItems = async () => {
    try {
      const { getActiveInventory } = await import("@/lib/supabase");
      const latest = await getActiveInventory();
      if (latest && latest.length > 0) {
        setItems(latest);
      }
    } catch (e) {
      console.error("Failed to refresh inventory items:", e);
    }
  };

  // Filter computation
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      // Query filter
      if (partInput.trim()) {
        const q = partInput.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        const matchesShop = (item.fixer_profiles?.shop_name || "").toLowerCase().includes(q);

        if (!matchesName && !matchesDesc && !matchesShop) {
          return false;
        }
      }

      // Brand / Model filter
      if (modelInput.trim()) {
        const m = modelInput.toLowerCase().trim();
        const brandMatch = (item.brand || "").toLowerCase().includes(m);
        const nameMatch = item.name.toLowerCase().includes(m);
        const skuMatch = (item.sku || "").toLowerCase().includes(m);

        if (!brandMatch && !nameMatch && !skuMatch) {
          return false;
        }
      }

      // Condition filter
      if (condition !== "all" && item.condition !== condition) {
        return false;
      }

      // In-stock only filter
      if (inStockOnly && (item.quantity ?? 0) <= 0) {
        return false;
      }

      return true;
    });

    // Sort computation
    return result.sort((a, b) => {
      const priceA = a.unit_price || 0;
      const priceB = b.unit_price || 0;
      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "quantity_desc") return (b.quantity ?? 0) - (a.quantity ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [initialItems, partInput, modelInput, condition, inStockOnly, sortBy]);

  const handleResetFilters = () => {
    setPartInput("");
    setModelInput("");
    setCondition("all");
    setInStockOnly(false);
    setSortBy("newest");
  };

  return (
    <div className="flex min-h-screen flex-col bg-bench text-enamel">
      <Navbar />

      <Hero
        onSearch={(p, m) => {
          setPartInput(p);
          setModelInput(m);
        }}
        partInput={partInput}
        setPartInput={setPartInput}
        modelInput={modelInput}
        setModelInput={setModelInput}
        totalParts={items.length}
      />

      {/* Component Specialization Categories */}
      <section className="border-b border-hairline bg-chalk py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <span className="font-mono text-eyebrow uppercase tracking-wider text-steel-soft font-semibold block">
                Hardware Inventory Classes
              </span>
              <h2 className="font-display text-2xl font-semibold uppercase text-enamel">
                Browse Bench-Tested Components
              </h2>
            </div>
            <span className="font-mono text-xs text-steel">
              100% Escrow-Backed Hardware Transactions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isSelected = partInput.toLowerCase().includes(cat.filter.toLowerCase());
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setPartInput("");
                    } else {
                      setPartInput(cat.filter);
                    }
                  }}
                  className={`rounded-machined border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-signal bg-signal-wash shadow-sm"
                      : "border-hairline bg-bench/30 hover:bg-bench/70 hover:border-enamel/40 shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex size-8 items-center justify-center rounded-machined bg-enamel text-bench">
                        <Icon className="size-4 text-signal" />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-signal bg-chalk border border-hairline px-2 py-0.5 rounded">
                        [{cat.badge}]
                      </span>
                    </div>
                    <div className="font-display text-base font-semibold uppercase text-enamel">
                      {cat.title}
                    </div>
                    <p className="mt-1 text-xs text-steel leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-hairline/60 flex items-center justify-between font-mono text-[11px] text-signal font-semibold">
                    <span>{isSelected ? "Active Filter" : "Filter Hardware"}</span>
                    <ArrowRight className="size-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catalog Grid Area */}
      <main id="catalog" className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Filter Controls */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <PartFilters
              condition={condition}
              onConditionChange={setCondition}
              inStockOnly={inStockOnly}
              onInStockToggle={() => setInStockOnly(!inStockOnly)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              totalFiltered={filteredItems.length}
            />
          </aside>

          {/* Right Column: Part Cards */}
          <section className="lg:col-span-8 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-steel font-semibold">
                Available Hardware (<strong className="text-enamel font-bold">{filteredItems.length}</strong>)
              </span>
              {(partInput || modelInput || condition !== "all" || inStockOnly || sortBy !== "newest") && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-signal hover:underline transition-all cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredItems.map((item) => (
                  <PartCard
                    key={item.id}
                    item={item}
                    onInquireClick={(it) => setActiveItemForInquiry(it)}
                  />
                ))}
              </div>
            ) : (
              /* Zero Results */
              <div className="rounded-machined border border-hairline bg-chalk p-16 text-center shadow-bench flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-machined bg-bench text-steel mb-4 border border-hairline">
                  <Package className="size-7" />
                </div>
                <h3 className="font-display text-xl font-semibold uppercase text-enamel">
                  No Matching Hardware Found
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-steel">
                  No components matched your search criteria. Try broadening your query or reset all filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 rounded-machined bg-signal text-white font-display font-semibold uppercase tracking-wider px-5 py-2.5 text-xs shadow-sm hover:bg-signal-lift transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <QualityBanner />
      <Footer />

      {/* Modals */}
      <PartInquiryModal
        item={activeItemForInquiry}
        onClose={() => setActiveItemForInquiry(null)}
      />
    </div>
  );
}

