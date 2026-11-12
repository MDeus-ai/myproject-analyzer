import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  isPathUnderAllowedRoots,
  resolveAllowedAssetUrl,
} from "./asset-protocol.ts";

test("resolveAllowedAssetUrl permits files inside picked roots", () => {
  const root = path.resolve("/workspace/my-project");
  const img = path.join(root, "src", "assets", "logo.png");
  const url = `myproject-asset://local?path=${encodeURIComponent(img)}`;

  assert.equal(resolveAllowedAssetUrl(url, [root]), img);
});

test("resolveAllowedAssetUrl blocks traversal and unpicked roots", () => {
  const root = path.resolve("/workspace/my-project");
  const outside = path.resolve("/workspace/other-secret/key.png");
  const traversal = path.join(root, "..", "other-secret", "key.png");

  assert.equal(
    resolveAllowedAssetUrl(
      `myproject-asset://local?path=${encodeURIComponent(outside)}`,
      [root],
    ),
    null,
  );
  assert.equal(
    resolveAllowedAssetUrl(
      `myproject-asset://local?path=${encodeURIComponent(traversal)}`,
      [root],
    ),
    null,
  );
  assert.equal(resolveAllowedAssetUrl("myproject-asset://local", [root]), null);
  assert.equal(resolveAllowedAssetUrl("https://evil.example/a.png", [root]), null);
});

test("isPathUnderAllowedRoots handles empty root set", () => {
  assert.equal(isPathUnderAllowedRoots("/workspace/my-project/a.png", []), false);
});
