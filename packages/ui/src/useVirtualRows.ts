import { useEffect, useRef, useState } from "react";
import type { RefObject, UIEvent } from "react";

export interface VirtualRows {
  ref: RefObject<HTMLDivElement | null>;
  /** First index to render (inclusive). */
  start: number;
  /** Last index to render (exclusive). */
  end: number;
  /** Pixel spacer before the rendered window. */
  padTop: number;
  /** Pixel spacer after the rendered window. */
  padBottom: number;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
}

/**
 * Fixed-row-height windowing for long lists/tables. Renders only the visible
 * slice + overscan; the rest becomes two spacer blocks so scrollbar geometry
 * is preserved. Requires rows to be exactly `rowHeight` tall (set it
 * explicitly on each row — all virtualized views here truncate their text,
 * so heights are stable).
 */
export function useVirtualRows(
  count: number,
  rowHeight: number,
  overscan = 10,
): VirtualRows {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(800);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setViewportH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(
    count,
    Math.ceil((scrollTop + viewportH) / rowHeight) + overscan,
  );

  return {
    ref,
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (count - end) * rowHeight),
    onScroll: (e: UIEvent<HTMLDivElement>) =>
      setScrollTop(e.currentTarget.scrollTop),
  };
}
