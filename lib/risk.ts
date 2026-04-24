import type { Branch, HazardKey } from "@/types/branch";

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
  return values.reduce((acc, current) => acc + current, 0) / values.length;
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
  return assetValue * (riskScore / 100);
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
  return values.reduce((acc, item) => acc + item, 0) / values.length;
}
