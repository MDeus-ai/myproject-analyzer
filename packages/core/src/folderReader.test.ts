import { test } from "node:test";
import assert from "node:assert/strict";
import { readTextIfReadable, sniffTextBytes } from "@myproject/core/folderReader";

/**
 * NOTE: every typed array passed to `new Blob(...)` is declared
 * Uint8Array<ArrayBuffer> explicitly. The default Uint8Array type
 * parameter is ArrayBufferLike (which includes SharedArrayBuffer), and
 * BlobPart only accepts ArrayBufferView<ArrayBuffer> — without the
 * explicit parameter, tsc rejects the constructor call (ts2322).
 */
const makeBlob = (content: string | Uint8Array<ArrayBuffer>): Blob =>
  new Blob([content]);

/** Fills a plain-ArrayBuffer view — typed to satisfy BlobPart. */
const makeBytes = (length: number, fill: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  bytes.fill(fill);
  return bytes;
};

test("BUGFIX: .ts files carry video/mp2t MIME but must be read as text", async () => {
  const blob = makeBlob("export const x = 1;\n");
  assert.equal(
    await readTextIfReadable(blob, "treeBuilder.ts", "video/mp2t"),
    "export const x = 1;\n",
  );
});

test("a real binary renamed to .ts is rejected by the paranoia guard", async () => {
  const bytes = makeBytes(2048, 0x47); // MPEG-TS sync byte ('G')
  bytes[10] = 0; // NUL — decodes to U+0000, which the guard must catch
  const blob = makeBlob(bytes);
  assert.equal(
    await readTextIfReadable(blob, "recording.ts", "video/mp2t"),
    undefined,
  );
});

test("real video file with video MIME is still rejected", async () => {
  const bytes = makeBytes(4096, 0x47);
  bytes[10] = 0;
  const blob = makeBlob(bytes);
  assert.equal(
    await readTextIfReadable(blob, "clip.mp4", "video/mp4"),
    undefined,
  );
});

test("unknown extension + empty MIME falls through to the sniff", async () => {
  const blob = makeBlob("pipeline { stages {} }");
  assert.equal(
    await readTextIfReadable(blob, "Jenkinsfile.dev", ""),
    "pipeline { stages {} }",
  );
});

test("dotfiles survive via filename/extension overrides", async () => {
  const blob = makeBlob("node_modules/\n");
  assert.equal(
    await readTextIfReadable(blob, ".gitignore", ""),
    "node_modules/\n",
  );
});

test(".env family is covered by the basename override", async () => {
  const blob = makeBlob("SECRET=hunter2\n");
  assert.equal(
    await readTextIfReadable(blob, ".env.production", ""),
    "SECRET=hunter2\n",
  );
});

test("sniffTextBytes: NUL → binary, source code → text", () => {
  const nulBytes = makeBytes(4, 105);
  nulBytes[2] = 0;
  assert.equal(sniffTextBytes(nulBytes), false);
  assert.equal(
    sniffTextBytes(new TextEncoder().encode("const a = 1;\n")),
    true,
  );
});
