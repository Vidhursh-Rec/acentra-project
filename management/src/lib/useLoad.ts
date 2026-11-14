import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "./api";

/** Load data, optionally re-fetching every `refreshMs` (overview pages refresh every 30 s). */
export function useLoad<T>(load: () => Promise<T>, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    reload();
    if (!refreshMs) return;
    const id = setInterval(reload, refreshMs);
    return () => clearInterval(id);
  }, [reload, refreshMs]);

  return { data, error, reload };
}
