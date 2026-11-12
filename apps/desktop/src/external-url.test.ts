import test from "node:test";
import assert from "node:assert/strict";
import { isSafeExternalUrl, isDevServerUrl } from "./external-url.ts";

test("http/https/mailto are safe to open externally", () => {
  assert.equal(isSafeExternalUrl("https://github.com/MDeus-ai"), true);
  assert.equal(isSafeExternalUrl("http://example.com/docs"), true);
  assert.equal(isSafeExternalUrl("mailto:dev@example.com"), true);
});

test("dangerous schemes are denied", () => {
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("file:///C:/Windows/System32"), false);
  assert.equal(isSafeExternalUrl("blob:http://localhost:3000/uuid"), false);
  assert.equal(isSafeExternalUrl("data:text/html,<script>"), false);
  assert.equal(isSafeExternalUrl("ms-word:ofe|u|http://evil/x.doc"), false);
});

test("malformed URLs are denied", () => {
  assert.equal(isSafeExternalUrl("not a url"), false);
  assert.equal(isSafeExternalUrl(""), false);
});

test("dev-server origin match is exact", () => {
  const dev = "http://localhost:3000";
  assert.equal(isDevServerUrl("http://localhost:3000/", dev), true);
  assert.equal(
    isDevServerUrl("http://localhost:3000/src/App.tsx?t=123", dev),
    true,
  );
  // same host, different port → different origin → denied
  assert.equal(isDevServerUrl("http://localhost:3001/", dev), false);
  // https upgrade → denied
  assert.equal(isDevServerUrl("https://localhost:3000/", dev), false);
  // lookalike host → denied
  assert.equal(isDevServerUrl("http://localhost:3000.evil.com/", dev), false);
  assert.equal(isDevServerUrl("not-a-url", dev), false);
});
