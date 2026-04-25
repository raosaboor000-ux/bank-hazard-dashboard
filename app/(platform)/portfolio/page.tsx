"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { useScenario } from "@/components/dashboard/scenario-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { applyPortfolioCsv } from "@/lib/portfolio-csv";
import {
  HAZARD_LABELS,
  getBranchPhysicalVaR,
  getBranchScenarioRiskScore,
  getRiskCategory,
  getTotalPortfolioPhysicalVaR,
  toCompactCurrency,
  toCurrency,
} from "@/lib/risk";

function PortfolioPageContent() {
  const { scenarioId, horizonId } = useScenario();
  const { branches, addBranch, updateBranch, deleteBranch } = useBranchStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(searchParams.get("branch"));
  const [form, setForm] = useState({ name: "", city: "Lahore", lat: "", lng: "", asset_value: "" });
  const [importMessage, setImportMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHistorical = scenarioId === "historical";
  const effHorizon = isHistorical ? "short" : horizonId;

  const cities = useMemo(() => ["all", ...new Set(branches.map((branch) => branch.city))], [branches]);
  const selectedBranchFromMap = branches.find((branch) => branch.id === selectedBranchId);
  const selectedAssetVaR = selectedBranchFromMap
    ? getBranchPhysicalVaR(selectedBranchFromMap, scenarioId, effHorizon)
    : 0;
  const portfolioTotalVaR = getTotalPortfolioPhysicalVaR(branches, scenarioId, effHorizon);
  const selectedScenarioScore = selectedBranchFromMap
    ? getBranchScenarioRiskScore(selectedBranchFromMap, scenarioId, effHorizon)
    : 0;
  const listViewportHeight = selectedBranchFromMap ? "max-h-[360px]" : "max-h-[560px]";
  const filtered = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(query.toLowerCase()) &&
      (cityFilter === "all" || branch.city === cityFilter),
  );

  const submit = () => {
    const payload = {
      name: form.name,
      city: form.city,
      lat: Number(form.lat),
      lng: Number(form.lng),
      asset_value: Number(form.asset_value),
    };

    if (!payload.name || Number.isNaN(payload.lat) || Number.isNaN(payload.lng) || Number.isNaN(payload.asset_value)) return;

    if (editingId) {
      updateBranch(editingId, payload);
      setEditingId(null);
    } else {
      addBranch(payload);
    }

    setForm({ name: "", city: "Lahore", lat: "", lng: "", asset_value: "" });
  };

  const openDetails = (branchId: string) => {
    setSelectedBranchId(branchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const contextHint = isHistorical
    ? "Baseline 2020 (historical) · VaR and scores match Scenario & Strategy"
    : `IPCC / horizon: ${String(scenarioId).replace("ssp", "SSP")} · ${String(horizonId)} (same as Scenario & Strategy page)`;

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const working = branches.map((b) => ({
      ...b,
      hazards: { ...b.hazards },
      risk_scores: { ...b.risk_scores },
    }));
    const r = applyPortfolioCsv(text, working, { addBranch, updateBranch });
    if (r.error) setImportMessage(r.error);
    else setImportMessage(`Imported: ${r.added} new branch(es), ${r.updated} row(s) updated.`);
    event.target.value = "";
  };

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Asset Governance</p>
        <h2 className="section-title">Asset Portfolio Manager</h2>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-4">
      <div className="space-y-4 xl:col-span-3">
        {selectedBranchFromMap ? (
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Selected Asset Intelligence</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedBranchId(null);
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("branch");
                  router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
                }}
              >
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{selectedBranchFromMap.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedBranchFromMap.city} · Branch ID: {selectedBranchFromMap.id}</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-200">
                  {getRiskCategory(selectedScenarioScore)} Risk
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{contextHint}</p>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">Asset Value</p>
                  <p className="font-semibold">{toCurrency(selectedBranchFromMap.asset_value)}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">Branch risk (active scenario)</p>
                  <p className="font-semibold">{selectedScenarioScore.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">Physical VaR (active scenario)</p>
                  <p className="font-semibold">{toCompactCurrency(selectedAssetVaR)}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">Portfolio VaR Share</p>
                  <p className="font-semibold">
                    {portfolioTotalVaR ? ((selectedAssetVaR / portfolioTotalVaR) * 100).toFixed(2) : "0.00"}%
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="mb-2 text-sm font-medium">Hazard Breakdown</p>
                  <div className="space-y-2">
                    {(Object.keys(selectedBranchFromMap.hazards) as Array<keyof typeof selectedBranchFromMap.hazards>).map((hazard) => (
                      <div key={hazard}>
                        <div className="flex items-center justify-between text-xs">
                          <span>{HAZARD_LABELS[hazard]}</span>
                          <span>{selectedBranchFromMap.hazards[hazard].toFixed(2)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted/70">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                            style={{ width: `${Math.min(100, selectedBranchFromMap.hazards[hazard])}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="mb-2 text-sm font-medium">Risk Trajectory</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Baseline (2020)</span><span>{selectedBranchFromMap.risk_scores.baseline.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Short Term (2030)</span><span>{selectedBranchFromMap.risk_scores.short_term.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Medium Term (2050)</span><span>{selectedBranchFromMap.risk_scores.medium_term.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Long Term (2100)</span><span>{selectedBranchFromMap.risk_scores.long_term.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Asset Portfolio Manager</CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 size-4" /> Import CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv("portfolio.csv", [
                    [
                      "ID",
                      "Name",
                      "City",
                      "Latitude",
                      "Longitude",
                      "Asset Value",
                      "flood",
                      "heatwave",
                      "drought",
                      "urban_flood",
                      "extreme_rain",
                      "baseline",
                      "short_term",
                      "medium_term",
                      "long_term",
                    ],
                    ...filtered.map((branch) => [
                      branch.id,
                      branch.name,
                      branch.city,
                      String(branch.lat),
                      String(branch.lng),
                      String(branch.asset_value),
                      String(branch.hazards.flood),
                      String(branch.hazards.heatwave),
                      String(branch.hazards.drought),
                      String(branch.hazards.urban_flood),
                      String(branch.hazards.extreme_rain),
                      String(branch.risk_scores.baseline),
                      String(branch.risk_scores.short_term),
                      String(branch.risk_scores.medium_term),
                      String(branch.risk_scores.long_term),
                    ]),
                  ])
                }
              >
                <Download className="mr-2 size-4" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
          {importMessage ? <p className="text-sm text-muted-foreground">{importMessage}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Search by branch name..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <Select value={cityFilter} onValueChange={(value) => setCityFilter(value ?? "all")}>
              <SelectTrigger><SelectValue placeholder="Filter by city" /></SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className={`${listViewportHeight} overflow-auto rounded-xl border border-white/20 pr-6 dark:border-white/10`}
            style={{ scrollbarGutter: "stable both-edges" }}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Asset</TableHead><TableHead className="sticky right-0 z-20 bg-background/95 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((branch) => (
                  <TableRow key={branch.id} className={branch.id === selectedBranchId ? "bg-blue-500/10" : ""}>
                    <TableCell>{branch.id}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.city}</TableCell>
                    <TableCell>{toCompactCurrency(branch.asset_value)}</TableCell>
                    <TableCell className="sticky right-0 z-10 bg-background/90 pr-4 text-right backdrop-blur-sm">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDetails(branch.id)}
                        >
                          Detail
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setEditingId(branch.id);
                            setForm({
                              name: branch.name,
                              city: branch.city,
                              lat: String(branch.lat),
                              lng: String(branch.lng),
                              asset_value: String(branch.asset_value),
                            });
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => deleteBranch(branch.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/20 bg-white/25 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <h3 className="text-xl font-semibold">{editingId ? "Edit Branch" : "Add New Branch"}</h3>
        <Input placeholder="Branch name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        <Input placeholder="City" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
        <Input placeholder="Latitude" value={form.lat} onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))} />
        <Input placeholder="Longitude" value={form.lng} onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))} />
        <Input placeholder="Asset value (PKR)" value={form.asset_value} onChange={(event) => setForm((prev) => ({ ...prev, asset_value: event.target.value }))} />
        <Button className="w-full" onClick={submit}>{editingId ? "Update Branch" : "Add Branch"}</Button>
      </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="fade-in-up p-4 text-sm text-muted-foreground">Loading portfolio...</div>}>
      <PortfolioPageContent />
    </Suspense>
  );
}
