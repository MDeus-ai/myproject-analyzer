import test from "node:test";
import assert from "node:assert/strict";
import { diffLines, diffStats, collapseContext } from "./codeDiff";

test("identical texts produce only context lines", () => {
  const lines = diffLines("a\nb\nc", "a\nb\nc");
  assert.equal(lines.length, 3);
  assert.ok(lines.every((l) => l.type === "context"));
  const s = diffStats(lines);
  assert.deepEqual(s, { added: 0, removed: 0, unchanged: 3 });
});

test("changed line is detected with correct line numbers", () => {
  const lines = diffLines("a\nb\nc", "a\nx\nc");
  assert.deepEqual(
    lines.map((l) => l.type),
    ["context", "removed", "added", "context"],
  );
  assert.equal(lines[1].oldLineNumber, 2);
  assert.equal(lines[2].newLineNumber, 2);
  const s = diffStats(lines);
  assert.deepEqual(s, { added: 1, removed: 1, unchanged: 2 });
});

test("new file: empty old text yields all-added", () => {
  const lines = diffLines("", "one\ntwo");
  assert.ok(lines.every((l) => l.type === "added"));
  assert.equal(diffStats(lines).added, 2);
});

test("delete: empty new text yields all-removed", () => {
  const lines = diffLines("one\ntwo", "");
  assert.ok(lines.every((l) => l.type === "removed"));
  assert.equal(diffStats(lines).removed, 2);
});

test("collapseContext keeps radius around changes and gaps the rest", () => {
  const oldText = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join(
    "\n",
  );
  const newText = oldText.replace("line 10", "line 10 changed");
  const items = collapseContext(diffLines(oldText, newText), 3);
  // gap(6) + 3 context + removed + added + 3 context + gap(7)
  assert.equal(items.length, 10);
  assert.deepEqual(items[0], { type: "gap", count: 6 });
  assert.deepEqual(items[items.length - 1], { type: "gap", count: 7 });
  assert.equal(items.filter((i) => i.type === "added").length, 1);
  assert.equal(items.filter((i) => i.type === "removed").length, 1);
});
