"use client";

import * as React from "react";
import { getShopStatus, type HoursInput, type ShopStatus } from "@/lib/hours";
import { cn } from "@/lib/utils";

/**
 * ── SIGNATURE ELEMENT ──────────────────────────────────────────────────────
 * The status strip: a live machine-style readout of whether a shop is open.
 *
 * This is the one question every visitor to a repair directory actually has,
 * so it is the one place the design spends any boldness. Everything around it
 * stays quiet.
 *
 * Rendered on the server first (so it is present in the HTML for crawlers and
 * for users with JS disabled), then re-evaluated on the client every 30s so a
 * cached page cannot claim a shop is open an hour after it shut.
 */

export interface StatusStripProps {
  hours: HoursInput;
  /** `sm` for cards and search results, `md` for the profile contact panel. */
  size?: "sm" | "md";
  /** Server-computed status, passed in to keep the first paint stable. */
  initialStatus?: ShopStatus;
  className?: string;
}

export function StatusStrip({
  hours,
  size = "sm",
  initialStatus,
  className,
}: StatusStripProps) {
  const [status, setStatus] = React.useState<ShopStatus>(
    () => initialStatus ?? getShopStatus(hours),
  );

  React.useEffect(() => {
    const tick = () => setStatus(getShopStatus(hours));
    tick(); // reconcile immediately in case the server render is stale
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, [hours]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono uppercase tracking-[0.08em]",
        size === "sm" ? "text-eyebrow" : "text-xs",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("status-dot", status.isOpen ? "status-dot--open" : "status-dot--closed")}
      />
      <span className={cn("font-semibold", status.isOpen ? "text-verdigris" : "text-steel")}>
        {status.headline}
      </span>
      <span aria-hidden className="text-hairline">
        /
      </span>
      <span className="text-steel-soft">{status.detail}</span>
    </div>
  );
}

/**
 * Server-rendered variant. Identical markup, no timer, no client bundle.
 * Use inside JSON-LD-bearing server components where interactivity is wasted.
 */
export function StaticStatusStrip({
  status,
  size = "sm",
  className,
}: {
  status: ShopStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono uppercase tracking-[0.08em]",
        size === "sm" ? "text-eyebrow" : "text-xs",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("status-dot", status.isOpen ? "status-dot--open" : "status-dot--closed")}
      />
      <span className={cn("font-semibold", status.isOpen ? "text-verdigris" : "text-steel")}>
        {status.headline}
      </span>
      <span aria-hidden className="text-hairline">
        /
      </span>
      <span className="text-steel-soft">{status.detail}</span>
    </div>
  );
}
