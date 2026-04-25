"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ClipboardList, Gauge, Globe2, LineChart, ShieldCheck } from "lucide-react";
import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  getPortfolioWeightedComposite,
  getRiskCategory,
  getTotalPortfolioPhysicalVaR,
  toCompactCurrency,
  varToMillionsPkrLabel,
  type IpcgScenarioId,
  type TimeHorizonId,
} from "@/lib/risk";

const FUTURE_SCENARIOS = [
  { id: "ssp1-2.6" as const, label: "SSP1-2.6", subtitle: "Low emissions", warming: "+1.5C" },
  { id: "ssp2-4.5" as const, label: "SSP2-4.5", subtitle: "Moderate emissions", warming: "+2.7C" },
  { id: "ssp5-8.5" as const, label: "SSP5-8.5", subtitle: "High emissions", warming: "+4.4C" },
];

const HORIZONS = [
  { id: "short" as const, label: "Short-term (2030)" },
  { id: "medium" as const, label: "Medium-term (2050)" },
  { id: "long" as const, label: "Long-term (2100)" },
];

const stressOptions = [
  { id: "once-100", label: "1-in-100 year (Severe)", varLift: 1.8, carFloor: 11.5, lcrFloor: 100 },
  { id: "once-50", label: "1-in-50 year (Extreme)", varLift: 2.2, carFloor: 10.8, lcrFloor: 95 },
  { id: "compound", label: "Compound heat + flood", varLift: 2.6, carFloor: 10.0, lcrFloor: 92 },
] as const;

const roadmap = [
  { name: "Governance Structure", due: "Sep 2026", progress: 30 },
  { name: "Policy Development", due: "Dec 2026", progress: 20 },
  { name: "Risk Integration", due: "Jun 2027", progress: 15 },
  { name: "Staff Capacity Building", due: "Dec 2027", progress: 10 },
  { name: "Full Compliance", due: "Jun 2029", progress: 5 },
];

function scenarioLabel(id: IpcgScenarioId) {
  if (id === "historical") return "Baseline 2020 (Historical)";
  const s = FUTURE_SCENARIOS.find((x) => x.id === id);
  return s ? `${s.label} (${s.subtitle})` : id;
}

function horizonLabel(h: TimeHorizonId) {
  return HORIZONS.find((x) => x.id === h)?.label ?? h;
}

function riskBadgeClass(score: number) {
  if (score <= 20) return "bg-emerald-700 text-white";
  if (score <= 40) return "bg-lime-600/90 text-slate-950";
  if (score <= 60) return "bg-amber-500 text-slate-950";
  if (score <= 80) return "bg-orange-600 text-white";
  return "bg-red-700 text-white";
}

export default function ScenarioStrategyPage() {
  const { branches } = useBranchStore();
  const { scenarioId, horizonId, setScenarioId, setHorizonId } = useScenario();
  const [stressId, setStressId] = useState<(typeof stressOptions)[number]["id"]>("once-100");

  const isHistorical = scenarioId === "historical";
  const stress = stressOptions.find((item) => item.id === stressId) ?? stressOptions[0];

  const { compositeRisk, physicalVaR, stressedVaR, projectedCar, projectedLcr } = useMemo(() => {
    const composite = getPortfolioWeightedComposite(
      branches,
      scenarioId,
      isHistorical ? "short" : horizonId,
    );
    const totalPkr = getTotalPortfolioPhysicalVaR(
      branches,
      scenarioId,
      isHistorical ? "short" : horizonId,
    );
    const stressVar = totalPkr * stress.varLift;
    const car = Math.max(stress.carFloor, 15.8 - (stress.varLift - 1) * 2.2);
    const lcr = Math.max(stress.lcrFloor, 132 - (stress.varLift - 1) * 20);
    return {
      compositeRisk: composite,
      physicalVaR: totalPkr,
      stressedVaR: stressVar,
      projectedCar: car,
      projectedLcr: lcr,
    };
  }, [branches, scenarioId, horizonId, isHistorical, stress.varLift, stress.carFloor, stress.lcrFloor]);

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Scenario & Strategy</p>
        <h2 className="section-title">Climate Scenario Planning Console</h2>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-5" /> Portfolio Summary
            </CardTitle>
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
              <p className="text-5xl font-bold tabular-nums">{varToMillionsPkrLabel(physicalVaR)}</p>
              <p className="text-muted-foreground">Physical VaR (PKR M)</p>
            </div>
            <div className={`inline-flex w-full max-w-sm justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${riskBadgeClass(compositeRisk)}`}>
              Portfolio: {getRiskCategory(compositeRisk)} Risk ({Math.round(compositeRisk)}/100)
            </div>
            <p className="text-sm text-muted-foreground">
              Current: {scenarioLabel(scenarioId)}
              {isHistorical ? " · Reference year 2020" : ` / ${horizonLabel(horizonId)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              VaR uses asset value × (branch risk / 100); branch risk is baseline (2020) in historical mode, or IPCC & horizon–adjusted composite otherwise.
            </p>
            <p className="text-xs text-muted-foreground">
              Full currency: {toCompactCurrency(physicalVaR)} total at-risk exposure
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="size-5" /> IPCC Scenario & Time Horizon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-lg font-semibold">Historical Baseline (2020)</p>
              <p className="mb-2 text-sm text-muted-foreground">SBP reference period: risk from stored baseline scores (not IPCC future pathways).</p>
              <button
                type="button"
                onClick={() => setScenarioId("historical")}
                className={`w-full rounded-xl p-3 text-center text-sm font-semibold transition ${
                  isHistorical ? "bg-emerald-700 text-white" : "bg-slate-200/35 dark:bg-slate-700/40"
                }`}
              >
                Reference Period (2020)
              </button>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="mb-3 text-lg font-semibold">Future IPCC Scenarios</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FUTURE_SCENARIOS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setScenarioId(item.id as IpcgScenarioId)}
                    className={`rounded-xl p-3 text-left transition ${
                      !isHistorical && scenarioId === item.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200/35 dark:bg-slate-700/40"
                    }`}
                  >
                    <p className="font-bold">{item.label}</p>
                    <p className="text-sm opacity-85">{item.subtitle}</p>
                    <p className="text-sm opacity-85">{item.warming}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className={`rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5 ${isHistorical ? "opacity-60" : ""}`}>
              <p className="mb-3 text-lg font-semibold">Time Horizon</p>
              {isHistorical ? (
                <p className="text-sm text-muted-foreground">N/A in baseline 2020 — select a future SSP to compare 2030, 2050, or 2100.</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {HORIZONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    disabled={isHistorical}
                    onClick={() => setHorizonId(item.id as TimeHorizonId)}
                    className={`rounded-xl p-3 text-center text-sm font-semibold transition ${
                      horizonId === item.id && !isHistorical
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200/35 dark:bg-slate-700/40"
                    } ${isHistorical ? "pointer-events-none cursor-not-allowed" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5" /> Climate Stress Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Select
              value={stressId}
              onValueChange={(value) => setStressId((value as (typeof stressOptions)[number]["id"]) ?? "once-100")}
            >
              <SelectTrigger className="w-full md:w-[420px]">
                <span className="truncate text-left">{stress.label}</span>
              </SelectTrigger>
              <SelectContent className="w-full md:w-[420px]">
                {stressOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p>
              <strong>Stressed VaR:</strong> {toCompactCurrency(stressedVaR)} ({stress.varLift.toFixed(2)}x baseline) · {varToMillionsPkrLabel(stressedVaR)} PKR M
            </p>
            <p>
              <strong>Projected CAR:</strong> {projectedCar.toFixed(2)}% (Min: {stress.carFloor.toFixed(2)}%) {projectedCar >= stress.carFloor ? "✅ Adequate" : "⚠️ Low"}
            </p>
            <p>
              <strong>Projected LCR:</strong> {projectedLcr.toFixed(2)}% (Min: {stress.lcrFloor.toFixed(2)}%) {projectedLcr >= stress.lcrFloor ? "✅ Adequate" : "⚠️ Low"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" /> Implementation Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
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
    </div>
  );
}
