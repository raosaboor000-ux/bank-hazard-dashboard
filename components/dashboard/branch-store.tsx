"use client";

import { branchSeedData } from "@/data/branches";
import type { Branch } from "@/types/branch";
import { createContext, useContext, useMemo, useState } from "react";

type BranchInput = {
  name: string;
  city: string;
  lat: number;
  lng: number;
  asset_value: number;
};

type BranchStore = {
  branches: Branch[];
  addBranch: (branch: BranchInput) => void;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
};

const BranchStoreContext = createContext<BranchStore | null>(null);

function createSyntheticRiskScore(base: number, bump: number) {
  return Math.min(100, Math.round(base + bump));
}

export function BranchStoreProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(branchSeedData);

  const store = useMemo<BranchStore>(
    () => ({
      branches,
      addBranch: (payload) => {
        setBranches((prev) => {
          const baseline = Math.round(35 + Math.random() * 25);
          const record: Branch = {
            id: `BR-${String(prev.length + 1).padStart(3, "0")}`,
            name: payload.name,
            city: payload.city,
            lat: payload.lat,
            lng: payload.lng,
            asset_value: payload.asset_value,
            hazards: {
              flood: Math.round(25 + Math.random() * 50),
              heatwave: Math.round(25 + Math.random() * 50),
              drought: Math.round(25 + Math.random() * 50),
              urban_flood: Math.round(25 + Math.random() * 50),
              extreme_rain: Math.round(25 + Math.random() * 50),
            },
            risk_scores: {
              baseline,
              short_term: createSyntheticRiskScore(baseline, 4 + Math.random() * 6),
              medium_term: createSyntheticRiskScore(baseline, 10 + Math.random() * 12),
              long_term: createSyntheticRiskScore(baseline, 18 + Math.random() * 20),
            },
          };
          return [...prev, record];
        });
      },
      updateBranch: (id, patch) => {
        setBranches((prev) =>
          prev.map((branch) =>
            branch.id === id
              ? {
                  ...branch,
                  ...patch,
                }
              : branch,
          ),
        );
      },
      deleteBranch: (id) => {
        setBranches((prev) => prev.filter((branch) => branch.id !== id));
      },
    }),
    [branches],
  );

  return <BranchStoreContext.Provider value={store}>{children}</BranchStoreContext.Provider>;
}

export function useBranchStore() {
  const value = useContext(BranchStoreContext);
  if (!value) throw new Error("useBranchStore must be used within BranchStoreProvider");
  return value;
}
