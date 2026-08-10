"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Boxes,
  CalendarClock,
  Heart,
  CalendarDays,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MessagesSquare,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Live counters the nav can hang on an item.
 *
 * Items are static config, so they name a counter rather than carrying a
 * number — the values are per-request server data and would otherwise force
 * this module to be rebuilt per user.
 */
export type NavCountKey = "pendingRequests" | "openDisputes";
export type NavCounts = Partial<Record<NavCountKey, number>>;

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /**
   * URL-prefix that also activates this item, for pages that live underneath
   * it. Omitted → exact match on `href` only, which is what section overviews
   * want: the subtree below `/dashboard` and `/dashboard/expert` belongs to
   * their siblings, not to them.
   */
  match?: string;
  /** Renders a count badge when the named counter is above zero. */
  count?: NavCountKey;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /**
   * Draw a rule above this section. Reserved for a change of *side* — customer
   * to shop owner — rather than a change of page.
   */
  separated?: boolean;
};

/** Sections of the sidebar, in the order they render. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutGrid },
      {
        href: "/dashboard/discover",
        label: "Discover experts",
        icon: Search,
        match: "/dashboard/discover",
      },
      {
        href: "/dashboard/saved",
        label: "Saved shops",
        icon: Heart,
        match: "/dashboard/saved",
      },
      {
        href: "/dashboard/bookings",
        label: "Bookings",
        icon: CalendarDays,
        match: "/dashboard/bookings",
      },
      {
        href: "/dashboard/messages",
        label: "Messages",
        icon: MessagesSquare,
        match: "/dashboard/messages",
      },
    ],
  },
  {
    title: "Your account",
    items: [
      { href: "/dashboard/billing", label: "Payments", icon: CreditCard, match: "/dashboard/billing" },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star, match: "/dashboard/reviews" },
      {
        href: "/dashboard/warranty",
        label: "Warranty & claims",
        icon: ShieldCheck,
        match: "/dashboard/warranty",
      },
      {
        href: "/dashboard/settings/profile",
        label: "Settings",
        icon: Settings,
        match: "/dashboard/settings",
      },
    ],
  },
];

/**
 * Shop-owner routes. Rendered only for users who own a shop — everyone else
 * gets the "list your shop" card instead, so a customer is never shown a
 * section of the product they cannot enter.
 */
export const EXPERT_NAV_SECTION: NavSection = {
  title: "Your shop",
  separated: true,
  items: [
    { href: "/dashboard/expert", label: "Overview", icon: LayoutDashboard },
    {
      href: "/dashboard/expert/requests",
      label: "Requests",
      icon: Inbox,
      match: "/dashboard/expert/requests",
      count: "pendingRequests",
    },
    {
      href: "/dashboard/expert/schedule",
      label: "Schedule",
      icon: CalendarClock,
      match: "/dashboard/expert/schedule",
    },
    {
      href: "/dashboard/expert/clients",
      label: "Clients",
      icon: Users,
      match: "/dashboard/expert/clients",
    },
    {
      href: "/dashboard/expert/earnings",
      label: "Earnings",
      icon: Wallet,
      match: "/dashboard/expert/earnings",
    },
    {
      href: "/dashboard/expert/services",
      label: "Services",
      icon: Wrench,
      match: "/dashboard/expert/services",
    },
    {
      href: "/dashboard/expert/inventory",
      label: "Inventory",
      icon: Boxes,
      match: "/dashboard/expert/inventory",
    },
    {
      href: "/dashboard/expert/profile",
      label: "Shop profile",
      icon: Store,
      match: "/dashboard/expert/profile",
    },
    {
      href: "/dashboard/expert/messages",
      label: "Client inbox",
      icon: MessagesSquare,
      match: "/dashboard/expert/messages",
    },
    {
      href: "/dashboard/expert/disputes",
      label: "Warranty claims",
      icon: Scale,
      match: "/dashboard/expert/disputes",
      count: "openDisputes",
    },
  ],
};

/** The sections to render for this user, in order. */
export function navSections(hasShop: boolean, pathname: string): NavSection[] {
  if (!hasShop) return NAV_SECTIONS;
  
  const onShopSide = pathname.startsWith("/dashboard/expert");
  return onShopSide ? [EXPERT_NAV_SECTION] : NAV_SECTIONS;
}

/** All nav items flat, for the mobile sheet and the sitemap-ish tests. */
export function allNavItems(hasShop = false): NavItem[] {
  return hasShop ? [...NAV_SECTIONS, EXPERT_NAV_SECTION].flatMap((section) => section.items) : NAV_SECTIONS.flatMap((section) => section.items);
}

/**
 * Whether `href` is the active page.
 *
 * An item is active on its own page, plus — when it declares a `match` — on
 * anything nested below it, so a request detail page keeps "Requests" lit.
 *
 * The two overview items deliberately declare no `match`. `/dashboard` is a
 * prefix of every route in this dashboard and `/dashboard/expert` is a prefix
 * of every route in the shop section, so prefix-matching them would leave the
 * customer overview permanently lit and light both "Overview" and "Requests"
 * on `/dashboard/expert/requests`.
 *
 * The prefix test requires a following slash so sibling routes that merely
 * share a string prefix stay independent — `/dashboard/expertise` must not
 * activate `/dashboard/expert`.
 */
export function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (!item.match) return false;
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

/** One item row, shared by the rail and the sheet so they can't drift. */
export function NavItemLink({
  item,
  pathname,
  onNavigate,
  compact = false,
  count = 0,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  /** Rail mode: icon-only, label becomes the accessible name. */
  compact?: boolean;
  /** Resolved value of `item.count`. Zero renders nothing. */
  count?: number;
}) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  const showCount = count > 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-machined px-2.5 text-sm transition-colors",
        "font-display uppercase tracking-wide",
        active
          ? "bg-enamel text-bench"
          : "text-steel hover:bg-bench hover:text-enamel",
        compact && "justify-center px-0",
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", active && "text-bench")} />
      <span className={cn("truncate", compact && "sr-only")}>{item.label}</span>

      {showCount ? (
        <>
          {compact ? (
            /* No room for a numeral beside an icon-only row, so the rail gets a
               presence indicator and the count is left to the reader below. */
            <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-machined bg-signal" />
          ) : (
            <span
              aria-hidden
              className={cn(
                "ml-auto min-w-5 shrink-0 rounded-machined px-1.5 py-0.5 text-center font-mono text-[0.6875rem] leading-none",
                /* Inverted on the active row: signal on enamel is legible but
                   muddy, and the chip has to stay readable at 11px. */
                active ? "bg-chalk text-signal" : "bg-signal text-chalk",
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
          {/* Announced as "Requests, 3 awaiting reply" — a bare numeral after
              the label is ambiguous read aloud. */}
          <span className="sr-only">, {count} awaiting reply</span>
        </>
      ) : null}
    </Link>
  );
}
