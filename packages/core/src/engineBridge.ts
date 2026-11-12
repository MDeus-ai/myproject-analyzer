/**
 * Pluggable high-performance engine hook (native Rust engine on desktop).
 *
 * Same pattern as contentReader.ts: packages/core must stay platform-
 * agnostic, so the active platform may register a DepLenzEngine at boot.
 * When none is registered (web, tests, missing native module), every
 * consumer falls back to the pure-TypeScript implementation in depLenz.ts,
 * which remains the executable spec for any native port.
 */

import type { ProcessedFile } from "./types";
import type {
  CodebaseSearchMatch,
  CodebaseSearchOptions,
  DepLenzAnalysisResult,
  DepLenzSymbol,
} from "./depLenz";

export interface DepLenzEngine {
  /**
   * Returns null when the engine can't handle this file set (e.g.
   * blob-backed files on web) — callers then use the TS engine.
   */
  buildGraph(files: ProcessedFile[]): Promise<DepLenzAnalysisResult | null>;
  search(
    files: ProcessedFile[],
    opts: CodebaseSearchOptions,
    symbolsMap?: Map<string, DepLenzSymbol[]>,
  ): Promise<CodebaseSearchMatch[] | null>;
}

let activeEngine: DepLenzEngine | null = null;

export function setDepLenzEngine(engine: DepLenzEngine | null): void {
  activeEngine = engine;
}

export function getDepLenzEngine(): DepLenzEngine | null {
  return activeEngine;
}
