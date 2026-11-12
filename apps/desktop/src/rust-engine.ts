/**
 * Desktop main-process Rust engine dispatcher (`engine:buildGraph`,
 * `engine:search`, `engine:estimateTokens`).
 *
 * Security: path-backed files without `textContent` are hydrated ONLY via
 * the caller-supplied `readAllowedText` callback (which enforces
 * `isUnderAllowedRoot` + size/NUL gates in `main.ts`).
 *
 * Execution:
 * 1. If the compiled Rust N-API `.node` addon (`@myproject/rust-engine`) is
 *    present on disk, executes in native Rust (`backend: "rust-napi"`).
 * 2. Otherwise executes in the Electron main Node process (`backend: "node-main"`)
 *    off the renderer thread and returns the serialized JSON payload.
 */

import type {
  EngineBuildGraphIpcResult,
  EngineEstimateTokensIpcResult,
  EngineFileInputIpc,
  EngineSearchIpcResult,
  EngineSearchOptionsIpc,
} from "@myproject/platform/bridge";
import type { ProcessedFile } from "@myproject/core/types";
import {
  buildCodebaseDependencyGraph,
  searchCodebase,
  type DepLenzSymbol,
} from "@myproject/core/depLenz";
import { estimateCombinedTokensByStyle } from "@myproject/core/codeAnalyzer";
import { serializeDepLenzResult } from "@myproject/core/engineBridge";
import {
  loadNativeRustAddon,
  type NativeRustAddon,
} from "@myproject/rust-engine";

export type ReadAllowedTextFn = (absPath: string) => Promise<string | null>;

async function hydrateEngineInputs(
  files: EngineFileInputIpc[],
  readAllowedText: ReadAllowedTextFn,
): Promise<EngineFileInputIpc[]> {
  return Promise.all(
    files.map(async (f) => {
      if (f.textContent !== undefined || !f.absolutePath) {
        return f;
      }
      const text = await readAllowedText(f.absolutePath);
      return text != null ? { ...f, textContent: text } : f;
    }),
  );
}

function toProcessedFiles(inputs: EngineFileInputIpc[]): ProcessedFile[] {
  return inputs.map((f, i) => {
    const parts = f.relativePath.split("/");
    return {
      id: `engine-${i}`,
      name: f.name,
      originalName: f.name,
      flattenedName: f.name,
      relativePath: f.relativePath,
      pathSegments: parts,
      directoryPath: parts.length > 2 ? parts.slice(1, -1).join("/") : "",
      size: f.size,
      type: "",
      extension: f.extension,
      lastModified: 0,
      textContent: f.textContent,
      ...(f.absolutePath
        ? { source: { kind: "path" as const, absolutePath: f.absolutePath } }
        : {}),
    };
  });
}

export async function handleEngineBuildGraph(
  files: EngineFileInputIpc[],
  readAllowedText: ReadAllowedTextFn,
  addon: NativeRustAddon | null = loadNativeRustAddon(),
): Promise<EngineBuildGraphIpcResult> {
  try {
    const hydrated = await hydrateEngineInputs(files, readAllowedText);
    if (addon) {
      const graphJson = addon.napiBuildGraph(JSON.stringify(hydrated));
      return { ok: true, backend: "rust-napi", graphJson };
    }
    const processed = toProcessedFiles(hydrated);
    const result = buildCodebaseDependencyGraph(processed);
    const serialized = serializeDepLenzResult(result);
    return {
      ok: true,
      backend: "node-main",
      graphJson: JSON.stringify(serialized),
    };
  } catch (err) {
    return {
      ok: false,
      backend: addon ? "rust-napi" : "node-main",
      graphJson: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function handleEngineSearch(
  files: EngineFileInputIpc[],
  opts: EngineSearchOptionsIpc,
  symbolsMapJson: string | null,
  readAllowedText: ReadAllowedTextFn,
  addon: NativeRustAddon | null = loadNativeRustAddon(),
): Promise<EngineSearchIpcResult> {
  try {
    const hydrated = await hydrateEngineInputs(files, readAllowedText);
    if (addon) {
      const matchesJson = addon.napiSearchCodebase(
        JSON.stringify(hydrated),
        JSON.stringify(opts),
        symbolsMapJson,
      );
      return { ok: true, backend: "rust-napi", matchesJson };
    }
    const processed = toProcessedFiles(hydrated);
    let symbolsMap: Map<string, DepLenzSymbol[]> | undefined;
    if (symbolsMapJson) {
      const parsed = JSON.parse(symbolsMapJson) as Record<
        string,
        DepLenzSymbol[]
      >;
      symbolsMap = new Map(Object.entries(parsed));
    }
    const matches = searchCodebase(processed, opts, symbolsMap);
    return {
      ok: true,
      backend: "node-main",
      matchesJson: JSON.stringify(matches),
    };
  } catch (err) {
    return {
      ok: false,
      backend: addon ? "rust-napi" : "node-main",
      matchesJson: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function handleEngineEstimateTokens(
  files: EngineFileInputIpc[],
  includeToc: boolean,
  includeLineNumbers: boolean,
  readAllowedText: ReadAllowedTextFn,
  addon: NativeRustAddon | null = loadNativeRustAddon(),
): Promise<EngineEstimateTokensIpcResult> {
  try {
    const hydrated = await hydrateEngineInputs(files, readAllowedText);
    if (addon && typeof addon.napiEstimateTokens === "function") {
      const tokensJson = addon.napiEstimateTokens(
        JSON.stringify(hydrated),
        includeToc,
        includeLineNumbers,
      );
      return { ok: true, backend: "rust-napi", tokensJson };
    }
    const processed = toProcessedFiles(hydrated);
    const est = estimateCombinedTokensByStyle(processed, {
      includeToc,
      includeLineNumbers,
    });
    return {
      ok: true,
      backend: "node-main",
      tokensJson: JSON.stringify(est),
    };
  } catch (err) {
    return {
      ok: false,
      backend: addon ? "rust-napi" : "node-main",
      tokensJson: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
