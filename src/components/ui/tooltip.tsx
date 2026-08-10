"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Used for the collapsed sidebar rail, where the icon is the only visible label.
 *
 * A tooltip is not an accessible name — it doesn't appear on touch and Radix
 * only shows it on hover or keyboard focus. Every trigger that relies on one
 * still carries its own `sr-only` text or `aria-label`; the tooltip is for
 * sighted mouse users who need the icon disambiguated.
 */
export const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 8, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-machined bg-enamel px-2 py-1 shadow-lift",
          "font-mono text-eyebrow uppercase tracking-[0.14em] text-bench",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
