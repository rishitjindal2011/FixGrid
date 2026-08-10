import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Native `<select>`, styled to sit level with `Input`.
 *
 * Not a Radix listbox. Every select in this console is a filter or a status
 * choice inside a plain form post — a native control submits without
 * JavaScript, keeps its own keyboard behaviour, and stays a Server Component.
 * The composed-content case a listbox exists for (a badge inside the trigger)
 * does not come up here.
 *
 * The chevron is an inline data-URI background rather than an absolutely
 * positioned icon, so the control needs no wrapper element and can be dropped
 * straight into a grid.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none rounded-machined border border-hairline bg-chalk px-3 pr-8 text-[0.95rem] text-enamel",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235A6B75%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat",
          "focus:border-signal focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
