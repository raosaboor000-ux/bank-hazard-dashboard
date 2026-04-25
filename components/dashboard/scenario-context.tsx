"use client";

import type { IpcgScenarioId, TimeHorizonId } from "@/lib/risk";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ScenarioContextValue = {
  scenarioId: IpcgScenarioId;
  horizonId: TimeHorizonId;
  setScenarioId: (id: IpcgScenarioId) => void;
  setHorizonId: (id: TimeHorizonId) => void;
};

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenarioId, setScenarioIdState] = useState<IpcgScenarioId>("ssp1-2.6");
  const [horizonId, setHorizonIdState] = useState<TimeHorizonId>("short");

  const setScenarioId = useCallback((id: IpcgScenarioId) => {
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
