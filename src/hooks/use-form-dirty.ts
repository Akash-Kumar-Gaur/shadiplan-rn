import { useMemo } from "react";

/**
 * Returns true when `current` differs from `baseline` (shallow field compare).
 * For create forms, pass empty/default values as baseline.
 */
export function useFormDirty<T extends Record<string, unknown>>(
  current: T,
  baseline: T,
): boolean {
  return useMemo(() => {
    const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
    for (const key of keys) {
      const a = current[key];
      const b = baseline[key];
      if (Array.isArray(a) || Array.isArray(b)) {
        if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) return true;
        continue;
      }
      if (a instanceof Date || b instanceof Date) {
        const at = a instanceof Date ? a.getTime() : a;
        const bt = b instanceof Date ? b.getTime() : b;
        if (at !== bt) return true;
        continue;
      }
      if (a !== b) return true;
    }
    return false;
  }, [current, baseline]);
}
