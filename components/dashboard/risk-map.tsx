"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Branch } from "@/types/branch";
import { calculateCompositeRisk, getRiskColor, getRiskCategory } from "@/lib/risk";
import "leaflet/dist/leaflet.css";

export function RiskMap({ branches }: { branches: Branch[] }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([30.3753, 69.3451], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    branches.forEach((branch) => {
      const score = calculateCompositeRisk(branch);
      L.circleMarker([branch.lat, branch.lng], {
        radius: 8,
        color: getRiskColor(score),
        fillColor: getRiskColor(score),
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${branch.name}</strong><br/>${branch.city}<br/>Composite Risk: ${score.toFixed(1)}<br/>Category: ${getRiskCategory(score)}`,
        );
    });

    return () => {
      map.remove();
    };
  }, [branches]);

  return <div ref={mapRef} className="z-0 h-[360px] w-full rounded-md" />;
}
