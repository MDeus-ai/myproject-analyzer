import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildWatchIgnored } from "./watch-filter.ts";
import { parseGitignore } from "@myproject/core/gitignoreParser";

const ROOT = path.resolve("proj");
const HEAVY = new Set(["node_modules", ".git", "dist"]);

test("the watched root itself is NEVER ignored", () => {
  const ignored = buildWatchIgnored(ROOT, HEAVY, []);
  assert.equal(ignored(ROOT), false);
  assert.equal(ignored(ROOT + path.sep), false);
});

test("regular files and directories are kept", () => {
  const ignored = buildWatchIgnored(ROOT, HEAVY, []);
  assert.equal(ignored(path.join(ROOT, "src")), false);
  assert.equal(ignored(path.join(ROOT, "src", "a.ts")), false);
});

test("heavy segments are ignored at any depth", () => {
  const ignored = buildWatchIgnored(ROOT, HEAVY, []);
  assert.equal(ignored(path.join(ROOT, "node_modules")), true);
  assert.equal(ignored(path.join(ROOT, "node_modules", "react", "x.js")), true);
  assert.equal(ignored(path.join(ROOT, "packages", "x", "dist", "b.js")), true);
});

test("gitignore rules are respected, negation included", () => {
  const rules = parseGitignore("logs/\ntemp/*\n!important.dat\n");
  const ignored = buildWatchIgnored(ROOT, HEAVY, rules);
  assert.equal(ignored(path.join(ROOT, "logs", "a.log")), true);
  assert.equal(ignored(path.join(ROOT, "temp", "cache.dat")), true);
  assert.equal(ignored(path.join(ROOT, "temp", "important.dat")), false);
  assert.equal(ignored(path.join(ROOT, "src", "a.ts")), false);
});

test("paths outside the root are ignored", () => {
  const ignored = buildWatchIgnored(ROOT, HEAVY, []);
  assert.equal(ignored(path.resolve(ROOT, "..", "elsewhere", "x.ts")), true);
});
