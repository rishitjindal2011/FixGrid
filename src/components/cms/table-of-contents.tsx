"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Heading } from "@/lib/cms/headings";

/**
 * Sticky section nav.
 *
 * Headings arrive as props, derived server-side alongside the id injection
 * (see `lib/cms/headings.ts`), so the nav is present in the initial HTML and
 * can never list an anchor that doesn't exist. The only client-side work is
 * scroll-spy for the active state.
 */
export function TableOfContents({
  headings,
  title = "On this page",
  includeSubheadings = false,
}: {
  headings: Heading[];
  title?: string;
  includeSubheadings?: boolean;
}) {
  const items = React.useMemo(
    () => (includeSubheadings ? headings : headings.filter((h) => h.level === 2)),
    [headings, includeSubheadings],
  );

  const [activeId, setActiveId] = React.useState<string | null>(items[0]?.id ?? null);

  React.useEffect(() => {
    if (items.length === 0) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the entry nearest the top of the viewport that is intersecting,
        // rather than the last one to fire — otherwise fast scrolls land on the
        // wrong heading.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // Top band only: a heading counts as "current" once it reaches the upper
      // quarter of the viewport and stops counting when it leaves the top.
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className={cn(item.level === 3 && "pl-4")}>
          <a
            href={`#${item.id}`}
            aria-current={activeId === item.id ? "location" : undefined}
            className={cn(
              "block border-l-2 py-1 pl-3 text-sm leading-snug transition-colors",
              activeId === item.id
                ? "border-signal font-medium text-enamel"
                : "border-hairline text-steel hover:border-steel-soft hover:text-enamel",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label={title} className="mx-auto max-w-5xl px-4 py-6">
      {/* Mobile: collapsed by default so it never pushes the article down. */}
      <details className="rounded-machined border border-hairline bg-chalk p-4 lg:hidden">
        <summary className="cursor-pointer font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
          {title}
        </summary>
        <div className="mt-3">{list}</div>
      </details>

      <div className="hidden lg:sticky lg:top-24 lg:block">
        <p className="eyebrow mb-3">{title}</p>
        {list}
      </div>
    </nav>
  );
}
