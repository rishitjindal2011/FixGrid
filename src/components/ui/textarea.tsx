import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Multi-line text input, matched to `Input` so the two line up in a form grid.
 *
 * `field-sizing-content` lets the box grow with what's typed where the browser
 * supports it, and degrades to the `min-h` everywhere else — no resize
 * observer, no client component.
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "min-h-20 w-full rounded-machined border border-hairline bg-chalk px-3 py-2",
        "text-[0.95rem] leading-relaxed text-enamel field-sizing-content",
        "placeholder:text-steel-soft focus:border-signal focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
