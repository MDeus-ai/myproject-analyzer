import test from "node:test";
import assert from "node:assert/strict";
import {
  getTextContent,
  peekTextContent,
  evictTextContent,
  hydrateFilesForExport,
} from "./content.ts";
import { setPathTextReader } from "./contentReader.ts";
import { MAX_TEXT_READ_SIZE } from "./codeAnalyzer.ts";
import type { ProcessedFile } from "./types.ts";

let counter = 0;
function makeFile(over: Partial<ProcessedFile> = {}): ProcessedFile {
  counter++;
  return {
    id: `t${counter}`,
    name: "file.ts",
    originalName: "file.ts",
    flattenedName: "file.ts",
    relativePath: "proj/file.ts",
    pathSegments: ["proj", "file.ts"],
    directoryPath: "",
    size: 10,
    type: "text/typescript",
    extension: "ts",
    lastModified: 1700000000000,
    ...over,
  };
}

/** Typed to satisfy BlobPart on modern TS (Uint8Array<ArrayBuffer>). */
function bigBlob(length: number): Blob {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  return new Blob([bytes]);
}

test("returns pre-populated textContent without touching the source", async () => {
  const file = makeFile({
    textContent: "already here",
    blob: {
      size: 5,
      text() {
        throw new Error("must not read");
      },
    } as unknown as Blob,
  });
  assert.equal(await getTextContent(file), "already here");
});

test("hydrates text from a blob source on first access, then caches", async () => {
  const file = makeFile({ blob: new Blob(["const x = 1;\n"]) });
  assert.equal(peekTextContent(file), undefined);
  assert.equal(await getTextContent(file), "const x = 1;\n");
  assert.equal(peekTextContent(file), "const x = 1;\n"); // cached on the file
});

test("returns undefined for oversized blobs (over the text read limit)", async () => {
  const file = makeFile({ blob: bigBlob(MAX_TEXT_READ_SIZE + 1) });
  assert.equal(await getTextContent(file), undefined);
  assert.equal(peekTextContent(file), undefined);
});

test("reads path-backed files through the registered PathTextReader", async () => {
  const calls: string[][] = [];
  setPathTextReader({
    readPathText: async (abs, name, mime) => {
      calls.push([abs, name, mime]);
      return abs === "/proj/src/a.ts" ? "export const a = 1;\n" : undefined;
    },
  });
  try {
    const file = makeFile({
      name: "a.ts",
      source: { kind: "path", absolutePath: "/proj/src/a.ts" },
    });
    assert.equal(await getTextContent(file), "export const a = 1;\n");
    assert.deepEqual(calls, [["/proj/src/a.ts", "a.ts", "text/typescript"]]);
  } finally {
    setPathTextReader(null);
  }
});

test("path-backed file with no registered reader resolves undefined", async () => {
  setPathTextReader(null);
  const file = makeFile({
    source: { kind: "path", absolutePath: "/proj/src/a.ts" },
  });
  assert.equal(await getTextContent(file), undefined);
});

test("evictTextContent clears re-readable content and getTextContent re-reads", async () => {
  let reads = 0;
  setPathTextReader({
    readPathText: async () => {
      reads++;
      return "from disk";
    },
  });
  try {
    const file = makeFile({
      source: { kind: "path", absolutePath: "/proj/b.ts" },
    });
    await getTextContent(file);
    assert.equal(reads, 1);
    assert.equal(evictTextContent(file), true);
    assert.equal(peekTextContent(file), undefined);
    await getTextContent(file);
    assert.equal(reads, 2); // re-read after eviction
  } finally {
    setPathTextReader(null);
  }
});

test("evictTextContent refuses files with no re-readable source", async () => {
  const file = makeFile({ textContent: "keep me" }); // no source, no blob
  assert.equal(evictTextContent(file), false);
  assert.equal(peekTextContent(file), "keep me");
});

test("hydrateFilesForExport fills pending files and reports progress", async () => {
  const files = [
    makeFile({ textContent: "already hydrated" }), // not pending
    makeFile({ blob: new Blob(["from blob"]) }),
    makeFile({}), // no source at all — not pending
  ];
  const progress: Array<[number, number]> = [];
  const result = await hydrateFilesForExport(files, (done, total) =>
    progress.push([done, total]),
  );
  assert.equal(result.hydrated, 1);
  assert.equal(result.skipped, 0);
  assert.equal(peekTextContent(files[1]), "from blob");
  assert.deepEqual(progress.at(-1), [1, 1]);
});
