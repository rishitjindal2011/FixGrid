"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
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
import { Label } from "@/components/ui/label";
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
import { formatMoney } from "@/lib/format";
import {
  EMPTY_FILTERS,
  filterInventory,
  hasActiveFilters,
  isLowStock,
  type InventoryFilters,
  type InventorySort,
  type StockFilter,
} from "@/lib/inventory/filter";
import {
  INVENTORY_CONDITION_LABELS,
  type InventoryCondition,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * The shop's stock, as its owner manages it.
 *
 * Same bones as `service-list.tsx` — a client component because every control on
 * a row is a server action through `useActionState`, and hooks cannot live in a
 * `.map`, so a row is its own component. Unlisted rows are muted, never hidden:
 * dropping them would make unlisting indistinguishable from deleting.
 *
 * What this adds over the catalogue is a toolbar. A shop with eight services has
 * no use for search; a shop with four hundred screen types cannot work without
 * it. Filtering happens **in the browser over the already-loaded array**, not by
 * refetching — the whole stock list is one query the page already made, the
 * dataset is bounded by what one shop stocks, and a round-trip per keystroke
 * would make the search feel worse than no search at all.
 *
 * ### Reordering and sorting do not mix
 *
 * The move arrows write `sort_order`, which is the "manual" sort. Under any
 * other sort the arrows would still swap two rows in *stored* order — a write
 * with no visible effect, or worse, a visible jump somewhere else in the list.
 * So they are hidden outside manual order, with a line of explanation, rather
 * than left present and lying.
 */

/** A stock row as this table draws it — an `ExpertInventoryItem` satisfies it. */
export interface InventoryTableItem extends EditableInventoryItem {
  currency: string;
  sort_order: number;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
}

const SORT_LABELS: Record<InventorySort, string> = {
  manual: "Your order",
  name: "Name A–Z",
  price_low: "Price: low to high",
  price_high: "Price: high to low",
  quantity_high: "Quantity: most first",
  quantity_low: "Quantity: least first",
  recent: "Recently added",
};

const STOCK_LABELS: Record<StockFilter, string> = {
  all: "Any stock level",
  in_stock: "In stock",
  low: "Running low",
  out: "Out of stock",
};

/** Every column of the table, so an error row can span the lot. */
const COLUMN_COUNT = 8;

export function InventoryList({
  fixerId,
  items,
  categories,
}: {
  fixerId: string;
  items: InventoryTableItem[];
  categories: InventoryCategoryOption[];
}) {
  const [filters, setFilters] = React.useState<InventoryFilters>(EMPTY_FILTERS);

  // Derived during render, every render. Nothing is mirrored into state — the
  // filtered array is a function of props and the controls above it, and
  // `react-hooks/set-state-in-effect` is an error in this repo anyway.
  const visible = filterInventory(items, filters, isLowStock);
  const filtering = hasActiveFilters(filters);
  const manualOrder = filters.sort === "manual";

  // Only the categories this shop actually stocks. Offering all forty when the
  // shop files everything under two is a filter that mostly returns nothing.
  const usedCategories = categories.filter((category) =>
    items.some((item) => item.category_id === category.id),
  );

  const update = (patch: Partial<InventoryFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="Nothing in stock yet"
        description="Add the parts and accessories you sell over the counter. Customers see them on your public page with the price and whether you have any in — which is what stops the phone call that only asks that."
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

  return (
    <div className="flex flex-col gap-4">
      <InventoryToolbar
        filters={filters}
        onChange={update}
        onClear={() => setFilters(EMPTY_FILTERS)}
        categories={usedCategories}
        filtering={filtering}
      />

      <p
        role="status"
        aria-live="polite"
        className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel"
      >
        {visible.length === items.length
          ? `${items.length} ${items.length === 1 ? "item" : "items"}`
          : `${visible.length} of ${items.length} items`}
        {manualOrder ? null : ` · sorted by ${SORT_LABELS[filters.sort].toLowerCase()}`}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches"
          description="No item in your stock list matches those filters. Widen them or clear them to see everything again."
          action={
            <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X aria-hidden />
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="hidden lg:table-cell">Item ID</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Condition</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">In stock</TableHead>
                <TableHead className="text-center">Listed</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((item, index) => (
                <InventoryRow
                  key={item.id}
                  fixerId={fixerId}
                  categories={categories}
                  item={item}
                  // Only meaningful in manual order, which is the only place the
                  // arrows render — see the note at the top of this file.
                  isFirst={index === 0}
                  isLast={index === visible.length - 1}
                  reorderable={manualOrder && !filtering}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {manualOrder && filtering ? (
        <p className="text-xs leading-relaxed text-steel-soft">
          Reordering is switched off while the list is filtered — moving a row
          you can see past rows you cannot would change an order you are not
          looking at. Clear the filters to arrange your stock.
        </p>
      ) : null}
      {manualOrder ? null : (
        <p className="text-xs leading-relaxed text-steel-soft">
          Switch back to{" "}
          <span className="text-enamel">{SORT_LABELS.manual}</span> to rearrange
          items. The order you set there is the order customers see.
        </p>
      )}
    </div>
  );
}

function InventoryToolbar({
  filters,
  onChange,
  onClear,
  categories,
  filtering,
}: {
  filters: InventoryFilters;
  onChange: (patch: Partial<InventoryFilters>) => void;
  onClear: () => void;
  categories: InventoryCategoryOption[];
  filtering: boolean;
}) {
  const fieldId = React.useId();
  const id = (field: string) => `${fieldId}-${field}`;

  return (
    <div className="flex flex-col gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("search")}>Search your stock</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
          />
          <Input
            id={id("search")}
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Name, item ID, brand…"
            className="pl-9"
            aria-describedby={id("searchHint")}
          />
        </div>
        <p id={id("searchHint")} className="text-xs text-steel-soft">
          Every word has to appear somewhere on the item, in any order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("stock")}>Stock level</Label>
          <Select
            id={id("stock")}
            value={filters.stock}
            onChange={(event) =>
              onChange({ stock: event.target.value as StockFilter })
            }
          >
            {(Object.keys(STOCK_LABELS) as StockFilter[]).map((value) => (
              <option key={value} value={value}>
                {STOCK_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("condition")}>Condition</Label>
          <Select
            id={id("condition")}
            value={filters.condition}
            onChange={(event) => onChange({ condition: event.target.value })}
          >
            <option value="">Any condition</option>
            {(
              Object.keys(INVENTORY_CONDITION_LABELS) as InventoryCondition[]
            ).map((value) => (
              <option key={value} value={value}>
                {INVENTORY_CONDITION_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        {/* Hidden outright when the shop files nothing under a category — a
            select with one option is a control that cannot do anything. */}
        {categories.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("category")}>Category</Label>
            <Select
              id={id("category")}
              value={filters.categoryId}
              onChange={(event) => onChange({ categoryId: event.target.value })}
            >
              <option value="">Any category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("sort")}>Sort by</Label>
          <Select
            id={id("sort")}
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as InventorySort })
            }
          >
            {(Object.keys(SORT_LABELS) as InventorySort[]).map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtering ? (
        <div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X aria-hidden />
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function InventoryRow({
  fixerId,
  categories,
  item,
  isFirst,
  isLast,
  reorderable,
}: {
  fixerId: string;
  categories: InventoryCategoryOption[];
  item: InventoryTableItem;
  isFirst: boolean;
  isLast: boolean;
  reorderable: boolean;
}) {
  const [toggleState, toggleAction] = useActionState(
    toggleInventoryActive,
    BOOKING_INITIAL_STATE,
  );
  const [moveState, moveAction] = useActionState(
    reorderInventoryItem,
    BOOKING_INITIAL_STATE,
  );

  const rowError = toggleState.error ?? moveState.error;
  const dim = item.is_active ? undefined : "text-steel-soft";

  const out = item.quantity === 0;
  const low = isLowStock(item);

  return (
    <>
      <TableRow className={cn(!item.is_active && "bg-bench-sunk/60")}>
        <TableCell className="min-w-[15rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-medium",
                item.is_active ? "text-enamel" : "text-steel-soft",
              )}
            >
              {item.name}
            </span>
            {item.is_active ? null : <Badge variant="neutral">Unlisted</Badge>}
          </div>

          {item.brand ? (
            <p className={cn("pt-1 text-xs text-steel", dim)}>{item.brand}</p>
          ) : null}

          {/* The item ID rides along under the name on narrow screens, where
              its own column is hidden — it is the field an owner searches by,
              so it cannot be the one that disappears on a phone. */}
          {item.sku ? (
            <p className="pt-1 font-mono text-xs uppercase text-steel-soft lg:hidden">
              {item.sku}
            </p>
          ) : null}
        </TableCell>

        <TableCell
          className={cn(
            "hidden whitespace-nowrap font-mono text-xs uppercase lg:table-cell",
            dim,
          )}
        >
          {item.sku ?? <span className="text-steel-soft">—</span>}
        </TableCell>

        <TableCell className={cn("hidden whitespace-nowrap text-sm md:table-cell", dim)}>
          {item.category?.name ?? <span className="text-steel-soft">—</span>}
        </TableCell>

        <TableCell className={cn("hidden whitespace-nowrap text-sm sm:table-cell", dim)}>
          {INVENTORY_CONDITION_LABELS[item.condition]}
        </TableCell>

        <TableCell
          className={cn(
            "whitespace-nowrap text-right font-mono tabular-nums text-sm",
            dim,
          )}
        >
          {item.unit_price === null ? (
            <span className="text-steel-soft">On request</span>
          ) : (
            formatMoney(item.unit_price, item.currency)
          )}
        </TableCell>

        <TableCell className="whitespace-nowrap text-right">
          <span
            className={cn(
              "font-mono tabular-nums text-sm",
              out ? "text-rust" : low ? "text-signal" : dim,
            )}
          >
            {item.quantity}
          </span>
          {out ? (
            <span className="block pt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-rust">
              Out
            </span>
          ) : low ? (
            <span className="block pt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
              Low
            </span>
          ) : null}
        </TableCell>

        <TableCell className="text-center">
          <form action={toggleAction} className="inline-flex">
            <input type="hidden" name="id" value={item.id} />
            <ActiveToggle name={item.name} active={item.is_active} />
          </form>
        </TableCell>

        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {reorderable ? (
              <form action={moveAction} className="flex items-center gap-1">
                <input type="hidden" name="id" value={item.id} />
                <MoveButtons name={item.name} isFirst={isFirst} isLast={isLast} />
              </form>
            ) : null}

            <InventoryForm fixerId={fixerId} categories={categories} item={item}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${item.name}`}
              >
                <Pencil aria-hidden />
              </Button>
            </InventoryForm>

            <DeleteItem id={item.id} name={item.name} />
          </div>
        </TableCell>
      </TableRow>

      {rowError ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="pt-0">
            <p
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-sm leading-relaxed text-rust"
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {rowError}
            </p>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

/**
 * The listed switch, which submits the instant it is flipped.
 *
 * The posted value is a hidden input holding the *opposite* of what is stored,
 * not the switch's own state: Radix syncs its hidden checkbox in an effect,
 * which has not run by the time `requestSubmit` fires from the change handler,
 * so reading the switch would post the value it had a moment ago.
 */
function ActiveToggle({ name, active }: { name: string; active: boolean }) {
  const { pending } = useFormStatus();
  const control = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Switch
        ref={control}
        checked={pending ? !active : active}
        disabled={pending}
        aria-label={
          active ? `Hide ${name} from your public page` : `Show ${name} publicly`
        }
        onCheckedChange={() => control.current?.form?.requestSubmit()}
      />
    </>
  );
}

/** One form, two submits — the two can never be in flight at once. */
function MoveButtons({
  name,
  isFirst,
  isLast,
}: {
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="submit"
        name="direction"
        value="up"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={pending || isFirst}
        aria-label={`Move ${name} up`}
      >
        <ChevronUp aria-hidden />
      </Button>
      <Button
        type="submit"
        name="direction"
        value="down"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={pending || isLast}
        aria-label={`Move ${name} down`}
      >
        <ChevronDown aria-hidden />
      </Button>
    </>
  );
}

function DeleteItem({ id, name }: { id: string; name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-steel hover:bg-rust-wash hover:text-rust"
          aria-label={`Delete ${name}`}
        >
          <Trash2 aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DeleteItemForm id={id} name={name} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inside `DialogContent` so a refusal does not survive the dialog being closed
 * and reopened. Nothing closes this on success — the row is gone from the
 * revalidated list, and this dialog goes with it.
 */
function DeleteItemForm({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState(
    deleteInventoryItem,
    BOOKING_INITIAL_STATE,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />

      <DialogHeader>
        <DialogTitle>Delete this item?</DialogTitle>
        <DialogDescription>
          {name} is removed from your stock list and from your public page. If
          you have simply run out, set the quantity to zero instead — that keeps
          it listed and tells customers to ask.
        </DialogDescription>
      </DialogHeader>

      {state.error ? (
        <DialogBody>
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        </DialogBody>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Keep it
          </Button>
        </DialogClose>
        <DeleteButton />
      </DialogFooter>
    </form>
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
