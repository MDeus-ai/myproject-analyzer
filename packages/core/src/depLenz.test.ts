import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSymbolsFromFile,
  extractInvokedNames,
  extractFileImports,
  extractTypeDeclarations,
  resolveRelativeImportPath,
  buildCodebaseDependencyGraph,
  searchCodebase,
  extractSurgicalContext,
  buildPlanPrompt,
  parsePlanResponse,
  buildPlannedContext,
  validateFileSyntax,
} from "@myproject/core/depLenz";
import { ProcessedFile } from "@myproject/core/types";

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
  const symbols = extractSymbolsFromFile(
    mockFiles[0].textContent!,
    mockFiles[0].relativePath,
    mockFiles[0].name,
  );
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
  const cardSymbols = extractSymbolsFromFile(
    mockFiles[1].textContent!,
    mockFiles[1].relativePath,
    mockFiles[1].name,
  );
  const comp = cardSymbols.find((s) => s.name === "InvoiceCard");
  assert.ok(comp);
  assert.equal(comp.kind, "component");

  // Check hook detection
  const hookSymbols = extractSymbolsFromFile(
    mockFiles[2].textContent!,
    mockFiles[2].relativePath,
    mockFiles[2].name,
  );
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
  const imports = extractFileImports(
    mockFiles[1].textContent!,
    mockFiles[1].relativePath,
    mockFiles,
  );
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

  // Check impact radius (direct callers + direct callees)
  assert.ok(calcNode.impactRadius >= 3);
  assert.equal(calcNode.impactLevel, "medium");
});

test("searchCodebase finds keyword matches and assigns enclosing symbols", () => {
  const analysis = buildCodebaseDependencyGraph(mockFiles);
  const matches = searchCodebase(
    mockFiles,
    { query: "taxRate" },
    analysis.fileSymbolsMap,
  );

  assert.ok(matches.length > 0);
  const match = matches[0];
  assert.equal(match.fileName, "InvoiceCard.tsx");
  assert.ok(match.enclosingSymbol);
  assert.equal(match.enclosingSymbol.name, "InvoiceCard");
});

test("extractSurgicalContext includes full target file, types, map and touched files", () => {
  const analysis = buildCodebaseDependencyGraph(mockFiles);
  const bundle = extractSurgicalContext(
    "src/utils/mathUtils.ts:calculateTotal",
    analysis,
    mockFiles,
    "add tax support",
  );

  assert.ok(bundle);
  assert.equal(bundle.targetSymbol.name, "calculateTotal");
  assert.ok(bundle.callees.some((c) => c.name === "add"));
  assert.ok(bundle.callers.some((c) => c.name === "InvoiceCard"));

  // 2b: complete target file (imports and all), not just the symbol body
  assert.ok(bundle.formattedPrompt.includes("COMPLETE TARGET FILE"));
  assert.ok(bundle.formattedPrompt.includes(mockFiles[0].textContent!.trim()));
  // 3a: annotated project map + touched-files list
  assert.ok(bundle.formattedPrompt.includes("PROJECT MAP"));
  assert.ok(bundle.formattedPrompt.includes("FILES TOUCHED BY THIS CHANGE"));
  // callers/callees sections + task
  assert.ok(bundle.formattedPrompt.includes("UPSTREAM CALLERS"));
  assert.ok(bundle.formattedPrompt.includes("DOWNSTREAM DEPENDENCIES"));
  assert.ok(bundle.formattedPrompt.includes("add tax support"));
  assert.ok(bundle.touchedFiles.includes("src/utils/mathUtils.ts"));
  assert.ok(bundle.touchedFiles.includes("src/components/InvoiceCard.tsx"));
  assert.ok(bundle.estimatedTokens > 0);
});

test("FIX 1a: default imports, barrel re-exports and lazy() register callers", () => {
  const files: ProcessedFile[] = [
    {
      id: "d1",
      name: "Dashboard.tsx",
      originalName: "Dashboard.tsx",
      flattenedName: "Dashboard.tsx",
      relativePath: "src/pages/Dashboard.tsx",
      pathSegments: ["src", "pages", "Dashboard.tsx"],
      directoryPath: "src/pages",
      size: 100,
      type: "text/typescript",
      extension: "tsx",
      lastModified: 1,
      textContent: `
export default function Dashboard() {
  return <main>Dash</main>;
}
`,
    },
    {
      id: "d2",
      name: "Button.tsx",
      originalName: "Button.tsx",
      flattenedName: "Button.tsx",
      relativePath: "src/components/Button.tsx",
      pathSegments: ["src", "components", "Button.tsx"],
      directoryPath: "src/components",
      size: 100,
      type: "text/typescript",
      extension: "tsx",
      lastModified: 2,
      textContent: `
export function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
`,
    },
    {
      id: "d3",
      name: "index.ts",
      originalName: "index.ts",
      flattenedName: "index.ts",
      relativePath: "src/components/index.ts",
      pathSegments: ["src", "components", "index.ts"],
      directoryPath: "src/components",
      size: 60,
      type: "text/typescript",
      extension: "ts",
      lastModified: 3,
      textContent: `export { Button } from "./Button";\n`,
    },
    {
      id: "d4",
      name: "App.tsx",
      originalName: "App.tsx",
      flattenedName: "App.tsx",
      relativePath: "src/App.tsx",
      pathSegments: ["src", "App.tsx"],
      directoryPath: "src",
      size: 200,
      type: "text/typescript",
      extension: "tsx",
      lastModified: 4,
      textContent: `
import React, { lazy } from "react";
import Dash from "./pages/Dashboard";
import { Button } from "./components";

const Reports = lazy(() => import("./pages/Reports"));

export function App() {
  return (
    <>
      <Dash />
      <Button label="go" />
      <Reports />
    </>
  );
}
`,
    },
    {
      id: "d5",
      name: "Reports.tsx",
      originalName: "Reports.tsx",
      flattenedName: "Reports.tsx",
      relativePath: "src/pages/Reports.tsx",
      pathSegments: ["src", "pages", "Reports.tsx"],
      directoryPath: "src/pages",
      size: 100,
      type: "text/typescript",
      extension: "tsx",
      lastModified: 5,
      textContent: `
export default function Reports() {
  return <section>Reports</section>;
}
`,
    },
  ];

  const result = buildCodebaseDependencyGraph(files);

  // default import under a DIFFERENT local name (Dash) still links
  const dashboard = result.nodesMap.get("src/pages/Dashboard.tsx:Dashboard");
  assert.ok(dashboard);
  assert.ok(
    dashboard.dependents.some((d) => d.symbol.name === "App"),
    "Dashboard should list App as a caller via default import",
  );

  // barrel re-export: Button imported from "./components" (index.ts)
  const button = result.nodesMap.get("src/components/Button.tsx:Button");
  assert.ok(button);
  assert.ok(
    button.dependents.some((d) => d.symbol.name === "App"),
    "Button should list App as a caller through the barrel",
  );

  // React.lazy(() => import(...)) edge
  const reports = result.nodesMap.get("src/pages/Reports.tsx:Reports");
  assert.ok(reports);
  assert.ok(
    reports.dependents.some((d) => d.symbol.name === "App"),
    "Reports should list App as a caller via lazy()",
  );

  // 1b: split fields present and blast radius counts upstream
  assert.equal(button.directCallers, 1);
  assert.ok(button.blastRadius >= 1);
  assert.equal(typeof button.impactRadius, "number");
});

test("FIX 2a: multi-line inline-typed signatures are never truncated", () => {
  const content = `
export function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return <button onClick={onClick}>{children}</button>;
}
`;
  const symbols = extractSymbolsFromFile(
    content,
    "src/Button.tsx",
    "Button.tsx",
  );
  assert.equal(symbols.length, 1);
  const sig = symbols[0].signature;
  assert.ok(sig.includes("onClick?: () => void"), `truncated: ${sig}`);
  assert.ok(sig.includes("children: React.ReactNode"), `truncated: ${sig}`);
});

test("FIX 2a: type declarations are extracted and indexed", () => {
  const content = `
export interface ButtonProps {
  size: ButtonSize;
  onClick?: () => void;
}

export type ButtonSize = "sm" | "lg";
`;
  const types = extractTypeDeclarations(content, "src/types.ts");
  assert.equal(types.length, 2);
  const props = types.find((t) => t.name === "ButtonProps");
  assert.ok(props);
  assert.equal(props.kind, "interface");
  assert.ok(props.references.includes("ButtonSize"));
});

test("FIX 2c: plan prompt + plan parsing round-trip", () => {
  const analysis = buildCodebaseDependencyGraph(mockFiles);
  const prompt = buildPlanPrompt(
    "src/utils/mathUtils.ts:calculateTotal",
    analysis,
    mockFiles,
    "add tax support",
  );
  assert.ok(prompt);
  assert.ok(prompt.includes("SYMBOL INDEX"));
  assert.ok(prompt.includes("DO NOT WRITE CODE YET"));

  const plan = parsePlanResponse(
    [
      "<<<DEPLENZ_PLAN>>>",
      "- file: src/utils/mathUtils.ts | symbols: calculateTotal | change: add tax param",
      "- file: src/components/InvoiceCard.tsx | symbols: InvoiceCard | change: pass tax",
      "<<<END_DEPLENZ_PLAN>>>",
    ].join("\n"),
  );
  assert.equal(plan.length, 2);
  assert.equal(plan[0].path, "src/utils/mathUtils.ts");
  assert.deepEqual(plan[0].symbols, ["calculateTotal"]);

  const ctx = buildPlannedContext(
    "src/utils/mathUtils.ts:calculateTotal",
    plan,
    analysis,
    mockFiles,
    "add tax support",
  );
  assert.ok(ctx);
  assert.ok(ctx.plannedFiles.includes("src/components/InvoiceCard.tsx"));
  assert.ok(ctx.prompt.includes("PLANNED FILES"));
  assert.ok(ctx.prompt.includes(mockFiles[1].textContent!.trim()));
});

test("validateFileSyntax identifies unclosed delimiters, mismatched brackets and JSON syntax errors", () => {
  // 1. Clean code produces zero diagnostics
  const cleanTs = `export function greet(name: string) { return "hello " + name; }`;
  assert.equal(
    validateFileSyntax(cleanTs, "src/greet.ts", "greet.ts").length,
    0,
  );

  // 2. Unclosed brace
  const unclosedBrace = `
export function badFunc() {
  if (true) {
    return 42;
  // Missing closing brace
`;
  const unclosedDiags = validateFileSyntax(
    unclosedBrace,
    "src/bad.ts",
    "bad.ts",
  );
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
  const mismatchDiags = validateFileSyntax(
    mismatched,
    "src/mismatch.ts",
    "mismatch.ts",
  );
  assert.ok(mismatchDiags.length > 0);
  assert.equal(mismatchDiags[0].category, "mismatched-delimiter");

  // 4. Unexpected closing delimiter
  const unexpectedClosing = `
export function extraClose() {
  return true;
}}
`;
  const unexpectedDiags = validateFileSyntax(
    unexpectedClosing,
    "src/extra.ts",
    "extra.ts",
  );
  assert.ok(unexpectedDiags.length > 0);
  assert.equal(unexpectedDiags[0].category, "unexpected-delimiter");

  // 5. Unterminated template literal
  const unterminatedTpl = "const str = `hello world;\nconst next = 123;";
  const tplDiags = validateFileSyntax(unterminatedTpl, "src/tpl.ts", "tpl.ts");
  assert.ok(tplDiags.length > 0);
  assert.equal(tplDiags[0].category, "unterminated-literal");

  // 6. Malformed JSON
  const invalidJson = `{ "name": "test", "items": [1, 2, }`;
  const jsonDiags = validateFileSyntax(
    invalidJson,
    "package.json",
    "package.json",
  );
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

test("O(1) import resolution scales linearly on 1,000+ file codebases", () => {
  const largeRepo: ProcessedFile[] = [];
  const count = 1000;
  for (let i = 0; i < count; i++) {
    const prev = i > 0 ? `import { fn${i - 1} } from "./mod${i - 1}";\n` : "";
    const call = i > 0 ? `return fn${i - 1}() + 1;` : "return 1;";
    largeRepo.push({
      id: `large-${i}`,
      name: `mod${i}.ts`,
      originalName: `mod${i}.ts`,
      flattenedName: `mod${i}.ts`,
      relativePath: `bigproj/src/modules/mod${i}.ts`,
      pathSegments: ["bigproj", "src", "modules", `mod${i}.ts`],
      directoryPath: "src/modules",
      size: 120,
      type: "text/typescript",
      extension: "ts",
      lastModified: 1700000000000,
      textContent: `${prev}export function fn${i}() { ${call} }\n`,
    });
  }

  const t0 = performance.now();
  const graph = buildCodebaseDependencyGraph(largeRepo);
  const elapsedMs = performance.now() - t0;

  assert.equal(graph.totalFunctions, count);
  assert.equal(graph.totalDependenciesMapped, count - 1);
  assert.ok(
    elapsedMs < 1500,
    `Expected 1,000-file graph build under 1500ms, took ${Math.round(elapsedMs)}ms`,
  );

  // Cached second pass (simulating live-watch or filter update) is near-instant
  const t1 = performance.now();
  const graphCached = buildCodebaseDependencyGraph(largeRepo);
  const cachedElapsedMs = performance.now() - t1;
  assert.equal(graphCached.totalDependenciesMapped, count - 1);
  assert.ok(
    cachedElapsedMs <= elapsedMs,
    `Expected cached pass (${Math.round(cachedElapsedMs)}ms) <= cold pass (${Math.round(elapsedMs)}ms)`,
  );
});

test("Rust codebase analysis extracts structs, traits, impl methods, mod/use edges and clusters", () => {
  const rustFiles: ProcessedFile[] = [
    {
      id: "rs-1",
      name: "storage.rs",
      originalName: "storage.rs",
      flattenedName: "storage.rs",
      relativePath: "orbit-kv/src/storage.rs",
      pathSegments: ["orbit-kv", "src", "storage.rs"],
      directoryPath: "src",
      size: 400,
      type: "text/rust",
      extension: "rs",
      lastModified: 1700000010000,
      textContent: `
pub trait StorageBackend {
    fn flush(&mut self) -> Result<usize, String>;
}

pub struct MemTable {
    entries: usize,
}

impl MemTable {
    pub fn new() -> Self {
        Self { entries: 0 }
    }

    pub fn put(&mut self, key: String) -> Result<(), String> {
        Ok(())
    }
}
`,
    },
    {
      id: "rs-2",
      name: "engine.rs",
      originalName: "engine.rs",
      flattenedName: "engine.rs",
      relativePath: "orbit-kv/src/engine.rs",
      pathSegments: ["orbit-kv", "src", "engine.rs"],
      directoryPath: "src",
      size: 450,
      type: "text/rust",
      extension: "rs",
      lastModified: 1700000011000,
      textContent: `
use crate::storage::{MemTable, StorageBackend};

pub struct KvEngine {
    table: MemTable,
}

pub fn execute_put(engine: &mut KvEngine, key: String) -> Result<(), String> {
    engine.table.put(key)
}
`,
    },
  ];

  const graph = buildCodebaseDependencyGraph(rustFiles);
  assert.equal(graph.projectStack?.primary, "rust");
  assert.ok((graph.totalStructs ?? 0) >= 2, "Should detect MemTable and KvEngine structs");
  assert.ok((graph.totalTraits ?? 0) >= 1, "Should detect StorageBackend trait");

  const execNode = graph.nodesMap.get("orbit-kv/src/engine.rs:execute_put");
  assert.ok(execNode, "Should find execute_put function in engine.rs");
  assert.ok(
    execNode.dependencies.some((d) => d.symbol.name === "put"),
    "execute_put in engine.rs should link to MemTable::put in storage.rs via use crate::storage",
  );
  assert.ok((graph.moduleClusters?.length ?? 0) >= 1);
});

test("C/C++ codebase analysis extracts classes, structs, out-of-line Class::method and bridges #include headers to .cpp files", () => {
  const cppFiles: ProcessedFile[] = [
    {
      id: "cpp-1",
      name: "world.hpp",
      originalName: "world.hpp",
      flattenedName: "world.hpp",
      relativePath: "chrono/include/world.hpp",
      pathSegments: ["chrono", "include", "world.hpp"],
      directoryPath: "include",
      size: 300,
      type: "text/x-c++hdr",
      extension: "hpp",
      lastModified: 1700000020000,
      textContent: `
#pragma once
struct RigidBody {
    double mass;
};

class PhysicsWorld {
public:
    void stepSimulation(double dt);
};
`,
    },
    {
      id: "cpp-2",
      name: "world.cpp",
      originalName: "world.cpp",
      flattenedName: "world.cpp",
      relativePath: "chrono/src/world.cpp",
      pathSegments: ["chrono", "src", "world.cpp"],
      directoryPath: "src",
      size: 350,
      type: "text/x-c++src",
      extension: "cpp",
      lastModified: 1700000021000,
      textContent: `
#include "world.hpp"

void integrateBody(double dt) {
}

void PhysicsWorld::stepSimulation(double dt) {
    integrateBody(dt);
}
`,
    },
    {
      id: "cpp-3",
      name: "main.cpp",
      originalName: "main.cpp",
      flattenedName: "main.cpp",
      relativePath: "chrono/src/main.cpp",
      pathSegments: ["chrono", "src", "main.cpp"],
      directoryPath: "src",
      size: 300,
      type: "text/x-c++src",
      extension: "cpp",
      lastModified: 1700000022000,
      textContent: `
#include "world.hpp"

int main() {
    PhysicsWorld world;
    world.stepSimulation(0.016);
    return 0;
}
`,
    },
  ];

  const graph = buildCodebaseDependencyGraph(cppFiles);
  assert.equal(graph.projectStack?.primary, "cpp");
  assert.ok((graph.totalStructs ?? 0) >= 1, "Should detect RigidBody struct");
  assert.ok((graph.totalClasses ?? 0) >= 1, "Should detect PhysicsWorld class");

  const mainNode = graph.nodesMap.get("chrono/src/main.cpp:main");
  assert.ok(mainNode, "Should extract main() from main.cpp");
  assert.ok(
    mainNode.dependencies.some((d) => d.symbol.name === "stepSimulation"),
    "main() should resolve stepSimulation across #include \"world.hpp\" -> world.cpp bridge",
  );
});


