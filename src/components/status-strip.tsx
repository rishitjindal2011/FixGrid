"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  formatClock,
  getShopStatus,
  type HoursInput,
  type ShopStatus,
  type StatusDetail,
} from "@/lib/hours";
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

  // Markup lives in one place so a ticking card and a static profile panel can
  // never drift apart in wording.
  return <StaticStatusStrip status={status} size={size} className={className} />;
}

/**
 * No-timer variant. Same markup, no interval, cheap enough to drop into a
 * JSON-LD-bearing page where re-evaluation buys nothing.
 *
 * Still a Client Component — it lives in a `"use client"` module — which is
 * exactly why `detailParts` exists: `useTranslations` can look up a message here,
 * but it cannot re-order an English sentence that `hours.ts` already assembled.
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
  const t = useTranslations("status");

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
        {t(status.isOpen ? "open" : "closed")}
      </span>
      <span aria-hidden className="text-hairline">
        /
      </span>
      <span className="text-steel-soft">{formatDetail(t, status.detailParts)}</span>
    </div>
  );
}

/**
 * The detail line, assembled from data rather than translated as prose.
 *
 * Each branch hands the catalogue a shape plus the numbers, so the message file
 * decides where the time lands in the sentence — "Opens 9:00 am" against
 * "9:00 am पर खुलेगा". The clock itself stays in Latin digits with am/pm: that
 * form is read everywhere in India, and Devanagari numerals on a time invite a
 * misreading no amount of localisation pays for.
 */
function formatDetail(
  t: (key: string, values?: Record<string, string>) => string,
  detail: StatusDetail,
): string {
  switch (detail.kind) {
    case "closesAt":
      return t("closesAt", { time: formatClock(detail.minutes) });
    case "opensAt":
      return t("opensAt", { time: formatClock(detail.minutes) });
    case "opensTomorrow":
      return t("opensTomorrow", { time: formatClock(detail.minutes) });
    case "opensOnDay":
      return t("opensOnDay", {
        day: t(`weekday.${detail.day}`),
        time: formatClock(detail.minutes),
      });
    case "notListed":
      return t("notListed");
  }
}
