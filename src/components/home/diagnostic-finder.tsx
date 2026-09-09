"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Wrench, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProblemChip {
  label: string;
  href?: string;
  query?: string;
  badge?: string;
}

const POPULAR_PROBLEMS: ProblemChip[] = [
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
  placeholder = "Search broken screen, battery drain, PCB short, water damage...",
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
    <div className="w-full max-w-3xl mx-auto">
      {/* Search Input Box with Machined Framing */}
      <form
        onSubmit={handleSubmit}
        action="/search"
        method="get"
        role="search"
        className="relative group rounded-machined border-2 border-enamel/30 bg-chalk p-1.5 shadow-lift transition-all focus-within:border-signal focus-within:shadow-[0_0_0_3px_rgba(232,89,12,0.15)]"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex flex-1 items-center">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 size-5 text-steel transition-colors group-focus-within:text-signal"
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
              className="h-12 w-full rounded-none border-0 bg-transparent pl-11 pr-9 text-base font-sans text-enamel outline-none placeholder:text-steel-soft"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 rounded p-1 text-steel hover:text-enamel focus:outline-none"
                aria-label="Clear search input"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="lg" className="shrink-0 gap-1.5 font-display tracking-wide uppercase px-6">
            <Wrench className="size-4 text-signal-wash" />
            <span>{searchButtonText}</span>
          </Button>
        </div>
      </form>

      {/* High-Intent Problem Diagnostic Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
          <Sparkles className="size-3 text-signal" />
          Frequent Diagnostics:
        </span>
        {POPULAR_PROBLEMS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleSelectChip(chip)}
            className="group inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk/80 px-2.5 py-1 text-xs text-steel transition-all hover:border-signal hover:bg-signal-wash hover:text-signal focus-visible:border-signal"
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
