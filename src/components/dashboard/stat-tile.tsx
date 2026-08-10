import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One measured number.
 *
 * The value is mono because it is data, not prose — the same reasoning behind
 * `--font-mono` being reserved for "measured data" in the token block. Tiles
 * with a `href` lift on hover (`shadow-bench → shadow-lift`); static ones do not,
 * because a surface that lifts under the cursor and then does nothing is a lie.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  href?: string;
  /**
   * Marks the tile as live/actionable — the only case that earns signal orange,
   * per the token rule. Use it for "3 awaiting your reply", not for a total.
   */
  emphasis?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon ? (
          <Icon
            aria-hidden
            className={cn("size-4 shrink-0", emphasis ? "text-signal" : "text-steel-soft")}
          />
        ) : null}
      </div>

      <p
        className={cn(
          "pt-3 font-mono text-2xl leading-none tabular-nums",
          emphasis ? "text-signal" : "text-enamel",
        )}
      >
        {value}
      </p>

      {hint ? <p className="pt-1.5 text-xs text-steel">{hint}</p> : null}
    </>
  );

  const shell = cn(
    "block rounded-machined border border-hairline bg-chalk p-4 shadow-bench",
    href && "transition-shadow hover:border-steel-soft hover:shadow-lift",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
