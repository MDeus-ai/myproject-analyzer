/**
 * Pluggable high-performance engine hook (native Rust N-API engine on desktop,
 * Rust WASM / off-main-thread Web Worker engine on web).
 *
 * Same pattern as contentReader.ts: packages/core must stay platform-
 * agnostic, so the active platform may register a DepLenzEngine at boot.
 * When none is registered (tests, missing native module), every consumer
 * falls back to the pure-TypeScript implementation in depLenz.ts, which
 * remains the executable spec for the Rust port (`packages/rust-engine`).
 */

import type { ProcessedFile } from "./types";
import type {
  CodebaseSearchMatch,
  CodebaseSearchOptions,
  DepLenzAnalysisResult,
  DepLenzGraphNode,
  DepLenzSymbol,
  SyntaxDiagnostic,
  TypeDeclaration,
} from "./depLenz";
import type { AnalyzerStyle } from "./codeAnalyzer";

export interface RustFileInput {
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  textContent?: string;
  absolutePath?: string;
}

/**
 * Plain-object wire representation of `DepLenzAnalysisResult` across
 * Rust N-API JSON, WebAssembly, Electron IPC, and Web Worker boundaries
 * (where `Map` instances are serialized as `Record<string, ...>`).
 */
export interface SerializedDepLenzAnalysisResult {
  symbols: DepLenzSymbol[];
  nodesMap: Record<string, DepLenzGraphNode>;
  fileSymbolsMap: Record<string, DepLenzSymbol[]>;
  fileTypesMap: Record<string, TypeDeclaration[]>;
  typeIndex: Record<string, TypeDeclaration[]>;
  totalFunctions: number;
  totalComponents: number;
  totalHooks: number;
  totalDependenciesMapped: number;
  analyzedFilesCount: number;
  diagnostics: SyntaxDiagnostic[];
  totalSyntaxWarnings: number;
  filesWithSyntaxErrors: string[];
}

export function toRustFileInputs(files: ProcessedFile[]): RustFileInput[] {
  return files.map((f) => ({
    name: f.name,
    relativePath: f.relativePath,
    extension: f.extension,
    size: f.size,
    textContent: f.textContent,
    absolutePath:
      f.source?.kind === "path" ? f.source.absolutePath : undefined,
  }));
}

export function serializeDepLenzResult(
  result: DepLenzAnalysisResult,
): SerializedDepLenzAnalysisResult {
  return {
    symbols: result.symbols,
    nodesMap: Object.fromEntries(result.nodesMap.entries()),
    fileSymbolsMap: Object.fromEntries(result.fileSymbolsMap.entries()),
    fileTypesMap: Object.fromEntries(result.fileTypesMap.entries()),
    typeIndex: Object.fromEntries(result.typeIndex.entries()),
    totalFunctions: result.totalFunctions,
    totalComponents: result.totalComponents,
    totalHooks: result.totalHooks,
    totalDependenciesMapped: result.totalDependenciesMapped,
    analyzedFilesCount: result.analyzedFilesCount,
    diagnostics: result.diagnostics,
    totalSyntaxWarnings: result.totalSyntaxWarnings,
    filesWithSyntaxErrors: result.filesWithSyntaxErrors,
  };
}

export function deserializeDepLenzResult(
  raw: SerializedDepLenzAnalysisResult,
): DepLenzAnalysisResult {
  return {
    symbols: raw.symbols ?? [],
    nodesMap: new Map(Object.entries(raw.nodesMap ?? {})),
    fileSymbolsMap: new Map(Object.entries(raw.fileSymbolsMap ?? {})),
    fileTypesMap: new Map(Object.entries(raw.fileTypesMap ?? {})),
    typeIndex: new Map(Object.entries(raw.typeIndex ?? {})),
    totalFunctions: raw.totalFunctions ?? 0,
    totalComponents: raw.totalComponents ?? 0,
    totalHooks: raw.totalHooks ?? 0,
    totalDependenciesMapped: raw.totalDependenciesMapped ?? 0,
    analyzedFilesCount: raw.analyzedFilesCount ?? 0,
    diagnostics: raw.diagnostics ?? [],
    totalSyntaxWarnings: raw.totalSyntaxWarnings ?? 0,
    filesWithSyntaxErrors: raw.filesWithSyntaxErrors ?? [],
  };
}

export interface DepLenzEngine {
  /** Identifier for telemetry/tests ("rust-napi" | "rust-wasm" | "desktop-ipc" | "web-worker"). */
  readonly backend?: string;
  /**
   * Returns null when the engine can't handle this file set — callers then
   * fall back to the TS engine.
   */
  buildGraph(files: ProcessedFile[]): Promise<DepLenzAnalysisResult | null>;
  search(
    files: ProcessedFile[],
    opts: CodebaseSearchOptions,
    symbolsMap?: Map<string, DepLenzSymbol[]>,
  ): Promise<CodebaseSearchMatch[] | null>;
  /** Optional native token estimator across all 6 Analyzer formats. */
  estimateTokens?(
    files: ProcessedFile[],
    opts: { includeToc: boolean; includeLineNumbers: boolean },
  ): Promise<Record<AnalyzerStyle, number> | null>;
}

let activeEngine: DepLenzEngine | null = null;

export function setDepLenzEngine(engine: DepLenzEngine | null): void {
  activeEngine = engine;
}

export function getDepLenzEngine(): DepLenzEngine | null {
  return activeEngine;
}
