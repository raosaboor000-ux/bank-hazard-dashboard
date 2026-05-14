"use client";

import { Globe2 } from "lucide-react";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IpccScenarioId, TimeHorizonId } from "@/lib/risk";

const SSP_TILES: {
  id: Exclude<IpccScenarioId, "historical">;
  title: string;
  emissions: string;
  warming: string;
}[] = [
  { id: "ssp1-2.6", title: "SSP1-2.6", emissions: "Low emissions", warming: "+1.5C" },
  { id: "ssp2-4.5", title: "SSP2-4.5", emissions: "Moderate emissions", warming: "+2.7C" },
  { id: "ssp5-8.5", title: "SSP5-8.5", emissions: "High emissions", warming: "+4.4C" },
];

const HORIZON_TILES: { id: TimeHorizonId; label: string }[] = [
  { id: "short", label: "Short-term (2030)" },
  { id: "medium", label: "Medium-term (2050)" },
  { id: "long", label: "Long-term (2100)" },
];

export function AnalyticsScenarioHorizonPanel() {
  const { scenarioId, horizonId, setScenarioId, setHorizonId } = useScenario();
  const isHistorical = scenarioId === "historical";

  const tileBase =
    "rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70";
  const tileSelected = "border-emerald-500/90 bg-emerald-600 text-white shadow-md";
  const tileIdle =
    "border-white/15 bg-white/[0.06] text-foreground hover:bg-white/10 dark:border-white/12 dark:bg-white/[0.07] dark:hover:bg-white/12";

  return (
    <Card className="hover-lift h-full border-white/20 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]">
      <CardHeader className="border-b border-white/15 pb-4 dark:border-white/10">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="size-5 text-emerald-400/90" />
          Scenario & Horizon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <button
          type="button"
          onClick={() => setScenarioId("historical")}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
            isHistorical ? tileSelected : tileIdle,
          )}
        >
          Reference Period (2020)
        </button>

        <div className="grid grid-cols-2 gap-2">
          {SSP_TILES.slice(0, 2).map((tile) => {
            const active = scenarioId === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setScenarioId(tile.id)}
                className={cn(tileBase, active ? tileSelected : tileIdle)}
              >
                <div className="text-sm font-semibold leading-tight">{tile.title}</div>
                <div className={cn("mt-1 text-xs", active ? "text-white/90" : "text-muted-foreground")}>{tile.emissions}</div>
                <div className={cn("text-xs", active ? "text-white/85" : "text-muted-foreground")}>{tile.warming}</div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setScenarioId(SSP_TILES[2].id)}
            className={cn(tileBase, "col-span-2", scenarioId === SSP_TILES[2].id ? tileSelected : tileIdle)}
          >
            <div className="text-sm font-semibold leading-tight">{SSP_TILES[2].title}</div>
            <div
              className={cn(
                "mt-1 text-xs",
                scenarioId === SSP_TILES[2].id ? "text-white/90" : "text-muted-foreground",
              )}
            >
              {SSP_TILES[2].emissions}
            </div>
            <div
              className={cn("text-xs", scenarioId === SSP_TILES[2].id ? "text-white/85" : "text-muted-foreground")}
            >
              {SSP_TILES[2].warming}
            </div>
          </button>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time horizon</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {HORIZON_TILES.map((h) => {
              const active = !isHistorical && horizonId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  disabled={isHistorical}
                  onClick={() => setHorizonId(h.id)}
                  className={cn(
                    tileBase,
                    "py-2.5 text-center text-sm font-medium",
                    isHistorical && "cursor-not-allowed opacity-45",
                    active ? tileSelected : tileIdle,
                  )}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
          {isHistorical ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Select an SSP above to enable time horizons.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
