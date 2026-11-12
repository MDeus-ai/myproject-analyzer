import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  clampBoundsToDisplays,
  loadWindowState,
  saveWindowState,
  windowStateFile,
} from "./window-state.ts";

const PRIMARY = { x: 0, y: 0, width: 1920, height: 1040 };
const SECONDARY = { x: 1920, y: 0, width: 1920, height: 1080 };

test("fully on-screen bounds are kept as-is", () => {
  const saved = { x: 100, y: 100, width: 1440, height: 900 };
  assert.deepEqual(clampBoundsToDisplays(saved, [PRIMARY]), saved);
});

test("bounds on the secondary display survive while it is connected", () => {
  const saved = { x: 2100, y: 100, width: 1440, height: 900 };
  assert.deepEqual(clampBoundsToDisplays(saved, [PRIMARY, SECONDARY]), saved);
});

test("bounds on a disconnected display fall back to null", () => {
  const saved = { x: 2100, y: 100, width: 1440, height: 900 };
  assert.equal(clampBoundsToDisplays(saved, [PRIMARY]), null);
});

test("partially off-screen but still grabbable counts as visible", () => {
  // 120px still hanging onto the primary display
  const saved = { x: 1800, y: 100, width: 1440, height: 900 };
  assert.deepEqual(clampBoundsToDisplays(saved, [PRIMARY]), saved);
});

test("a sliver under the visibility threshold is treated as gone", () => {
  const saved = { x: 1850, y: 100, width: 1440, height: 900 }; // only 70px visible
  assert.equal(clampBoundsToDisplays(saved, [PRIMARY]), null);
});

test("negative coordinates (monitor left of primary) work", () => {
  const LEFT = { x: -1920, y: 0, width: 1920, height: 1080 };
  const saved = { x: -1500, y: 100, width: 1440, height: 900 };
  assert.deepEqual(clampBoundsToDisplays(saved, [PRIMARY, LEFT]), saved);
});

test("absurd saved sizes are rejected", () => {
  assert.equal(
    clampBoundsToDisplays({ x: 0, y: 0, width: 10, height: 10 }, [PRIMARY]),
    null,
  );
});

test("no displays → null", () => {
  assert.equal(
    clampBoundsToDisplays({ x: 0, y: 0, width: 1440, height: 900 }, []),
    null,
  );
});

test("save → load round trip", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "winstate-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = windowStateFile(dir);
  const state = {
    bounds: { x: 10, y: 20, width: 1440, height: 900 },
    isMaximized: false,
  };
  saveWindowState(file, state);
  assert.deepEqual(loadWindowState(file), state);
});

test("load tolerates missing, corrupt and wrong-shaped files", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "winstate-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = windowStateFile(dir);
  assert.equal(loadWindowState(file), null); // missing
  writeFileSync(file, "{ not json", "utf8");
  assert.equal(loadWindowState(file), null); // corrupt
  writeFileSync(file, JSON.stringify({ bounds: { x: "a" } }), "utf8");
  assert.equal(loadWindowState(file), null); // wrong shape
});
