"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { horizonLabel } from "@/lib/ipcc-scenarios";
import {
  getBranchScenarioRiskScore,
  getPortfolioRiskChangeSeries,
  getPortfolioValueWeightedCompositeRisk,
  getPortfolioWeightedComposite,
  getTotalPortfolioPhysicalVaR,
  toCompactCurrency,
  type IpccScenarioId,
  type TimeHorizonId,
} from "@/lib/risk";

const DASHBOARD_SCENARIO_OPTIONS: { id: IpccScenarioId; label: string }[] = [
  { id: "historical", label: "Historical (2020)" },
  { id: "ssp1-2.6", label: "SSP1-2.6" },
  { id: "ssp2-4.5", label: "SSP2-4.5" },
  { id: "ssp5-8.5", label: "SSP5-8.5" },
];

const DASHBOARD_HORIZON_OPTIONS: TimeHorizonId[] = ["short", "medium", "long"];

const toMax3Decimals = (value: number) => Number(value.toFixed(3)).toString();
const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.95)",
  color: "#e2e8f0",
};

/** Same top/bottom margins so plot bands and x-axis baselines line up across charts. */
const DASHBOARD_SYNC_CHART_MARGIN = { top: 28, bottom: 44, left: 4 } as const;
const dashboardLineChartMargin = { ...DASHBOARD_SYNC_CHART_MARGIN, right: 12 };
const dashboardComposedChartMargin = { ...DASHBOARD_SYNC_CHART_MARGIN, right: 52 };

const sharedXAxisTickProps = {
  fontSize: 11,
  fill: "rgba(148,163,184,0.95)",
} as const;

const RiskMap = dynamic(() => import("@/components/dashboard/risk-map").then((m) => m.RiskMap), {
  ssr: false,
  loading: () => <div className="h-[360px] animate-pulse rounded-md bg-muted" />,
});

export default function DashboardPage() {
  const { branches } = useBranchStore();
  const { scenarioId, horizonId, setScenarioId, setHorizonId } = useScenario();
  const isHistorical = scenarioId === "historical";
  const eff = isHistorical ? "short" : horizonId;
  const avgRisk = getPortfolioWeightedComposite(branches, scenarioId, eff);
  const totalVaR = getTotalPortfolioPhysicalVaR(branches, scenarioId, eff);
  const highRiskCount = branches.filter((b) => getBranchScenarioRiskScore(b, scenarioId, eff) >= 60).length;

  const portfolioTrajectory = useMemo(
    () =>
      (["baseline", "short_term", "medium_term", "long_term"] as const).map((key, idx) => ({
        year: ["2020", "2030", "2050", "2100"][idx] as string,
        score: getPortfolioValueWeightedCompositeRisk(branches, (branch) =>
          key === "baseline"
            ? branch.risk_scores.baseline
            : key === "short_term"
              ? branch.risk_scores.short_term
              : key === "medium_term"
                ? branch.risk_scores.medium_term
                : branch.risk_scores.long_term,
        ),
      })),
    [branches],
  );

  const topMatrix = [...branches]
    .sort(
      (a, b) =>
        getBranchScenarioRiskScore(b, scenarioId, eff) - getBranchScenarioRiskScore(a, scenarioId, eff),
    )
    .slice(0, 5)
    .map((branch) => ({
      name: branch.name,
      risk: getBranchScenarioRiskScore(branch, scenarioId, eff),
      value: branch.asset_value / 1_000_000_000,
    }));

  const riskChangeSeries = useMemo(() => getPortfolioRiskChangeSeries(branches, horizonId), [branches, horizonId]);

  return (
    <div className="fade-in-up space-y-6">
      <header>
        <p className="section-kicker">Climate Physical Risk Intelligence</p>
        <h2 className="section-title">Banking Framework Compliance Dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
          Portfolio-wide physical climate risk intelligence for Alfalah Bank branches across Pakistan.
          Executive-ready view of exposure, hotspots, and future risk transition.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Scenario</p>
          <Select value={scenarioId} onValueChange={(value) => setScenarioId(value as IpccScenarioId)}>
            <SelectTrigger
              size="sm"
              className="h-9 min-w-[160px] border-white/25 bg-white/15 text-sm dark:border-white/15 dark:bg-white/10"
            >
              <SelectValue placeholder="Scenario" />
            </SelectTrigger>
            <SelectContent align="start">
              {DASHBOARD_SCENARIO_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time horizon</p>
          <Select
            value={horizonId}
            onValueChange={(value) => setHorizonId(value as TimeHorizonId)}
            disabled={isHistorical}
          >
            <SelectTrigger
              size="sm"
              className="h-9 min-w-[180px] border-white/25 bg-white/15 text-sm dark:border-white/15 dark:bg-white/10"
            >
              <SelectValue placeholder="Time horizon" />
            </SelectTrigger>
            <SelectContent align="start">
              {DASHBOARD_HORIZON_OPTIONS.map((hid) => (
                <SelectItem key={hid} value={hid} className="text-sm">
                  {horizonLabel(hid)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Branches" value={String(branches.length)} helper="Total branch assets monitored in this portfolio." />
        <KpiCard
          title="Avg Composite Risk"
          value={avgRisk.toFixed(1)}
          helper="Value-weighted mean risk (0-100) for the active scenario and time horizon selection."
        />
        <KpiCard
          title="Total Physical VaR"
          value={toCompactCurrency(totalVaR)}
          helper="Sum of branch VaR for the active IPCC scenario and time horizon."
        />
        <KpiCard title="High Risk Branches" value={String(highRiskCount)} helper="Branches with active scenario risk at or above 60/100 (Board appetite)." />
      </section>

      <section className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 md:grid-cols-2">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-[5.5rem] shrink-0 flex-col">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">Branch Risk Map</h3>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
              Geographic distribution of branches; marker color reflects active scenario risk.
            </p>
          </div>
          <div className="mt-3 h-[380px] w-full min-h-0 shrink-0 overflow-hidden rounded-2xl">
            <RiskMap branches={branches} />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-[5.5rem] shrink-0 flex-col">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">Mini Hazard x Asset Matrix (Top 5 Risk)</h3>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
              Highest composite-risk branches for the active scenario and horizon.
            </p>
          </div>
          <div className="mt-3 h-[380px] shrink-0 overflow-hidden rounded-2xl">
            <div className="h-full space-y-3 overflow-y-auto pr-1">
              {topMatrix.map((row) => (
                <div key={row.name} className="rounded-xl border border-white/20 bg-white/35 p-3 transition-all duration-300 hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{row.name}</span>
                    <span>{row.risk.toFixed(2)} Risk</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/80">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 transition-all duration-500" style={{ width: `${Math.min(100, row.risk)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Assets: {row.value.toFixed(2)}B PKR</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-[5.5rem] shrink-0 flex-col">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">Portfolio composite by year</h3>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
              Value-weighted mean from stored horizon scores (2020–2100).
            </p>
          </div>
          <div className="mt-3 h-[280px] w-full min-w-0 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioTrajectory} margin={dashboardLineChartMargin}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="year"
                  stroke="rgba(148,163,184,0.85)"
                  tick={sharedXAxisTickProps}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
                  height={48}
                  angle={-12}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  width={44}
                  stroke="rgba(148,163,184,0.85)"
                  domain={[0, 100]}
                  tick={sharedXAxisTickProps}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
                />
                <Tooltip
                  formatter={(value) => toMax3Decimals(Number(value ?? 0))}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Line dataKey="score" name="Composite (0–100)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-[5.5rem] shrink-0 flex-col">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">Risk change vs 2020 baseline</h3>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
              Bars: value-weighted composite by scenario. Line: % change vs 2020. SSPs use{" "}
              <span className="font-medium text-foreground">{horizonLabel(horizonId)}</span>.
            </p>
          </div>
          <div className="mt-3 h-[280px] w-full min-w-0 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={riskChangeSeries} margin={dashboardComposedChartMargin}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(148,163,184,0.85)"
                  tick={sharedXAxisTickProps}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
                  height={48}
                  angle={-12}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  width={44}
                  domain={[0, 100]}
                  stroke="rgba(148,163,184,0.85)"
                  tick={sharedXAxisTickProps}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#c62828"
                  width={44}
                  tick={{ fontSize: 11, fill: "#f87171" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(198,40,40,0.45)" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                  formatter={(value, name) => {
                    const n = Number(value ?? 0);
                    if (name === "% vs 2020 baseline") return [`${n.toFixed(1)}%`, name];
                    return [`${n.toFixed(2)}/100`, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  wrapperStyle={{ fontSize: 11, lineHeight: "14px", paddingBottom: 2 }}
                />
                <Bar yAxisId="left" dataKey="composite" name="Composite risk (0–100)" fill="#1e6f5c" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pctFromBaseline"
                  name="% vs 2020 baseline"
                  stroke="#c62828"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#c62828" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
