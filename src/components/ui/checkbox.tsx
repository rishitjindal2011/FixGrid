"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox.
 *
 * Checked fills with signal because a ticked box is live state, not decoration.
 * The indeterminate dash is a real Radix state (`checked="indeterminate"`) used
 * by "select all" headers where only some rows are picked — it is styled here so
 * a table that adopts it later does not have to invent an appearance.
 *
 * This renders a `<button role="checkbox">`, not an `<input>`, so it does not
 * appear in a native form post. Pair it with a hidden input or a client handler
 * when the value has to reach a server action.
 */
export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-machined border border-hairline bg-chalk",
        "transition-colors focus-visible:outline-none",
        "hover:border-steel-soft",
        "data-[state=checked]:border-signal data-[state=checked]:bg-signal",
        "data-[state=indeterminate]:border-signal data-[state=indeterminate]:bg-signal",
        "disabled:cursor-not-allowed disabled:border-hairline disabled:bg-bench-sunk disabled:text-steel-soft disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group grid place-items-center text-white">
        {/* Switched on Radix's own data-state rather than a `checked` prop, so
            this is still correct for uncontrolled (defaultChecked) checkboxes,
            where the prop is undefined but the state is not. */}
        <Check
          className="size-3.5 group-data-[state=indeterminate]:hidden"
          strokeWidth={3}
          aria-hidden
        />
        <Minus
          className="hidden size-3.5 group-data-[state=indeterminate]:block"
          strokeWidth={3}
          aria-hidden
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
