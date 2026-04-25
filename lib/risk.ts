import type { Branch, HazardKey } from "@/types/branch";

const DISPLAY_DECIMALS = 3;

/** Cuts IEEE-754 noise (e.g. 40.480000000000004) for any displayed / charted value. */
export function roundToDecimals(value: number, decimals: number = DISPLAY_DECIMALS) {
  if (!Number.isFinite(value)) return 0;
  return Number.parseFloat(value.toFixed(decimals));
}

export const HAZARD_LABELS: Record<HazardKey, string> = {
  flood: "Flood",
  heatwave: "Heatwave",
  drought: "Drought",
  urban_flood: "Urban Flood",
  extreme_rain: "Extreme Rain",
};

export function toCurrency(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toCompactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000_000) {
    return `${sign}Rs ${(abs / 1_000_000_000_000).toFixed(2).replace(/\.?0+$/, "")}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}Rs ${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rs ${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}Rs ${(abs / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
  }
  return `${sign}Rs ${abs.toFixed(2).replace(/\.?0+$/, "")}`;
}

export function calculateCompositeRisk(branch: Branch) {
  const values = Object.values(branch.hazards);
  return roundToDecimals(values.reduce((acc, current) => acc + current, 0) / values.length);
}

export function getRiskCategory(score: number) {
  if (score <= 20) return "Low";
  if (score <= 40) return "Moderate";
  if (score <= 60) return "Elevated";
  if (score <= 80) return "High";
  return "Extreme";
}

export function getRiskColor(score: number) {
  if (score <= 20) return "#16a34a";
  if (score <= 40) return "#ca8a04";
  if (score <= 60) return "#ea580c";
  if (score <= 80) return "#dc2626";
  return "#991b1b";
}

export function calculateVaR(assetValue: number, riskScore: number) {
  return roundToDecimals(assetValue * (riskScore / 100));
}

export function buildRiskTrajectory(branch: Branch) {
  return [
    { year: "2020", risk: branch.risk_scores.baseline },
    { year: "2030", risk: branch.risk_scores.short_term },
    { year: "2050", risk: branch.risk_scores.medium_term },
    { year: "2100", risk: branch.risk_scores.long_term },
  ];
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return roundToDecimals(values.reduce((acc, item) => acc + item, 0) / values.length);
}

/** Shared IPCC + horizon model used for portfolio summary, VaR, matrix scaling, and maps. */
export type IpcgScenarioId = "historical" | "ssp1-2.6" | "ssp2-4.5" | "ssp5-8.5";
export type TimeHorizonId = "short" | "medium" | "long";

const SSP_MULTIPLIER: Record<Exclude<IpcgScenarioId, "historical">, number> = {
  "ssp1-2.6": 0.92,
  "ssp2-4.5": 1.08,
  "ssp5-8.5": 1.26,
};

const HORIZON_WEIGHT: Record<TimeHorizonId, number> = {
  short: 1.0,
  medium: 1.12,
  long: 1.26,
};

/**
 * One branch-level risk score (0–100) for the selected scenario/period.
 * - Historical: SBP 2020 baseline (stored as `risk_scores.baseline`).
 * - Future SSP: hazard composite × IPCC scenario multiplier × time-horizon weight (capped at 100).
 */
export function getBranchScenarioRiskScore(branch: Branch, scenario: IpcgScenarioId, horizon: TimeHorizonId): number {
  if (scenario === "historical") {
    return roundToDecimals(Math.min(100, Math.max(0, branch.risk_scores.baseline)));
  }
  const base = calculateCompositeRisk(branch);
  const m = SSP_MULTIPLIER[scenario];
  const w = HORIZON_WEIGHT[horizon];
  return roundToDecimals(Math.min(100, base * m * w));
}

/** Value-weighted average portfolio risk (0–100), consistent with the HTML reference dashboard. */
export function getPortfolioWeightedComposite(
  branches: Branch[],
  scenario: IpcgScenarioId,
  horizon: TimeHorizonId,
): number {
  if (!branches.length) return 0;
  const totalValue = branches.reduce((a, b) => a + b.asset_value, 0);
  if (totalValue <= 0) return 0;
  return roundToDecimals(
    branches.reduce((s, b) => s + getBranchScenarioRiskScore(b, scenario, horizon) * b.asset_value, 0) / totalValue,
  );
}

/** Physical VaR = asset value × (scenario risk / 100). */
export function getBranchPhysicalVaR(branch: Branch, scenario: IpcgScenarioId, horizon: TimeHorizonId) {
  return calculateVaR(branch.asset_value, getBranchScenarioRiskScore(branch, scenario, horizon));
}

export function getTotalPortfolioPhysicalVaR(branches: Branch[], scenario: IpcgScenarioId, horizon: TimeHorizonId) {
  return roundToDecimals(
    branches.reduce((acc, b) => acc + getBranchPhysicalVaR(b, scenario, horizon), 0),
  );
}

/**
 * Scale raw hazard values so the row’s composite matches `getBranchScenarioRiskScore` under the current selection.
 */
export function getScaledHazard(branch: Branch, hazardKey: HazardKey, scenario: IpcgScenarioId, horizon: TimeHorizonId): number {
  const target = getBranchScenarioRiskScore(branch, scenario, horizon);
  const base = calculateCompositeRisk(branch) || 1;
  return roundToDecimals(
    Math.min(100, Math.max(0, (branch.hazards[hazardKey] * target) / base)),
  );
}

export function varToMillionsPkrLabel(totalPkr: number) {
  return Math.round(totalPkr / 1_000_000).toLocaleString("en-PK");
}
