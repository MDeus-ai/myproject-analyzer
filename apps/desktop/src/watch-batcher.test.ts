import test from "node:test";
import assert from "node:assert/strict";
import { coalesceWatchEvents, WatchBatcher } from "./watch-batcher.ts";
import type { WatchEvent } from "@myproject/platform/types";

const ev = (
  type: WatchEvent["type"],
  path: string,
  over: Partial<WatchEvent> = {},
): WatchEvent => ({ type, path, ...over });

test("coalesce: last event per path wins", () => {
  const out = coalesceWatchEvents([
    ev("add", "src/a.ts"),
    ev("change", "src/a.ts", { size: 10 }),
    ev("change", "src/b.ts"),
  ]);
  assert.equal(out.length, 2);
  const a = out.find((e) => e.path === "src/a.ts")!;
  assert.equal(a.type, "change");
  assert.equal(a.size, 10);
});

test("coalesce: rename keeps both paths; unlink wins when last", () => {
  const out = coalesceWatchEvents([
    ev("unlink", "src/old.ts"),
    ev("add", "src/new.ts"),
    ev("add", "src/tmp.ts"),
    ev("unlink", "src/tmp.ts"),
  ]);
  assert.deepEqual(out.map((e) => `${e.type}:${e.path}`).sort(), [
    "add:src/new.ts",
    "unlink:src/old.ts",
    "unlink:src/tmp.ts",
  ]);
});

test("batcher: debounces a burst into one coalesced flush", async () => {
  const flushed: WatchEvent[][] = [];
  const batcher = new WatchBatcher((events) => flushed.push(events), 10);
  batcher.push(ev("add", "src/a.ts"));
  batcher.push(ev("change", "src/a.ts", { size: 3 }));
  batcher.push(ev("add", "src/b.ts"));
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].length, 2); // a.ts coalesced, b.ts separate
  batcher.dispose();
});

test("batcher: dispose cancels a pending flush", async () => {
  const flushed: WatchEvent[][] = [];
  const batcher = new WatchBatcher((events) => flushed.push(events), 10);
  batcher.push(ev("add", "src/a.ts"));
  batcher.dispose();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(flushed.length, 0);
});
