"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  deleteAddress,
  saveAddress,
  type AddressActionState,
} from "@/lib/dashboard/address-actions";
import type { SavedAddress } from "@/lib/dashboard/addresses";
import { cn } from "@/lib/utils";

const ADDRESS_INITIAL_STATE: AddressActionState = { error: null, success: false };

/**
 * Add, edit and remove saved addresses.
 *
 * One form, reused for both add and edit, distinguished only by a hidden `id`.
 * Two forms would double every field and every validation message for a
 * difference the user does not perceive — they are "typing an address" either
 * way.
 *
 * Deletes are separate `<form>` elements rather than buttons calling an action
 * imperatively, so each row's pending state is its own and removing one address
 * does not grey out the rest.
 */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(addresses.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {addresses.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) =>
            editing === address.id ? (
              <li key={address.id}>
                <AddressForm
                  address={address}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={address.id}>
                <AddressRow
                  address={address}
                  onEdit={() => {
                    setEditing(address.id);
                    setAdding(false);
                  }}
                />
              </li>
            ),
          )}
        </ul>
      ) : null}

      {adding ? (
        <AddressForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
          >
            <Plus aria-hidden />
            Add an address
          </Button>
        </div>
      )}
    </div>
  );
}

function AddressRow({
  address,
  onEdit,
}: {
  address: SavedAddress;
  onEdit: () => void;
}) {
  const [state, action, pending] = useActionState(deleteAddress, ADDRESS_INITIAL_STATE);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench">
      <div className="flex min-w-0 items-start gap-3">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm uppercase tracking-wide text-enamel">
              {address.label ?? "Address"}
            </span>
            {address.isDefault ? <Badge variant="verified">Default</Badge> : null}
          </p>
          <p className="pt-0.5 text-sm text-steel">{address.oneLine}</p>
          {state.error ? <p className="pt-1 text-xs text-rust">{state.error}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>

        <form action={action}>
          <input type="hidden" name="id" value={address.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Trash2 aria-hidden />}
            <span className="sr-only">Remove {address.label ?? address.oneLine}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={`address-${name}`} className="eyebrow text-steel">
        {label}
      </label>
      <Input
        id={`address-${name}`}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function AddressForm({
  address,
  onDone,
  onCancel,
}: {
  address?: SavedAddress;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(saveAddress, ADDRESS_INITIAL_STATE);

  /*
   * The form does not close itself on success, and that is deliberate.
   *
   * Calling `onDone()` during render mutates the parent mid-render; an effect
   * watching `state.success` trips `react-hooks/set-state-in-effect`, an error in
   * this config; and closing on *submit* would unmount the only thing that can
   * display `state.error`, turning a rejected save into a silent no-op.
   *
   * So a successful save shows its confirmation in place, with a Done button, and
   * the revalidated list is already correct behind it. One extra click, and the
   * failure path stays visible.
   */
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench"
    >
      {address ? <input type="hidden" name="id" value={address.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Label"
          name="label"
          defaultValue={address?.label ?? ""}
          placeholder="Home, Office…"
        />
        <Field
          label="Postcode"
          name="postcode"
          defaultValue={address?.postcode ?? ""}
          placeholder="SW1A 1AA"
        />
        <Field
          label="Address line 1"
          name="line1"
          defaultValue={address?.line1 ?? ""}
          required
          className="sm:col-span-2"
        />
        <Field
          label="Address line 2"
          name="line2"
          defaultValue={address?.line2 ?? ""}
          className="sm:col-span-2"
        />
        <Field label="Town or city" name="city" defaultValue={address?.city ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-steel">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault ?? false}
          className="size-4 rounded-machined border-hairline text-signal focus-visible:outline-signal"
        />
        Use this address by default
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-rust">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p aria-live="polite" className="flex items-center gap-1.5 text-sm text-verdigris">
          <Check aria-hidden className="size-4" />
          {state.message ?? "Saved."}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {state.success ? (
          <Button type="button" size="sm" onClick={onDone}>
            Done
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
            {address ? "Save changes" : "Save address"}
          </Button>
        )}

        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X aria-hidden />
          {state.success ? "Close" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
