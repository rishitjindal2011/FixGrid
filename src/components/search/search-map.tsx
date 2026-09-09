"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";

/**
 * Server/client boundary for the directory map.
 */
const SearchMapCanvas = dynamic(
  () => import("./search-map-canvas").then((mod) => mod.SearchMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full flex-col items-center justify-center bg-bench-sunk/60 text-steel">
        <Navigation className="size-6 animate-spin text-signal" />
        <span className="mt-2 font-mono text-eyebrow uppercase tracking-wider">
          Initializing Radar...
        </span>
      </div>
    ),
  },
);

export interface SearchMapPin {
  id: string;
  slug: string;
  shopName: string;
  address: string;
  lat: number;
  lng: number;
}

function isIndia(lat: number, lng: number): boolean {
  return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

export function SearchMap({ pins }: { pins: SearchMapPin[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearchArea = React.useCallback(
    (bbox: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("bbox", bbox);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Focus on Indian territory pins
  const indiaPins = pins.filter((p) => isIndia(p.lat, p.lng));
  const effectivePins = indiaPins.length > 0 ? indiaPins : pins;
  const first = effectivePins[0];
  // Default to New Delhi / NCR center instead of USA
  const center: [number, number] = first ? [first.lat, first.lng] : [28.6139, 77.209];
  const zoom = first ? 13 : 5;

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-machined border-2 border-enamel/20 bg-chalk shadow-lift">
      {/* Map Command Bar */}
      <div className="flex items-center justify-between border-b border-hairline bg-enamel px-4 py-2.5 text-bench shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
          </span>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-bench">
            FixGrid Workshop Radar
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-signal bg-enamel-lift px-2 py-0.5 rounded font-bold">
          {effectivePins.length} {effectivePins.length === 1 ? "Workshop" : "Workshops"} Mapped
        </span>
      </div>

      {/* Map Content */}
      <div className="relative flex-1 min-h-0">
        {pins.length === 0 ? (
          <div className="schematic flex size-full items-center justify-center p-6 text-center">
            <div className="rounded-machined border border-hairline bg-chalk/90 p-4 shadow-bench max-w-xs">
              <MapPin className="mx-auto size-5 text-steel-soft" />
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-enamel font-bold">
                No mapped workshops in view
              </p>
              <p className="mt-1 text-xs text-steel">
                Adjust your filters or zoom out to see more repair hubs.
              </p>
            </div>
          </div>
        ) : (
          <SearchMapCanvas
            pins={pins}
            center={center}
            zoom={zoom}
            onSearchArea={handleSearchArea}
          />
        )}
      </div>
    </div>
  );
}
