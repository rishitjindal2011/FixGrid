"use client";

import * as React from "react";
import { useActionState, useState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  PackageOpen,
  Search,
  FilterX,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  InventoryForm,
  type EditableInventoryItem,
  type InventoryCategoryOption,
} from "@/components/dashboard/expert/inventory-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import {
  deleteInventoryItem,
  reorderInventoryItem,
  toggleInventoryActive,
} from "@/lib/dashboard/expert-actions";
import {
  filterInventory,
  hasActiveFilters,
  isLowStock,
  EMPTY_FILTERS,
  type InventoryFilters,
  type InventorySort,
  type StockFilter,
} from "@/lib/inventory/filter";
import { INVENTORY_CONDITION_LABELS } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/** A catalogue row as this table draws it. */
export interface CatalogueInventoryItem extends EditableInventoryItem {
  currency: string;
  sort_order: number;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
}

const COLUMN_COUNT = 9;

export function InventoryList({
  fixerId,
  items,
  categories,
}: {
  fixerId: string;
  items: CatalogueInventoryItem[];
  categories: InventoryCategoryOption[];
}) {
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_FILTERS);

  const filtered = useMemo(
    () => filterInventory(items, filters, isLowStock),
    [items, filters],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No inventory yet"
        description="Parts and stock you sell over the counter. Customers see the name, price and whether it is in stock."
        action={
          <InventoryForm fixerId={fixerId} categories={categories}>
            <Button variant="primary">
              <Plus aria-hidden />
              Add your first item
            </Button>
          </InventoryForm>
        }
      />
    );
  }

  const isFiltering = hasActiveFilters(filters);
  const isCustomSort = filters.sort !== "manual";
  // Only manual sort permits reordering — an item moved up under "price: low to high"
  // implies changing its price to be lower than the one above it, which is nonsense.
  const canReorder = !isFiltering && !isCustomSort;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-machined border border-hairline bg-bench p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
            <Input
              type="search"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.categoryId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Select
            value={filters.stock}
            onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as StockFilter }))}
            aria-label="Filter by stock"
          >
            <option value="all">All stock</option>
            <option value="in_stock">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>

          <Select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as InventorySort }))}
            aria-label="Sort by"
          >
            <option value="manual">Custom order</option>
            <option value="name">Name (A-Z)</option>
            <option value="price_low">Price (Low-High)</option>
            <option value="price_high">Price (High-Low)</option>
            <option value="quantity_low">Quantity (Low-High)</option>
            <option value="quantity_high">Quantity (High-Low)</option>
            <option value="recent">Recently added</option>
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

      <div className="rounded-machined border border-hairline bg-bench shadow-sm overflow-hidden">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Listed</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              {canReorder ? <TableHead className="w-[88px] text-center">Order</TableHead> : null}
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canReorder ? COLUMN_COUNT - 1 : COLUMN_COUNT - 2} className="h-32 text-center text-steel">
                  No items match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, index) => (
                <InventoryRow
                  key={item.id}
                  fixerId={fixerId}
                  item={item}
                  categories={categories}
                  isFirst={index === 0}
                  isLast={index === filtered.length - 1}
                  canReorder={canReorder}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InventoryRow({
  fixerId,
  item,
  categories,
  isFirst,
  isLast,
  canReorder,
}: {
  fixerId: string;
  item: CatalogueInventoryItem;
  categories: InventoryCategoryOption[];
  isFirst: boolean;
  isLast: boolean;
  canReorder: boolean;
}) {
  const lowStock = isLowStock(item);

  return (
    <TableRow
      className={cn(
        "group transition-colors",
        !item.is_active && "bg-steel-wash/30 text-steel-soft",
      )}
    >
      <TableCell>
        <ActiveToggle item={item} fixerId={fixerId} />
      </TableCell>
      
      <TableCell className="max-w-[280px]">
        <div className="flex flex-col gap-0.5">
          <span className={cn("font-medium", !item.is_active && "text-steel")}>
            {item.name}
          </span>
          {(item.sku || item.category) && (
            <div className="flex items-center gap-2 text-xs text-steel-soft">
              {item.sku && <span className="font-mono">{item.sku}</span>}
              {item.sku && item.category && <span>•</span>}
              {item.category && <span>{item.category.name}</span>}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className={cn(!item.is_active && "text-steel")}>
        {INVENTORY_CONDITION_LABELS[item.condition]}
      </TableCell>

      <TableCell className="font-mono">
        {item.unit_price === null ? (
          <span className="text-steel-soft">Ask</span>
        ) : (
          `£${(item.unit_price / 100).toFixed(2)}`
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono", item.quantity === 0 && "text-rust font-bold")}>
            {item.quantity}
          </span>
          {item.quantity === 0 ? (
            <Badge variant="signal">Out</Badge>
          ) : lowStock ? (
            <Badge variant="signal">Low</Badge>
          ) : null}
        </div>
      </TableCell>

      {canReorder ? (
        <TableCell>
          <MoveButtons item={item} isFirst={isFirst} isLast={isLast} fixerId={fixerId} />
        </TableCell>
      ) : null}

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <InventoryForm fixerId={fixerId} categories={categories} item={item}>
            <Button variant="ghost" size="icon" className="size-8 [&_svg]:size-4" title="Edit item">
              <Pencil aria-hidden />
            </Button>
          </InventoryForm>
          <DeleteInventory item={item} fixerId={fixerId} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ActiveToggle({ item, fixerId }: { item: CatalogueInventoryItem; fixerId: string }) {
  const [state, formAction] = useActionState(toggleInventoryActive, BOOKING_INITIAL_STATE);

  return (
    <form action={formAction}>
      <input type="hidden" name="fixerId" value={fixerId} />
      <input type="hidden" name="id" value={item.id} />
      {/* 
        This is a hidden input whose value is the *opposite* of what is in the DB.
        If it's active, the form posts "isActive = false".
      */}
      <input type="hidden" name="isActive" value={item.is_active ? "false" : "true"} />
      
      <Switch
        type="submit"
        checked={item.is_active}
        title={item.is_active ? "Unlist item" : "List item"}
        aria-label={item.is_active ? "Unlist item" : "List item"}
      />
    </form>
  );
}

function MoveButtons({
  item,
  isFirst,
  isLast,
  fixerId,
}: {
  item: CatalogueInventoryItem;
  isFirst: boolean;
  isLast: boolean;
  fixerId: string;
}) {
  const [state, formAction] = useActionState(reorderInventoryItem, BOOKING_INITIAL_STATE);

  return (
    <form action={formAction} className="flex justify-center gap-1">
      <input type="hidden" name="fixerId" value={fixerId} />
      <input type="hidden" name="id" value={item.id} />
      
      <Button
        type="submit"
        name="direction"
        value="up"
        variant="ghost"
        size="icon"
        className="size-8 [&_svg]:size-4"
        disabled={isFirst}
        title="Move up"
      >
        <ChevronUp aria-hidden />
      </Button>
      <Button
        type="submit"
        name="direction"
        value="down"
        variant="ghost"
        size="icon"
        className="size-8 [&_svg]:size-4"
        disabled={isLast}
        title="Move down"
      >
        <ChevronDown aria-hidden />
      </Button>
    </form>
  );
}

function DeleteInventory({ item, fixerId }: { item: CatalogueInventoryItem; fixerId: string }) {
  const [state, formAction] = useActionState(deleteInventoryItem, BOOKING_INITIAL_STATE);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 [&_svg]:size-4" title="Delete item">
          <Trash2 aria-hidden className="text-rust" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-enamel">{item.name}</strong>?
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {state.error ? (
          <DialogBody>
            <p
              role="alert"
              className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          </DialogBody>
        ) : null}

        <form action={formAction}>
          <input type="hidden" name="fixerId" value={fixerId} />
          <input type="hidden" name="id" value={item.id} />
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <DeleteButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Deleting…" : "Delete item"}
    </Button>
  );
}
