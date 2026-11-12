import { useEffect, useRef, useState } from "react";

/**
 * Debounced mirror of a value. Used to keep expensive derived pipelines
 * (dependency graph, search, collision resolution) from re-running on every
 * ~150ms live-watch batch while the user edits files in an external editor.
 *
 * `flushImmediately(prev, next)` lets callers bypass the debounce for
 * transitions that must feel instant (e.g. empty -> loaded project import).
 * The predicate is read through a ref, so inline arrows don't retrigger
 * the effect.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number,
  flushImmediately?: (prev: T, next: T) => boolean,
): T {
  const [v, setV] = useState(value);
  const vRef = useRef(v);
  vRef.current = v;
  const flushRef = useRef(flushImmediately);
  flushRef.current = flushImmediately;

  useEffect(() => {
    if (flushRef.current?.(vRef.current, value)) {
      setV(value);
      return;
    }
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return v;
}
