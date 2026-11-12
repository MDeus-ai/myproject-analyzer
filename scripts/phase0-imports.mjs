#!/usr/bin/env node
/**
 * Phase 0: rewrite import paths after the monorepo move.
 * Run from the repo root:   node scripts/phase0-imports.mjs
 *
 * Rewrites, inside packages/core, packages/ui, apps/web:
 *   ./xxx            -> @myproject/core/xxx   (core-internal siblings)
 *   ../types         -> @myproject/core/types
 *   ../utils/xxx     -> @myproject/core/xxx   (from ui/ and app files)
 *   ./components/X   -> @myproject/ui         (from app files -> barrel)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function listFiles(dir, exts) {
  return execSync(`git ls-files ${dir}`, { encoding: "utf8" })
    .split("\n")
    .filter((f) => exts.some((e) => f.endsWith(e)));
}

const CORE_UTILS = [
  "clipboard",
  "codeAnalyzer",
  "codeDiff",
  "collisionResolver",
  "depLenz",
  "fileHelpers",
  "folderExclusions",
  "folderReader",
  "gitignoreParser",
  "imageExporter",
  "pdfGenerator",
  "sampleProject",
  "secretsDetector",
  "smartPaste",
  "smartPasteVerify",
  "themes",
  "treeBuilder",
  "zipExporter",
  "content",
  "contentReader",
  "types",
];

function transform(file, code) {
  let out = code;
  const isCore = file.startsWith("packages/core/");
  const isWeb = file.startsWith("apps/web/");

  // 1. core-internal sibling imports: ./xxx -> @myproject/core/xxx
  if (isCore) {
    for (const u of CORE_UTILS) {
      out = out
        .replaceAll(`"./${u}"`, `"@myproject/core/${u}"`)
        .replaceAll(`'./${u}'`, `'@myproject/core/${u}'`)
        .replaceAll(`"./${u}.ts"`, `"@myproject/core/${u}"`)
        .replaceAll(`'./${u}.ts'`, `'@myproject/core/${u}'`);
    }
  }

  // 2. ui + web files: ../utils/xxx -> @myproject/core/xxx
  for (const u of CORE_UTILS) {
    out = out
      .replaceAll(`"../utils/${u}"`, `"@myproject/core/${u}"`)
      .replaceAll(`'../utils/${u}'`, `'@myproject/core/${u}'`);
  }
  // 2b. web files: ./utils/xxx -> @myproject/core/xxx
  //     (App.tsx sat beside the old src/utils, so it used same-dir imports)
  if (isWeb) {
    for (const u of CORE_UTILS) {
      out = out
        .replaceAll(`"./utils/${u}"`, `"@myproject/core/${u}"`)
        .replaceAll(`'./utils/${u}'`, `'@myproject/core/${u}'`);
    }
  }

  // 3. ../types and ./types -> @myproject/core/types
  out = out
    .replaceAll(`"../types"`, `"@myproject/core/types"`)
    .replaceAll(`'../types'`, `'@myproject/core/types'`)
    .replaceAll(`"./types"`, `"@myproject/core/types"`)
    .replaceAll(`'./types'`, `'@myproject/core/types'`);

  // 4. web files: component imports -> the ui barrel
  if (isWeb) {
    out = out
      .replace(/"\.{1,2}\/components\/[A-Za-z]+"/g, `"@myproject/ui"`)
      .replace(/'\.{1,2}\/components\/[A-Za-z]+'/g, `'@myproject/ui'`);
  }

  return out;
}

const files = [
  ...listFiles("packages/core", [".ts"]),
  ...listFiles("packages/ui", [".tsx", ".ts"]),
  ...listFiles("apps/web/src", [".tsx", ".ts"]),
];

let changed = 0;
for (const file of files) {
  const code = readFileSync(file, "utf8");
  const out = transform(file, code);
  if (out !== code) {
    writeFileSync(file, out, "utf8");
    changed++;
    console.log(`updated: ${file}`);
  }
}
console.log(`\n${changed} files rewritten.`);
