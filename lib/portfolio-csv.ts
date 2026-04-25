import { parseCsvText } from "@/lib/csv";
import type { Branch, HazardKey } from "@/types/branch";

const HAZARD_KEYS: HazardKey[] = ["flood", "heatwave", "drought", "urban_flood", "extreme_rain"];

function norm(h: string) {
  return h
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, " ")
    .replaceAll(" ", "_");
}

function getColMap(headers: string[]) {
  const m = new Map<string, number>();
  headers.forEach((h, i) => {
    m.set(norm(h), i);
  });
  return m;
}

function cell(row: string[], m: Map<string, number>, ...names: string[]) {
  for (const n of names) {
    const i = m.get(n);
    if (i !== undefined) return row[i] ?? "";
  }
  return "";
}

function toNum(s: string) {
  const n = Number(String(s).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : NaN;
}

const defaultHaz: Branch["hazards"] = {
  flood: 50,
  heatwave: 50,
  drought: 50,
  urban_flood: 50,
  extreme_rain: 50,
};

const defaultRs: Branch["risk_scores"] = {
  baseline: 50,
  short_term: 54,
  medium_term: 60,
  long_term: 68,
};

/**
 * @param working Mutable branch list: start with a copy of the current store so
 * multiple file rows (add then update) resolve correctly in one import.
 */
export function applyPortfolioCsv(
  text: string,
  working: Branch[],
  {
    addBranch,
    updateBranch,
  }: {
    addBranch: (p: {
      name: string;
      city: string;
      lat: number;
      lng: number;
      asset_value: number;
      id?: string;
      hazards?: Branch["hazards"];
      risk_scores?: Branch["risk_scores"];
    }) => string | null;
    updateBranch: (id: string, patch: Partial<Branch>) => void;
  },
) {
  const table = parseCsvText(text);
  if (table.length < 2) return { added: 0, updated: 0, error: "No data rows" as string | undefined };

  const m = getColMap(table[0]!);
  if (!m.get("name") && !m.get("id")) {
    return { added: 0, updated: 0, error: "CSV must have at least Name or ID column" };
  }

  let added = 0;
  let updated = 0;

  for (const row of table.slice(1)) {
    if (row.every((c) => !String(c).trim())) continue;
    const id = cell(row, m, "id", "branch_id").trim();
    const name = cell(row, m, "name", "branch_name", "asset_name");
    const city = cell(row, m, "city", "location") || "Lahore";
    const lat = toNum(cell(row, m, "latitude", "lat"));
    const lng = toNum(cell(row, m, "longitude", "lng", "lon", "long"));
    const av = toNum(cell(row, m, "asset_value", "asset value", "value", "amount"));

    const hazards: Partial<Branch["hazards"]> = {};
    for (const h of HAZARD_KEYS) {
      const v = cell(row, m, h, h.replaceAll("_", " "));
      if (v) {
        const n = toNum(v);
        if (!Number.isNaN(n)) (hazards as Record<string, number>)[h] = n;
      }
    }
    const hasHaz = HAZARD_KEYS.some((h) => hazards[h] !== undefined);

    const bLine = toNum(cell(row, m, "baseline", "baseline_2020", "2020_baseline"));
    const st = toNum(cell(row, m, "short_term", "short", "2030"));
    const mt = toNum(cell(row, m, "medium_term", "medium", "2050"));
    const lt = toNum(cell(row, m, "long_term", "long", "2100"));
    const hasR = [bLine, st, mt, lt].some((x) => !Number.isNaN(x));

    const byId = id
      ? working.find((b) => b.id.toLowerCase() === id.toLowerCase())
      : undefined;
    const byName =
      !byId && name
        ? working.find((b) => b.name.toLowerCase() === name.trim().toLowerCase())
        : undefined;
    const target = byId ?? byName;

    if (target) {
      const patch: Partial<Branch> = {};
      if (name.trim()) patch.name = name.trim();
      if (city.trim()) patch.city = city.trim();
      if (!Number.isNaN(lat)) patch.lat = lat;
      if (!Number.isNaN(lng)) patch.lng = lng;
      if (!Number.isNaN(av) && av > 0) patch.asset_value = av;
      if (hasHaz) {
        const merged = { ...target.hazards };
        for (const h of HAZARD_KEYS) {
          const n = hazards[h];
          if (n !== undefined) merged[h] = Math.max(0, Math.min(100, n));
        }
        patch.hazards = merged;
      }
      if (hasR) {
        patch.risk_scores = { ...target.risk_scores };
        if (!Number.isNaN(bLine)) patch.risk_scores.baseline = Math.round(Math.min(100, bLine));
        if (!Number.isNaN(st)) patch.risk_scores.short_term = Math.round(Math.min(100, st));
        if (!Number.isNaN(mt)) patch.risk_scores.medium_term = Math.round(Math.min(100, mt));
        if (!Number.isNaN(lt)) patch.risk_scores.long_term = Math.round(Math.min(100, lt));
      }
      if (Object.keys(patch).length) {
        updateBranch(target.id, patch);
        const tix = working.findIndex((b) => b.id === target.id);
        if (tix >= 0) {
          working[tix] = { ...working[tix]!, ...patch, hazards: patch.hazards ?? working[tix]!.hazards, risk_scores: patch.risk_scores ?? working[tix]!.risk_scores };
        }
        updated += 1;
      }
      continue;
    }

    if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(av) || av <= 0) {
      continue;
    }

    const hFull: Branch["hazards"] | undefined = hasHaz
      ? {
          ...defaultHaz,
          ...HazardKeysFill(hazards),
        }
      : undefined;
    const rs: Branch["risk_scores"] | undefined = hasR
      ? (() => {
          const b = !Number.isNaN(bLine) ? bLine : 40;
          return {
            baseline: Math.min(100, !Number.isNaN(bLine) ? bLine : b),
            short_term: Math.min(100, !Number.isNaN(st) ? st : b + 4),
            medium_term: Math.min(100, !Number.isNaN(mt) ? mt : b + 10),
            long_term: Math.min(100, !Number.isNaN(lt) ? lt : b + 20),
          };
        })()
      : undefined;

    const newId = addBranch({
      id: id || undefined,
      name: name.trim(),
      city: city.trim(),
      lat,
      lng,
      asset_value: av,
      hazards: hFull,
      risk_scores: rs,
    });
    if (newId) {
      const b: Branch = {
        id: newId,
        name: name.trim(),
        city: city.trim(),
        lat,
        lng,
        asset_value: av,
        hazards: hFull
          ? { ...hFull }
          : { ...defaultHaz },
        risk_scores: rs ? { ...rs } : { ...defaultRs },
      };
      working.push(b);
      added += 1;
    }
  }

  return { added, updated, error: undefined as string | undefined };
}

function HazardKeysFill(p: Partial<Record<HazardKey, number>>) {
  const o: Partial<Record<HazardKey, number>> = {};
  for (const h of HAZARD_KEYS) {
    if (p[h] !== undefined) o[h] = p[h] as number;
  }
  return o;
}
