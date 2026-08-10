import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status pill — except it is not a pill. `rounded-machined`, 4px, like every
 * other surface in the system.
 *
 * `signal` is not a general-purpose "highlight": it means this row is waiting
 * on the person reading it. A pending claim is signal; a completed booking is
 * not, however recent.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-machined border px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-hairline bg-bench text-steel",
        verified: "border-verdigris/30 bg-verdigris-wash text-verdigris",
        signal: "border-signal/30 bg-signal-wash text-signal",
        danger: "border-rust/30 bg-rust-wash text-rust",
        solid: "border-enamel bg-enamel text-bench",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
