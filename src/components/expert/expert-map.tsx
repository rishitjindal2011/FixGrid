"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet reads `window` at module scope, so it cannot be imported on the
 * server at all — not even to be tree-shaken away. This wrapper is the only
 * place that boundary is crossed.
 */
const ExpertMapCanvas = dynamic(
  () => import("./expert-map-canvas").then((mod) => mod.ExpertMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/10] animate-pulse rounded-machined border border-hairline bg-bench-sunk" />
    ),
  },
);

export function ExpertMap({
  lat,
  lng,
  shopName,
}: {
  lat: number | null;
  lng: number | null;
  shopName: string;
}) {
  if (lat === null || lng === null) return null;
  return <ExpertMapCanvas lat={lat} lng={lng} shopName={shopName} />;
}
