import test from "node:test";
import assert from "node:assert/strict";
import {
  computeQuickLineDelta,
  detectChangedSymbolNames,
  createEvolutionEntry,
  buildEvolutionEntryFromSmartPaste,
  formatCompactEvolutionHandover,
} from "@myproject/core/evolutionLog";
import { ProcessedFile } from "@myproject/core/types";

test("computeQuickLineDelta computes accurate line additions and removals", () => {
  const prev = ["fn alpha() {}", "fn beta() {}", "fn gamma() {}"].join("\n");
  const next = [
    "fn alpha() {}",
    "fn beta_v2() {}",
    "fn gamma() {}",
    "fn delta() {}",
  ].join("\n");

  const delta = computeQuickLineDelta(prev, next);
  assert.equal(delta.addedLines, 2);
  assert.equal(delta.removedLines, 1);
});

test("detectChangedSymbolNames extracts Rust, C++, and TypeScript symbol deltas", () => {
  const prev = `
pub struct MemTable {
  size: usize,
}
pub fn get_key() {}
`;
  const next = `
pub struct MemTable {
  size: usize,
  capacity: usize,
}
pub trait StorageBackend {
  fn flush(&mut self);
}
pub fn get_key() {}
`;

  const changed = detectChangedSymbolNames(prev, next);
  assert.ok(changed.includes("MemTable"));
  assert.ok(changed.includes("StorageBackend"));
  assert.ok(changed.includes("flush"));
});

test("createEvolutionEntry and buildEvolutionEntryFromSmartPaste generate compact ~20-token deltas", () => {
  const manual = createEvolutionEntry({
    source: "manual",
    summary: "Added CRC32 checksum verification to WAL blocks",
    changes: [
      {
        path: "src/storage.rs",
        action: "modify",
        addedLines: 28,
        removedLines: 4,
        symbolsChanged: ["verify_crc32", "KvEngine"],
      },
    ],
  });

  assert.ok(manual.compactDelta.includes("|note]"));
  assert.ok(manual.compactDelta.includes("src/storage.rs"));
  assert.ok(manual.compactDelta.includes("+28/-4"));
  assert.ok(
    manual.estimatedTokens <= 45,
    `Expected compact token count <= 45, got ${manual.estimatedTokens}`,
  );

  const origFiles: ProcessedFile[] = [
    {
      id: "w1",
      name: "world.cpp",
      originalName: "world.cpp",
      flattenedName: "world.cpp",
      relativePath: "chrono-physics-engine/src/world.cpp",
      pathSegments: ["chrono-physics-engine", "src", "world.cpp"],
      directoryPath: "src",
      size: 100,
      type: "text/x-c++src",
      extension: "cpp",
      lastModified: 1,
      textContent: "void PhysicsWorld::stepSimulation(double dt) {\n}\n",
    },
  ];

  const spEntry = buildEvolutionEntryFromSmartPaste({
    changes: [
      {
        path: "src/world.cpp",
        action: "modify",
        content:
          "void PhysicsWorld::stepSimulation(double dt) {\n  solveContacts();\n}\n",
      },
    ],
    originalFiles: origFiles,
    targetSymbol: "stepSimulation",
    userTaskPrompt: "Integrate impulse contact solver pass",
  });

  assert.equal(spEntry.source, "smart-paste");
  assert.ok(spEntry.compactDelta.includes("|paste]"));
  assert.ok(spEntry.compactDelta.includes("src/world.cpp"));
});

test("formatCompactEvolutionHandover enforces token budget and formats markdown handover", () => {
  const entries = Array.from({ length: 12 }, (_, idx) =>
    createEvolutionEntry({
      source: "smart-paste",
      summary: `Step ${idx + 1}: refactored module ${idx + 1}`,
      changes: [
        {
          path: `src/mod${idx + 1}.ts`,
          action: "modify",
          addedLines: 10,
          removedLines: 3,
          symbolsChanged: [`fn${idx + 1}`],
        },
      ],
      timestamp: 1700000000000 + idx * 1000,
    }),
  );

  const handover = formatCompactEvolutionHandover(entries, 120);
  assert.ok(handover.text.includes("PROJECT EVOLUTION LOG"));
  assert.ok(handover.includedCount >= 1 && handover.includedCount < entries.length);
  assert.equal(handover.totalCount, entries.length);
});
