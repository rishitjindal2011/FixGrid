"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Barcode, Smartphone } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { PhoneScannerBridge } from "@/components/dashboard/expert/phone-scanner-bridge";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { upsertInventoryItem } from "@/lib/dashboard/expert-actions";
import { type InventoryCondition } from "@/lib/types/marketplace";

/**
 * Add or edit one stock item.
 *
 * Built on the same bones as `service-form.tsx`, for the same reasons: the whole
 * form sits inside `DialogContent`, which Radix unmounts on close, so backing
 * out of a half-typed item and reopening starts from the stored row again with
 * no reset code and no effect. On success the fields are *replaced* by a
 * confirmation — a second press of Save would otherwise add the same part twice.
 *
 * Price is typed in RUPEES and stored as integer paise, converted once in
 * `upsertInventoryItem`, which refuses a third decimal rather than rounding it.
 * Hence `type="text" inputMode="decimal"` and not `type="number"`, whose stepper
 * produces values the server is obliged to reject.
 *
 * Quantity and the low-stock threshold *are* `type="number"` — they are whole
 * counts, the stepper cannot produce anything the server refuses, and a keypad
 * is the right affordance for a number you nudge up and down while stocktaking.
 */

/**
 * The columns this form edits. Declared structurally rather than imported from
 * `@/lib/dashboard/expert`, which is `server-only` — an `ExpertInventoryItem`
 * row satisfies this shape and passes straight in.
 */
export interface EditableInventoryItem {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  condition: InventoryCondition;
  /** Pence. Null means "price on request". */
  unit_price: number | null;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

export interface InventoryCategoryOption {
  id: string;
  name: string;
}

const CONDITION_ORDER: readonly InventoryCondition[] = [
  "new",
  "refurbished",
  "used",
];

/** A new item starts flagged at 2 — enough warning to reorder before zero. */
const NEW_ITEM_THRESHOLD = 2;

/** Paise back into the rupees string the form edits. Null renders empty. */
function rupeesField(pence: number | null): string {
  return pence === null ? "" : (pence / 100).toFixed(2);
}

/**
 * `condition` is a bare enum; its translated label lives under the
 * `expert.inventory` namespace, keyed by condition.
 */
function conditionLabel(t: (key: string) => string, c: InventoryCondition): string {
  return t(
    c === "new"
      ? "conditionNew"
      : c === "refurbished"
        ? "conditionRefurbished"
        : "conditionUsed",
  );
}

export function InventoryForm({
  fixerId,
  categories,
  item = null,
  children,
}: {
  fixerId: string;
  categories: InventoryCategoryOption[];
  /** Absent means "add". Present means "edit this row". */
  item?: EditableInventoryItem | null;
  /** The control that opens the dialog — a `Button`, rendered as the trigger. */
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl">
        <InventoryFields fixerId={fixerId} categories={categories} item={item} />
      </DialogContent>
    </Dialog>
  );
}

function InventoryFields({
  fixerId,
  categories,
  item,
}: {
  fixerId: string;
  categories: InventoryCategoryOption[];
  item: EditableInventoryItem | null;
}) {
  const [state, formAction] = useActionState(
    upsertInventoryItem,
    BOOKING_INITIAL_STATE,
  );

  const [skuVal, setSkuVal] = React.useState(item?.sku ?? "");
  const [showBarcodeScanner, setShowBarcodeScanner] = React.useState(false);

  const t = useTranslations("expert.inventory");
  const editing = item !== null;
  const fieldId = React.useId();
  const id = (field: string) => `${fieldId}-${field}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit item" : "Add an item"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Changes show on your public page as soon as you save."
            : "Parts and stock you sell over the counter. Customers see the name, price and whether it is in stock."}
        </DialogDescription>
      </DialogHeader>

      {state.success ? (
        <>
          <DialogBody>
            <p
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
            >
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.message ?? "Item saved."}
            </p>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Done</Button>
            </DialogClose>
          </DialogFooter>
        </>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="fixerId" value={fixerId} />
          <input type="hidden" name="id" value={item?.id ?? ""} />

          <DialogBody className="flex flex-col gap-5">
            {/* Item Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("name")}>Item name</Label>
              <Input
                id={id("name")}
                name="name"
                required
                minLength={1}
                maxLength={160}
                defaultValue={item?.name ?? ""}
                placeholder="e.g. iPhone 14 Pro OLED Display / USB-C Charging Port"
              />
            </div>

            {/* Product Barcode Section (ANY ANY ANY BARCODE) */}
            <div className="rounded-xl border border-hairline bg-bench/60 p-3.5 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#ea580c]/10 text-[#ea580c]">
                    <Barcode className="size-4" />
                  </div>
                  <div>
                    <Label htmlFor={id("sku")} className="text-xs font-bold text-enamel uppercase tracking-wide">
                      Product Barcode / Item Code
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Any Barcode Accepted
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                    className="h-7 gap-1 px-2.5 text-xs text-[#ea580c] border-[#ea580c]/30 hover:bg-[#ea580c]/10"
                  >
                    <Smartphone className="size-3" />
                    <span>{showBarcodeScanner ? "Close Scanner" : "Scan Barcode (Phone / PC)"}</span>
                  </Button>
                </div>
              </div>

              {showBarcodeScanner ? (
                <div className="my-1">
                  <PhoneScannerBridge
                    purpose="inventory_barcode"
                    onCodeReceived={(code) => {
                      setSkuVal(code);
                      setShowBarcodeScanner(false);
                    }}
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <Input
                  id={id("sku")}
                  name="sku"
                  value={skuVal}
                  onChange={(e) => setSkuVal(e.target.value)}
                  maxLength={64}
                  placeholder="Scan or enter ANY barcode (e.g. 8901030865432, EAN, UPC, Code 128, QR, Serial #)"
                  className="font-mono uppercase text-sm"
                  aria-describedby={id("skuHint")}
                />
              </div>
              <p id={id("skuHint")} className="text-[11px] text-steel leading-relaxed">
                Scan or enter <strong>any product barcode</strong> (EAN-13, UPC, Code 128, Code 39, QR code, Serial #, or custom SKU). Enables fast barcode lookup during billing, repairs, and stock check.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("description")}>Description — optional</Label>
              <Textarea
                id={id("description")}
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={item?.description ?? ""}
                placeholder="What it fits, what is in the box, and anything a customer should know before buying."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("brand")}>Brand — optional</Label>
                <Input
                  id={id("brand")}
                  name="brand"
                  maxLength={80}
                  defaultValue={item?.brand ?? ""}
                  placeholder="Apple"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("category")}>Category</Label>
                <Select
                  id={id("category")}
                  name="categoryId"
                  defaultValue={item?.category_id ?? ""}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("condition")}>Condition</Label>
                <Select
                  id={id("condition")}
                  name="condition"
                  defaultValue={item?.condition ?? "new"}
                >
                  {CONDITION_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {conditionLabel(t, value)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("price")}>Price — optional</Label>
                <Input
                  id={id("price")}
                  name="price"
                  type="text"
                  inputMode="decimal"
                  defaultValue={rupeesField(item?.unit_price ?? null)}
                  placeholder="49.99"
                  className="font-mono tabular-nums"
                  aria-describedby={id("priceHint")}
                />
                {/* Blank is a real answer, and the only one that reads
                    correctly on the public page. Zero would advertise it free. */}
                <p id={id("priceHint")} className="text-xs text-steel-soft">
                  Leave blank and it shows as{" "}
                  <span className="text-enamel">Price on request</span>.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("quantity")}>Quantity in stock</Label>
                <Input
                  id={id("quantity")}
                  name="quantity"
                  type="number"
                  required
                  min={0}
                  max={1000000}
                  step={1}
                  defaultValue={item?.quantity ?? 0}
                  className="font-mono tabular-nums"
                  aria-describedby={id("quantityHint")}
                />
                <p id={id("quantityHint")} className="text-xs text-steel-soft">
                  Zero shows as out of stock, not hidden.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("threshold")}>Low-stock alert at</Label>
                <Input
                  id={id("threshold")}
                  name="threshold"
                  type="number"
                  required
                  min={0}
                  max={1000000}
                  step={1}
                  defaultValue={item?.low_stock_threshold ?? NEW_ITEM_THRESHOLD}
                  className="font-mono tabular-nums"
                  aria-describedby={id("thresholdHint")}
                />
                <p id={id("thresholdHint")} className="text-xs text-steel-soft">
                  Flagged here on your list only. Zero turns it off.
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-machined border border-hairline bg-bench px-4 py-3">
              <div className="max-w-prose">
                <label
                  htmlFor={id("isActive")}
                  className="font-display text-base uppercase tracking-wide text-enamel"
                >
                  Listed publicly
                </label>
                <p id={id("activeHint")} className="pt-1 text-sm leading-relaxed text-steel">
                  Switched off, this stays in your stock list but nobody outside
                  the shop can see it. Use it for parts you are still pricing up.
                </p>
              </div>

              <Switch
                id={id("isActive")}
                name="isActive"
                defaultChecked={item?.is_active ?? true}
                aria-describedby={id("activeHint")}
                className="mt-1 shrink-0"
              />
            </div>

            {state.error ? (
              <p
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {state.error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SaveButton editing={editing} />
          </DialogFooter>
        </form>
      )}
    </>
  );
}

/** Separate component because `useFormStatus` reads the enclosing form. */
function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save changes" : "Add item"}
    </Button>
  );
}
