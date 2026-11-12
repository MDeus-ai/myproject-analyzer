/**
 * Window bounds persistence — remembers size/position/maximized state
 * across launches, with display validation so a restored window can
 * never land on a disconnected monitor (the classic "laptop undocked"
 * case: saved coordinates point at a screen that no longer exists).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PersistedWindowState {
  bounds: WindowBounds;
  isMaximized: boolean;
}

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** At least this much of the window must be visible to trust a saved spot. */
const MIN_VISIBLE_PX = 100;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isValidBounds(b: unknown): b is WindowBounds {
  if (typeof b !== "object" || b === null) return false;
  const r = b as Record<string, unknown>;
  return (
    isFiniteNumber(r.x) &&
    isFiniteNumber(r.y) &&
    isFiniteNumber(r.width) &&
    isFiniteNumber(r.height) &&
    r.width >= MIN_WIDTH &&
    r.height >= MIN_HEIGHT
  );
}

/** Visible-overlap test between the window rect and one display work area.
 *  Handles negative coordinates (monitors left/above the primary). */
function hasEnoughOverlap(bounds: WindowBounds, area: WorkArea): boolean {
  const overlapW =
    Math.min(bounds.x + bounds.width, area.x + area.width) -
    Math.max(bounds.x, area.x);
  const overlapH =
    Math.min(bounds.y + bounds.height, area.y + area.height) -
    Math.max(bounds.y, area.y);
  return overlapW >= MIN_VISIBLE_PX && overlapH >= MIN_VISIBLE_PX;
}

/**
 * Pure validation: returns the saved bounds when they still intersect a
 * connected display (at least MIN_VISIBLE_PX in both axes), else null so
 * the caller falls back to default placement.
 */
export function clampBoundsToDisplays(
  saved: WindowBounds,
  workAreas: WorkArea[],
): WindowBounds | null {
  if (!isValidBounds(saved)) return null;
  if (workAreas.length === 0) return null;
  return workAreas.some((area) => hasEnoughOverlap(saved, area)) ? saved : null;
}

/** Reads persisted state; null on missing/corrupt/invalid — never throws. */
export function loadWindowState(filePath: string): PersistedWindowState | null {
  try {
    const data: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (typeof data !== "object" || data === null) return null;
    const state = data as Record<string, unknown>;
    if (!isValidBounds(state.bounds)) return null;
    return {
      bounds: state.bounds,
      isMaximized: state.isMaximized === true,
    };
  } catch {
    return null;
  }
}

/** Writes persisted state; failures are non-fatal (worst case: defaults). */
export function saveWindowState(
  filePath: string,
  state: PersistedWindowState,
): void {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // non-fatal — worst case the window opens at default bounds next launch
  }
}

export function windowStateFile(userDataDir: string): string {
  return path.join(userDataDir, "window-state.json");
}
