"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { SlotPicker } from "@/components/dashboard/slot-picker";
import { BookingFaultPhotos, BookingSubmitSpinner } from "@/components/dashboard/booking-fault-photos";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBooking } from "@/lib/bookings/actions";
import { uploadBookingFaultPhotos } from "@/lib/bookings/attachments-client";
import {
  generateSlots,
  groupSlotsByDay,
  type Slot,
  type SlotRule,
} from "@/lib/bookings/slots";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { formatDuration, formatPriceRange, formatSlot } from "@/lib/format";
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  type PriceType,
} from "@/lib/types/marketplace";
import type { SavedAddress } from "@/lib/dashboard/addresses";
import { cn } from "@/lib/utils";

/**
 * The booking request form.
 *
 * The one rule this file is built around: **nothing derived is ever stored.**
 * Picking a service changes the duration, which changes every slot boundary,
 * which can invalidate a time already chosen. The obvious implementation syncs
 * price, duration and selection into state from an effect; that is a lint error
 * here (`react-hooks/set-state-in-effect`) and it is a lint error for a reason —
 * it paints one frame of stale numbers before correcting itself, and on a page
 * whose whole job is quoting a price that frame is a lie.
 *
 * So three things are state — the service id, the delivery mode the customer
 * clicked, and the slot start they clicked — and everything else is computed
 * during render from those three. A slot that no longer exists at the new
 * duration resolves to `null` and the submit button says why.
 *
 * Slots are generated here rather than on the server for the same reason: the
 * duration is a client choice. `@/lib/bookings/slots` is pure and has no
 * Supabase import precisely so it can run on both sides of the boundary.
 */

/** A service as this form needs it — paise and minutes, never rupees or hours. */
export interface BookingFormService {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  /** Pence. */
  priceMin: number | null;
  /** Pence. */
  priceMax: number | null;
  currency: string;
  durationMinutes: number;
  deliveryModes: DeliveryMode[];
  warrantyDays: number;
}

/**
 * Everything `generateSlots` needs, serialised.
 *
 * Instants cross the server boundary as ISO strings and are revived inside the
 * memo below. `nowIso` is the server's request time rather than a fresh
 * `new Date()` — the lead-hours window is computed from it, and a client clock
 * running two minutes fast would otherwise offer a slot the server then refuses.
 */
export interface BookingSlotSource {
  rules: SlotRule[];
  /**
   * Merged busy ranges from `shop_busy_periods`. Deliberately fed to
   * `generateSlots` as `timeOff` rather than `booked`: the function merges
   * closures and jobs into opaque blocks with no count, so there is nothing to
   * weigh against a rule's capacity. Blanking the slot outright over-blocks a
   * multi-bench shop, which is the safe direction — the exclusion constraint on
   * `bookings.slot` is what actually stops a double booking, and it surfaces as
   * "that slot was just taken" after the customer has already committed.
   */
  busyIso: Array<{ start: string; end: string }>;
  leadHours: number;
  horizonDays: number;
  fromIso: string;
  toIso: string;
  nowIso: string;
}

export interface BookingFormProps {
  /** The customer's saved addresses, default first. Empty is fine. */
  addresses: SavedAddress[];
  fixerId: string;
  shopName: string;
  /** IANA name. Every time on this page is rendered in it. */
  timezone: string;
  services: BookingFormService[];
  /** Modes the shop offers at all, from the `offers_*` flags on the profile. */
  shopModes: DeliveryMode[];
  slotSource: BookingSlotSource;
  /** Used when the shop lists no services, so the grid still has a stride. */
  fallbackDurationMinutes: number;
  /** The shop's `default_warranty_days`, for services that do not set their own. */
  defaultWarrantyDays: number;
}

/** Radio value meaning "type a new one". Not a uuid, so it cannot collide. */
const NEW_ADDRESS = "new";

const ADDRESS_MODES: readonly DeliveryMode[] = ["home_visit", "pickup_drop"];

export function BookingForm({
  fixerId,
  shopName,
  timezone,
  services,
  shopModes,
  slotSource,
  fallbackDurationMinutes,
  defaultWarrantyDays,
  addresses,
}: BookingFormProps) {
  const router = useRouter();
  const [state, setState] = React.useState(BOOKING_INITIAL_STATE);
  const [pending, setPending] = React.useState(false);
  const [faultPhotos, setFaultPhotos] = React.useState<File[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(BOOKING_INITIAL_STATE);

    const formData = new FormData(event.currentTarget);
    const result = await createBooking(BOOKING_INITIAL_STATE, formData);

    if (result.success && result.bookingId && faultPhotos.length > 0) {
      await uploadBookingFaultPhotos(result.bookingId, faultPhotos);
    }

    setState(result);
    setPending(false);

    if (result.success && result.reference) {
      router.push(`/dashboard/bookings/${encodeURIComponent(result.reference)}`);
    }
  }

  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [modeChoice, setModeChoice] = React.useState<DeliveryMode | null>(null);
  const [selectedStart, setSelectedStart] = React.useState<string | null>(null);

  /*
   * The address book, if the customer has one.
   *
   * Opens on their default so the common case — booking a home visit to the
   * house they always book to — is zero typing. With no saved addresses this is
   * `NEW_ADDRESS` and the form behaves exactly as it did before the book existed.
   *
   * The four fields are controlled rather than defaulted, because choosing a
   * different saved address has to *replace* what is in them. `defaultValue`
   * only seeds the first render, so a second pick would leave the first
   * address's postcode sitting under the new one's street.
   */
  const initialAddress =
    addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

  const [addressChoice, setAddressChoice] = React.useState<string>(
    initialAddress?.id ?? NEW_ADDRESS,
  );

  const chosenAddress = addresses.find((address) => address.id === addressChoice) ?? null;
  const usingSavedAddress = chosenAddress !== null;

  // Seeded from the initially selected address, not empty — the hidden inputs
  // are what actually get submitted, so starting them blank would post an empty
  // line1 for anyone who accepted the preselected address without touching it.
  const [line1, setLine1] = React.useState(initialAddress?.line1 ?? "");
  const [line2, setLine2] = React.useState(initialAddress?.line2 ?? "");
  const [city, setCity] = React.useState(initialAddress?.city ?? "");
  const [postcode, setPostcode] = React.useState(initialAddress?.postcode ?? "");

  // Applied in the event handler, not an effect: `react-hooks/set-state-in-effect`
  // is an error in this config, and the copy only ever needs to happen when a
  // radio is clicked.
  function pickAddress(id: string) {
    setAddressChoice(id);

    const picked = addresses.find((address) => address.id === id) ?? null;
    setLine1(picked?.line1 ?? "");
    setLine2(picked?.line2 ?? "");
    setCity(picked?.city ?? "");
    setPostcode(picked?.postcode ?? "");
  }

  /* ── Derived during render, in dependency order ─────────────────────────── */

  // Falling back to the first service rather than null: a hand-cleared select
  // should not leave the price panel showing a dash while a duration is still
  // being used to cut the grid.
  const service = services.find((item) => item.id === serviceId) ?? services[0] ?? null;
  const durationMinutes = service?.durationMinutes ?? fallbackDurationMinutes;
  const warrantyDays = service?.warrantyDays ?? defaultWarrantyDays;

  // A service may offer fewer modes than the shop does — a bench-only diagnostic
  // on a shop that also does home visits. The intersection is what is bookable,
  // and it is never empty: a service listing nothing falls back to the shop.
  const modes = React.useMemo(() => {
    const offered = service?.deliveryModes?.length ? service.deliveryModes : shopModes;
    const allowed = offered.filter((mode) => shopModes.includes(mode));
    if (allowed.length > 0) return allowed;
    return shopModes.length > 0 ? shopModes : (["in_shop"] as DeliveryMode[]);
  }, [service, shopModes]);

  // The clicked mode only survives while the chosen service still offers it.
  const deliveryMode: DeliveryMode =
    modeChoice && modes.includes(modeChoice) ? modeChoice : (modes[0] ?? "in_shop");
  const needsAddress = ADDRESS_MODES.includes(deliveryMode);

  const days = React.useMemo(() => {
    const slots = generateSlots({
      rules: slotSource.rules,
      booked: [],
      timeOff: slotSource.busyIso.map((period) => ({
        start: new Date(period.start),
        end: new Date(period.end),
      })),
      durationMinutes,
      timezone,
      from: new Date(slotSource.fromIso),
      to: new Date(slotSource.toIso),
      leadHours: slotSource.leadHours,
      horizonDays: slotSource.horizonDays,
      now: new Date(slotSource.nowIso),
    });

    return groupSlotsByDay(slots, timezone);
  }, [slotSource, durationMinutes, timezone]);

  // The selection is re-resolved against the current grid every render. Change
  // the service and a 45-minute slot at 09:45 simply stops existing; this
  // returns null and the submit hint asks for a new time rather than posting a
  // boundary the shop's diary never had.
  const selected: Slot | null = React.useMemo(() => {
    if (!selectedStart) return null;
    for (const day of days) {
      for (const slot of day.slots) {
        if (slot.available && slot.start.toISOString() === selectedStart) return slot;
      }
    }
    return null;
  }, [days, selectedStart]);

  const hasTimes = days.some((day) => day.slots.some((slot) => slot.available));

  if (state.success) {
    return <RequestSent shopName={shopName} message={state.message} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="fixerId" value={fixerId} />
      <input type="hidden" name="serviceId" value={service?.id ?? ""} />
      <input type="hidden" name="deliveryMode" value={deliveryMode} />
      <input type="hidden" name="slotStart" value={selected ? selected.start.toISOString() : ""} />
      <input type="hidden" name="slotEnd" value={selected ? selected.end.toISOString() : ""} />

      {/* ── What ───────────────────────────────────────────────────────────── */}
      <Panel step={1} title="What needs fixing">
        {services.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-service" className="eyebrow">
              Service
            </label>
            <Select
              id="booking-service"
              value={service?.id ?? ""}
              onChange={(event) => setServiceId(event.target.value)}
              aria-describedby="booking-service-summary"
            >
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatDuration(item.durationMinutes)}
                </option>
              ))}
            </Select>

            {service?.description ? (
              <p className="pt-0.5 text-sm leading-relaxed text-steel">{service.description}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-steel">
            This shop has not published a price list yet. Describe the fault below and they
            will quote you on inspection.
          </p>
        )}

        {/* The live quote. `aria-live` because changing the select above changes
            these three numbers and nothing else on screen moves. */}
        <dl
          id="booking-service-summary"
          aria-live="polite"
          className="grid grid-cols-2 gap-3 rounded-machined border border-hairline bg-bench p-3 sm:grid-cols-3"
        >
          <div>
            <dt className="eyebrow pb-1">Price</dt>
            <dd className="font-mono text-lg leading-none tabular-nums text-enamel">
              {service
                ? formatPriceRange(
                    service.priceType,
                    service.priceMin,
                    service.priceMax,
                    service.currency,
                  )
                : "On quote"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow pb-1">Time booked</dt>
            <dd className="flex items-center gap-1.5 font-mono text-lg leading-none tabular-nums text-enamel">
              <Clock aria-hidden className="size-4 text-steel-soft" />
              {formatDuration(durationMinutes)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow pb-1">Warranty</dt>
            <dd className="flex items-center gap-1.5 font-mono text-lg leading-none tabular-nums text-enamel">
              <ShieldCheck aria-hidden className="size-4 text-steel-soft" />
              {warrantyDays > 0 ? `${warrantyDays} days` : "None listed"}
            </dd>
          </div>
        </dl>

        <p className="text-xs leading-relaxed text-steel-soft">
          Nothing is charged now. The shop confirms the price before any work starts.
        </p>
      </Panel>

      {/* ── How ────────────────────────────────────────────────────────────── */}
      <Panel step={2} title="How it gets fixed">
        <fieldset>
          <legend className="sr-only">Delivery arrangement</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {modes.map((mode) => (
              <label key={mode} className="block">
                <input
                  type="radio"
                  name="deliveryChoice"
                  value={mode}
                  checked={mode === deliveryMode}
                  onChange={() => setModeChoice(mode)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block cursor-pointer rounded-machined border border-hairline bg-chalk px-3 py-2.5 text-sm text-enamel transition-colors",
                    "hover:border-steel-soft",
                    "peer-checked:border-signal peer-checked:bg-signal-wash peer-checked:text-signal",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal",
                  )}
                >
                  {DELIVERY_MODE_LABELS[mode]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Rendered only for the two modes that need it. An address field on a
            drop-in booking is a question with no right answer. */}
        {needsAddress ? (
          <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
            <p className="text-xs leading-relaxed text-steel sm:col-span-2">
              {deliveryMode === "home_visit"
                ? "Where should the shop come to?"
                : "Where should the shop collect from and return to?"}
            </p>

            {/* Saved addresses first, so the common case is one click. Picking
                one fills the fields below; "a different address" clears them and
                offers the form. Either way the same four names are submitted, so
                `createBooking` needs no knowledge of the address book. */}
            {addresses.length > 0 ? (
              <fieldset className="sm:col-span-2">
                <legend className="eyebrow pb-1.5 text-steel">Saved addresses</legend>

                <div className="flex flex-col gap-1.5">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-machined border px-3 py-2 text-sm transition-colors",
                        addressChoice === address.id
                          ? "border-signal bg-signal/5 text-enamel"
                          : "border-hairline bg-chalk text-steel hover:border-steel-soft",
                      )}
                    >
                      <input
                        type="radio"
                        name="addressChoice"
                        value={address.id}
                        checked={addressChoice === address.id}
                        onChange={() => pickAddress(address.id)}
                        className="mt-1 size-3.5 accent-signal"
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-xs uppercase tracking-wide text-enamel">
                          {address.label ?? "Address"}
                          {address.isDefault ? " · default" : ""}
                        </span>
                        <span className="block pt-0.5 text-xs text-steel">{address.oneLine}</span>
                      </span>
                    </label>
                  ))}

                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-machined border px-3 py-2 text-sm transition-colors",
                      addressChoice === NEW_ADDRESS
                        ? "border-signal bg-signal/5 text-enamel"
                        : "border-hairline bg-chalk text-steel hover:border-steel-soft",
                    )}
                  >
                    <input
                      type="radio"
                      name="addressChoice"
                      value={NEW_ADDRESS}
                      checked={addressChoice === NEW_ADDRESS}
                      onChange={() => pickAddress(NEW_ADDRESS)}
                      className="size-3.5 accent-signal"
                    />
                    <span className="font-display text-xs uppercase tracking-wide">
                      A different address
                    </span>
                  </label>
                </div>
              </fieldset>
            ) : null}

            {/* Hidden when a saved address is chosen, but still mounted and still
                carrying its values — an unmounted input submits nothing, and the
                server needs line1 either way. */}
            <div
              className={cn(
                "grid gap-3 sm:col-span-2 sm:grid-cols-2",
                usingSavedAddress ? "hidden" : "",
              )}
            >
              {addresses.length > 0 && !usingSavedAddress ? (
                <label className="flex items-center gap-2 text-xs text-steel sm:col-span-2">
                  <input
                    type="checkbox"
                    name="saveAddress"
                    defaultChecked
                    className="size-3.5 accent-signal"
                  />
                  Save this address for next time
                </label>
              ) : null}

                <Field id="booking-line1" label="Address line 1" className="sm:col-span-2">
                <Input
                  id="booking-line1"
                  name="addressLine1"
                  autoComplete="address-line1"
                  maxLength={200}
                  required={!usingSavedAddress}
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                />
              </Field>

              <Field id="booking-line2" label="Address line 2" className="sm:col-span-2">
                <Input
                  id="booking-line2"
                  name="addressLine2"
                  autoComplete="address-line2"
                  maxLength={200}
                  value={line2}
                  onChange={(event) => setLine2(event.target.value)}
                />
              </Field>

              <Field id="booking-city" label="Town or city">
                <Input
                  id="booking-city"
                  name="addressCity"
                  autoComplete="address-level2"
                  maxLength={120}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </Field>

              <Field id="booking-postcode" label="Postcode">
                <Input
                  id="booking-postcode"
                  name="addressPostcode"
                  autoComplete="postal-code"
                  maxLength={20}
                  className="font-mono uppercase"
                  value={postcode}
                  onChange={(event) => setPostcode(event.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* ── When ───────────────────────────────────────────────────────────── */}
      <Panel
        step={3}
        title="When"
        aside={
          selected ? (
            <span className="font-mono text-xs tabular-nums text-signal">
              {formatSlot(selected.start, selected.end, timezone)}
            </span>
          ) : null
        }
      >
        <SlotPicker
          days={days}
          timezone={timezone}
          selectedStart={selected ? selected.start.toISOString() : null}
          onSelect={(slot) => setSelectedStart(slot.start.toISOString())}
          disabled={pending}
        />

        {hasTimes ? (
          <p className="text-xs text-steel-soft">
            Times are the shop&rsquo;s local clock. Struck-through times are already taken.
          </p>
        ) : null}
      </Panel>

      {/* ── Detail ─────────────────────────────────────────────────────────── */}
      <Panel step={4} title="Tell the shop about it">
        <Field id="booking-device" label="Device and fault">
          <Textarea
            id="booking-device"
            name="deviceDetails"
            rows={4}
            required
            maxLength={2000}
            placeholder="Make, model and what it is doing — e.g. iPhone 13, screen cracked bottom-right, touch still works."
          />
        </Field>

        <Field id="booking-notes" label="Anything else (optional)">
          <Textarea
            id="booking-notes"
            name="customerNotes"
            rows={3}
            maxLength={2000}
            placeholder="Parking, access, a deadline you are working to."
          />
        </Field>

        <Field id="booking-photos" label="Photos of the fault (optional)">
          <BookingFaultPhotos files={faultPhotos} onChange={setFaultPhotos} disabled={pending} />
        </Field>
      </Panel>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !selected}>
          <CalendarCheck aria-hidden />
          {pending ? "Sending request…" : "Request this booking"}
        </Button>

        {/* Says which step is outstanding rather than leaving a dead button. */}
        <p aria-live="polite" className="text-xs text-steel">
          {selected
            ? `${shopName} will confirm before any work starts.`
            : hasTimes
              ? "Pick a time above to send your request."
              : "No times are bookable right now — try a shorter service or message the shop."}
        </p>
      </div>
    </form>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function Panel({
  step,
  title,
  aside,
  children,
}: {
  step: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <div className="flex items-center justify-between gap-3 pb-4">
        <h2 className="flex items-center gap-2.5 font-display text-base uppercase tracking-wide text-enamel">
          <span className="grid size-6 shrink-0 place-items-center rounded-machined bg-bench-sunk font-mono text-eyebrow tabular-nums text-steel">
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>

      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * What replaces the form once the request is in.
 *
 * The reference comes back inside `state.message` from `createBooking` — it is
 * generated by a database trigger, so this is the first moment anyone can read
 * it, and it is what the customer quotes if they ring the shop.
 */
function RequestSent({ shopName, message }: { shopName: string; message?: string }) {
  return (
    <section
      role="status"
      className="rounded-machined border border-verdigris/30 bg-verdigris-wash p-6 text-center"
    >
      <span className="mx-auto grid size-10 place-items-center rounded-machined border border-verdigris/30 bg-chalk text-verdigris">
        <CheckCircle2 aria-hidden className="size-5" />
      </span>

      <h2 className="pt-3 font-display text-lg uppercase tracking-wide text-enamel">
        Request sent
      </h2>
      <p className="mx-auto max-w-sm pt-2 text-sm leading-relaxed text-steel">
        {message ?? `Your request is with ${shopName}.`} They will confirm the time and the
        price before any work starts.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
        <Button asChild variant="primary" size="sm">
          <Link href="/dashboard/bookings">Track this booking</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/discover">Back to the directory</Link>
        </Button>
      </div>
    </section>
  );
}
