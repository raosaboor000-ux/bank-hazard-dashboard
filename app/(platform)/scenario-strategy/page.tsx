"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ClipboardList, Gauge, Globe2, LineChart, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { calculateCompositeRisk, calculateVaR, getRiskCategory, toCompactCurrency } from "@/lib/risk";
import { useBranchStore } from "@/components/dashboard/branch-store";

const scenarios = [
  { id: "ssp1-2.6", label: "SSP1-2.6", subtitle: "Low emissions", warming: "+1.5C", multiplier: 0.92 },
  { id: "ssp2-4.5", label: "SSP2-4.5", subtitle: "Moderate emissions", warming: "+2.7C", multiplier: 1.08 },
  { id: "ssp5-8.5", label: "SSP5-8.5", subtitle: "High emissions", warming: "+4.4C", multiplier: 1.26 },
] as const;

const horizons = [
  { id: "short", label: "Short-term (2030)", riskWeight: 1.0 },
  { id: "medium", label: "Medium-term (2050)", riskWeight: 1.12 },
  { id: "long", label: "Long-term (2100)", riskWeight: 1.26 },
] as const;

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

export default function ScenarioStrategyPage() {
  const { branches } = useBranchStore();
  const [scenarioId, setScenarioId] = useState<(typeof scenarios)[number]["id"]>("ssp1-2.6");
  const [horizonId, setHorizonId] = useState<(typeof horizons)[number]["id"]>("short");
  const [stressId, setStressId] = useState<(typeof stressOptions)[number]["id"]>("once-100");

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const horizon = horizons.find((item) => item.id === horizonId) ?? horizons[0];
  const stress = stressOptions.find((item) => item.id === stressId) ?? stressOptions[0];

  const { compositeRisk, physicalVaR, stressedVaR, projectedCar, projectedLcr } = useMemo(() => {
    const baseComposite = branches.reduce((acc, branch) => acc + calculateCompositeRisk(branch), 0) / branches.length;
    const adjustedRisk = baseComposite * scenario.multiplier * horizon.riskWeight;
    const totalVaR = branches.reduce(
      (acc, branch) => acc + calculateVaR(branch.asset_value, calculateCompositeRisk(branch)),
      0,
    );
    const stressVar = totalVaR * stress.varLift;
    const car = Math.max(stress.carFloor, 15.8 - (stress.varLift - 1) * 2.2);
    const lcr = Math.max(stress.lcrFloor, 132 - (stress.varLift - 1) * 20);
    return {
      compositeRisk: adjustedRisk,
      physicalVaR: totalVaR,
      stressedVaR: stressVar,
      projectedCar: car,
      projectedLcr: lcr,
    };
  }, [branches, scenario.multiplier, horizon.riskWeight, stress.varLift, stress.carFloor, stress.lcrFloor]);

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Scenario & Strategy</p>
        <h2 className="section-title">Climate Scenario Planning Console</h2>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2"><LineChart className="size-5" /> Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-5xl font-bold">{compositeRisk.toFixed(2)}</p>
              <p className="text-muted-foreground">Composite Risk (0-100)</p>
              <div className="mx-auto mt-4 h-4 w-full max-w-sm rounded-full bg-gradient-to-r from-green-600 via-yellow-500 to-red-600" />
            </div>
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-5xl font-bold">{toCompactCurrency(physicalVaR)}</p>
              <p className="text-muted-foreground">Physical VaR</p>
            </div>
            <div className="rounded-full bg-yellow-500 px-5 py-2 font-semibold text-slate-950">
              Portfolio: {getRiskCategory(compositeRisk)} Risk ({compositeRisk.toFixed(2)}/100)
            </div>
            <p className="text-sm text-muted-foreground">
              Current: {scenario.label} / {horizon.label}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2"><Globe2 className="size-5" /> IPCC Scenario & Time Horizon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-lg font-semibold">Historical Baseline (2020)</p>
              <div className="mt-2 rounded-lg bg-slate-200/35 p-3 text-center font-semibold text-foreground dark:bg-slate-700/40">
                Reference Period
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="mb-3 text-lg font-semibold">Future IPCC Scenarios</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {scenarios.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setScenarioId(item.id)}
                    className={`rounded-xl p-3 text-left transition ${
                      scenarioId === item.id ? "bg-emerald-700 text-white" : "bg-slate-200/35 dark:bg-slate-700/40"
                    }`}
                  >
                    <p className="font-bold">{item.label}</p>
                    <p className="text-sm opacity-85">{item.subtitle}</p>
                    <p className="text-sm opacity-85">{item.warming}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/20 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="mb-3 text-lg font-semibold">Time Horizon</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {horizons.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setHorizonId(item.id)}
                    className={`rounded-xl p-3 text-center font-semibold transition ${
                      horizonId === item.id ? "bg-emerald-700 text-white" : "bg-slate-200/35 dark:bg-slate-700/40"
                    }`}
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
            <CardTitle className="flex items-center gap-2"><Gauge className="size-5" /> Climate Stress Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Select value={stressId} onValueChange={(value) => setStressId((value as (typeof stressOptions)[number]["id"]) ?? "once-100")}>
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
            <p><strong>Stressed VaR:</strong> {toCompactCurrency(stressedVaR)} ({stress.varLift.toFixed(2)}x baseline)</p>
            <p><strong>Projected CAR:</strong> {projectedCar.toFixed(2)}% (Min: {stress.carFloor.toFixed(2)}%) {projectedCar >= stress.carFloor ? "✅ Adequate" : "⚠️ Low"}</p>
            <p><strong>Projected LCR:</strong> {projectedLcr.toFixed(2)}% (Min: {stress.lcrFloor.toFixed(2)}%) {projectedLcr >= stress.lcrFloor ? "✅ Adequate" : "⚠️ Low"}</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2"><ClipboardList className="size-5" /> Implementation Roadmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {roadmap.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span>{item.due} · {item.progress}%</span>
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
