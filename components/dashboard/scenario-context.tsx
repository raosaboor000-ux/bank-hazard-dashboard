"use client";

import type { IpccScenarioId, TimeHorizonId } from "@/lib/risk";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ScenarioContextValue = {
  scenarioId: IpccScenarioId;
  horizonId: TimeHorizonId;
  setScenarioId: (id: IpccScenarioId) => void;
  setHorizonId: (id: TimeHorizonId) => void;
};

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenarioId, setScenarioIdState] = useState<IpccScenarioId>("ssp1-2.6");
  const [horizonId, setHorizonIdState] = useState<TimeHorizonId>("short");

  const setScenarioId = useCallback((id: IpccScenarioId) => {
    setScenarioIdState(id);
  }, []);

  const setHorizonId = useCallback((id: TimeHorizonId) => {
    setHorizonIdState(id);
  }, []);

  const value = useMemo(
    () => ({ scenarioId, horizonId, setScenarioId, setHorizonId }),
    [scenarioId, horizonId, setScenarioId, setHorizonId],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function useScenario() {
  const v = useContext(ScenarioContext);
  if (!v) throw new Error("useScenario must be used within ScenarioProvider");
  return v;
}
