import type { IpccScenarioId, TimeHorizonId } from "@/lib/risk";

export function horizonLabel(id: TimeHorizonId): string {
  switch (id) {
    case "short":
      return "Short term (2030)";
    case "medium":
      return "Medium term (2050)";
    case "long":
      return "Long term (2100)";
    default:
      return id;
  }
}

/** Hyphenated labels (Analytics Scenario & Horizon card). */
export function horizonLabelHyphenated(id: TimeHorizonId): string {
  switch (id) {
    case "short":
      return "Short-term (2030)";
    case "medium":
      return "Medium-term (2050)";
    case "long":
      return "Long-term (2100)";
    default:
      return id;
  }
}

export function scenarioLabel(id: IpccScenarioId): string {
  switch (id) {
    case "historical":
      return "Historical baseline (2020)";
    case "ssp1-2.6":
      return "SSP1-2.6";
    case "ssp2-4.5":
      return "SSP2-4.5";
    case "ssp5-8.5":
      return "SSP5-8.5";
    default:
      return id;
  }
}

/** Longer description for summary lines (emissions band + indicative warming). */
export function scenarioLabelWithDetails(id: IpccScenarioId): string {
  switch (id) {
    case "historical":
      return "Historical baseline (2020)";
    case "ssp1-2.6":
      return "SSP1-2.6 — Low emissions — +1.5°C";
    case "ssp2-4.5":
      return "SSP2-4.5 — Moderate emissions — +2.7°C";
    case "ssp5-8.5":
      return "SSP5-8.5 — High emissions — +4.4°C";
    default:
      return id;
  }
}
