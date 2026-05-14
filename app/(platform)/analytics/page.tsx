"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarDays, Download, Gauge, LineChart as LineChartIcon, ShieldCheck, Upload } from "lucide-react";
import { AnalyticsScenarioHorizonPanel } from "@/components/dashboard/analytics-scenario-horizon-panel";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { downloadCsv, parseCsvText } from "@/lib/csv";
import { horizonLabelHyphenated, scenarioLabel } from "@/lib/ipcc-scenarios";
import {
  getBranchPhysicalVaR,
  getBranchScenarioRiskScore,
  getPortfolioValueWeightedCompositeRisk,
  getPortfolioWeightedComposite,
  getProjectedCarPercent,
  getProjectedLcrPercent,
  getRiskCategory,
  getScaledHazard,
  getStressedPhysicalVarPkr,
  getTotalPortfolioPhysicalVaR,
  HAZARD_LABELS,
  roundToDecimals,
  toCompactCurrency,
  varToMillionsPkrLabel,
} from "@/lib/risk";
import type { HazardKey } from "@/types/branch";

const hazardKeys: HazardKey[] = ["flood", "heatwave", "drought", "urban_flood", "extreme_rain"];

/** Stress severity multiplier m (AIGeo: Stressed VaR = totalVaR × m). */
const stressOptions = [
  { id: "once-100", label: "1-in-100 year (Severe)", varLift: 1.8 },
  { id: "once-50", label: "1-in-50 year (Extreme)", varLift: 2.2 },
  { id: "compound", label: "1-in-200 years (Extreme)", varLift: 2.6 },
] as const;

const roadmap = [
  { name: "Governance Structure", due: "Sep 2026", progress: 30 },
  { name: "Policy Development", due: "Dec 2026", progress: 20 },
  { name: "Risk Integration", due: "Jun 2027", progress: 15 },
  { name: "Staff Capacity Building", due: "Dec 2027", progress: 10 },
  { name: "Full Compliance", due: "Jun 2029", progress: 5 },
];

function cellColor(value: number) {
  if (value < 20) return "bg-green-500/22 text-green-100";
  if (value < 40) return "bg-yellow-500/28 text-yellow-50";
  if (value < 60) return "bg-orange-500/32 text-orange-50";
  if (value < 80) return "bg-red-500/36 text-red-50";
  return "bg-red-700/45 text-red-50";
}

function formatPkrAxis(value: number) {
  if (!Number.isFinite(value)) return "Rs 0";
  if (Math.abs(value) >= 1_000_000_000) return `Rs ${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `Rs ${(value / 1_000_000).toFixed(0)}M`;
  return `Rs ${Math.round(value)}`;
}

const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.95)",
  color: "#e2e8f0",
};

export default function AnalyticsPage() {
  const { branches, updateBranch } = useBranchStore();
  const { scenarioId, horizonId } = useScenario();
  const [stressId, setStressId] = useState<(typeof stressOptions)[number]["id"]>("once-100");
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const [varView, setVarView] = useState<"chart" | "table">("chart");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedBranch = branches.find((b) => b.id === selectedId) ?? branches[0];
  const isHistorical = scenarioId === "historical";
  const eff = isHistorical ? "short" : horizonId;
  const stress = stressOptions.find((item) => item.id === stressId) ?? stressOptions[0];

  const compositeRisk = getPortfolioWeightedComposite(branches, scenarioId, eff);
  const totalVaR = getTotalPortfolioPhysicalVaR(branches, scenarioId, eff);
  const stressedVaR = getStressedPhysicalVarPkr(totalVaR, stress.varLift);
  const projectedCar = getProjectedCarPercent(stress.varLift);
  const projectedLcr = getProjectedLcrPercent(stress.varLift);

  const varData = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        name: b.name,
        var: getBranchPhysicalVaR(b, scenarioId, eff),
        contributionPct: totalVaR > 0 ? (getBranchPhysicalVaR(b, scenarioId, eff) / totalVaR) * 100 : 0,
      })),
    [branches, scenarioId, eff, totalVaR],
  );

  const branchHazardData = selectedBranch
    ? hazardKeys.map((hazard) => ({
        hazard: HAZARD_LABELS[hazard],
        yearly: getScaledHazard(selectedBranch, hazard, scenarioId, eff),
      }))
    : [];

  const trajectory = [
    { year: "2020", portfolio: getPortfolioValueWeightedCompositeRisk(branches, (b) => b.risk_scores.baseline) },
    { year: "2030", portfolio: getPortfolioValueWeightedCompositeRisk(branches, (b) => b.risk_scores.short_term) },
    { year: "2050", portfolio: getPortfolioValueWeightedCompositeRisk(branches, (b) => b.risk_scores.medium_term) },
    { year: "2100", portfolio: getPortfolioValueWeightedCompositeRisk(branches, (b) => b.risk_scores.long_term) },
  ];

  const handleHazardImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const table = parseCsvText(content);
    if (table.length < 2) {
      setImportMessage("CSV has no data rows.");
      event.target.value = "";
      return;
    }

    const headers = table[0].map((h) => String(h).trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const idIdx = idx("id");
    const nameIdx = idx("name");
    const floodIdx = idx("flood");
    const heatIdx = idx("heatwave");
    const droughtIdx = idx("drought");
    const urbanIdx = idx("urban_flood");
    const rainIdx = idx("extreme_rain");

    let updated = 0;
    for (const row of table.slice(1)) {
      const get = (i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "");
      const rowId = get(idIdx);
      const rowName = get(nameIdx);
      const target = branches.find(
        (b) =>
          (rowId && b.id.toLowerCase() === rowId.toLowerCase()) ||
          (rowName && b.name.toLowerCase() === rowName.toLowerCase()),
      );
      if (!target) continue;

      const next = { ...target.hazards };
      const read = (i: number) => {
        const raw = get(i);
        if (!raw) return undefined;
        const n = Number(raw);
        if (!Number.isFinite(n)) return undefined;
        return Math.max(0, Math.min(100, n));
      };

      const flood = read(floodIdx);
      const heatwave = read(heatIdx);
      const drought = read(droughtIdx);
      const urban_flood = read(urbanIdx);
      const extreme_rain = read(rainIdx);
      if (flood !== undefined) next.flood = flood;
      if (heatwave !== undefined) next.heatwave = heatwave;
      if (drought !== undefined) next.drought = drought;
      if (urban_flood !== undefined) next.urban_flood = urban_flood;
      if (extreme_rain !== undefined) next.extreme_rain = extreme_rain;

      updateBranch(target.id, { hazards: next });
      updated += 1;
    }

    setImportMessage(updated ? `Imported hazard values for ${updated} branch(es).` : "No matching rows found in CSV.");
    event.target.value = "";
  };

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Unified Intelligence</p>
        <h2 className="section-title">Analytics</h2>
      </header>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="hover-lift border-white/20 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]">
          <CardHeader className="border-b border-white/15 pb-4 dark:border-white/10">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="size-5" />
              Portfolio Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Metrics update from the Scenario & Horizon panel on this page. Same selection applies across Dashboard and Portfolio.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-5xl font-bold tabular-nums">{Math.round(compositeRisk)}</p>
              <p className="text-muted-foreground">Composite Risk (0-100)</p>
              <div className="mx-auto mt-4 w-full max-w-sm">
                <RiskGauge score={compositeRisk} />
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-5xl font-bold tabular-nums">{varToMillionsPkrLabel(totalVaR)}</p>
              <p className="text-muted-foreground">Physical VaR (PKR M)</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Current:{" "}
              {isHistorical
                ? "Reference Period (2020)"
                : `${scenarioLabel(scenarioId)} / ${horizonLabelHyphenated(horizonId)}`}
            </p>
            <p className="text-sm font-semibold">
              Portfolio: {getRiskCategory(compositeRisk)} Risk ({Math.round(compositeRisk)}/100)
            </p>
          </CardContent>
        </Card>

        <AnalyticsScenarioHorizonPanel />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-5" /> Climate Stress Test</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={stressId} onValueChange={(value) => setStressId((value as (typeof stressOptions)[number]["id"]) ?? "once-100")}>
              <SelectTrigger className="w-full md:w-[420px]">
                <span className="truncate text-left">{stress.label}</span>
              </SelectTrigger>
              <SelectContent className="w-full md:w-[420px]">
                {stressOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p><strong>Stressed VaR:</strong> {toCompactCurrency(stressedVaR)} ({stress.varLift.toFixed(2)}× baseline)</p>
            <p>
              <strong>Projected CAR:</strong> {projectedCar.toFixed(1)}% (Min: 11.5%){" "}
              {projectedCar >= 11.5 ? "✅ Adequate" : "⚠️ Below requirement"}
            </p>
            <p>
              <strong>Projected LCR:</strong> {projectedLcr.toFixed(0)}% (Min: 100%){" "}
              {projectedLcr >= 100 ? "✅ Adequate" : "⚠️ Liquidity risk"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader><CardTitle>Implementation Roadmap</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {roadmap.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span>
                    {item.due} · {item.progress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-700" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 text-sm text-muted-foreground">
              <CalendarDays className="mr-1 inline size-4" />
              Target deadline: June 30, 2029
            </div>
            <div className="pt-1 text-sm text-muted-foreground">
              <ShieldCheck className="mr-1 inline size-4" />
              Governance and controls reviewed quarterly
            </div>
            <div className="text-sm text-muted-foreground">
              <AlertTriangle className="mr-1 inline size-4" />
              Escalation trigger: milestone delay greater than 45 days
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader><CardTitle>Portfolio Risk Trajectory</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectory}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="year" stroke="rgba(148,163,184,0.85)" />
                <YAxis stroke="rgba(148,163,184,0.85)" />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Line dataKey="portfolio" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader><CardTitle>Hazard Drill-down (scenario-aware)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedBranch?.id ?? ""} onValueChange={(value) => setSelectedId(value ?? "")}>
              <SelectTrigger className="w-full md:w-[460px]">
                <span className="truncate text-left">{selectedBranch?.name ?? "Select branch"}</span>
              </SelectTrigger>
              <SelectContent className="w-full md:w-[460px]">
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id} className="py-2 text-sm">{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchHazardData} layout="vertical" margin={{ top: 8, right: 24, left: 14, bottom: 8 }} barCategoryGap={20}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="rgba(148,163,184,0.85)" />
                  <YAxis dataKey="hazard" type="category" width={110} stroke="rgba(148,163,184,0.85)" />
                  <Tooltip
                    formatter={(value) => {
                      const n = roundToDecimals(Number(value ?? 0));
                      return [`${String(n)}`, "Scaled risk (0-100)"];
                    }}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="yearly" fill="url(#hazardBarGradientAnalytics)" barSize={20} radius={[0, 10, 10, 0]}>
                    <LabelList dataKey="yearly" position="right" formatter={(v: unknown) => String(roundToDecimals(Number(v ?? 0)))} />
                  </Bar>
                  <defs>
                    <linearGradient id="hazardBarGradientAnalytics" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground">
              Branch composite: {String(roundToDecimals(getBranchScenarioRiskScore(selectedBranch, scenarioId, eff)))}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="hover-lift">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Physical VaR by Branch</CardTitle>
              <button
                type="button"
                onClick={() => setVarView((prev) => (prev === "chart" ? "table" : "chart"))}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {varView === "chart" ? "Show Table" : "Show Chart"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Portfolio total VaR: <span className="font-semibold text-foreground">{toCompactCurrency(totalVaR)}</span>
            </p>
          </CardHeader>
          <CardContent className={varView === "chart" ? "h-96" : ""}>
            {varView === "chart" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varData} layout="vertical" margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(148,163,184,0.85)" tickFormatter={(value) => formatPkrAxis(Number(value ?? 0))} />
                  <YAxis dataKey="name" type="category" width={150} stroke="rgba(148,163,184,0.85)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => toCompactCurrency(Number(value ?? 0))}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="var" fill="url(#varGradientAnalytics)" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="var" position="right" formatter={(v: unknown) => toCompactCurrency(Number(v ?? 0))} />
                  </Bar>
                  <defs>
                    <linearGradient id="varGradientAnalytics" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="max-h-96 overflow-auto rounded-xl border border-white/20 dark:border-white/10">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b bg-background/95 text-muted-foreground backdrop-blur-sm">
                      <th className="p-3 text-left">Branch</th>
                      <th className="p-3 text-left">VaR</th>
                      <th className="p-3 text-left">% Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varData.map((row) => (
                      <tr key={row.id} className="border-b border-white/10">
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 font-medium">{toCompactCurrency(row.var)}</td>
                        <td className="p-3">{row.contributionPct.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="hover-lift">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Complete Hazard x Asset Matrix</CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleHazardImport}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 size-4" />
              Import CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv("hazard-matrix.csv", [
                  ["ID", "Name", ...hazardKeys.map((h) => HAZARD_LABELS[h]), "Composite"],
                  ...branches.map((branch) => [
                    branch.id,
                    branch.name,
                    ...hazardKeys.map((hazard) => String(roundToDecimals(getScaledHazard(branch, hazard, scenarioId, eff)))),
                    String(roundToDecimals(getBranchScenarioRiskScore(branch, scenarioId, eff))),
                  ]),
                ])
              }
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importMessage ? <p className="mb-3 text-sm text-muted-foreground">{importMessage}</p> : null}
          <div className="max-h-[520px] overflow-auto rounded-xl border border-white/20 dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b bg-background/95 text-muted-foreground backdrop-blur-sm">
                  <th className="p-2 text-left">Branch</th>
                  {hazardKeys.map((hazard) => (
                    <th key={hazard} className="p-2 text-left">{HAZARD_LABELS[hazard]}</th>
                  ))}
                  <th className="p-2 text-left">Composite</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => {
                  const rowComposite = getBranchScenarioRiskScore(branch, scenarioId, eff);
                  return (
                    <tr key={branch.id} className="border-b">
                      <td className="p-2">{branch.name}</td>
                      {hazardKeys.map((hazard) => {
                        const v = getScaledHazard(branch, hazard, scenarioId, eff);
                        return (
                          <td key={hazard} className={`p-2 text-center font-medium ${cellColor(v)}`}>
                            {String(roundToDecimals(v))}
                          </td>
                        );
                      })}
                      <td className="p-2 font-medium">{String(roundToDecimals(rowComposite))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
