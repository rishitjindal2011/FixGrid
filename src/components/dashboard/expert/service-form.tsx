"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { upsertService } from "@/lib/dashboard/expert-actions";
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  type PriceType,
} from "@/lib/types/marketplace";

/**
 * Add or edit one catalogue entry.
 *
 * The whole form lives inside `DialogContent`, which Radix unmounts on close.
 * That is what makes every reset here free: backing out of a half-typed service
 * and reopening starts from the stored row again, and the `priceType` state
 * below is re-seeded from props on mount rather than being pushed back into
 * sync afterwards. `react-hooks/set-state-in-effect` is an error in this repo,
 * so "remount instead of resync" is the only shape available — and it is also
 * the correct one.
 *
 * Prices are typed in POUNDS and stored as integer pence. The conversion
 * happens once, server-side in `upsertService`, which rejects a third decimal
 * rather than rounding it; this form therefore uses a text input with a decimal
 * keypad hint rather than `type="number"`, whose stepper would happily produce
 * a value the server is obliged to refuse.
 */

/**
 * The columns this form edits. Declared structurally rather than imported from
 * `@/lib/dashboard/expert`, which is `server-only` — an `ExpertService` row
 * satisfies this shape and passes straight in.
 */
export interface EditableService {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_type: PriceType;
  /** Pence. */
  price_min: number | null;
  /** Pence. */
  price_max: number | null;
  duration_minutes: number;
  delivery_modes: DeliveryMode[];
  warranty_days: number;
  is_active: boolean;
}

export interface ServiceCategoryOption {
  id: string;
  name: string;
}

/** The order the choices are offered in, cheapest commitment last. */
const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: "Fixed price",
  from: "From (a starting price)",
  quote: "Quote on inspection",
};

const DELIVERY_MODE_ORDER: readonly DeliveryMode[] = [
  "in_shop",
  "home_visit",
  "pickup_drop",
];

/** A new service starts here — three months' cover and a one-hour bench slot. */
const NEW_SERVICE_WARRANTY_DAYS = 90;
const NEW_SERVICE_DURATION_MINUTES = 60;

/** Pence back into the pounds string the form edits. Null renders empty. */
function poundsField(pence: number | null): string {
  return pence === null ? "" : (pence / 100).toFixed(2);
}

export function ServiceForm({
  fixerId,
  categories,
  service = null,
  children,
}: {
  fixerId: string;
  categories: ServiceCategoryOption[];
  /** Absent means "add". Present means "edit this row". */
  service?: EditableService | null;
  /** The control that opens the dialog — a `Button`, rendered as the trigger. */
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl">
        <ServiceFields fixerId={fixerId} categories={categories} service={service} />
      </DialogContent>
    </Dialog>
  );
}

function ServiceFields({
  fixerId,
  categories,
  service,
}: {
  fixerId: string;
  categories: ServiceCategoryOption[];
  service: EditableService | null;
}) {
  const [state, formAction] = useActionState(upsertService, BOOKING_INITIAL_STATE);

  // The one piece of client state on this form, and the only one that earns it:
  // whether the price inputs exist at all depends on it.
  const [priceType, setPriceType] = React.useState<PriceType>(
    service?.price_type ?? "fixed",
  );

  // Derived during render, every render. Nothing writes these back into state —
  // an effect mirroring `priceType` into a `showsPrice` flag is exactly the lint
  // error this file is written to avoid, and it would also leave the inputs a
  // frame behind the select that controls them.
  const showsPrice = priceType !== "quote";
  const showsUpperPrice = priceType === "fixed";

  const editing = service !== null;
  const fieldId = React.useId();
  const id = (field: string) => `${fieldId}-${field}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Changes show on your public page as soon as you save."
            : "This is what customers pick from when they book. Name it the way somebody searching would say it."}
        </DialogDescription>
      </DialogHeader>

      {/* On success the fields are replaced rather than left sitting there.
          Nothing closes the dialog from the action result — that would mean a
          setState in an effect — so without this a second press of Save would
          add the same service twice. */}
      {state.success ? (
        <>
          <DialogBody>
            <p
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
            >
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.message ?? "Service saved."}
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
          <input type="hidden" name="id" value={service?.id ?? ""} />

          <DialogBody className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("name")}>Name</Label>
              <Input
                id={id("name")}
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={service?.name ?? ""}
                placeholder="iPhone screen replacement"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("description")}>Description — optional</Label>
              <Textarea
                id={id("description")}
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={service?.description ?? ""}
                placeholder="What is included, what is not, and anything a customer should bring."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("category")}>Category</Label>
                <Select
                  id={id("category")}
                  name="categoryId"
                  defaultValue={service?.category_id ?? ""}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-steel-soft">
                  How customers filter the directory. Leave it unset and this service
                  only shows on your own page.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("priceType")}>How it is priced</Label>
                <Select
                  id={id("priceType")}
                  name="priceType"
                  value={priceType}
                  onChange={(event) => setPriceType(event.target.value as PriceType)}
                >
                  {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((value) => (
                    <option key={value} value={value}>
                      {PRICE_TYPE_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Hidden outright on `quote`, not disabled. A disabled price box
                still reads as "a price you are not allowed to set"; there is no
                price to set, and the row stores null rather than zero. */}
            {showsPrice ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id("priceMin")}>
                    {showsUpperPrice ? "Price" : "Starting price"}
                  </Label>
                  <Input
                    id={id("priceMin")}
                    name="priceMin"
                    type="text"
                    inputMode="decimal"
                    required
                    defaultValue={poundsField(service?.price_min ?? null)}
                    placeholder="49.99"
                    aria-describedby={id("priceHint")}
                  />
                  <p id={id("priceHint")} className="text-xs text-steel-soft">
                    Pounds and pence, like <span className="font-mono">49.99</span>.
                  </p>
                </div>

                {showsUpperPrice ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={id("priceMax")}>Upper price — optional</Label>
                    <Input
                      id={id("priceMax")}
                      name="priceMax"
                      type="text"
                      inputMode="decimal"
                      defaultValue={poundsField(service?.price_max ?? null)}
                      placeholder="89.99"
                      aria-describedby={id("priceMaxHint")}
                    />
                    <p id={id("priceMaxHint")} className="text-xs text-steel-soft">
                      Set this and the service advertises a range instead of one figure.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("duration")}>Time on the bench — minutes</Label>
                <Input
                  id={id("duration")}
                  name="durationMinutes"
                  type="number"
                  required
                  min={5}
                  max={1440}
                  step={5}
                  defaultValue={service?.duration_minutes ?? NEW_SERVICE_DURATION_MINUTES}
                  className="font-mono tabular-nums"
                  aria-describedby={id("durationHint")}
                />
                <p id={id("durationHint")} className="text-xs text-steel-soft">
                  How long a slot this books out of your diary.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("warranty")}>Warranty — days</Label>
                <Input
                  id={id("warranty")}
                  name="warrantyDays"
                  type="number"
                  required
                  min={0}
                  max={3650}
                  step={1}
                  defaultValue={service?.warranty_days ?? NEW_SERVICE_WARRANTY_DAYS}
                  className="font-mono tabular-nums"
                  aria-describedby={id("warrantyHint")}
                />
                <p id={id("warrantyHint")} className="text-xs text-steel-soft">
                  Your payout for this job is held until the cover runs out.
                  Zero means none.
                </p>
              </div>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow pb-2">
                Available as — pick at least one
              </legend>

              <div className="flex flex-col gap-2.5">
                {DELIVERY_MODE_ORDER.map((mode) => (
                  <div key={mode} className="flex items-center gap-2.5">
                    <Checkbox
                      id={id(mode)}
                      name="deliveryModes"
                      value={mode}
                      defaultChecked={
                        service
                          ? service.delivery_modes.includes(mode)
                          : mode === "in_shop"
                      }
                    />
                    <label
                      htmlFor={id(mode)}
                      className="text-sm leading-relaxed text-enamel"
                    >
                      {DELIVERY_MODE_LABELS[mode]}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex items-start justify-between gap-4 rounded-machined border border-hairline bg-bench px-4 py-3">
              <div className="max-w-prose">
                <label
                  htmlFor={id("isActive")}
                  className="font-display text-base uppercase tracking-wide text-enamel"
                >
                  Bookable
                </label>
                <p id={id("activeHint")} className="pt-1 text-sm leading-relaxed text-steel">
                  Switched off, this stays in your catalogue but nobody can book it.
                  Existing bookings against it are untouched.
                </p>
              </div>

              <Switch
                id={id("isActive")}
                name="isActive"
                defaultChecked={service?.is_active ?? true}
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
      {pending ? "Saving…" : editing ? "Save changes" : "Add service"}
    </Button>
  );
}
