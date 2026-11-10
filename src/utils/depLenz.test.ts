import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSymbolsFromFile,
  extractInvokedNames,
  extractFileImports,
  resolveRelativeImportPath,
  buildCodebaseDependencyGraph,
  searchCodebase,
  extractSurgicalContext,
  validateFileSyntax,
} from "./depLenz";
import { ProcessedFile } from "../types";

const mockFiles: ProcessedFile[] = [
  {
    id: "f1",
    name: "mathUtils.ts",
    originalName: "mathUtils.ts",
    flattenedName: "mathUtils.ts",
    relativePath: "src/utils/mathUtils.ts",
    pathSegments: ["src", "utils", "mathUtils.ts"],
    directoryPath: "src/utils",
    size: 200,
    type: "text/typescript",
    extension: "ts",
    lastModified: 1700000000000,
    textContent: `
export function add(a: number, b: number): number {
  return a + b;
}

export const multiply = (a: number, b: number) => {
  return a * b;
};

export function calculateTotal(items: number[]): number {
  let sum = 0;
  for (const item of items) {
    sum = add(sum, item);
  }
  return sum;
}
`,
  },
  {
    id: "f2",
    name: "InvoiceCard.tsx",
    originalName: "InvoiceCard.tsx",
    flattenedName: "InvoiceCard.tsx",
    relativePath: "src/components/InvoiceCard.tsx",
    pathSegments: ["src", "components", "InvoiceCard.tsx"],
    directoryPath: "src/components",
    size: 400,
    type: "text/typescript",
    extension: "tsx",
    lastModified: 1700000001000,
    textContent: `
import React from "react";
import { calculateTotal, multiply } from "../utils/mathUtils";

export function InvoiceCard({ prices, taxRate }: { prices: number[]; taxRate: number }) {
  const subtotal = calculateTotal(prices);
  const tax = multiply(subtotal, taxRate);
  return (
    <div className="card">
      <span>Subtotal: {subtotal}</span>
      <span>Tax: {tax}</span>
    </div>
  );
}
`,
  },
  {
    id: "f3",
    name: "useInvoice.ts",
    originalName: "useInvoice.ts",
    flattenedName: "useInvoice.ts",
    relativePath: "src/hooks/useInvoice.ts",
    pathSegments: ["src", "hooks", "useInvoice.ts"],
    directoryPath: "src/hooks",
    size: 300,
    type: "text/typescript",
    extension: "ts",
    lastModified: 1700000002000,
    textContent: `
import { calculateTotal } from "../utils/mathUtils";

export function useInvoice(items: number[]) {
  const total = calculateTotal(items);
  return { total };
}
`,
  },
];

test("extractSymbolsFromFile identifies functions, arrow functions, components and hooks", () => {
  const symbols = extractSymbolsFromFile(mockFiles[0].textContent!, mockFiles[0].relativePath, mockFiles[0].name);
  assert.equal(symbols.length, 3);

  const addSym = symbols.find((s) => s.name === "add");
  assert.ok(addSym);
  assert.equal(addSym.kind, "function");
  assert.equal(addSym.isExported, true);

  const multSym = symbols.find((s) => s.name === "multiply");
  assert.ok(multSym);
  assert.equal(multSym.kind, "function");

  const calcSym = symbols.find((s) => s.name === "calculateTotal");
  assert.ok(calcSym);
  assert.ok(calcSym.calls.includes("add"));

  // Check component detection
  const cardSymbols = extractSymbolsFromFile(mockFiles[1].textContent!, mockFiles[1].relativePath, mockFiles[1].name);
  const comp = cardSymbols.find((s) => s.name === "InvoiceCard");
  assert.ok(comp);
  assert.equal(comp.kind, "component");

  // Check hook detection
  const hookSymbols = extractSymbolsFromFile(mockFiles[2].textContent!, mockFiles[2].relativePath, mockFiles[2].name);
  const hook = hookSymbols.find((s) => s.name === "useInvoice");
  assert.ok(hook);
  assert.equal(hook.kind, "hook");
});

test("extractInvokedNames discovers called functions and JSX elements", () => {
  const body = `
    const a = add(1, 2);
    const b = calculateTotal([a]);
    return <InvoiceCard prices={[a, b]} />;
  `;
  const invoked = extractInvokedNames(body, "myFunction");
  assert.ok(invoked.includes("add"));
  assert.ok(invoked.includes("calculateTotal"));
  assert.ok(invoked.includes("InvoiceCard"));
  assert.ok(!invoked.includes("myFunction"));
});

test("extractFileImports and resolveRelativeImportPath parse imports correctly", () => {
  const imports = extractFileImports(mockFiles[1].textContent!, mockFiles[1].relativePath, mockFiles);
  assert.ok(imports.length >= 2);

  const mathImp = imports.find((i) => i.sourcePath === "../utils/mathUtils");
  assert.ok(mathImp);
  assert.equal(mathImp.isRelative, true);
  assert.equal(mathImp.resolvedFilePath, "src/utils/mathUtils.ts");
  assert.ok(mathImp.importedNames.some((n) => n.name === "calculateTotal"));
  assert.ok(mathImp.importedNames.some((n) => n.name === "multiply"));

  const reactImp = imports.find((i) => i.sourcePath === "react");
  assert.ok(reactImp);
  assert.equal(reactImp.isRelative, false);
});

test("buildCodebaseDependencyGraph creates full bi-directional callee & caller graph", () => {
  const result = buildCodebaseDependencyGraph(mockFiles);

  assert.equal(result.totalFunctions, 5); // add, multiply, calculateTotal, InvoiceCard, useInvoice
  assert.equal(result.totalComponents, 1);
  assert.equal(result.totalHooks, 1);

  // Check calculateTotal node
  const calcNode = result.nodesMap.get("src/utils/mathUtils.ts:calculateTotal");
  assert.ok(calcNode);
  // calculateTotal calls add (callee)
  assert.ok(calcNode.dependencies.some((d) => d.symbol.name === "add"));
  // calculateTotal is called by InvoiceCard and useInvoice (callers / dependents)
  assert.ok(calcNode.dependents.some((d) => d.symbol.name === "InvoiceCard"));
  assert.ok(calcNode.dependents.some((d) => d.symbol.name === "useInvoice"));

  // Check impact radius
  assert.ok(calcNode.impactRadius >= 3);
  assert.equal(calcNode.impactLevel, "medium");
});

test("searchCodebase finds keyword matches and assigns enclosing symbols", () => {
  const analysis = buildCodebaseDependencyGraph(mockFiles);
  const matches = searchCodebase(mockFiles, { query: "taxRate" }, analysis.fileSymbolsMap);

  assert.ok(matches.length > 0);
  const match = matches[0];
  assert.equal(match.fileName, "InvoiceCard.tsx");
  assert.ok(match.enclosingSymbol);
  assert.equal(match.enclosingSymbol.name, "InvoiceCard");
});

test("extractSurgicalContext generates complete bundle for LLM targeting a symbol", () => {
  const analysis = buildCodebaseDependencyGraph(mockFiles);
  const bundle = extractSurgicalContext("src/utils/mathUtils.ts:calculateTotal", analysis);

  assert.ok(bundle);
  assert.equal(bundle.targetSymbol.name, "calculateTotal");
  assert.ok(bundle.callees.some((c) => c.name === "add"));
  assert.ok(bundle.callers.some((c) => c.name === "InvoiceCard"));
  assert.ok(bundle.callers.some((c) => c.name === "useInvoice"));

  // Formatted prompt should include sections
  assert.ok(bundle.formattedPrompt.includes("DEPLENZ SURGICAL CONTEXT FOR LLM"));
  assert.ok(bundle.formattedPrompt.includes("TARGET IMPLEMENTATION (calculateTotal)"));
  assert.ok(bundle.formattedPrompt.includes("DIRECT DEPENDENCIES"));
  assert.ok(bundle.formattedPrompt.includes("DIRECT CALLERS"));
  assert.ok(bundle.estimatedTokens > 0);
});

test("validateFileSyntax identifies unclosed delimiters, mismatched brackets and JSON syntax errors", () => {
  // 1. Clean code produces zero diagnostics
  const cleanTs = `export function greet(name: string) { return "hello " + name; }`;
  assert.equal(validateFileSyntax(cleanTs, "src/greet.ts", "greet.ts").length, 0);

  // 2. Unclosed brace
  const unclosedBrace = `
export function badFunc() {
  if (true) {
    return 42;
  // Missing closing brace
`;
  const unclosedDiags = validateFileSyntax(unclosedBrace, "src/bad.ts", "bad.ts");
  assert.ok(unclosedDiags.length > 0);
  assert.equal(unclosedDiags[0].category, "unclosed-delimiter");
  assert.equal(unclosedDiags[0].severity, "error");

  // 3. Mismatched delimiter (e.g. ( closed with ] or })
  const mismatched = `
export function mismatch() {
  const arr = [1, 2, (3 + 4];
  return arr;
}
`;
  const mismatchDiags = validateFileSyntax(mismatched, "src/mismatch.ts", "mismatch.ts");
  assert.ok(mismatchDiags.length > 0);
  assert.equal(mismatchDiags[0].category, "mismatched-delimiter");

  // 4. Unexpected closing delimiter
  const unexpectedClosing = `
export function extraClose() {
  return true;
}}
`;
  const unexpectedDiags = validateFileSyntax(unexpectedClosing, "src/extra.ts", "extra.ts");
  assert.ok(unexpectedDiags.length > 0);
  assert.equal(unexpectedDiags[0].category, "unexpected-delimiter");

  // 5. Unterminated template literal
  const unterminatedTpl = "const str = `hello world;\nconst next = 123;";
  const tplDiags = validateFileSyntax(unterminatedTpl, "src/tpl.ts", "tpl.ts");
  assert.ok(tplDiags.length > 0);
  assert.equal(tplDiags[0].category, "unterminated-literal");

  // 6. Malformed JSON
  const invalidJson = `{ "name": "test", "items": [1, 2, }`;
  const jsonDiags = validateFileSyntax(invalidJson, "package.json", "package.json");
  assert.ok(jsonDiags.length > 0);
  assert.equal(jsonDiags[0].category, "json-syntax");
  assert.equal(jsonDiags[0].severity, "error");
});

test("buildCodebaseDependencyGraph surfaces syntax diagnostics and warns user without crashing", () => {
  const filesWithBrokenCode: ProcessedFile[] = [
    ...mockFiles,
    {
      id: "broken-1",
      name: "brokenUtil.ts",
      originalName: "brokenUtil.ts",
      flattenedName: "brokenUtil.ts",
      relativePath: "src/utils/brokenUtil.ts",
      pathSegments: ["src", "utils", "brokenUtil.ts"],
      directoryPath: "src/utils",
      size: 150,
      type: "text/typescript",
      extension: "ts",
      lastModified: 1700000003000,
      textContent: `
export function broken() {
  if (true) {
    return "unclosed";
`,
    },
    {
      id: "broken-json",
      name: "config.json",
      originalName: "config.json",
      flattenedName: "config.json",
      relativePath: "config.json",
      pathSegments: ["config.json"],
      directoryPath: "",
      size: 80,
      type: "application/json",
      extension: "json",
      lastModified: 1700000004000,
      textContent: `{ "apiKey": "xyz", trailing, }`,
    },
  ];

  const result = buildCodebaseDependencyGraph(filesWithBrokenCode);
  assert.ok(result.diagnostics.length >= 2);
  assert.ok(result.totalSyntaxWarnings >= 2);
  assert.ok(result.filesWithSyntaxErrors.length >= 2);

  // Still successfully mapped valid symbols from mockFiles
  assert.ok(result.nodesMap.has("src/utils/mathUtils.ts:calculateTotal"));
});
