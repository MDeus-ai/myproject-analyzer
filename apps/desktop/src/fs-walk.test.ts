import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { walkFiles } from "./fs-walk.ts";

async function makeTree(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "walk-"));
  await mkdir(path.join(root, "src", "deep"), { recursive: true });
  await mkdir(path.join(root, "node_modules", "junk"), { recursive: true });
  await writeFile(path.join(root, "package.json"), "{}");
  await writeFile(path.join(root, "src", "a.ts"), "export {};\n");
  await writeFile(path.join(root, "src", "deep", "b.ts"), "export {};\n");
  await writeFile(path.join(root, "node_modules", "junk", "x.js"), "x");
  return root;
}

test("walks every file with posix relative paths and absolute paths", async (t) => {
  const root = await makeTree();
  t.after(() => rm(root, { recursive: true, force: true }));

  const entries = await walkFiles(root);
  assert.deepEqual(entries.map((e) => e.relPath).sort(), [
    "node_modules/junk/x.js",
    "package.json",
    "src/a.ts",
    "src/deep/b.ts",
  ]);
  for (const e of entries) {
    assert.ok(path.isAbsolute(e.absPath));
    assert.ok(e.size >= 0);
    assert.ok(e.mtimeMs > 0);
  }
});

test("respects the maxFiles cap", async (t) => {
  const root = await makeTree();
  t.after(() => rm(root, { recursive: true, force: true }));
  const entries = await walkFiles(root, { maxFiles: 2 });
  assert.equal(entries.length, 2);
});

test("symlink loops terminate", async (t) => {
  const root = await makeTree();
  t.after(() => rm(root, { recursive: true, force: true }));
  try {
    await symlink(
      path.join(root, "src"),
      path.join(root, "src", "loop"),
      "dir",
    );
  } catch {
    t.skip("symlink creation needs elevation on Windows");
    return;
  }
  const entries = await walkFiles(root);
  assert.ok(entries.length < 100); // terminated; exact count varies
});
