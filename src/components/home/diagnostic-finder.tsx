"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wrench, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProblemChip {
  label: string;
  href?: string;
  query?: string;
  badge?: string;
}

const REAL_CATEGORIES: ProblemChip[] = [
  { label: "MacBook Screen", href: "/repair/macbook-screen-repair", badge: "Display" },
  { label: "iPhone Battery", href: "/repair/iphone-battery-replacement", badge: "Power" },
  { label: "PS5 HDMI Port", href: "/repair/playstation-hdmi-repair", badge: "WLOD" },
  { label: "Water Damage", href: "/repair/laptop-liquid-damage", badge: "PCB" },
  { label: "Inverter AC PCB", href: "/repair/inverter-pcb-repair", badge: "Appliance" },
  { label: "Refrigerator Compressor", href: "/repair/refrigerator-compressor-repair", badge: "HVAC" },
  { label: "Drone Motor", href: "/repair/drone-motor-replacement", badge: "Robotics" },
  { label: "Mechanical Keyboard", href: "/repair/mechanical-keyboard-switch-replacement", badge: "Sockets" },
];

export function DiagnosticFinder({
  placeholder = "What broke? (e.g. MacBook M1 screen, iPhone battery, Inverter PCB...)",
  searchLabel = "Search verified repairs",
  searchButtonText = "Find Technicians",
}: {
  placeholder?: string;
  searchLabel?: string;
  searchButtonText?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  function handleSelectChip(chip: ProblemChip) {
    if (chip.href) {
      router.push(chip.href);
    } else if (chip.query) {
      setQuery(chip.query);
      router.push(`/search?q=${encodeURIComponent(chip.query)}`);
    }
  }

  return (
    <div className="w-full">
      {/* Search Input Box with Machined Framing */}
      <form
        onSubmit={handleSubmit}
        action="/search"
        method="get"
        role="search"
        className="relative group rounded-machined border-2 border-enamel/30 bg-chalk p-1.5 shadow-lift transition-all focus-within:border-signal focus-within:shadow-[0_0_0_3px_rgba(232,89,12,0.15)]"
      >
        <div className="flex items-center gap-2">
          {/* Query Input */}
          <div className="relative flex flex-1 items-center">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 size-4 text-steel transition-colors group-focus-within:text-signal"
            />
            <label htmlFor="home-diagnostic-q" className="sr-only">
              {searchLabel}
            </label>
            <input
              id="home-diagnostic-q"
              name="q"
              type="search"
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-12 w-full rounded-none border-0 bg-transparent pl-10 pr-8 text-sm font-sans text-enamel outline-none placeholder:text-steel-soft"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 rounded p-1 text-steel hover:text-enamel focus:outline-none"
                aria-label="Clear search input"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Submit Action Button */}
          <Button
            type="submit"
            size="lg"
            className="shrink-0 gap-1.5 font-display tracking-wide uppercase px-6 text-sm bg-signal hover:bg-signal-lift text-chalk shadow-bench cursor-pointer"
          >
            <Wrench className="size-4 text-signal-wash" />
            <span>{searchButtonText}</span>
          </Button>
        </div>
      </form>

      {/* Verified Database Category Diagnostic Chips */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-steel font-medium">
          <Sparkles className="size-3 text-signal" />
          Categories:
        </span>
        {REAL_CATEGORIES.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleSelectChip(chip)}
            className="group inline-flex items-center gap-1 rounded-machined border border-hairline bg-chalk/90 px-2 py-1 text-xs text-steel transition-all hover:border-signal hover:bg-signal-wash hover:text-signal focus-visible:border-signal cursor-pointer"
          >
            <span>{chip.label}</span>
            {chip.badge && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-steel-soft group-hover:text-signal-lift font-semibold">
                [{chip.badge}]
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
