import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-10 w-full rounded-machined border border-hairline bg-chalk px-3 text-[0.95rem] text-enamel",
          // The border goes signal on focus rather than adding a ring, so a row
          // of mixed controls keeps one focus vocabulary.
          "placeholder:text-steel-soft focus:border-signal focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
