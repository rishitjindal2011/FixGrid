"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Store, Wrench } from "lucide-react";

import { type NavCounts, NavItemLink, navSections } from "@/components/dashboard/nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  /**
   * True when the signed-in user owns a shop; adds the "Your shop" section.
   *
   * Optional, with the customer-only view as the default, so the dashboard
   * layout compiles untouched. The layout already reads `getOwnedShop` for the
   * topbar and should pass `hasShop` and `pendingRequests` down.
   */
  hasShop?: boolean;
  /** Names the shop above its section, so an owner knows which one. */
  shopName?: string | null;
  /** Booking requests awaiting the owner's reply; badges the Requests item. */
  pendingRequests?: number;
  /** Warranty claims still open against this shop; badges the claims item. */
  openDisputes?: number;
}

/**
 * The nav list, rendered identically in the desktop rail and the mobile sheet.
 *
 * `onNavigate` closes the sheet on mobile. On desktop it is undefined, because
 * App Router navigation keeps the layout mounted and there is nothing to close.
 */
function NavList({
  pathname,
  hasShop,
  shopName,
  pendingRequests,
  openDisputes,
  onNavigate,
}: {
  pathname: string;
  hasShop: boolean;
  shopName?: string | null;
  pendingRequests: number;
  openDisputes: number;
  onNavigate?: () => void;
}) {
  const counts: NavCounts = { pendingRequests, openDisputes };

  return (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-6 p-3">
      {navSections(hasShop, pathname).map((section) => (
        <div
          key={section.title}
          className={cn(
            /* Full-bleed rule: an indented one reads as a gap between two lists,
               and the point here is that it is a boundary between two roles. */
            section.separated && "-mx-3 border-t border-hairline px-3 pt-5",
          )}
        >
          <div className="px-2.5 pb-2">
            <p className="eyebrow">{section.title}</p>
            {section.separated && shopName ? (
              /* Someone who is both a customer and an owner needs the shop named
                 here, not just the section — "Your shop" alone does not say
                 whose bookings the items below are about. */
              <p className="mt-1.5 flex items-center gap-1.5">
                <Store aria-hidden className="size-3.5 shrink-0 text-steel" />
                <span className="truncate font-display text-sm uppercase tracking-wide text-enamel">
                  {shopName}
                </span>
              </p>
            ) : null}
          </div>

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavItemLink
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  count={item.count ? (counts[item.count] ?? 0) : 0}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/*
       * Non-owners only. Once the shop section is rendered it already carries an
       * Overview link, and two routes to the same page in one nav is the kind of
       * thing that makes a sidebar feel untended.
       */}
      {hasShop ? null : (
        <div className="mt-auto">
          <p className="eyebrow px-2.5 pb-2">Own a shop?</p>
          <Link
            href="/join"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-machined border border-hairline bg-bench p-3",
              "transition-colors hover:border-steel-soft hover:bg-bench-sunk",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
              <Store aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm uppercase tracking-wide text-enamel">
                List your shop
              </span>
              <span className="block truncate text-xs text-steel">
                Manage bookings and earnings
              </span>
            </span>
          </Link>
        </div>
      )}
    </nav>
  );
}

/** Wordmark, repeated in both presentations. */
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex h-16 items-center gap-2 border-b border-hairline px-4 font-display text-xl uppercase tracking-tight text-enamel"
    >
      <span className="grid size-7 place-items-center rounded-machined bg-enamel text-bench">
        <Wrench aria-hidden className="size-4" />
      </span>
      {SITE_NAME}
    </Link>
  );
}

/**
 * The desktop rail.
 *
 * Rendered by the dashboard layout, NOT by the topbar, and that placement is
 * load-bearing rather than stylistic. The topbar carries `backdrop-blur-sm`,
 * and a `backdrop-filter` establishes a containing block for `position: fixed`
 * descendants — so a fixed rail nested inside the header resolves `inset-y-0
 * left-0` against the *header* instead of the viewport. It lands 256px in
 * (after the layout's `lg:pl-64`) and is clipped to the header's 64px height,
 * leaving the reserved column empty. Keeping it a sibling of the header is what
 * makes `fixed` mean what it says.
 */
export function DashboardSidebarRail({
  hasShop = false,
  shopName,
  pendingRequests = 0,
  openDisputes = 0,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hairline bg-chalk lg:flex">
      <Brand />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <NavList
          pathname={pathname}
          hasShop={hasShop}
          shopName={shopName}
          pendingRequests={pendingRequests}
          openDisputes={openDisputes}
        />
      </div>
    </aside>
  );
}

/**
 * The mobile trigger and its off-canvas sheet.
 *
 * Safe inside the header: the trigger is an ordinary in-flow button, and Radix
 * portals the sheet content to `document.body`, so neither is affected by the
 * header's containing block.
 */
export function DashboardSidebarSheet({
  hasShop = false,
  shopName,
  pendingRequests = 0,
  openDisputes = 0,
}: SidebarProps) {
  const pathname = usePathname();

  /*
   * Open state is stored as *the path the sheet was opened on*, so a route
   * change closes it by derivation — no effect watching `pathname`, which is
   * both a wasted render pass and what `react-hooks/set-state-in-effect` flags.
   *
   * `onNavigate` is still wired up below: it closes the sheet the instant a link
   * is tapped rather than waiting for the new path to land, and it covers a tap
   * on the page you are already on, where `pathname` never changes.
   */
  const [openedAt, setOpenedAt] = React.useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu aria-hidden />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0">
        <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigate between your bookings, messages and account settings.
        </SheetDescription>

        <Brand onNavigate={() => setOpenedAt(null)} />
        <NavList
          pathname={pathname}
          hasShop={hasShop}
          shopName={shopName}
          pendingRequests={pendingRequests}
          openDisputes={openDisputes}
          onNavigate={() => setOpenedAt(null)}
        />
      </SheetContent>
    </Sheet>
  );
}
