"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ServiceForm,
  type EditableService,
  type ServiceCategoryOption,
} from "@/components/dashboard/expert/service-form";
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
  deleteService,
  reorderService,
  toggleServiceActive,
} from "@/lib/dashboard/expert-actions";
import { formatDuration, formatPriceRange } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The shop's catalogue, as its owner manages it.
 *
 * A client component because every control on a row is a server action taken
 * through `useActionState` — a toggle, two reorder arrows and a delete, each
 * needing its own state so a failed delete cannot post its message next to the
 * switch. Hooks cannot live in a `.map`, so a row is its own component.
 *
 * **Inactive rows are muted, never hidden.** `listShopServices` deliberately
 * returns them, and a service switched off is a service the owner may want back
 * — dropping it from this table would make deactivation indistinguishable from
 * deletion, which is precisely the mistake the switch exists to let them avoid.
 *
 * Reordering is two arrows writing `sort_order` through `reorderService`, not a
 * drag handle. Drag-and-drop would mean a dependency, a pointer-only
 * interaction and a gesture with no keyboard equivalent, to move a list that is
 * typically eight rows long.
 */

/** A catalogue row as this table draws it — an `ExpertService` satisfies it. */
export interface CatalogueService extends EditableService {
  currency: string;
  sort_order: number;
  category: { id: string; name: string; slug: string } | null;
}

export function ServiceList({
  fixerId,
  services,
  categories,
}: {
  fixerId: string;
  services: CatalogueService[];
  categories: ServiceCategoryOption[];
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No services yet"
        description="Services are what customers actually book. Until this shop lists one there is nothing for anyone to request, so no booking can reach you — not from search, not from your own page."
        action={
          <ServiceForm fixerId={fixerId} categories={categories}>
            <Button variant="primary">
              <Plus aria-hidden />
              Add your first service
            </Button>
          </ServiceForm>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Service</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="hidden sm:table-cell">Duration</TableHead>
            <TableHead className="hidden lg:table-cell">Available as</TableHead>
            <TableHead className="text-center">Bookable</TableHead>
            <TableHead className="text-right">
              {/* A visible header over a row of icon buttons is noise. */}
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {services.map((service, index) => (
            <ServiceRow
              key={service.id}
              fixerId={fixerId}
              categories={categories}
              service={service}
              index={index}
              total={services.length}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Every column of the table, so an error row can span the lot. */
const COLUMN_COUNT = 7;

function ServiceRow({
  fixerId,
  categories,
  service,
  index,
  total,
}: {
  fixerId: string;
  categories: ServiceCategoryOption[];
  service: CatalogueService;
  index: number;
  total: number;
}) {
  const [toggleState, toggleAction] = useActionState(
    toggleServiceActive,
    BOOKING_INITIAL_STATE,
  );
  const [moveState, moveAction] = useActionState(reorderService, BOOKING_INITIAL_STATE);
  const tDelivery = useTranslations("deliveryModes");

  // Both live in the same row, so they share one message line. They cannot
  // fail at the same moment — each is a separate submission — and showing the
  // toggle's refusal is more urgent than a stale reorder failure above it.
  const rowError = toggleState.error ?? moveState.error;

  // Retired rows keep every control at full contrast; only the content dims.
  // A greyed-out switch on a switched-off service would look like the one thing
  // the owner is not allowed to press, which is the opposite of the truth.
  const dim = service.is_active ? undefined : "text-steel-soft";

  return (
    <>
      <TableRow className={cn(!service.is_active && "bg-bench-sunk/60")}>
        <TableCell className="min-w-[16rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-medium",
                service.is_active ? "text-enamel" : "text-steel-soft",
              )}
            >
              {service.name}
            </span>
            {service.is_active ? null : <Badge variant="neutral">Switched off</Badge>}
          </div>

          {service.description ? (
            <p className={cn("max-w-[46ch] truncate pt-1 text-xs text-steel", dim)}>
              {service.description}
            </p>
          ) : null}
        </TableCell>

        <TableCell className={cn("hidden whitespace-nowrap text-sm md:table-cell", dim)}>
          {service.category?.name ?? <span className="text-steel-soft">—</span>}
        </TableCell>

        <TableCell
          className={cn("whitespace-nowrap font-mono tabular-nums text-sm", dim)}
        >
          {formatPriceRange(
            service.price_type,
            service.price_min,
            service.price_max,
            service.currency,
          )}
        </TableCell>

        <TableCell
          className={cn(
            "hidden whitespace-nowrap font-mono tabular-nums text-sm sm:table-cell",
            dim,
          )}
        >
          {formatDuration(service.duration_minutes)}
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          <div className="flex max-w-[20rem] flex-wrap gap-1">
            {service.delivery_modes.length === 0 ? (
              <span className="text-sm text-steel-soft">—</span>
            ) : (
              service.delivery_modes.map((mode) => (
                <Badge key={mode} variant="neutral">
                  {tDelivery(mode)}
                </Badge>
              ))
            )}
          </div>
        </TableCell>

        <TableCell className="text-center">
          <form action={toggleAction} className="inline-flex">
            <input type="hidden" name="id" value={service.id} />
            <ActiveToggle name={service.name} active={service.is_active} />
          </form>
        </TableCell>

        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <form action={moveAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={service.id} />
              <MoveButtons
                name={service.name}
                isFirst={index === 0}
                isLast={index === total - 1}
              />
            </form>

            <ServiceForm fixerId={fixerId} categories={categories} service={service}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${service.name}`}
              >
                <Pencil aria-hidden />
              </Button>
            </ServiceForm>

            <DeleteService id={service.id} name={service.name} />
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
 * The bookable switch, which submits the instant it is flipped.
 *
 * The posted value is a hidden input holding the *opposite* of what is stored,
 * not the switch's own state. Radix syncs its hidden checkbox in an effect,
 * which has not run by the time `requestSubmit` fires from the change handler —
 * so reading the switch would post the value it had a moment ago. The target
 * state is known here without asking it.
 *
 * While the write is in flight the thumb shows where it is going rather than
 * where it was: a switch that ignores a press for a round-trip reads as broken.
 * The truth arrives with the revalidated `active` prop, so nothing needs
 * reconciling afterwards.
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
          active ? `Stop taking bookings for ${name}` : `Take bookings for ${name}`
        }
        onCheckedChange={() => control.current?.form?.requestSubmit()}
      />
    </>
  );
}

/**
 * Up and down, submitting the same form.
 *
 * `name`/`value` on a submit button is what tells the action which way — one
 * form with two buttons rather than two forms, so the two can never be in
 * flight at once and land out of order.
 */
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

function DeleteService({ id, name }: { id: string; name: string }) {
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
        <DeleteServiceForm id={id} name={name} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inside `DialogContent` so a refusal does not survive the dialog being closed
 * and reopened. Nothing closes this on success — the row is gone from the
 * revalidated list, and this dialog goes with it.
 */
function DeleteServiceForm({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState(deleteService, BOOKING_INITIAL_STATE);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />

      <DialogHeader>
        <DialogTitle>Delete this service?</DialogTitle>
        <DialogDescription>
          {name} is removed from your catalogue and from your public page. If you
          only want to stop taking bookings for it, switch it off instead — that
          keeps it here for later.
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
      {pending ? "Deleting…" : "Delete service"}
    </Button>
  );
}
