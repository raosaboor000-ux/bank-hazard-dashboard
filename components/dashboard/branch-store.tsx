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
  id?: string;
  hazards?: Branch["hazards"];
  risk_scores?: Branch["risk_scores"];
};

type BranchStore = {
  branches: Branch[];
  addBranch: (branch: BranchInput) => string | null;
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
        let createdId: string | null = null;
        setBranches((prev) => {
          const proposedId = payload.id?.trim();
          if (proposedId && prev.some((b) => b.id === proposedId)) {
            return prev;
          }
          const id = proposedId && proposedId.length > 0
            ? proposedId
            : `BR-${String(prev.length + 1).padStart(3, "0")}`;

          const defaultHazards: Branch["hazards"] = {
            flood: Math.round(25 + Math.random() * 50),
            heatwave: Math.round(25 + Math.random() * 50),
            drought: Math.round(25 + Math.random() * 50),
            urban_flood: Math.round(25 + Math.random() * 50),
            extreme_rain: Math.round(25 + Math.random() * 50),
          };
          const hazards = payload.hazards ?? defaultHazards;
          const riskFromHaz = Object.values(hazards).reduce((a, v) => a + v, 0) / Object.values(hazards).length;
          const seedBaseline = Math.round(riskFromHaz);
          const defaultRisk: Branch["risk_scores"] = {
            baseline: seedBaseline,
            short_term: createSyntheticRiskScore(seedBaseline, 4 + Math.random() * 6),
            medium_term: createSyntheticRiskScore(seedBaseline, 10 + Math.random() * 12),
            long_term: createSyntheticRiskScore(seedBaseline, 18 + Math.random() * 20),
          };
          const risk_scores = payload.risk_scores
            ? { ...payload.risk_scores }
            : defaultRisk;
          const record: Branch = {
            id,
            name: payload.name,
            city: payload.city,
            lat: payload.lat,
            lng: payload.lng,
            asset_value: payload.asset_value,
            hazards: { ...hazards },
            risk_scores,
          };
          createdId = id;
          return [...prev, record];
        });
        return createdId;
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
