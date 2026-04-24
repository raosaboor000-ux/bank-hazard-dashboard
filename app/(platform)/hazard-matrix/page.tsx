"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { HAZARD_LABELS, calculateCompositeRisk } from "@/lib/risk";
import type { HazardKey } from "@/types/branch";

const hazardKeys: HazardKey[] = ["flood", "heatwave", "drought", "urban_flood", "extreme_rain"];

function cellColor(value: number) {
  if (value <= 20) return "bg-green-500/22 text-green-100";
  if (value <= 40) return "bg-yellow-500/28 text-yellow-50";
  if (value <= 60) return "bg-orange-500/32 text-orange-50";
  if (value <= 80) return "bg-red-500/36 text-red-50";
  return "bg-red-700/45 text-red-50";
}

export default function HazardMatrixPage() {
  const { branches } = useBranchStore();
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const selectedBranch = branches.find((branch) => branch.id === selectedId) ?? branches[0];

  const branchHazardData = selectedBranch
    ? hazardKeys.map((hazard) => ({
        hazard: HAZARD_LABELS[hazard],
        yearly: selectedBranch.hazards[hazard],
      }))
    : [];

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Exposure Heatmap</p>
        <h2 className="section-title">Hazard x Asset Matrix</h2>
      </header>
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle>Hazard x Asset Matrix (Yearly)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[520px] overflow-auto rounded-xl border border-white/20 dark:border-white/10">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b bg-background/95 text-muted-foreground backdrop-blur-sm">
                <th className="p-2 text-left">Branch</th>
                {hazardKeys.map((hazard) => <th key={hazard} className="p-2 text-left">{HAZARD_LABELS[hazard]}</th>)}
                <th className="p-2 text-left">Composite</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b">
                  <td className="p-2">{branch.name}</td>
                  {hazardKeys.map((hazard) => (
                    <td key={hazard} className={`p-2 text-center font-medium ${cellColor(branch.hazards[hazard])}`}>
                      {branch.hazards[hazard].toFixed(2)}
                    </td>
                  ))}
                  <td className="p-2 font-medium">{calculateCompositeRisk(branch).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift">
        <CardHeader><CardTitle>Branch Drill-down</CardTitle></CardHeader>
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
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchHazardData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 14, bottom: 8 }}
                barCategoryGap={20}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="rgba(148,163,184,0.85)" />
                <YAxis dataKey="hazard" type="category" width={110} stroke="rgba(148,163,184,0.85)" />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)}`, "Risk Score"]}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", backdropFilter: "blur(12px)", background: "rgba(15,23,42,0.75)" }}
                />
                <Bar dataKey="yearly" fill="url(#hazardBarGradient)" barSize={20} radius={[0, 10, 10, 0]}>
                  <LabelList dataKey="yearly" position="right" fill="#cbd5e1" />
                </Bar>
                <defs>
                  <linearGradient id="hazardBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
