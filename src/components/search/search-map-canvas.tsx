"use client";

import * as React from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { useSelection } from "@/components/search/selection-context";
import type { SearchMapPin } from "@/components/search/search-map";

import "leaflet/dist/leaflet.css";

/**
 * Markers are built with `divIcon` rather than Leaflet's default image marker:
 * the default is a PNG referenced by a relative path that bundlers rewrite
 * incorrectly (the well-known broken-marker 404), and a div lets the pin use
 * the same tokens as the rest of the page.
 */
function buildIcon(active: boolean): L.DivIcon {
  const fill = active ? "#123b4a" : "#e8590c";
  const size = active ? 28 : 22;
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:block;width:${size}px;height:${size}px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${fill};border:2px solid #ffffff;
        box-shadow:0 2px 6px rgba(18,59,74,.35);
      "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const DEFAULT_ICON = buildIcon(false);
const ACTIVE_ICON = buildIcon(true);

/** Fits the map to the pins whenever the result set changes identity. */
function FitToPins({ pins }: { pins: SearchMapPin[] }) {
  const map = useMap();
  const signature = pins.map((pin) => pin.id).join(",");

  React.useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number]));
    // A single pin produces a zero-area bounds that `fitBounds` would zoom to
    // maximum on, so treat it as a centre point instead.
    if (pins.length === 1) {
      const first = pins[0];
      if (first) map.setView([first.lat, first.lng], 14);
      return;
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // `signature` is the real dependency; `pins` is a fresh array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

/** Pans to whichever result the visitor picked in the list. */
function PanToSelected({ pins }: { pins: SearchMapPin[] }) {
  const map = useMap();
  const { selectedId } = useSelection();

  React.useEffect(() => {
    if (!selectedId) return;
    const pin = pins.find((candidate) => candidate.id === selectedId);
    if (!pin) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, map]);

  return null;
}

/**
 * "Search this area" is an explicit button rather than an automatic refetch on
 * every pan. Auto-search on move fights the user: the list reshuffles under
 * their cursor while they are still looking for the place they just scrolled to.
 */
function ViewportControl({ onSearchArea }: { onSearchArea: (bbox: string) => void }) {
  const [isDirty, setDirty] = React.useState(false);

  const map = useMapEvents({
    moveend: () => setDirty(true),
    zoomend: () => setDirty(true),
  });

  if (!isDirty) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
      <button
        type="button"
        onClick={() => {
          setDirty(false);
          onSearchArea(map.getBounds().toBBoxString());
        }}
        className="pointer-events-auto rounded-machined border border-enamel bg-enamel px-3 py-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-bench shadow-lift transition-colors hover:bg-enamel-lift"
      >
        Search this area
      </button>
    </div>
  );
}

export interface SearchMapCanvasProps {
  pins: SearchMapPin[];
  center: [number, number];
  zoom: number;
  onSearchArea: (bbox: string) => void;
}

export function SearchMapCanvas({ pins, center, zoom, onSearchArea }: SearchMapCanvasProps) {
  const { hoveredId, selectedId, setHoveredId, setSelectedId } = useSelection();

  return (
    <div className="relative size-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitToPins pins={pins} />
        <PanToSelected pins={pins} />
        <ViewportControl onSearchArea={onSearchArea} />

        {pins.map((pin) => {
          const isActive = hoveredId === pin.id || selectedId === pin.id;
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={isActive ? ACTIVE_ICON : DEFAULT_ICON}
              title={pin.shopName}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{
                mouseover: () => setHoveredId(pin.id),
                mouseout: () => setHoveredId(null),
                click: () => setSelectedId(pin.id),
              }}
            >
              <Popup>
                <span className="block font-display uppercase tracking-[0.06em] text-enamel">
                  {pin.shopName}
                </span>
                <span className="mt-1 block text-steel">{pin.address}</span>
                <Link
                  href={`/expert/${pin.slug}`}
                  className="mt-2 inline-block font-mono text-eyebrow uppercase tracking-[0.14em] text-signal underline underline-offset-4"
                >
                  View profile
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
