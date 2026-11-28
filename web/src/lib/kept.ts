import { useCallback, useState } from "react";

// State that survives page switches (the old page kept these as module globals), but not reloads.
const mem = new Map<string, unknown>();

export function useKept<T>(key: string, init: T | (() => T)): [T, (u: T | ((prev: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    if (mem.has(key)) return mem.get(key) as T;
    const first = typeof init === "function" ? (init as () => T)() : init;
    mem.set(key, first);
    return first;
  });
  const set = useCallback((u: T | ((prev: T) => T)) => {
    setV((p) => {
      const n = typeof u === "function" ? (u as (prev: T) => T)(p) : u;
      mem.set(key, n);
      return n;
    });
  }, [key]);
  return [v, set];
}
