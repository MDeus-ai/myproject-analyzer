/**
 * Unit tests for the Smart Paste protocol (parser / stripper / prompt builder).
 * Run with: npx --yes tsx --test src/utils/smartPaste.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSmartPasteInstructions,
  createSmartPasteZip,
  parseSmartPasteResponse,
  sanitizeSmartPastePath,
  stripSmartPasteMarkers,
  SMART_PASTE_MARKER,
} from "@myproject/core/smartPaste";
import type { ProcessedFile } from "@myproject/core/types";

const stubFile = (relativePath: string): ProcessedFile =>
  ({ relativePath }) as unknown as ProcessedFile;

const SAMPLE_TSX = [
  'import React from "react";',
  "",
  "// [SMART-PASTE] added greeting prop",
  "export function Hello({ name }: { name: string }) {",
  "  return <h1>Hello {name}</h1>;",
  "}",
].join("\n");

test("parses a single modify block and counts markers", () => {
  const response = [
    '<<<SMART_PASTE_FILE path="src/Hello.tsx" action="modify">>>',
    SAMPLE_TSX,
    "<<<END_SMART_PASTE_FILE>>>",
  ].join("\n");

  const result = parseSmartPasteResponse(response, [stubFile("src/Hello.tsx")]);
  assert.equal(result.changes.length, 1);
  const change = result.changes[0];
  assert.equal(change.path, "src/Hello.tsx");
  assert.equal(change.action, "modify");
  assert.equal(change.content, SAMPLE_TSX);
  assert.equal(change.markerCount, 1);
  assert.equal(change.existsInProject, true);
  assert.equal(result.warnings.length, 0);
});

test("parses modify / create / delete blocks in one response", () => {
  const response = [
    '<<<SMART_PASTE_FILE path="src/a.ts" action="modify">>>',
    "export const a = 1;",
    "<<<END_SMART_PASTE_FILE>>>",
    '<<<SMART_PASTE_FILE path="src/new.ts" action="create">>>',
    "export const fresh = true;",
    "<<<END_SMART_PASTE_FILE>>>",
    '<<<SMART_PASTE_FILE path="src/old.ts" action="delete">>>',
    "<<<END_SMART_PASTE_FILE>>>",
  ].join("\n");

  const result = parseSmartPasteResponse(response, [
    stubFile("src/a.ts"),
    stubFile("src/old.ts"),
  ]);

  assert.equal(result.changes.length, 3);
  assert.deepEqual(
    result.changes.map((c) => c.action),
    ["modify", "create", "delete"],
  );
  assert.equal(result.changes[1].existsInProject, false);
  assert.equal(result.changes[2].content, "");
  assert.equal(result.warnings.length, 0);
});

test("tolerates markdown fences wrapped around blocks", () => {
  const response = [
    "Here is the change:",
    "```",
    '<<<SMART_PASTE_FILE path="src/a.ts" action="modify">>>',
    "```ts",
    "export const a = 2;",
    "```",
    "<<<END_SMART_PASTE_FILE>>>",
    "```",
  ].join("\n");

  const result = parseSmartPasteResponse(response);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].content, "export const a = 2;");
});

test("last block wins for duplicate paths, with a warning", () => {
  const response = [
    '<<<SMART_PASTE_FILE path="src/a.ts" action="modify">>>',
    "export const v = 1;",
    "<<<END_SMART_PASTE_FILE>>>",
    '<<<SMART_PASTE_FILE path="src/a.ts" action="modify">>>',
    "export const v = 2;",
    "<<<END_SMART_PASTE_FILE>>>",
  ].join("\n");

  const result = parseSmartPasteResponse(response);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].content, "export const v = 2;");
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes("duplicate")));
});

test("unknown action falls back to modify with a warning", () => {
  const response = [
    '<<<SMART_PASTE_FILE path="src/a.ts" action="update">>>',
    "export const a = 1;",
    "<<<END_SMART_PASTE_FILE>>>",
  ].join("\n");
  const result = parseSmartPasteResponse(response);
  assert.equal(result.changes[0].action, "modify");
  assert.ok(result.warnings.some((w) => w.includes("update")));
});

test("warns when no file blocks are present", () => {
  const result = parseSmartPasteResponse("Sorry, I cannot help with that.");
  assert.equal(result.changes.length, 0);
  assert.ok(result.warnings.length > 0);
});

test("modify on a non-existent path is flagged", () => {
  const response = [
    '<<<SMART_PASTE_FILE path="src/ghost.ts" action="modify">>>',
    "export const g = 0;",
    "<<<END_SMART_PASTE_FILE>>>",
  ].join("\n");
  const result = parseSmartPasteResponse(response, [stubFile("src/real.ts")]);
  assert.equal(result.changes[0].existsInProject, false);
  assert.ok(result.warnings.some((w) => w.includes("ghost.ts")));
});

test("sanitizeSmartPastePath strips traversal and leading slashes", () => {
  assert.equal(sanitizeSmartPastePath("../../etc/passwd"), "etc/passwd");
  assert.equal(sanitizeSmartPastePath("/src/a.ts"), "src/a.ts");
  assert.equal(sanitizeSmartPastePath("src\\win\\path.ts"), "src/win/path.ts");
});

test("stripSmartPasteMarkers removes full-line and inline markers", () => {
  const input = [
    "// [SMART-PASTE] added handler",
    "const x = 1;",
    "const y = 2; // [SMART-PASTE] tweaked",
    "{/* [SMART-PASTE] new button */}",
    "/* [SMART-PASTE] recolor */",
    "<!-- [SMART-PASTE] extra section -->",
    "body { color: red; }",
  ].join("\n");

  const out = stripSmartPasteMarkers(input);
  assert.equal(
    out,
    ["const x = 1;", "const y = 2;", "body { color: red; }"].join("\n"),
  );
});

test("prompt contract embeds the dependency tree", () => {
  const text = buildSmartPasteInstructions({
    targetName: "TreeView",
    targetFilePath: "src/components/Tree.tsx",
    targetSignature: "export function TreeView(props: Props)",
    callers: [
      {
        name: "App",
        filePath: "src/App.tsx",
        signature: "export default function App()",
      },
    ],
    callees: [
      {
        name: "formatBytes",
        filePath: "src/utils/fileHelpers.ts",
        signature: "formatBytes(n: number): string",
      },
    ],
    externalPackages: ["react", "jszip"],
    includeMarkers: true,
  });

  assert.ok(text.includes("SMART PASTE — STRUCTURED OUTPUT CONTRACT"));
  assert.ok(text.includes('action="modify"'));
  assert.ok(text.includes("App") && text.includes("src/App.tsx"));
  assert.ok(text.includes("formatBytes"));
  assert.ok(text.includes("react") && text.includes("jszip"));
  assert.ok(text.includes(SMART_PASTE_MARKER));
});

test("markers-disabled variant omits the marker request", () => {
  const text = buildSmartPasteInstructions({
    targetName: "fn",
    targetFilePath: "src/fn.ts",
    callers: [],
    callees: [],
    externalPackages: [],
    includeMarkers: false,
  });
  assert.ok(text.includes("DISABLED"));
});

test("createSmartPasteZip preserves folders, strips markers, skips deletes", async () => {
  const blob = await createSmartPasteZip(
    [
      {
        path: "src/a.ts",
        action: "modify",
        content: "// [SMART-PASTE] x\nexport const a = 1;",
        markerCount: 1,
        existsInProject: true,
      },
      {
        path: "src/deleted.ts",
        action: "delete",
        content: "",
        markerCount: 0,
        existsInProject: true,
      },
    ],
    { stripMarkers: true },
  );

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const aFile = zip.file("src/a.ts");
  assert.ok(aFile, "src/a.ts should exist in the zip");
  const content = await aFile!.async("string");
  assert.ok(!content.includes(SMART_PASTE_MARKER));
  assert.ok(content.includes("export const a = 1;"));
  assert.equal(zip.file("src/deleted.ts"), null);
  assert.ok(zip.file("SMART_PASTE_MANIFEST.txt") !== null);
});
