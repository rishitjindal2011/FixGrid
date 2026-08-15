"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { PackageOpen, Search, FilterX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  filterInventory,
  hasActiveFilters,
  EMPTY_FILTERS,
  type InventoryFilters,
  type StockFilter,
  type InventorySort,
} from "@/lib/inventory/filter";
import { INVENTORY_CONDITION_LABELS } from "@/lib/types/marketplace";
import { formatMoney } from "@/lib/format";

export interface PublicInventoryItem {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  condition: string;
  unit_price: number | null;
  currency: string;
  quantity: number;
  sort_order: number;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
}

export function PublicInventory({
  items,
  shopName,
}: {
  items: PublicInventoryItem[];
  shopName: string;
}) {
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_FILTERS);

  // The public view does not care about low-stock warnings, so the lowStock check is false.
  const filtered = useMemo(
    () =>
      filterInventory(
        // Map the structure so that category_id is available for the filter.
        items.map((item) => ({
          ...item,
          category_id: item.category?.id ?? null,
        })),
        filters,
        () => false
      ),
    [items, filters]
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.category) {
        map.set(item.category.id, item.category.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-steel-wash">
          <PackageOpen aria-hidden className="size-6 text-steel" />
        </div>
        <h2 className="mt-4 font-display text-xl">{shopName} Shop</h2>
        <p className="mt-2 max-w-sm text-steel">
          This shop hasn&apos;t listed any items for sale yet.
        </p>
      </div>
    );
  }

  const isFiltering = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-machined border border-hairline bg-bench p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
            <Input
              type="search"
              placeholder="Search parts & stock..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-9"
            />
          </div>

          {categories.length > 0 && (
            <Select
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={filters.stock}
            onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as StockFilter }))}
            aria-label="Filter by availability"
          >
            <option value="all">Availability</option>
            <option value="in_stock">In stock</option>
            <option value="out">Out of stock</option>
          </Select>

          <Select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as InventorySort }))}
            aria-label="Sort items"
          >
            <option value="manual">Featured</option>
            <option value="name">Name (A-Z)</option>
            <option value="price_low">Price (Low-High)</option>
            <option value="price_high">Price (High-Low)</option>
          </Select>
        </div>

        {isFiltering && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-steel">
              Found {filtered.length} of {items.length} items
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="-mr-2 h-auto py-1"
            >
              <FilterX aria-hidden className="mr-1.5 size-4" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-steel">
            <PackageOpen aria-hidden className="mb-3 size-8 opacity-20" />
            <p>No items match these filters.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-machined border border-hairline bg-bench p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-medium">{item.name}</h3>
                {item.quantity === 0 ? (
                  <Badge variant="signal" className="shrink-0">Out of stock</Badge>
                ) : (
                  <Badge variant="verified" className="shrink-0">In stock</Badge>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-3">
                {item.description && (
                  <p className="line-clamp-3 text-sm text-steel-soft">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4 border-t border-hairline pt-3">
                  <div className="flex items-center gap-2 text-xs text-steel">
                    <span>{INVENTORY_CONDITION_LABELS[item.condition as keyof typeof INVENTORY_CONDITION_LABELS]}</span>
                    {item.brand && (
                      <>
                        <span>•</span>
                        <span>{item.brand}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="font-mono font-medium">
                    {item.unit_price === null ? (
                      <span className="text-steel-soft text-sm uppercase tracking-wide">Ask</span>
                    ) : (
                      formatMoney(item.unit_price)
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
