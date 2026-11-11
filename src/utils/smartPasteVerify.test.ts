import test from "node:test";
import assert from "node:assert/strict";
import {
  verifySmartPaste,
  countParams,
  countCallArgs,
} from "./smartPasteVerify";
import { parseSmartPasteResponse } from "./smartPaste";
import { buildCodebaseDependencyGraph } from "./depLenz";
import type { ProcessedFile } from "../types";

const MATH = `export function add(a: number, b: number): number {
  return a + b;
}

export function calculateTotal(items: number[]): number {
  let sum = 0;
  for (const item of items) {
    sum = add(sum, item);
  }
  return sum;
}
`;

const CARD = `import { calculateTotal } from "../utils/mathUtils";

export function InvoiceCard({ prices }: { prices: number[] }) {
  const total = calculateTotal(prices);
  return <div>{total}</div>;
}
`;

const PKG = `{ "dependencies": { "react": "^19.0.0" } }`;

const makeFiles = (): ProcessedFile[] => [
  {
    id: "m1",
    name: "mathUtils.ts",
    originalName: "mathUtils.ts",
    flattenedName: "mathUtils.ts",
    relativePath: "src/utils/mathUtils.ts",
    pathSegments: ["src", "utils", "mathUtils.ts"],
    directoryPath: "src/utils",
    size: 1,
    type: "text/typescript",
    extension: "ts",
    lastModified: 1,
    textContent: MATH,
  },
  {
    id: "m2",
    name: "InvoiceCard.tsx",
    originalName: "InvoiceCard.tsx",
    flattenedName: "InvoiceCard.tsx",
    relativePath: "src/components/InvoiceCard.tsx",
    pathSegments: ["src", "components", "InvoiceCard.tsx"],
    directoryPath: "src/components",
    size: 1,
    type: "text/typescript",
    extension: "tsx",
    lastModified: 2,
    textContent: CARD,
  },
  {
    id: "m3",
    name: "package.json",
    originalName: "package.json",
    flattenedName: "package.json",
    relativePath: "package.json",
    pathSegments: ["package.json"],
    directoryPath: "",
    size: 1,
    type: "application/json",
    extension: "json",
    lastModified: 3,
    textContent: PKG,
  },
];

const block = (path: string, action: string, content: string) =>
  `<<<SMART_PASTE_FILE path="${path}" action="${action}">>>\n${content}\n<<<END_SMART_PASTE_FILE>>>`;

test("clean modify passes all stages with zero errors", () => {
  const files = makeFiles();
  const analysis = buildCodebaseDependencyGraph(files);
  const newMath = MATH.replace(
    "return a + b;",
    "// [SMART-PASTE] handle floats\n  return a + b + 0;",
  );
  const parse = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", newMath),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: true,
  });
  assert.equal(report.errorCount, 0, JSON.stringify(report.findings, null, 2));
  assert.ok(report.preservedCount >= 1);
});

test("stage 1: truncation phrases and line-drop are hard errors", () => {
  const files = makeFiles();
  // Pad the math file past the verifier's 20-line threshold with comment
  // lines (they count as lines but don't extract as symbols), so the
  // line-drop heuristic — guarded to files of 20+ lines — can trigger.
  files[0] = {
    ...files[0],
    textContent:
      MATH +
      Array.from({ length: 12 }, (_, i) => `// filler line ${i}`).join("\n") +
      "\n",
  };
  const analysis = buildCodebaseDependencyGraph(files);
  const truncated = `export function calculateTotal(items: number[]): number {
  // ... rest unchanged
}`;
  const parse = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", truncated),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: false,
  });
  const messages = report.findings.map((f) => f.message).join("\n");
  assert.ok(messages.includes("Truncation placeholder"));
  assert.ok(messages.includes("lost"));
  assert.ok(report.errorCount >= 2);
});

test("stages 2+4: removed export flags callers that weren't updated", () => {
  const files = makeFiles();
  const analysis = buildCodebaseDependencyGraph(files);
  const withoutAdd = MATH.replace(
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n\n",
    "",
  ).replace("sum = add(sum, item);", "sum = sum + item;");
  const parse = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", withoutAdd),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: false,
  });
  assert.ok(
    report.findings.some((f) => f.stage === 2 && f.message.includes('"add"')),
  );
  // calculateTotal's contract unchanged, so InvoiceCard isn't a victim here —
  // but remove calculateTotal instead and it must appear:
  const withoutCalc = MATH.replace(
    /export function calculateTotal[\s\S]*$/,
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  );
  const parse2 = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", withoutCalc),
    files,
  );
  const report2 = verifySmartPaste(parse2, files, analysis, {
    markersExpected: false,
  });
  assert.ok(
    report2.mustUpdate.some((m) => m.file === "src/components/InvoiceCard.tsx"),
    `expected InvoiceCard in mustUpdate: ${JSON.stringify(report2.mustUpdate)}`,
  );
});

test("stage 3: unresolved imports and unknown packages are flagged", () => {
  const files = makeFiles();
  const analysis = buildCodebaseDependencyGraph(files);
  const bad = `import { nope } from "./doesNotExist";
import leftpad from "leftpad";
${MATH}`;
  const parse = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", bad),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: false,
  });
  assert.ok(
    report.findings.some(
      (f) => f.stage === 3 && f.message.includes("does not resolve"),
    ),
  );
  assert.ok(
    report.findings.some((f) => f.stage === 3 && f.message.includes("leftpad")),
  );
});

test("stage 2: dropped import still in use is an error", () => {
  const files = makeFiles();
  const analysis = buildCodebaseDependencyGraph(files);
  // Remove the import line but keep using calculateTotal.
  const noImport = CARD.replace(
    'import { calculateTotal } from "../utils/mathUtils";\n\n',
    "",
  );
  const parse = parseSmartPasteResponse(
    block("src/components/InvoiceCard.tsx", "modify", noImport),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: false,
  });
  assert.ok(
    report.findings.some(
      (f) =>
        f.stage === 2 &&
        f.message.includes('Import "calculateTotal" was dropped'),
    ),
  );
});

test("stage 5: edits without markers are flagged when markers were expected", () => {
  const files = makeFiles();
  const analysis = buildCodebaseDependencyGraph(files);
  const silent = MATH.replace("return a + b;", "return a + b + 1;");
  const parse = parseSmartPasteResponse(
    block("src/utils/mathUtils.ts", "modify", silent),
    files,
  );
  const report = verifySmartPaste(parse, files, analysis, {
    markersExpected: true,
  });
  assert.ok(
    report.findings.some(
      (f) => f.stage === 5 && f.message.includes("silent edits"),
    ),
  );
});

test("arity helpers: countParams and countCallArgs", () => {
  const { total, required } = countParams("add(a: number, b?: number, c = 3)");
  assert.equal(total, 3);
  assert.equal(required, 1);
  assert.deepEqual(
    countCallArgs("const x = add(1, 2); add(1);", "add"),
    [2, 1],
  );
});
