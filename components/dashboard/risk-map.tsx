"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/branch";
import { calculateCompositeRisk, getRiskColor, getRiskCategory, toCompactCurrency } from "@/lib/risk";
import "leaflet/dist/leaflet.css";

export function RiskMap({ branches }: { branches: Branch[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([30.3753, 69.3451], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    branches.forEach((branch) => {
      const score = calculateCompositeRisk(branch);
      const marker = L.circleMarker([branch.lat, branch.lng], {
        radius: 8,
        color: getRiskColor(score),
        fillColor: getRiskColor(score),
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:220px;line-height:1.45">
            <strong>${branch.name}</strong><br/>
            <span>${branch.city}</span><br/>
            <span>Asset Value: ${toCompactCurrency(branch.asset_value)}</span><br/>
            <span>Composite Risk: ${score.toFixed(2)} (${getRiskCategory(score)})</span><br/>
            <span>2050 Score: ${branch.risk_scores.medium_term.toFixed(2)} | 2100 Score: ${branch.risk_scores.long_term.toFixed(2)}</span><br/>
            <a href="/portfolio?branch=${branch.id}" data-branch-link="${branch.id}" style="display:inline-block;margin-top:8px;color:#60a5fa;text-decoration:underline;font-weight:600">View asset details</a>
          </div>`,
        );
      marker.on("dblclick", () => {
        router.push(`/portfolio?branch=${branch.id}`);
      });
      marker.on("popupopen", (event) => {
        const popupEl = event.popup.getElement();
        const link = popupEl?.querySelector(`[data-branch-link="${branch.id}"]`) as HTMLAnchorElement | null;
        if (!link) return;
        link.onclick = (clickEvent) => {
          clickEvent.preventDefault();
          router.push(`/portfolio?branch=${branch.id}`);
        };
      });
    });

    return () => {
      map.remove();
    };
  }, [branches, router]);

  return <div ref={mapRef} className="z-0 h-[360px] w-full rounded-md" />;
}
