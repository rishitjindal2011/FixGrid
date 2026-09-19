"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// FixGrid styled pin icon matching the rest of the application
const pinIcon = L.divIcon({
  className: "",
  html: `
    <span style="
      display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:#e8590c;
      border:2px solid #ffffff;box-shadow:0 2px 6px rgba(18,59,74,.35);
    "></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

interface LocationPickerProps {
  defaultLat?: number | null;
  defaultLng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

/** The shape we use out of a Nominatim result. It returns far more. */
interface NominatimResult {
  lat: string;
  lon: string;
}

export function LocationPicker({ defaultLat, defaultLng, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    defaultLat && defaultLng ? [defaultLat, defaultLng] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mapCenter: [number, number] = position || [28.6139, 77.209]; // Default to India if empty

  async function handleSearch() {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setErrorMsg("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data: NominatimResult[] = await response.json();
      const result = data[0];

      if (!result) {
        setErrorMsg("Location not found");
        return;
      }

      const newLat = Number.parseFloat(result.lat);
      const newLng = Number.parseFloat(result.lon);

      // A malformed result is a failed search, not a pin dropped at (NaN, NaN)
      // — which Leaflet renders as a silent no-op and the form would submit.
      if (Number.isNaN(newLat) || Number.isNaN(newLng)) {
        setErrorMsg("Location not found");
        return;
      }

      setPosition([newLat, newLng]);
      onChange(newLat, newLng);
    } catch {
      setErrorMsg("Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 h-[400px]">
      {/*
        A <div>, not a <form>. This component renders inside `ShopProfileForm`'s
        form, and HTML forbids nested forms — the browser drops the inner one
        during parsing, so the server-rendered and client-rendered trees differ
        and React reports a hydration error.

        Losing the form means losing two things a form gave us for free, so both
        are put back by hand: the button is explicitly `type="button"` (a bare
        button inside a form defaults to `type="submit"` and would save the whole
        shop profile), and Enter in the search box is caught and swallowed before
        it reaches the outer form.
      */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for an address to drop a pin..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void handleSearch();
          }}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={() => void handleSearch()}
          disabled={isSearching}
          variant="outline"
        >
          <Search className="size-4 mr-2" />
          Search
        </Button>
      </div>

      {errorMsg && <p className="text-sm text-rust">{errorMsg}</p>}

      <div className="flex-1 relative rounded-machined overflow-hidden border border-hairline z-0">
        <MapContainer center={mapCenter} zoom={position ? 15 : 10} className="h-full w-full">
          <TileLayer
            url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains="0123"
            attribution='&copy; Google Maps'
            maxZoom={20}
          />
          {position && <Marker position={position} icon={pinIcon} />}
          <MapEvents
            onPick={(lat, lng) => {
              setPosition([lat, lng]);
              onChange(lat, lng);
            }}
          />
          <CenterUpdater position={position} />
        </MapContainer>
      </div>
      <p className="text-xs text-steel-soft">
        Click on the map or search an address to set your exact location.
      </p>
    </div>
  );
}

/**
 * Click-to-drop-a-pin.
 *
 * Declared at module scope rather than inside `LocationPicker`. A component
 * defined in a render body is a brand-new type on every render, so React
 * unmounts and remounts it each time — which here would tear down and re-register
 * the map's click handler on every keystroke in the search box.
 */
function MapEvents({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Utility to re-center map when search changes position
function CenterUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  return null;
}
