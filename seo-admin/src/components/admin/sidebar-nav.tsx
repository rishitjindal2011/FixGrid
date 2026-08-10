"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Gauge, LayoutTemplate, Settings, SignpostBig } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Client-side only because the active state comes from `usePathname()`. Doing
 * this on the server would mean the whole shell re-renders on every navigation
 * just to move one highlight.
 */
const LINKS = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/blog-templates", label: "Blog Templates", icon: LayoutTemplate },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/redirects", label: "Redirects", icon: SignpostBig },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        // `/` would otherwise prefix-match every route, so it is exact-only.
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-machined px-3 py-2 font-display text-[0.95rem] uppercase tracking-wide transition-colors",
              active
                ? "bg-enamel text-bench"
                : "text-steel hover:bg-bench-sunk hover:text-enamel",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
