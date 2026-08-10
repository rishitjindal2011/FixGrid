"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Binary toggle.
 *
 * The thumb is a 4px-cornered square, not a circle — the system token comment
 * says "machined, not soft" and a pill thumb would violate it. The track rounds
 * a little more than the rest of the site only so the square thumb reads as a
 * control head sliding in a channel rather than a tile stuck on a bar.
 *
 * Checked is signal because a flipped switch is live state; unchecked is quiet
 * steel, not a coloured "off". The motion is a single transform on the thumb —
 * the global reduced-motion block in globals.css collapses it.
 */
export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        // 36×24 track, 16px thumb, 1px border + 2px padding: usable channel is
        // 30px, so the thumb's travel is exactly 14px and both rest positions
        // sit flush against the inner edge. Changing any one of these numbers
        // means recomputing the translate below.
        "peer inline-flex h-6 w-9 shrink-0 cursor-pointer items-center rounded-[5px] border border-hairline p-0.5",
        "transition-colors focus-visible:outline-none",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-signal",
        "data-[state=unchecked]:bg-bench-sunk",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-machined bg-chalk shadow-bench",
          "transition-transform data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
});
