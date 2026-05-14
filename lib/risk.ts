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

/**
 * Composite risk score R from branch hazard vector (AIGeo reference: R = round(Σ h_k / K), K = number of hazards).
 */
export function getCompositeRisk(branch: Branch): number {
  const values = Object.values(branch.hazards);
  if (!values.length) return 0;
  const sumHazards = values.reduce((acc, h) => acc + h, 0);
  return Math.round(sumHazards / values.length);
}

export function getRiskCategory(score: number) {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 60) return "Elevated";
  if (score < 80) return "High";
  return "Extreme";
}

export function getRiskColor(score: number) {
  if (score < 20) return "#16a34a";
  if (score < 40) return "#ca8a04";
  if (score < 60) return "#ea580c";
  if (score < 80) return "#dc2626";
  return "#991b1b";
}

/**
 * Physical VaR in PKR (AIGeo reference): VaR = V × (R / 100), where V = asset value, R = composite risk 0–100.
 */
export function physicalVarPkr(V: number, R: number) {
  return roundToDecimals(V * (R / 100));
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

/**
 * Portfolio weightedComposite (AIGeo reference): weightedComposite = Σ (R_i × V_i) / Σ V_i.
 * Here R_i is supplied per branch (e.g. baseline or horizon score from `risk_scores`).
 */
export function getPortfolioValueWeightedCompositeRisk(branches: Branch[], branchRiskScore: (branch: Branch) => number): number {
  if (!branches.length) return 0;
  const totalValue = branches.reduce((s, b) => s + b.asset_value, 0);
  if (totalValue <= 0) return 0;
  const weightedComposite = branches.reduce((s, b) => s + branchRiskScore(b) * b.asset_value, 0) / totalValue;
  return roundToDecimals(weightedComposite);
}

/** Shared IPCC + horizon model used for portfolio summary, VaR, matrix scaling, and maps. */
export type IpccScenarioId = "historical" | "ssp1-2.6" | "ssp2-4.5" | "ssp5-8.5";
export type TimeHorizonId = "short" | "medium" | "long";

const SSP_MULTIPLIER: Record<Exclude<IpccScenarioId, "historical">, number> = {
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
 * Branch-level composite risk R_i for the selected IPCC scenario and time horizon.
 * - Historical: R_i = baseline (2020) score from data (`risk_scores.baseline`).
 * - Future SSP: CSV has a single hazard vector; AIGeo HTML uses full per-scenario hazard tables.
 *   Here R_i ≈ min(100, max(0, R_base × m_SSP × w_horizon)) with R_base = getCompositeRisk(branch).
 */
export function getBranchScenarioRiskScore(branch: Branch, scenario: IpccScenarioId, horizon: TimeHorizonId): number {
  if (scenario === "historical") {
    return roundToDecimals(Math.min(100, Math.max(0, branch.risk_scores.baseline)));
  }
  const R_base = getCompositeRisk(branch);
  const mSSP = SSP_MULTIPLIER[scenario];
  const wHorizon = HORIZON_WEIGHT[horizon];
  return roundToDecimals(Math.min(100, Math.max(0, R_base * mSSP * wHorizon)));
}

/** Portfolio weightedComposite using `getBranchScenarioRiskScore` for each branch (AIGeo: Σ R_i V_i / Σ V_i). */
export function getPortfolioWeightedComposite(branches: Branch[], scenario: IpccScenarioId, horizon: TimeHorizonId): number {
  return getPortfolioValueWeightedCompositeRisk(branches, (b) => getBranchScenarioRiskScore(b, scenario, horizon));
}

/** One row of the AIGeo-style Risk Change chart (baseline vs SSPs at a fixed horizon). */
export type PortfolioRiskChangePoint = {
  scenarioId: IpccScenarioId;
  label: string;
  /** Value-weighted mean composite risk (0–100). */
  composite: number;
  /** Percent change vs 2020 historical baseline; baseline row is 0. */
  pctFromBaseline: number;
};

/**
 * Portfolio risk change vs 2020 baseline (AIGeo `updateChangeView`): value-weighted composite
 * for historical then each SSP, all SSPs using the same `horizon`. Baseline uses stored 2020 scores
 * (`getPortfolioWeightedComposite(..., "historical", ...)` — horizon ignored for historical).
 */
export function getPortfolioRiskChangeSeries(branches: Branch[], horizon: TimeHorizonId): PortfolioRiskChangePoint[] {
  const scenarios: IpccScenarioId[] = ["historical", "ssp1-2.6", "ssp2-4.5", "ssp5-8.5"];
  const labels = ["2020 Baseline", "SSP1-2.6", "SSP2-4.5", "SSP5-8.5"];
  const values = scenarios.map((sc) => getPortfolioWeightedComposite(branches, sc, sc === "historical" ? "short" : horizon));
  const baseline = values[0];
  return scenarios.map((scenarioId, i) => ({
    scenarioId,
    label: labels[i],
    composite: values[i],
    pctFromBaseline: roundToDecimals(baseline === 0 ? 0 : ((values[i] - baseline) / baseline) * 100),
  }));
}

/** Physical VaR for one branch: VaR_i = V_i × (R_i / 100). */
export function getBranchPhysicalVaR(branch: Branch, scenario: IpccScenarioId, horizon: TimeHorizonId) {
  const V = branch.asset_value;
  const R = getBranchScenarioRiskScore(branch, scenario, horizon);
  return physicalVarPkr(V, R);
}

/** Total physical VaR: Σ_i VaR_i (AIGeo reference portfolio sum). */
export function getTotalPortfolioPhysicalVaR(branches: Branch[], scenario: IpccScenarioId, horizon: TimeHorizonId) {
  return roundToDecimals(branches.reduce((acc, b) => acc + getBranchPhysicalVaR(b, scenario, horizon), 0));
}

/**
 * Scale raw hazard h_ik so the row’s composite matches scenario R_i under the current selection:
 * h_ik_scaled = h_ik × (R_i / R_base), R_base = getCompositeRisk(branch).
 */
export function getScaledHazard(branch: Branch, hazardKey: HazardKey, scenario: IpccScenarioId, horizon: TimeHorizonId): number {
  const R_i = getBranchScenarioRiskScore(branch, scenario, horizon);
  const R_base = getCompositeRisk(branch) || 1;
  return roundToDecimals(Math.min(100, Math.max(0, (branch.hazards[hazardKey] * R_i) / R_base)));
}

export function varToMillionsPkrLabel(totalPkr: number) {
  return Math.round(totalPkr / 1_000_000).toLocaleString("en-PK");
}

/** Stressed VaR (AIGeo): stressedVaR = totalVaR × multiplier. */
export function getStressedPhysicalVarPkr(totalPhysicalVarPkr: number, stressMultiplier: number) {
  return roundToDecimals(totalPhysicalVarPkr * stressMultiplier);
}

/** Projected CAR % under stress (AIGeo Climate Stress Test card): max(5, 18 − (multiplier − 1) × 5). */
export function getProjectedCarPercent(stressMultiplier: number) {
  return roundToDecimals(Math.max(5, 18 - (stressMultiplier - 1) * 5));
}

/** Projected LCR % under stress (AIGeo): max(60, 150 − (multiplier − 1) × 40). */
export function getProjectedLcrPercent(stressMultiplier: number) {
  return roundToDecimals(Math.max(60, 150 - (stressMultiplier - 1) * 40));
}
