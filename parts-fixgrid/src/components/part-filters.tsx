import Link from "next/link";
import { Filter, Layers, CheckSquare, ArrowDownUp, Plus } from "lucide-react";

interface PartFiltersProps {
  condition: string;
  onConditionChange: (c: string) => void;
  inStockOnly: boolean;
  onInStockToggle: () => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  totalFiltered: number;
}

export function PartFilters({
  condition,
  onConditionChange,
  inStockOnly,
  onInStockToggle,
  sortBy,
  onSortChange,
  totalFiltered,
}: PartFiltersProps) {
  const conditions = [
    { id: "all", label: "All Conditions" },
    { id: "new", label: "Brand New (OEM)" },
    { id: "refurbished", label: "Refurbished (Tested)" },
    { id: "used", label: "Original Pull (Grade A+)" },
  ];

  return (
    <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-signal" />
          <span className="font-display font-semibold text-base uppercase tracking-wider text-enamel">
            Component Filters
          </span>
        </div>
        <span className="font-mono text-xs text-steel">
          Showing <strong className="text-signal">{totalFiltered}</strong>
        </span>
      </div>

      {/* Condition Pills */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold">
          Hardware Condition
        </span>
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((c) => (
            <button
              key={c.id}
              onClick={() => onConditionChange(c.id)}
              className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                condition === c.id
                  ? "bg-enamel text-bench border-enamel font-semibold shadow-xs"
                  : "bg-bench/60 text-steel border-hairline hover:bg-chalk hover:text-enamel"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* In-Stock Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-hairline">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold">
          Immediate Bench Stock
        </span>
        <button
          onClick={onInStockToggle}
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
            inStockOnly
              ? "bg-verdigris text-white border-verdigris font-semibold shadow-xs"
              : "bg-bench/60 text-steel border-hairline hover:bg-chalk hover:text-enamel"
          }`}
        >
          <span>{inStockOnly ? "✓ In-Stock (>0)" : "Show All"}</span>
        </button>
      </div>

      {/* Sort Selector */}
      <div className="flex flex-col gap-2 pt-2 border-t border-hairline">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold flex items-center gap-1">
          <ArrowDownUp className="size-3 text-signal" /> Sort Catalog
        </span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full rounded-machined bg-bench/40 border border-hairline px-3 py-2 text-xs font-mono text-enamel focus:border-signal focus:outline-none"
        >
          <option value="newest">Newest Listed First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="quantity_desc">Highest Quantity Available</option>
        </select>
      </div>

      {/* Workshop Shelves Callout */}
      <div className="mt-2 rounded-machined border border-signal/20 bg-signal-wash p-3.5 flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-signal font-bold">
          Workshop Shelves Notice
        </span>
        <p className="font-display text-sm font-semibold uppercase text-enamel">
          Have Surplus Spare Parts?
        </p>
        <p className="text-xs text-steel leading-relaxed">
          Monetize OEM screen pulls, batteries, and motherboard chips stored in your workshop drawers.
        </p>
        <Link
          href="/list"
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-machined bg-signal px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white hover:bg-signal-lift transition-colors"
        >
          <Plus className="size-3.5" />
          <span>List Overstock on Grid</span>
        </Link>
      </div>
    </div>
  );
}
