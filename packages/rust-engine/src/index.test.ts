import test from "node:test";
import assert from "node:assert/strict";
import {
  createRustNapiEngine,
  getCandidateBinaryNames,
  loadNativeRustAddon,
  type NativeRustAddon,
} from "./index";
import type { ProcessedFile } from "@myproject/core/types";

function makeFile(
  relativePath: string,
  textContent: string,
): ProcessedFile {
  const parts = relativePath.split("/");
  const name = parts[parts.length - 1];
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  return {
    id: `id-${relativePath}`,
    name,
    originalName: name,
    flattenedName: name,
    relativePath,
    pathSegments: parts,
    directoryPath: parts.slice(1, -1).join("/"),
    size: textContent.length,
    type: "text/plain",
    extension: ext,
    lastModified: 1700000000000,
    textContent,
  };
}

test("getCandidateBinaryNames includes platform-arch and generic .node names", () => {
  const names = getCandidateBinaryNames("win32", "x64");
  assert.ok(names.includes("myproject-rust-engine.win32-x64.node"));
  assert.ok(names.includes("myproject-rust-engine.node"));
});

test("loadNativeRustAddon returns null gracefully when no .node binary is present", () => {
  const addon = loadNativeRustAddon(["/nonexistent-dir-12345"]);
  assert.equal(addon, null);
  const engine = createRustNapiEngine(addon);
  assert.equal(engine.backend, "unloaded");
});

test("createRustNapiEngine marshals files and deserializes Maps from NativeRustAddon", async () => {
  const mockAddon: NativeRustAddon = {
    napiBuildGraph(filesJson: string): string {
      const files = JSON.parse(filesJson) as Array<{ relativePath: string }>;
      assert.equal(files.length, 1);
      assert.equal(files[0].relativePath, "repo/src/math.ts");
      return JSON.stringify({
        symbols: [
          {
            id: "repo/src/math.ts:add",
            name: "add",
            kind: "function",
            filePath: "repo/src/math.ts",
            fileName: "math.ts",
            lineStart: 1,
            lineEnd: 3,
            signature: "add(a: number, b: number)",
            body: "export function add(a: number, b: number) { return a + b; }",
            isExported: true,
            isDefaultExport: false,
            calls: [],
          },
        ],
        nodesMap: {
          "repo/src/math.ts:add": {
            symbol: {
              id: "repo/src/math.ts:add",
              name: "add",
              kind: "function",
              filePath: "repo/src/math.ts",
              fileName: "math.ts",
              lineStart: 1,
              lineEnd: 3,
              signature: "add(a: number, b: number)",
              body: "export function add(a: number, b: number) { return a + b; }",
              isExported: true,
              isDefaultExport: false,
              calls: [],
            },
            dependencies: [],
            dependents: [],
            externalDependencies: [],
            impactRadius: 0,
            impactLevel: "low",
            directCallers: 0,
            directCallees: 0,
            blastRadius: 0,
          },
        },
        fileSymbolsMap: {
          "repo/src/math.ts": [
            {
              id: "repo/src/math.ts:add",
              name: "add",
              kind: "function",
              filePath: "repo/src/math.ts",
              fileName: "math.ts",
              lineStart: 1,
              lineEnd: 3,
              signature: "add(a: number, b: number)",
              body: "export function add(a: number, b: number) { return a + b; }",
              isExported: true,
              isDefaultExport: false,
              calls: [],
            },
          ],
        },
        fileTypesMap: {},
        typeIndex: {},
        totalFunctions: 1,
        totalComponents: 0,
        totalHooks: 0,
        totalDependenciesMapped: 0,
        analyzedFilesCount: 1,
        diagnostics: [],
        totalSyntaxWarnings: 0,
        filesWithSyntaxErrors: [],
      });
    },
    napiSearchCodebase(_filesJson: string, optionsJson: string): string {
      const opts = JSON.parse(optionsJson) as { query: string };
      return JSON.stringify([
        {
          id: "repo/src/math.ts:1:17",
          filePath: "repo/src/math.ts",
          fileName: "math.ts",
          lineNumber: 1,
          columnNumber: 17,
          lineText: "export function add(a: number, b: number) { return a + b; }",
          matchLength: opts.query.length,
        },
      ]);
    },
    napiEstimateTokens(): string {
      return JSON.stringify({
        standard: 120,
        compact: 45,
        markdown: 90,
        xml: 85,
        jsonl: 75,
        json: 88,
      });
    },
  };

  const engine = createRustNapiEngine(mockAddon);
  assert.equal(engine.backend, "rust-napi");

  const files = [
    makeFile(
      "repo/src/math.ts",
      "export function add(a: number, b: number) { return a + b; }",
    ),
  ];

  const graph = await engine.buildGraph(files);
  assert.ok(graph);
  assert.equal(graph.totalFunctions, 1);
  assert.ok(graph.nodesMap instanceof Map);
  assert.ok(graph.fileSymbolsMap instanceof Map);
  assert.ok(graph.nodesMap.has("repo/src/math.ts:add"));

  const matches = await engine.search(files, { query: "add" });
  assert.ok(matches);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].lineNumber, 1);

  const tokens = await engine.estimateTokens!(files, {
    includeToc: true,
    includeLineNumbers: false,
  });
  assert.ok(tokens);
  assert.equal(tokens.standard, 120);
  assert.equal(tokens.compact, 45);
});
