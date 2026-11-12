import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { planApplyChanges } from "./apply-plan.ts";

const ROOT = path.resolve("proj");

const contained = (abs: string): boolean => {
  const rel = path.relative(ROOT, abs);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
};

test("every planned write stays inside the root", () => {
  const { plan, errors } = planApplyChanges(ROOT, [
    { path: "src/a.ts", action: "modify", content: "x" },
    { path: "../../etc/passwd", action: "modify", content: "x" },
    { path: "/absolute/lead.ts", action: "create", content: "x" },
    { path: "", action: "modify", content: "x" },
    { path: "src/b.ts", action: "nope" as never, content: "x" },
  ]);

  // empty path + unknown action rejected
  assert.ok(errors.some((e) => e.includes("empty path")));
  assert.ok(errors.some((e) => e.includes("unknown action")));

  // everything that survived is contained
  assert.ok(plan.length > 0);
  for (const item of plan) {
    assert.ok(contained(item.abs), `escaped root: ${item.abs}`);
  }

  // traversal was sanitized to a safe relative path, not executed
  const passwd = plan.find((p) => p.rel.includes("passwd"));
  assert.ok(passwd);
  assert.equal(passwd.rel, "etc/passwd");

  const lead = plan.find((p) => p.rel.includes("lead.ts"));
  assert.equal(lead?.rel, "absolute/lead.ts");
});

test("windows-style separators and drive-letter escapes are contained", () => {
  const { plan } = planApplyChanges(ROOT, [
    { path: "src\\win\\style.ts", action: "create", content: "x" },
    { path: "C:/Windows/evil.dll", action: "create", content: "x" },
  ]);
  assert.equal(plan[0].rel, "src/win/style.ts");
  for (const item of plan) {
    assert.ok(contained(item.abs), `escaped root: ${item.abs}`);
  }
});

test("missing content defaults to empty string", () => {
  const { plan } = planApplyChanges(ROOT, [
    { path: "src/a.ts", action: "create", content: undefined as never },
  ]);
  assert.equal(plan[0].content, "");
});
