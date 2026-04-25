"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { average, buildRiskTrajectory } from "@/lib/risk";

const toMax3Decimals = (value: number) => Number(value.toFixed(3)).toString();
const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.95)",
  color: "#e2e8f0",
};

export default function RiskAnalysisPage() {
  const { branches } = useBranchStore();
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");

  const selectedBranch = branches.find((branch) => branch.id === selectedId) ?? branches[0];

  const trajectory = [
    { year: "2020", portfolio: average(branches.map((b) => b.risk_scores.baseline)) },
    { year: "2030", portfolio: average(branches.map((b) => b.risk_scores.short_term)) },
    { year: "2050", portfolio: average(branches.map((b) => b.risk_scores.medium_term)) },
    { year: "2100", portfolio: average(branches.map((b) => b.risk_scores.long_term)) },
  ];

  const scenarioData = trajectory.map((point) => ({
    year: point.year,
    low: Math.max(0, point.portfolio - 12),
    medium: point.portfolio,
    high: Math.min(100, point.portfolio + 15),
  }));

  const branchData = selectedBranch ? buildRiskTrajectory(selectedBranch) : [];
  const baseline = selectedBranch?.risk_scores.baseline ?? 0;
  const longTerm = selectedBranch?.risk_scores.long_term ?? 0;
  const percentChange = baseline ? ((longTerm - baseline) / baseline) * 100 : 0;

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Forward Looking Signals</p>
        <h2 className="section-title">Risk Change Analysis</h2>
      </header>
      <Card className="hover-lift">
        <CardHeader><CardTitle>Portfolio Risk Trajectory (2020 to 2100)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectory}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="year" stroke="rgba(148,163,184,0.85)" /><YAxis stroke="rgba(148,163,184,0.85)" /><Tooltip formatter={(value) => toMax3Decimals(Number(value ?? 0))} contentStyle={chartTooltipStyle} labelStyle={{ color: "#f8fafc", fontWeight: 600 }} itemStyle={{ color: "#e2e8f0" }} />
              <Line dataKey="portfolio" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="hover-lift">
        <CardHeader><CardTitle>Scenario Comparison</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scenarioData}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="year" stroke="rgba(148,163,184,0.85)" /><YAxis stroke="rgba(148,163,184,0.85)" /><Tooltip formatter={(value) => toMax3Decimals(Number(value ?? 0))} contentStyle={chartTooltipStyle} labelStyle={{ color: "#f8fafc", fontWeight: 600 }} itemStyle={{ color: "#e2e8f0" }} />
              <Line dataKey="low" stroke="#22c55e" />
              <Line dataKey="medium" stroke="#f59e0b" />
              <Line dataKey="high" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="hover-lift">
        <CardHeader><CardTitle>Branch-Level Risk Change</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedBranch?.id ?? ""} onValueChange={(value) => setSelectedId(value ?? "")}>
            <SelectTrigger className="w-full md:w-[460px]">
              <span className="truncate text-left">{selectedBranch?.name ?? "Select branch"}</span>
            </SelectTrigger>
            <SelectContent className="w-full md:w-[460px]">
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id} className="py-2 text-sm">
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={branchData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="year" stroke="rgba(148,163,184,0.85)" /><YAxis stroke="rgba(148,163,184,0.85)" /><Tooltip formatter={(value) => toMax3Decimals(Number(value ?? 0))} contentStyle={chartTooltipStyle} labelStyle={{ color: "#f8fafc", fontWeight: 600 }} itemStyle={{ color: "#e2e8f0" }} />
                <Line dataKey="risk" stroke="#22d3ee" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground">
            Long-term change from baseline: <span className="font-semibold text-foreground">{percentChange.toFixed(2)}%</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
