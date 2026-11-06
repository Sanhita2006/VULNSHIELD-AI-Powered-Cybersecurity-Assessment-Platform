import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DataMode } from "@/lib/types";

const STORAGE_KEY = "vulnshield:data-mode";

interface DataModeContextValue {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  isDemo: boolean;
}

const DataModeContext = createContext<DataModeContextValue | null>(null);

export function DataModeProvider({ children }: { children: ReactNode }) {
  // Start in demo on the server and first client render; read the saved
  // choice after hydration to avoid a mismatch.
  const [mode, setModeState] = useState<DataMode>("demo");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "demo" || saved === "live") setModeState(saved);
  }, []);

  const setMode = useCallback((next: DataMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <DataModeContext.Provider value={{ mode, setMode, isDemo: mode === "demo" }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const ctx = useContext(DataModeContext);
  if (!ctx) throw new Error("useDataMode must be used inside <DataModeProvider>");
  return ctx;
}
