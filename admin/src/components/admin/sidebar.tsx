"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CalendarRange,
  Gauge,
  Scale,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
  Lock,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Client-side only because the active state comes from `usePathname()`. Doing
 * this on the server would mean the whole shell re-renders on every navigation
 * just to move one highlight.
 */
const LINKS = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/claims", label: "Claims", icon: ShieldCheck },
  { href: "/experts", label: "Experts", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/users", label: "All accounts", icon: UserCog },
  { href: "/bookings", label: "Bookings", icon: CalendarRange },
  { href: "/disputes", label: "Disputes", icon: Scale },
  { href: "/payouts", label: "Payouts", icon: Banknote },
  { href: "/team", label: "Team", icon: Lock },
] as const;

export function Sidebar({ pendingClaims }: { pendingClaims: number }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-6 border-b border-hairline bg-chalk",
        "px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-b-0 lg:border-r",
      )}
    >
      <Link href="/" className="flex items-center gap-2.5 px-1">
        <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
          <Wrench className="size-4" aria-hidden />
        </span>
        <span className="font-display text-lg uppercase leading-none tracking-wide text-enamel">
          Platform
        </span>
      </Link>

      {/*
        One nav element at both sizes. Below `lg` it is a horizontally scrolling
        strip rather than a drawer: a drawer needs open/closed state, a portal
        and a focus trap to hide seven links, and on a console whose whole job is
        a queue count the nav should never be one tap away from invisible.
      */}
      <nav
        aria-label="Sections"
        className={cn(
          "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1",
          "lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0",
        )}
      >
        {LINKS.map(({ href, label, icon: Icon }) => {
          // `/` would otherwise prefix-match every route, so it is exact-only.
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = href === "/claims" && pendingClaims > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-machined px-3 py-2",
                "font-display text-[0.95rem] uppercase tracking-wide transition-colors",
                "lg:shrink",
                active ? "bg-enamel text-bench" : "text-steel hover:bg-bench-sunk hover:text-enamel",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}

              {/*
                The reason this console exists. A claim is a stranger asking for
                control of a real business's listing, and nothing else in the
                product surfaces one — so the count sits in signal, on the nav,
                on every page, and pushes to the right edge where the eye lands
                last and stays.

                `aria-label` because "3" on its own is meaningless read aloud.
              */}
              {showBadge ? (
                <span
                  aria-label={`${pendingClaims} pending`}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-machined border px-1.5 py-0.5",
                    "font-mono text-eyebrow tabular-nums tracking-[0.14em]",
                    active
                      ? "border-bench/30 bg-bench/15 text-bench"
                      : "border-signal/30 bg-signal-wash text-signal",
                  )}
                >
                  <span className="status-dot status-dot--live" aria-hidden />
                  {pendingClaims}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
