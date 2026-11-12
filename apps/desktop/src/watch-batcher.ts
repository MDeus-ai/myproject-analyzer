import type { WatchEvent } from "@myproject/platform/types";

/**
 * Coalesces raw watcher events for one flush window: last event per path
 * wins (add→change collapses to the final state; unlink wins if it is
 * last). Rename (unlink A + add B) survives because the paths differ.
 */
export function coalesceWatchEvents(events: WatchEvent[]): WatchEvent[] {
  const byPath = new Map<string, WatchEvent>();
  for (const e of events) byPath.set(e.path, e);
  return [...byPath.values()];
}

/**
 * Debounced event collector. push() schedules a flush `flushMs` later;
 * everything collected in the window is coalesced and handed to the
 * callback in one batch. Pushes during the window extend the batch but
 * never reset the timer (bounded latency).
 */
export class WatchBatcher {
  private pending: WatchEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onFlush: (events: WatchEvent[]) => void,
    private readonly flushMs = 150,
  ) {}

  push(event: WatchEvent): void {
    this.pending.push(event);
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flushNow(), this.flushMs);
    }
  }

  flushNow(): WatchEvent[] {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const batch = coalesceWatchEvents(this.pending);
    this.pending = [];
    if (batch.length > 0) this.onFlush(batch);
    return batch;
  }

  dispose(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = [];
  }
}
