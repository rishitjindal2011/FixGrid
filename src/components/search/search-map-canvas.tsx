"use client";

import * as React from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { BadgeCheck, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSelection } from "@/components/search/selection-context";
import type { SearchMapPin } from "@/components/search/search-map";

import "leaflet/dist/leaflet.css";

/**
 * Custom modern machined markers matching FixGrid's industrial design tokens.
 */
function buildIcon(active: boolean): L.DivIcon {
  const fill = active ? "#e8590c" : "#123b4a";
  const size = active ? 32 : 24;
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <span style="
          display:block;width:${size}px;height:${size}px;
          border-radius:50%;background:${fill};
          border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        "></span>
        ${
          active
            ? `<span style="
                position:absolute;top:50%;left:50%;width:8px;height:8px;
                margin-top:-4px;margin-left:-4px;background:#ffffff;
                border-radius:50%;
              "></span>`
            : ""
        }
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const DEFAULT_ICON = buildIcon(false);
const ACTIVE_ICON = buildIcon(true);

function isIndia(lat: number, lng: number): boolean {
  return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

/** Fits the map to the pins, prioritizing Indian coordinates to prevent world-wide zoomouts. */
function FitToPins({ pins }: { pins: SearchMapPin[] }) {
  const map = useMap();
  const indiaPins = pins.filter((pin) => isIndia(pin.lat, pin.lng));
  const targetPins = indiaPins.length > 0 ? indiaPins : pins;
  const signature = targetPins.map((pin) => pin.id).join(",");

  React.useEffect(() => {
    if (targetPins.length === 0) {
      map.setView([28.6139, 77.209], 12);
      return;
    }
    if (targetPins.length === 1) {
      const first = targetPins[0];
      if (first) map.setView([first.lat, first.lng], 14);
      return;
    }
    const bounds = L.latLngBounds(targetPins.map((pin) => [pin.lat, pin.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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
    map.flyTo([pin.lat, pin.lng], 15, { duration: 0.6 });
  }, [selectedId, map]);

  return null;
}

/** Explicit "Search this area" floating pill. */
function ViewportControl({ onSearchArea }: { onSearchArea: (bbox: string) => void }) {
  const [isDirty, setDirty] = React.useState(false);
  const map = useMapEvents({
    dragend: () => setDirty(true),
  });

  const handleClick = () => {
    const bounds = map.getBounds();
    const bbox = [
      bounds.getSouth().toFixed(5),
      bounds.getWest().toFixed(5),
      bounds.getNorth().toFixed(5),
      bounds.getEast().toFixed(5),
    ].join(",");
    setDirty(false);
    onSearchArea(bbox);
  };

  if (!isDirty) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto rounded-full bg-enamel px-4 py-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-bench shadow-lift hover:bg-signal transition-colors flex items-center gap-2 cursor-pointer"
      >
        <MapPin className="size-3 text-signal" />
        Search this map area
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
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains="0123"
          attribution='&copy; Google Maps'
          maxZoom={20}
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
              <Popup className="fixgrid-map-popup">
                <div className="p-1 min-w-[180px]">
                  <span className="block font-display text-sm font-bold uppercase tracking-wide text-enamel">
                    {pin.shopName}
                  </span>
                  <span className="mt-1 block text-xs text-steel leading-snug">{pin.address}</span>
                  <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase font-semibold text-verdigris flex items-center gap-1">
                      <ShieldCheck className="size-3" /> Escrow Safe
                    </span>
                    <Link
                      href={`/expert/${pin.slug}`}
                      className="font-display text-xs uppercase tracking-wider text-signal font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      Profile &rarr;
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
