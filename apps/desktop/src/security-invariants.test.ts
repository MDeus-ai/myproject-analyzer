/**
 * Source-scan regression test for the Electron security checklist.
 * Not a substitute for review — a tripwire so the invariants that are
 * easy to flip in one keystroke fail loudly in CI.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const mainSrc = readFileSync(path.join(SRC_DIR, "main.ts"), "utf8");
const preloadSrc = readFileSync(path.join(SRC_DIR, "preload.ts"), "utf8");

test("webPreferences keep the sacred invariants", () => {
  assert.match(mainSrc, /contextIsolation:\s*true/);
  assert.match(mainSrc, /nodeIntegration:\s*false/);
  assert.match(mainSrc, /sandbox:\s*true/);
});

test("dangerous switches never appear in main or preload", () => {
  const forbidden = [
    /webSecurity:\s*false/,
    /allowRunningInsecureContent:\s*true/,
    /enableRemoteModule/,
    /nodeIntegrationInWorker:\s*true/,
    /nodeIntegrationInSubFrames:\s*true/,
    /experimentalFeatures:\s*true/,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(mainSrc, pattern, `main.ts: ${pattern}`);
    assert.doesNotMatch(preloadSrc, pattern, `preload.ts: ${pattern}`);
  }
});

test("navigation, permission and webview guards are wired", () => {
  assert.match(mainSrc, /will-navigate/);
  assert.match(mainSrc, /setWindowOpenHandler/);
  assert.match(mainSrc, /setPermissionRequestHandler/);
  assert.match(mainSrc, /setPermissionCheckHandler/);
  assert.match(mainSrc, /will-attach-webview/);
});

test("preload surface stays minimal: exactly one global, no privileged imports", () => {
  const exposes = preloadSrc.match(/exposeInMainWorld/g) ?? [];
  assert.equal(
    exposes.length,
    1,
    "only window.myprojectDesktop may be exposed",
  );
  assert.doesNotMatch(preloadSrc, /ipcMain/);
  assert.doesNotMatch(preloadSrc, /from\s+["']node:(fs|child_process|net)/);
  assert.doesNotMatch(preloadSrc, /\bshell\b/);
});

test("IPC surface never exposes raw send/syncSend escape hatches", () => {
  // The bridge is invoke/handle + one event subscription; ipcRenderer.send
  // or sendSync would bypass the typed contract.
  assert.doesNotMatch(preloadSrc, /ipcRenderer\.sendSync/);
  assert.doesNotMatch(preloadSrc, /ipcRenderer\.send\(/);
});
