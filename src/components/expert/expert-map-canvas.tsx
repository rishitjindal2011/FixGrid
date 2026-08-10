"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

/**
 * Leaflet's default marker icon is a PNG referenced by a relative URL that
 * bundlers rewrite incorrectly — the classic broken-marker 404. A divIcon
 * sidesteps the asset pipeline entirely and lets the pin use our tokens.
 */
const pinIcon = L.divIcon({
  className: "",
  html: `
    <span style="
      display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:#e8590c;
      border:2px solid #ffffff;box-shadow:0 2px 6px rgba(18,59,74,.35);
    "></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export function ExpertMapCanvas({
  lat,
  lng,
  shopName,
}: {
  lat: number;
  lng: number;
  shopName: string;
}) {
  return (
    <div className="aspect-[16/10] overflow-hidden rounded-machined border border-hairline">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <Marker position={[lat, lng]} icon={pinIcon} title={shopName} />
      </MapContainer>
    </div>
  );
}
