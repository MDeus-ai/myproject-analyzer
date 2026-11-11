import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createFlatZip } from "./zipExporter.ts";
import { setPathTextReader } from "./contentReader.ts";
import type { ProcessedFile } from "./types.ts";

let counter = 0;
function makeFile(over: Partial<ProcessedFile> = {}): ProcessedFile {
  counter++;
  return {
    id: `z${counter}`,
    name: "file.txt",
    originalName: "file.txt",
    flattenedName: "file.txt",
    relativePath: "proj/file.txt",
    pathSegments: ["proj", "file.txt"],
    directoryPath: "",
    size: 5,
    type: "text/plain",
    extension: "txt",
    lastModified: 1700000000000,
    ...over,
  };
}

test("createFlatZip writes text and blob files flat at the archive root", async () => {
  const bytes = new Uint8Array(new ArrayBuffer(3));
  bytes.set([1, 2, 3]);
  const blob = await createFlatZip([
    makeFile({ name: "a.txt", flattenedName: "a.txt", textContent: "hello" }),
    makeFile({
      name: "b.bin",
      flattenedName: "b.bin",
      blob: new Blob([bytes]),
    }),
  ]);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.equal(await zip.file("a.txt")!.async("string"), "hello");
  assert.ok(zip.file("b.bin"));
  assert.equal(zip.file("proj/a.txt"), null); // no directory entries
});

test("createFlatZip hydrates path-backed files via the registered reader", async () => {
  setPathTextReader({
    readPathText: async (abs) =>
      abs === "/proj/src/c.ts" ? "export const c = 1;\n" : undefined,
  });
  try {
    const blob = await createFlatZip([
      makeFile({
        name: "c.ts",
        flattenedName: "c.ts",
        source: { kind: "path", absolutePath: "/proj/src/c.ts" },
      }),
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    assert.equal(
      await zip.file("c.ts")!.async("string"),
      "export const c = 1;\n",
    );
  } finally {
    setPathTextReader(null);
  }
});

test("createFlatZip emits progress within a 0-100 range", async () => {
  const events: number[] = [];
  const blob = await createFlatZip([makeFile({ textContent: "x" })], (p) =>
    events.push(p.percent),
  );
  assert.ok(blob.size > 0);
  assert.ok(events.length > 0);
  assert.ok(events.every((n) => n >= 0 && n <= 100));
});
