import test from "node:test";
import assert from "node:assert/strict";
import {
  handleEngineBuildGraph,
  handleEngineEstimateTokens,
  handleEngineSearch,
} from "./rust-engine";
import { deserializeDepLenzResult } from "@myproject/core/engineBridge";

test("handleEngineBuildGraph hydrates path-backed files via gated reader and builds graph", async () => {
  const disk = new Map<string, string>([
    [
      "/allowed/repo/src/math.ts",
      "export function add(a: number, b: number) { return a + b; }",
    ],
    [
      "/allowed/repo/src/app.ts",
      "import { add } from './math';\nexport function run() { return add(2, 3); }",
    ],
  ]);

  const readAllowedText = async (absPath: string) =>
    disk.get(absPath) ?? null;

  const res = await handleEngineBuildGraph(
    [
      {
        name: "math.ts",
        relativePath: "repo/src/math.ts",
        extension: "ts",
        size: 60,
        absolutePath: "/allowed/repo/src/math.ts",
      },
      {
        name: "app.ts",
        relativePath: "repo/src/app.ts",
        extension: "ts",
        size: 72,
        absolutePath: "/allowed/repo/src/app.ts",
      },
    ],
    readAllowedText,
    null,
  );

  assert.equal(res.ok, true);
  assert.ok(res.graphJson);
  const graph = deserializeDepLenzResult(JSON.parse(res.graphJson));
  assert.equal(graph.analyzedFilesCount, 2);
  assert.equal(graph.totalFunctions, 2);
  assert.equal(graph.totalDependenciesMapped, 1);
  assert.ok(graph.nodesMap.has("repo/src/math.ts:add"));
});

test("handleEngineSearch and handleEngineEstimateTokens work with both N-API addon and node-main fallback", async () => {
  const files = [
    {
      name: "math.ts",
      relativePath: "repo/src/math.ts",
      extension: "ts",
      size: 60,
      textContent: "export function add(a: number, b: number) { return a + b; }",
    },
  ];

  const searchRes = await handleEngineSearch(
    files,
    { query: "add", caseSensitive: true },
    null,
    async () => null,
    null,
  );
  assert.equal(searchRes.ok, true);
  const matches = JSON.parse(searchRes.matchesJson!);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].lineNumber, 1);

  const tokenRes = await handleEngineEstimateTokens(
    files,
    true,
    false,
    async () => null,
    null,
  );
  assert.equal(tokenRes.ok, true);
  const tokens = JSON.parse(tokenRes.tokensJson!);
  assert.ok(tokens.standard > tokens.compact);
});
