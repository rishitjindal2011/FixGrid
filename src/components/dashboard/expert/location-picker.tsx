"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
const defaultIcon = L.icon({
  iconUrl: "/images/marker-icon.png",
  iconRetinaUrl: "/images/marker-icon-2x.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerProps {
  defaultLat?: number | null;
  defaultLng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ defaultLat, defaultLng, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    defaultLat && defaultLng ? [defaultLat, defaultLng] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mapCenter: [number, number] = position || [51.505, -0.09]; // Default to London if empty

  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        setPosition([newLat, newLng]);
        onChange(newLat, newLng);
      } else {
        setErrorMsg("Location not found");
      }
    } catch (err) {
      setErrorMsg("Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 h-[400px]">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for an address to drop a pin..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isSearching} variant="outline">
          <Search className="size-4 mr-2" />
          Search
        </Button>
      </form>
      
      {errorMsg && <p className="text-sm text-rust">{errorMsg}</p>}

      <div className="flex-1 relative rounded-machined overflow-hidden border border-hairline z-0">
        <MapContainer center={mapCenter} zoom={position ? 15 : 10} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <Marker position={position} />}
          <MapEvents />
          <CenterUpdater position={position} />
        </MapContainer>
      </div>
      <p className="text-xs text-steel-soft">
        Click on the map or search an address to set your exact location.
      </p>
    </div>
  );
}

// Utility to re-center map when search changes position
function CenterUpdater({ position }: { position: [number, number] | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  return null;
}
