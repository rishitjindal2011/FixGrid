"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Store, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Customer / Shop switch, for people who are both.
 *
 * A shop owner is always also a customer — same account, same login — and the
 * two dashboards answer different questions: "where is my repair" versus "who is
 * waiting on me". Before this the only route between them was a nav item buried
 * in the sidebar's shop section, which meant an owner checking their own booking
 * had to hunt for the way back.
 *
 * Rendered only when `hasShop` is true. For the overwhelming majority of users
 * there is no second side to switch to, and a toggle with one reachable option
 * is furniture.
 *
 * Deliberately two links rather than a stateful control. Which side you are on
 * is a fact about the URL, so `usePathname` is the whole state — nothing to
 * synchronise, and it stays correct through back, forward and a hard reload.
 */
export function RoleToggle({ hasShop }: { hasShop: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.roleToggle");

  if (!hasShop) return null;

  // Everything under /dashboard/expert is the shop side; everything else under
  // /dashboard is the customer side.
  const onShopSide = pathname.startsWith("/dashboard/expert");

  return (
    <div
      role="group"
      aria-label={t("aria")}
      className="inline-flex items-center gap-0.5 rounded-machined border border-hairline bg-bench p-0.5"
    >
      <ToggleLink
        href="/dashboard"
        active={!onShopSide}
        icon={UserRound}
        label={t("customer")}
      />
      <ToggleLink
        href="/dashboard/expert"
        active={onShopSide}
        icon={Store}
        label={t("shop")}
      />
    </div>
  );
}

function ToggleLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      // `page` is the honest value here: these are navigation targets, and the
      // active one is the section currently displayed.
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-machined px-2.5 py-1",
        "font-display text-xs uppercase tracking-wide transition-colors",
        active
          ? "bg-chalk text-enamel shadow-bench"
          : "text-steel hover:text-enamel",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </Link>
  );
}
