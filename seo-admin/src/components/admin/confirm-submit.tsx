"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * A submit button that asks first.
 *
 * Deliberately not `window.confirm`: it is unstyled, blocks the main thread,
 * and on repeat use people learn to dismiss it without reading. Requiring a
 * second, differently-labelled click in place keeps the destructive action one
 * gesture away from being cancelled.
 *
 * It stays a real form submit, so deletion still works without JavaScript —
 * the confirmation is progressive enhancement, not the mechanism.
 */
export function ConfirmSubmit({
  children,
  confirmLabel,
  variant = "danger",
  size = "sm",
  ...props
}: {
  children: React.ReactNode;
  confirmLabel: string;
} & ButtonProps) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  // Note the prop order: `{...props}` comes first so the explicit `type` and
  // `variant` below always win. Spreading last would let a caller accidentally
  // turn the confirm button back into a plain button.
  if (!armed) {
    return (
      <Button {...props} type="button" variant="outline" size={size} onClick={() => setArmed(true)}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button {...props} type="submit" variant={variant} size={size} disabled={pending}>
        {pending ? "Working…" : confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size={size} onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </span>
  );
}

/** Plain submit with a pending label, for the non-destructive toolbar forms. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: { children: React.ReactNode; pendingLabel?: string } & ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
