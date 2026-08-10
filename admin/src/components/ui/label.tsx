import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Field label. Mono uppercase, matching `.eyebrow` — in this system a label
 * classifies a field rather than describing it, and the classifying voice is
 * always the mono one.
 *
 * A plain `<label>`, not Radix: the only thing Radix's version adds is
 * click-to-focus on non-native controls, and every control in this app is
 * native. It stays a Server Component this way.
 */
export const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        className={cn(
          "font-mono text-eyebrow uppercase tracking-[0.14em] text-steel",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
