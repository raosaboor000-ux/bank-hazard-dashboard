"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useBranchStore } from "@/components/dashboard/branch-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { toCompactCurrency } from "@/lib/risk";

export default function PortfolioPage() {
  const { branches, addBranch, updateBranch, deleteBranch } = useBranchStore();
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: "Lahore", lat: "", lng: "", asset_value: "" });

  const cities = useMemo(() => ["all", ...new Set(branches.map((branch) => branch.city))], [branches]);
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

  return (
    <div className="fade-in-up space-y-4">
      <header>
        <p className="section-kicker">Asset Governance</p>
        <h2 className="section-title">Asset Portfolio Manager</h2>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-4">
      <Card className="hover-lift xl:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Portfolio Manager</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv("portfolio.csv", [
                ["ID", "Name", "City", "Latitude", "Longitude", "Asset Value"],
                ...filtered.map((branch) => [
                  branch.id,
                  branch.name,
                  branch.city,
                  String(branch.lat),
                  String(branch.lng),
                  String(branch.asset_value),
                ]),
              ])
            }
          >
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="max-h-[560px] overflow-auto rounded-xl border border-white/20 dark:border-white/10">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Asset</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>{branch.id}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.city}</TableCell>
                    <TableCell>{toCompactCurrency(branch.asset_value)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
