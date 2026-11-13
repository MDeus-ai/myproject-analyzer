/**
 * TypeScript loader & DepLenzEngine adapter for `myproject-rust-engine`
 * (the native Rust N-API addon in `packages/rust-engine/src/lib.rs`).
 *
 * When the `.node` binary has been compiled (`npm run build:rust`), this
 * module loads it via Node's `createRequire` and executes:
 *  - `napiBuildGraph` (`build_codebase_dependency_graph` in Rust)
 *  - `napiSearchCodebase` (`search_codebase` with `memchr::memmem` SIMD + `regex`)
 *  - `napiEstimateTokens` (`estimate_combined_tokens_by_style` in Rust)
 *  - `napiCountLines` (`memchr` byte-scan newline counter)
 *
 * When the `.node` binary is absent (e.g., pure-web or uncompiled dev checkout),
 * `loadNativeRustAddon()` returns `null` so callers gracefully fall back to the
 * off-thread worker or TypeScript engine without crashing.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProcessedFile } from "@myproject/core/types";
import type {
  CodebaseSearchMatch,
  CodebaseSearchOptions,
  DepLenzAnalysisResult,
  DepLenzSymbol,
} from "@myproject/core/depLenz";
import type { AnalyzerStyle } from "@myproject/core/codeAnalyzer";
import {
  deserializeDepLenzResult,
  toRustFileInputs,
  type DepLenzEngine,
  type SerializedDepLenzAnalysisResult,
} from "@myproject/core/engineBridge";

export interface NativeRustAddon {
  napiBuildGraph(filesJson: string): string;
  napiSearchCodebase(
    filesJson: string,
    optionsJson: string,
    symbolsMapJson?: string | null,
  ): string;
  napiExtractSymbols?(
    content: string,
    filePath: string,
    fileName: string,
  ): string;
  napiEstimateTokens?(
    filesJson: string,
    includeToc: boolean,
    includeLineNumbers: boolean,
  ): string;
  napiCountLines?(content: string): number;
}

let cachedAddon: NativeRustAddon | null | undefined = undefined;

/**
 * Candidate `.node` binary filenames produced by `cargo build --release --features napi-binding`
 * or `@napi-rs/cli`.
 */
export function getCandidateBinaryNames(
  platform: string = process.platform,
  arch: string = process.arch,
): string[] {
  return [
    `myproject-rust-engine.${platform}-${arch}.node`,
    `myproject_rust_engine.${platform}-${arch}.node`,
    "myproject-rust-engine.node",
    "myproject_rust_engine.node",
    "index.node",
  ];
}

/**
 * Attempts to load the compiled N-API `.node` addon from disk.
 * Never throws; returns `null` if no compiled binary is present.
 */
export function loadNativeRustAddon(
  extraDirs: string[] = [],
): NativeRustAddon | null {
  if (cachedAddon !== undefined && extraDirs.length === 0) {
    return cachedAddon;
  }

  let pkgDir = "";
  try {
    pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  } catch {
    pkgDir = process.cwd();
  }

  const searchDirs = [
    ...extraDirs,
    pkgDir,
    path.join(pkgDir, "target", "release"),
    path.join(pkgDir, "..", "..", "target", "release"),
    path.join(pkgDir, "dist"),
    process.cwd(),
  ];

  const names = getCandidateBinaryNames();
  const req = createRequire(import.meta.url);

  for (const dir of searchDirs) {
    if (!dir) continue;
    for (const name of names) {
      const fullPath = path.join(dir, name);
      if (existsSync(fullPath)) {
        try {
          const loaded = req(fullPath) as NativeRustAddon;
          if (
            loaded &&
            typeof loaded.napiBuildGraph === "function" &&
            typeof loaded.napiSearchCodebase === "function"
          ) {
            if (extraDirs.length === 0) cachedAddon = loaded;
            return loaded;
          }
        } catch {
          // Incompatible binary or ABI mismatch — continue probing
        }
      }
    }
  }

  if (extraDirs.length === 0) cachedAddon = null;
  return null;
}

/**
 * Wraps a `NativeRustAddon` (real `.node` binary or test double) as a
 * `@myproject/core` `DepLenzEngine`.
 */
export function createRustNapiEngine(
  addon: NativeRustAddon | null = loadNativeRustAddon(),
): DepLenzEngine {
  return {
    backend: addon ? "rust-napi" : "unloaded",

    async buildGraph(
      files: ProcessedFile[],
    ): Promise<DepLenzAnalysisResult | null> {
      if (!addon) return null;
      const inputs = toRustFileInputs(files);
      const rawJson = addon.napiBuildGraph(JSON.stringify(inputs));
      const parsed = JSON.parse(rawJson) as SerializedDepLenzAnalysisResult;
      return deserializeDepLenzResult(parsed);
    },

    async search(
      files: ProcessedFile[],
      opts: CodebaseSearchOptions,
      symbolsMap?: Map<string, DepLenzSymbol[]>,
    ): Promise<CodebaseSearchMatch[] | null> {
      if (!addon) return null;
      const inputs = toRustFileInputs(files);
      const serializedSymMap = symbolsMap
        ? JSON.stringify(Object.fromEntries(symbolsMap.entries()))
        : null;
      const rawJson = addon.napiSearchCodebase(
        JSON.stringify(inputs),
        JSON.stringify(opts),
        serializedSymMap,
      );
      return JSON.parse(rawJson) as CodebaseSearchMatch[];
    },

    async estimateTokens(
      files: ProcessedFile[],
      opts: { includeToc: boolean; includeLineNumbers: boolean },
    ): Promise<Record<AnalyzerStyle, number> | null> {
      if (!addon || typeof addon.napiEstimateTokens !== "function") {
        return null;
      }
      const inputs = toRustFileInputs(files);
      const rawJson = addon.napiEstimateTokens(
        JSON.stringify(inputs),
        opts.includeToc,
        opts.includeLineNumbers,
      );
      return JSON.parse(rawJson) as Record<AnalyzerStyle, number>;
    },
  };
}
