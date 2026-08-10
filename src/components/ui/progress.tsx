"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const TONES = {
  signal: "bg-signal",
  verdigris: "bg-verdigris",
  enamel: "bg-enamel",
  rust: "bg-rust",
} as const;

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Signal is for live/in-flight work; verdigris for anything settled. */
  tone?: keyof typeof TONES;
}

/**
 * Determinate bar — warranty windows elapsing, a payout hold counting down.
 *
 * Deliberately not used for indeterminate loading: `Skeleton` covers that, and
 * an indeterminate bar animating forever reads as progress that isn't happening.
 */
export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(function Progress({ className, value, tone = "signal", ...props }, ref) {
  const pct = Math.min(100, Math.max(0, value ?? 0));

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-machined bg-bench-sunk",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full transition-transform duration-500", TONES[tone])}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
