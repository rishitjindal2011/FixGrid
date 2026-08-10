import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The header every dashboard page opens with.
 *
 * The schematic grid is the site's hero treatment, so it earns its place here —
 * one per page, at the top, never behind content. `schematic-fade` masks it out
 * before it reaches the text, which is the rule the class was written for.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6",
        className,
      )}
    >
      <div aria-hidden className="schematic schematic-fade absolute inset-0" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow pb-2">{eyebrow}</p> : null}
          <h1 className="font-display text-display-sm uppercase text-enamel sm:text-display">
            {title}
          </h1>
          {description ? (
            <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * A section heading inside a page — smaller than `PageHeader`, with an optional
 * "see all" style link on the right.
 */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 pb-3", className)}>
      <h2 className="font-display text-lg uppercase tracking-wide text-enamel">{title}</h2>
      {action}
    </div>
  );
}
