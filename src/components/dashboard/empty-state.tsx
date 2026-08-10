import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * What a panel shows when it has nothing to show.
 *
 * Deliberately a dashed well rather than a card: a dashed border reads as "this
 * is where something will go", where a solid card reads as content that failed
 * to load. Every empty state on the dashboard carries an action, because a
 * customer with no bookings has exactly one useful next step.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-machined border border-dashed border-hairline bg-bench/40 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-10 place-items-center rounded-machined border border-hairline bg-chalk text-steel-soft">
          <Icon aria-hidden className="size-5" />
        </span>
      ) : null}

      <div>
        <p className="font-display text-base uppercase tracking-wide text-enamel">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm pt-1.5 text-sm leading-relaxed text-steel">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}
