"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Server/client boundary for the directory map.
 *
 * Leaflet touches `window` at module scope, so it can never be evaluated during
 * SSR — not even to be tree-shaken. Everything Leaflet-flavoured lives in
 * `search-map-canvas`, and this file is the only place that import is deferred.
 */
const SearchMapCanvas = dynamic(
  () => import("./search-map-canvas").then((mod) => mod.SearchMapCanvas),
  {
    ssr: false,
    loading: () => <div className="size-full animate-pulse bg-bench-sunk" aria-hidden />,
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

  // Falls back to a wide view of the world when nothing has coordinates yet;
  // the canvas immediately fits to the pins when there are any.
  const first = pins[0];
  const center: [number, number] = first ? [first.lat, first.lng] : [39.5, -98.35];
  const zoom = first ? 12 : 3;

  return (
    <div className="size-full overflow-hidden rounded-machined border border-hairline bg-bench-sunk">
      {pins.length === 0 ? (
        <div className="schematic flex size-full items-center justify-center p-6 text-center">
          <p className="max-w-[22ch] font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
            No mapped shops in this result set
          </p>
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
  );
}
