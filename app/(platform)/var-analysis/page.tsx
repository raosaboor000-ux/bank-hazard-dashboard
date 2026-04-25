"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getBranchPhysicalVaR,
  getBranchScenarioRiskScore,
  getTotalPortfolioPhysicalVaR,
  roundToDecimals,
  toCompactCurrency,
  toCurrency,
} from "@/lib/risk";

export default function VarAnalysisPage() {
  const { branches } = useBranchStore();
  const { scenarioId, horizonId } = useScenario();
  const isHistorical = scenarioId === "historical";
  const eff = isHistorical ? "short" : horizonId;
  const [showTable, setShowTable] = useState(false);
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const selectedBranch = branches.find((branch) => branch.id === selectedId) ?? branches[0];

  const varData = useMemo(
    () =>
      branches.map((branch) => ({
        name: branch.name,
        var: getBranchPhysicalVaR(branch, scenarioId, eff),
        score: getBranchScenarioRiskScore(branch, scenarioId, eff),
      })),
    [branches, scenarioId, eff],
  );

  const totalVaR = getTotalPortfolioPhysicalVaR(branches, scenarioId, eff);
  const selectedVaR = selectedBranch ? getBranchPhysicalVaR(selectedBranch, scenarioId, eff) : 0;
  const selectedScore = selectedBranch
    ? getBranchScenarioRiskScore(selectedBranch, scenarioId, eff)
    : 0;
  const chartTooltipStyle = {
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(15,23,42,0.95)",
    color: "#e2e8f0",
  };

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Loss Distribution</p>
        <h2 className="section-title">Physical Value at Risk</h2>
      </header>
      <Card className="hover-lift">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Physical Value at Risk</CardTitle>
          <Button variant="outline" onClick={() => setShowTable((prev) => !prev)}>
            {showTable ? "Show Chart" : "Show Table"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Portfolio total VaR: <span className="font-semibold text-foreground">{toCompactCurrency(totalVaR)}</span>
          </p>
          {showTable ? (
            <div className="max-h-[420px] overflow-auto rounded-xl border border-white/20 dark:border-white/10">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Risk (0-100)</TableHead>
                    <TableHead>VaR</TableHead>
                    <TableHead>% Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varData.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{String(row.score)}</TableCell>
                      <TableCell>{toCompactCurrency(row.var)}</TableCell>
                      <TableCell>
                        {totalVaR > 0
                          ? String(roundToDecimals((row.var / totalVaR) * 100))
                          : "0"}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-96 w-full min-h-[320px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barSize={20}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="rgba(148,163,184,0.85)"
                    tickFormatter={(value) => toCompactCurrency(Number(value)).replace("PKR", "").trim()}
                  />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} stroke="rgba(148,163,184,0.85)" />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const row = item?.payload as { var: number; score: number } | undefined;
                      const base = toCompactCurrency(roundToDecimals(Number(value ?? 0)));
                      if (row?.score !== undefined) {
                        return `${base} (risk ${String(row.score)}/100)`;
                      }
                      return base;
                    }}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="var" fill="url(#varGradient2)" radius={[0, 8, 8, 0]}>
                    <LabelList
                      dataKey="var"
                      position="right"
                      fill="currentColor"
                      className="text-muted-foreground"
                      style={{ fontSize: 10 }}
                      formatter={(...raw) => {
                        const v = raw[0];
                        const n = typeof v === "number" ? v : Number(String(v));
                        return toCompactCurrency(roundToDecimals(Number.isFinite(n) ? n : 0));
                      }}
                    />
                  </Bar>
                  <defs>
                    <linearGradient id="varGradient2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover-lift">
        <CardHeader><CardTitle>Branch VaR Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
          <div className="glass-panel rounded-xl border p-4 text-sm">
            <p className="font-semibold">{selectedBranch?.name}</p>
            <p className="text-muted-foreground">Asset Value: {toCurrency(selectedBranch?.asset_value ?? 0)}</p>
            <p className="text-muted-foreground">Active scenario risk: {String(selectedScore)}/100</p>
            <p className="mt-2 text-base font-semibold text-red-700 dark:text-red-400">VaR: {toCurrency(selectedVaR)}</p>
            <p className="text-xs text-muted-foreground">VaR = asset value × (risk / 100)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
