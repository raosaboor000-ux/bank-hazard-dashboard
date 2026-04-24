"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateVaR, toCompactCurrency, toCurrency } from "@/lib/risk";

export default function VarAnalysisPage() {
  const { branches } = useBranchStore();
  const [showTable, setShowTable] = useState(false);
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const selectedBranch = branches.find((branch) => branch.id === selectedId) ?? branches[0];

  const varData = useMemo(
    () => branches.map((branch) => ({ name: branch.name, var: calculateVaR(branch.asset_value, branch.risk_scores.long_term) })),
    [branches],
  );

  const totalVaR = varData.reduce((acc, row) => acc + row.var, 0);
  const selectedVaR = selectedBranch ? calculateVaR(selectedBranch.asset_value, selectedBranch.risk_scores.long_term) : 0;

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
          <p className="text-sm text-muted-foreground">Portfolio total VaR: <span className="font-semibold text-foreground">{toCompactCurrency(totalVaR)}</span></p>
          {showTable ? (
            <Table>
              <TableHeader><TableRow><TableHead>Branch</TableHead><TableHead>VaR</TableHead><TableHead>% Contribution</TableHead></TableRow></TableHeader>
              <TableBody>
                {varData.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{toCompactCurrency(row.var)}</TableCell>
                    <TableCell>{((row.var / totalVaR) * 100).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="name" hide />
                <YAxis
                  stroke="rgba(148,163,184,0.85)"
                  width={80}
                  tickFormatter={(value) => toCompactCurrency(Number(value)).replace("PKR", "").trim()}
                />
                <Tooltip
                  formatter={(value) => toCompactCurrency(Number(value ?? 0))}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", backdropFilter: "blur(12px)", background: "rgba(15,23,42,0.75)" }}
                />
                <Bar dataKey="var" fill="url(#varGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="varGradient" x1="0" y1="0" x2="0" y2="1">
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
              <SelectValue placeholder="Select branch" />
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
            <p className="text-muted-foreground">Long-Term Risk Score: {selectedBranch?.risk_scores.long_term ?? 0}</p>
            <p className="mt-2 text-base font-semibold text-red-700 dark:text-red-400">VaR: {toCurrency(selectedVaR)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
