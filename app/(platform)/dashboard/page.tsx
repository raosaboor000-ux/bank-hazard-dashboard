"use client";

import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { average, calculateCompositeRisk, calculateVaR, toCompactCurrency } from "@/lib/risk";

const toMax3Decimals = (value: number) => Number(value.toFixed(3)).toString();

const RiskMap = dynamic(() => import("@/components/dashboard/risk-map").then((m) => m.RiskMap), {
  ssr: false,
  loading: () => <div className="h-[360px] animate-pulse rounded-md bg-muted" />,
});

export default function DashboardPage() {
  const { branches } = useBranchStore();
  const avgRisk = average(branches.map(calculateCompositeRisk));
  const totalVaR = branches.reduce((acc, branch) => acc + calculateVaR(branch.asset_value, branch.risk_scores.long_term), 0);
  const highRiskCount = branches.filter((branch) => calculateCompositeRisk(branch) > 60).length;

  const portfolioTrajectory = ["baseline", "short_term", "medium_term", "long_term"].map((key, idx) => ({
    year: ["2020", "2030", "2050", "2100"][idx],
    score: average(
      branches.map((branch) =>
        key === "baseline"
          ? branch.risk_scores.baseline
          : key === "short_term"
            ? branch.risk_scores.short_term
            : key === "medium_term"
              ? branch.risk_scores.medium_term
              : branch.risk_scores.long_term,
      ),
    ),
  }));

  const varByCity = Object.entries(
    branches.reduce<Record<string, number>>((acc, branch) => {
      acc[branch.city] = (acc[branch.city] ?? 0) + calculateVaR(branch.asset_value, branch.risk_scores.long_term);
      return acc;
    }, {}),
  ).map(([city, value]) => ({ city, value }));

  const topMatrix = [...branches]
    .sort((a, b) => calculateCompositeRisk(b) - calculateCompositeRisk(a))
    .slice(0, 5)
    .map((branch) => ({ name: branch.name, risk: calculateCompositeRisk(branch), value: branch.asset_value / 1_000_000_000 }));

  return (
    <div className="fade-in-up space-y-6">
      <header>
        <p className="section-kicker">Climate Physical Risk Intelligence</p>
        <h2 className="section-title">Banking Framework Compliance Dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
          Portfolio-wide physical climate risk intelligence for Askari Bank branches across Pakistan.
          Executive-ready view of exposure, hotspots, and future risk transition.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Branches" value={String(branches.length)} helper="Total branch assets monitored in this demo portfolio." />
        <KpiCard title="Avg Composite Risk" value={avgRisk.toFixed(1)} helper="Average of flood, heatwave, drought, urban flood, and extreme rain." />
        <KpiCard title="Total Physical VaR" value={toCompactCurrency(totalVaR)} helper="Portfolio Physical Value at Risk based on long-term risk score." />
        <KpiCard title="High Risk Branches" value={String(highRiskCount)} helper="Branches with composite risk above 60." />
      </section>

      <section className="grid items-start gap-8 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <h3 className="mb-3 text-lg font-semibold">Branch Risk Map</h3>
          <div className="h-[380px] w-full overflow-hidden rounded-2xl">
            <RiskMap branches={branches} />
          </div>
        </div>
        <div className="xl:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">Mini Hazard x Asset Matrix (Top 5 Risk)</h3>
          <div className="h-[380px] overflow-hidden rounded-2xl">
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
      </section>

      <section className="grid items-start gap-8 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-semibold">Composite Risk Change</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioTrajectory}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="year" stroke="rgba(148,163,184,0.85)" />
                <YAxis stroke="rgba(148,163,184,0.85)" />
                <Tooltip
                  formatter={(value) => toMax3Decimals(Number(value ?? 0))}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", backdropFilter: "blur(12px)", background: "rgba(15,23,42,0.75)" }}
                />
                <Line dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold">Portfolio Physical VaR by City</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={varByCity}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="city" stroke="rgba(148,163,184,0.85)" />
                <YAxis
                  stroke="rgba(148,163,184,0.85)"
                  width={86}
                  tickFormatter={(value) => toCompactCurrency(Number(value)).replace("PKR", "").trim()}
                />
                <Tooltip
                  formatter={(value) => toCompactCurrency(Number(value ?? 0))}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", backdropFilter: "blur(12px)", background: "rgba(15,23,42,0.75)" }}
                />
                <Bar dataKey="value" fill="url(#cityVarGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="cityVarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
