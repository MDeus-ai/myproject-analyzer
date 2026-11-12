import test from "node:test";
import assert from "node:assert/strict";
import type { DesktopHostBridge, WalkedEntry } from "@myproject/platform";
import type { ProcessedFile } from "@myproject/core/types";
import { ElectronPlatformBridge } from "./index.ts";

interface MockHostOptions {
  pick?: { canceled: boolean; path?: string };
  entries?: WalkedEntry[];
  texts?: Record<string, string>;
}

function mockHost(opts: MockHostOptions): DesktopHostBridge & {
  requestedReads: string[];
} {
  const requestedReads: string[] = [];
  return {
    requestedReads,
    platform: "electron",
    applyChanges: async () => ({
      ok: true,
      files: [],
      backupDir: null,
      errors: [],
    }),
    versions: { electron: "0", chrome: "0", node: "0" },
    pickFolder: async () => opts.pick ?? { canceled: true },
    walkFolder: async () => ({ ok: true, entries: opts.entries ?? [] }),
    readFileText: async (p) => opts.texts?.[p] ?? null,
    readFilesText: async (paths) => {
      requestedReads.push(...paths);
      return paths.map((p) => opts.texts?.[p] ?? null);
    },
    saveFile: async () => ({ saved: true }),
    getPathForFile: () => "",
    // ---- Phase 2: watch surface (required by DesktopHostBridge) ----
    startWatch: async () => ({ ok: true, sessionId: "s1" }),
    stopWatch: async () => ({ ok: true }),
    onWatchEvent: () => () => {},
  };
}

const entry = (relPath: string, size = 10): WalkedEntry => ({
  absPath: `D:/dev/proj/${relPath}`,
  relPath,
  name: relPath.split("/").pop()!,
  size,
  mtimeMs: 1700000000000,
});

test("canceled dialog resolves to null", async () => {
  const bridge = new ElectronPlatformBridge(mockHost({}));
  assert.equal(await bridge.pickFolder(), null);
});

test("native scan maps to FolderScanResult with path-backed sources", async () => {
  const host = mockHost({
    pick: { canceled: false, path: "D:\\dev\\proj" },
    entries: [
      entry("package.json"),
      entry("src/a.ts"),
      entry("node_modules/junk/x.js"),
      entry(".gitignore"),
      entry("secret-token.txt"),
    ],
    texts: {
      "D:/dev/proj/package.json": "{}",
      "D:/dev/proj/src/a.ts": "export const a = 1;\n",
      "D:/dev/proj/.gitignore": "secret-*\n",
    },
  });

  const result = await new ElectronPlatformBridge(host).pickFolder();
  assert.ok(result);
  assert.equal(result.rootName, "proj");

  // relativePath carries the root segment, mirroring webkitRelativePath
  const aTs = result.files.find((f) => f.name === "a.ts");
  assert.ok(aTs);
  assert.equal(aTs.relativePath, "proj/src/a.ts");
  assert.deepEqual(aTs.pathSegments, ["proj", "src", "a.ts"]);
  assert.equal(aTs.directoryPath, "src");
  assert.equal(aTs.source?.kind, "path");
  assert.equal(aTs.textContent, "export const a = 1;\n");

  // heavy folder detected, file excluded, its text NEVER requested
  assert.ok(
    result.files.every((f) => !f.relativePath.includes("node_modules")),
  );
  assert.equal(result.detectedExclusions[0]?.name, "node_modules");
  assert.ok(
    host.requestedReads.every((p) => !p.includes("node_modules")),
    "heavy-excluded files must not be read",
  );

  // .gitignore rule applied through the shared pipeline
  assert.ok(result.files.every((f) => f.name !== "secret-token.txt"));
  assert.equal(result.gitignoreRemovedFiles?.length, 1);
  assert.equal(result.gitignoreRemovedFiles?.[0].pattern, "secret-*");

  // Phase 2: native scans stamp the absolute root so the renderer can watch
  assert.equal(result.rootAbsolutePath, "D:\\dev\\proj");
});

test("readText prefers the path channel, falls back to blob", async () => {
  const host = mockHost({ texts: { "/x/b.ts": "from disk" } });
  const bridge = new ElectronPlatformBridge(host);

  const pathFile = {
    name: "b.ts",
    type: "",
    source: { kind: "path", absolutePath: "/x/b.ts" },
  } as unknown as ProcessedFile;
  assert.equal(await bridge.readText(pathFile), "from disk");

  const blobFile = {
    name: "c.ts",
    type: "text/typescript",
    blob: new Blob(["from blob"]),
  } as unknown as ProcessedFile;
  assert.equal(await bridge.readText(blobFile), "from blob");
});

test("saveBlob forwards bytes to the native save dialog", async () => {
  let saved: { name: string; size: number } | null = null;
  const host = mockHost({});
  host.saveFile = async (name, data) => {
    saved = { name, size: data.byteLength };
    return { saved: true };
  };
  await new ElectronPlatformBridge(host).saveBlob(
    new Blob(["hello"]),
    "out.zip",
  );
  assert.deepEqual(saved, { name: "out.zip", size: 5 });
});

test("watch methods map IPC results to the PlatformBridge contract", async () => {
  const bridge = new ElectronPlatformBridge(mockHost({}));
  assert.equal(bridge.capabilities.watch, true);
  assert.equal(
    await bridge.startWatch("D:\\dev\\proj", {
      excludedPatterns: ["node_modules"],
      respectGitignore: true,
    }),
    "s1",
  );
  await bridge.stopWatch("s1"); // must not throw

  const batches: unknown[] = [];
  const unsub = bridge.onWatchEvent((b) => batches.push(b));
  assert.equal(typeof unsub, "function");
  unsub();
});

test("startWatch surfaces the host error", async () => {
  const host = mockHost({});
  host.startWatch = async () => ({ ok: false, error: "nope" });
  await assert.rejects(
    () =>
      new ElectronPlatformBridge(host).startWatch("D:\\x", {
        excludedPatterns: [],
        respectGitignore: false,
      }),
    /nope/,
  );
});
test("applyChanges requires a prior native pick", async () => {
  const bridge = new ElectronPlatformBridge(mockHost({}));
  await assert.rejects(() => bridge.applyChanges([], {}), /natively-opened/);
});

test("applyChanges maps DTOs and converts null backupDir", async () => {
  let captured: { root: string; changes: unknown; opts: unknown } | null = null;
  const host = mockHost({
    pick: { canceled: false, path: "D:\\dev\\proj" },
    entries: [],
  });
  host.applyChanges = async (root, changes, opts) => {
    captured = { root, changes, opts };
    return {
      ok: true,
      files: [{ path: "src/a.ts", action: "modified" }],
      backupDir: null,
      errors: [],
    };
  };
  const bridge = new ElectronPlatformBridge(host);
  await bridge.pickFolder();

  const result = await bridge.applyChanges(
    [
      {
        path: "src/a.ts",
        action: "modify",
        content: "x",
        markerCount: 0,
        existsInProject: true,
      },
    ],
    { stripMarkers: true },
  );

  assert.equal(result.ok, true);
  assert.equal(result.backupDir, undefined); // null -> undefined
  assert.equal(captured!.root, "D:\\dev\\proj");
  assert.deepEqual(captured!.changes, [
    { path: "src/a.ts", action: "modify", content: "x" },
  ]);
  assert.deepEqual(captured!.opts, {
    dryRun: false,
    stripMarkers: true,
    force: false,
  });
});

test("a web-style import clears the apply target", async () => {
  const host = mockHost({
    pick: { canceled: false, path: "D:\\dev\\proj" },
    entries: [],
  });
  const bridge = new ElectronPlatformBridge(host);
  await bridge.pickFolder();
  await bridge.scanFileObjects([]); // scenario/sample load replaces the project
  await assert.rejects(() => bridge.applyChanges([], {}), /natively-opened/);
});
