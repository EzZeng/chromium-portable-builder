import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "chromium-portable-progress-v1";

type ProgressState = {
  checked: Record<string, boolean>;
  stepId: string;
};

const defaultState: ProgressState = {
  checked: {},
  stepId: "requirements",
};

function load(): ProgressState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      checked: parsed.checked ?? {},
      stepId: parsed.stepId ?? "requirements",
    };
  } catch {
    return defaultState;
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const toggle = useCallback((key: string) => {
    setState((s) => ({
      ...s,
      checked: { ...s.checked, [key]: !s.checked[key] },
    }));
  }, []);

  const setStepId = useCallback((stepId: string) => {
    setState((s) => ({ ...s, stepId }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const doneCount = Object.values(state.checked).filter(Boolean).length;

  return {
    checked: state.checked,
    stepId: state.stepId,
    toggle,
    setStepId,
    reset,
    doneCount,
    hydrated,
  };
}
