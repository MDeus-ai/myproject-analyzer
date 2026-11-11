/**
 * Smart Paste Verifier — algorithmic checks that run when an LLM response
 * is pasted back, BEFORE anything is applied.
 *
 * Stage 1  Integrity (cheap string checks)
 * Stage 2  Symbol diff (old vs new, via DepLenz's extractor)
 * Stage 3  Import resolution against a virtual copy of the project
 * Stage 4  Caller impact (reverse graph walk vs the change set)
 * Stage 5  Contract & preservation (body hashes, markers vs diff, dupes)
 *
 * Everything runs on DepLenz's existing balanced-scan extractor, so no new
 * dependency is added. The report shape is parser-agnostic: upgrading the
 * internals to a real AST later changes accuracy, not the UI contract.
 */

import type { ProcessedFile } from "../types";
import {
  extractSymbolsFromFile,
  extractTypeDeclarations,
  extractFileImports,
  type DepLenzAnalysisResult,
  type DepLenzSymbol,
} from "./depLenz";
import {
  SMART_PASTE_MARKER,
  type SmartPasteChange,
  type SmartPasteParseResult,
} from "./smartPaste";

export type VerifySeverity = "error" | "warning" | "info";

export interface VerifyFinding {
  severity: VerifySeverity;
  stage: 1 | 2 | 3 | 4 | 5;
  path?: string;
  message: string;
}

export interface MustUpdateEntry {
  file: string;
  symbol: string;
  reason: string;
}

export interface VerifyReport {
  findings: VerifyFinding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** Stage-4 headline: files that must change but weren't in the paste. */
  mustUpdate: MustUpdateEntry[];
  /** Stage-5: symbols byte-identical before/after (preserved untouched). */
  preservedCount: number;
  summary: string;
}

export interface VerifyOptions {
  /** Whether [SMART-PASTE] markers were requested in the prompt contract. */
  markersExpected: boolean;
}

/* ------------------------------------------------------------------ */
/* Shared signature/arity helpers                                      */
/* ------------------------------------------------------------------ */

/** Splits on a separator at top nesting level only (string-aware). */
export function splitTopLevel(s: string, sep = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  let inS = false,
    inD = false,
    inT = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inS || inD || inT) {
      cur += ch;
      if (ch === "\\") {
        cur += s[i + 1] ?? "";
        i++;
        continue;
      }
      if (inS && ch === "'") inS = false;
      else if (inD && ch === '"') inD = false;
      else if (inT && ch === "`") inT = false;
      continue;
    }
    if (ch === "'") {
      inS = true;
      cur += ch;
      continue;
    }
    if (ch === '"') {
      inD = true;
      cur += ch;
      continue;
    }
    if (ch === "`") {
      inT = true;
      cur += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
    if (ch === ")" || ch === "]" || ch === "}" || ch === ">") depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/** Parameter substring of a signature (balanced). Null when none found. */
export function paramsOfSignature(signature: string): string | null {
  const open = signature.indexOf("(");
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < signature.length; i++) {
    const ch = signature[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return signature.slice(open + 1, i);
    }
  }
  return null;
}

export function countParams(signature: string): {
  total: number;
  required: number;
} {
  const p = paramsOfSignature(signature);
  if (p == null || !p.trim()) return { total: 0, required: 0 };
  const parts = splitTopLevel(p);
  let required = 0;
  for (const part of parts) {
    const t = part.trim();
    if (!t || /^\.{3}/.test(t)) continue; // rest param
    if (/\?\s*:/.test(t) || /=/.test(t)) continue; // optional or defaulted
    required++;
  }
  return { total: parts.length, required };
}

/** Argument counts at every call site of `fnName` inside `body`. */
export function countCallArgs(body: string, fnName: string): number[] {
  const counts: number[] = [];
  const re = new RegExp(`\\b${fnName.replace(/\$/g, "\\$")}\\s*\\(`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const before = body.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s*$/.test(before)) continue; // skip the definition itself
    let depth = 1;
    let i = m.index + m[0].length;
    let args = 0;
    let hasContent = false;
    while (i < body.length && depth > 0) {
      const ch = body[i];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) break;
      } else if (ch === "," && depth === 1) args++;
      else if (!/\s/.test(ch) && depth === 1) hasContent = true;
      i++;
    }
    counts.push(hasContent ? args + 1 : 0);
  }
  return counts;
}

/** Whitespace/comment-normalized body for preservation comparison. */
export function normalizeBody(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Virtual project: original files with the paste applied              */
/* ------------------------------------------------------------------ */

function buildVirtualContents(
  files: ProcessedFile[],
  changes: SmartPasteChange[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    if (f.textContent != null) map.set(f.relativePath, f.textContent);
  }
  for (const c of changes) {
    if (c.action === "delete") map.delete(c.path);
    else map.set(c.path, c.content);
  }
  return map;
}

function virtualFiles(map: Map<string, string>): ProcessedFile[] {
  return [...map.keys()].map((p) => {
    const name = p.split("/").pop() ?? p;
    return {
      relativePath: p,
      name,
      extension: name.includes(".") ? name.split(".").pop()!.toLowerCase() : "",
    } as unknown as ProcessedFile;
  });
}

const NODE_BUILTINS = new Set([
  "fs",
  "path",
  "os",
  "http",
  "https",
  "url",
  "util",
  "stream",
  "events",
  "crypto",
  "buffer",
  "querystring",
  "zlib",
  "child_process",
  "process",
]);

/* ------------------------------------------------------------------ */
/* Stage 1 — Integrity                                                 */
/* ------------------------------------------------------------------ */

const TRUNCATION_RE =
  /(rest of (the )?(file|code) (remains?|is|stays) unchanged|rest unchanged|existing code (remains?|is) (unchanged|the same)|\/\/\s*\.\.\.\s*(rest|unchanged)|\(\s*\.\.\.\s*(rest|unchanged)|code omitted|omitted for brevity|snipped for brevity)/i;

function stage1(
  parse: SmartPasteParseResult,
  originalByPath: Map<string, string>,
): VerifyFinding[] {
  const findings: VerifyFinding[] = [];
  const blockPaths = new Set(parse.changes.map((c) => c.path));

  // Manifest vs blocks — both directions.
  const manifestPaths = new Set<string>();
  for (const line of parse.manifest) {
    const pm = /path:\s*([^\s|]+)/i.exec(line);
    if (pm) manifestPaths.add(pm[1].replace(/\\/g, "/").replace(/^\/+/, ""));
  }
  if (parse.manifest.length > 0) {
    for (const p of blockPaths) {
      if (!manifestPaths.has(p)) {
        findings.push({
          severity: "warning",
          stage: 1,
          path: p,
          message: `File block "${p}" is missing from the manifest.`,
        });
      }
    }
    for (const p of manifestPaths) {
      if (!blockPaths.has(p)) {
        findings.push({
          severity: "warning",
          stage: 1,
          path: p,
          message: `Manifest lists "${p}" but no file block was emitted for it.`,
        });
      }
    }
  }

  for (const change of parse.changes) {
    const original = originalByPath.get(change.path);

    if (change.action === "delete" && original === undefined) {
      findings.push({
        severity: "error",
        stage: 1,
        path: change.path,
        message: `action="delete" targets "${change.path}", which does not exist in the project.`,
      });
    }
    if (change.action === "create" && original !== undefined) {
      findings.push({
        severity: "warning",
        stage: 1,
        path: change.path,
        message: `action="create" overwrites existing file "${change.path}".`,
      });
    }
    if (change.action === "delete") continue;

    if (TRUNCATION_RE.test(change.content)) {
      findings.push({
        severity: "error",
        stage: 1,
        path: change.path,
        message:
          'Truncation placeholder detected ("rest unchanged" / "omitted"). The contract requires COMPLETE files — this block would destroy code if applied.',
      });
    }
    if (/^```/m.test(change.content)) {
      findings.push({
        severity: "error",
        stage: 1,
        path: change.path,
        message:
          "Stray markdown fence (```) inside file content — it would be written into the source file.",
      });
    }
    if (original !== undefined && change.action === "modify") {
      const oldLines = original.split("\n").length;
      const newLines = change.content.split("\n").length;
      if (oldLines >= 20 && newLines < oldLines * 0.6) {
        findings.push({
          severity: "error",
          stage: 1,
          path: change.path,
          message: `Modified file lost ${Math.round((1 - newLines / oldLines) * 100)}% of its lines (${oldLines} -> ${newLines}) — probable truncation.`,
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Stage 2 — Symbol diff (old vs new)                                  */
/* ------------------------------------------------------------------ */

export interface SymbolDiff {
  path: string;
  removedExports: DepLenzSymbol[];
  changedSignatures: { before: DepLenzSymbol; after: DepLenzSymbol }[];
  droppedImportsStillUsed: string[];
  addedSymbols: DepLenzSymbol[];
  preserved: number;
  changedBodies: DepLenzSymbol[];
}

function diffFileSymbols(
  path: string,
  oldContent: string,
  newContent: string,
): SymbolDiff {
  const name = path.split("/").pop() ?? path;
  const oldSyms = extractSymbolsFromFile(oldContent, path, name);
  const newSyms = extractSymbolsFromFile(newContent, path, name);
  const newByName = new Map(newSyms.map((s) => [s.name, s]));
  const oldByName = new Map(oldSyms.map((s) => [s.name, s]));

  const removedExports = oldSyms.filter(
    (s) => s.isExported && !newByName.has(s.name),
  );
  const changedSignatures: SymbolDiff["changedSignatures"] = [];
  const changedBodies: DepLenzSymbol[] = [];
  let preserved = 0;

  for (const before of oldSyms) {
    const after = newByName.get(before.name);
    if (!after) continue;
    if (before.signature !== after.signature) {
      changedSignatures.push({ before, after });
    } else if (normalizeBody(before.body) === normalizeBody(after.body)) {
      preserved++;
    } else {
      changedBodies.push(after);
    }
  }
  const addedSymbols = newSyms.filter((s) => !oldByName.has(s.name));

  // Import-block diff — the "lines 1-7" failure, converted from a silent
  // overwrite into a flagged finding.
  const oldImports = extractFileImports(oldContent, path, []);
  const importedBefore = new Set<string>();
  for (const imp of oldImports) {
    if (imp.defaultImport) importedBefore.add(imp.defaultImport);
    if (imp.namespaceImport) importedBefore.add(imp.namespaceImport);
    for (const n of imp.importedNames) importedBefore.add(n.alias ?? n.name);
  }
  const newImports = extractFileImports(newContent, path, []);
  const importedAfter = new Set<string>();
  for (const imp of newImports) {
    if (imp.defaultImport) importedAfter.add(imp.defaultImport);
    if (imp.namespaceImport) importedAfter.add(imp.namespaceImport);
    for (const n of imp.importedNames) importedAfter.add(n.alias ?? n.name);
  }
  const droppedImportsStillUsed: string[] = [];
  for (const binding of importedBefore) {
    if (importedAfter.has(binding)) continue;
    if (new RegExp(`\\b${binding.replace(/\$/g, "\\$")}\\b`).test(newContent)) {
      droppedImportsStillUsed.push(binding);
    }
  }

  return {
    path,
    removedExports,
    changedSignatures,
    droppedImportsStillUsed,
    addedSymbols,
    preserved,
    changedBodies,
  };
}

/* ------------------------------------------------------------------ */
/* Stage 3 — Import resolution against the virtual project             */
/* ------------------------------------------------------------------ */

/** Exported names of a virtual file; null = cannot verify (star barrel). */
function exportedNamesOf(content: string, path: string): Set<string> | null {
  const name = path.split("/").pop() ?? path;
  const out = new Set<string>();
  for (const s of extractSymbolsFromFile(content, path, name)) {
    if (s.isExported) out.add(s.name);
    if (s.isDefaultExport) out.add("default");
  }
  for (const t of extractTypeDeclarations(content, path)) {
    if (t.isExported) out.add(t.name);
  }
  for (const imp of extractFileImports(content, path, [])) {
    if (!imp.isReExport) continue;
    if (imp.starReExport) return null; // re-exports unknown names — skip check
    for (const n of imp.importedNames) out.add(n.alias ?? n.name);
  }
  return out;
}

function stage3(
  changes: SmartPasteChange[],
  virtual: Map<string, string>,
  packageDeps: Set<string> | null,
): VerifyFinding[] {
  const findings: VerifyFinding[] = [];
  const vFiles = virtualFiles(virtual);
  const exportCache = new Map<string, Set<string> | null>();

  const exportsFor = (p: string): Set<string> | null => {
    if (!exportCache.has(p)) {
      const content = virtual.get(p);
      exportCache.set(
        p,
        content == null ? new Set() : exportedNamesOf(content, p),
      );
    }
    return exportCache.get(p)!;
  };

  for (const change of changes) {
    if (change.action === "delete") continue;
    const imports = extractFileImports(change.content, change.path, vFiles);
    for (const imp of imports) {
      if (!imp.isRelative) {
        if (packageDeps && !imp.isTypeOnly) {
          const root = imp.sourcePath.startsWith("@")
            ? imp.sourcePath.split("/").slice(0, 2).join("/")
            : imp.sourcePath.split("/")[0];
          if (!NODE_BUILTINS.has(root) && !packageDeps.has(root)) {
            findings.push({
              severity: "warning",
              stage: 3,
              path: change.path,
              message: `"${imp.sourcePath}" is imported but is not listed in package.json dependencies.`,
            });
          }
        }
        continue;
      }
      if (!imp.resolvedFilePath) {
        findings.push({
          severity: "error",
          stage: 3,
          path: change.path,
          message: `Import "${imp.sourcePath}" does not resolve to any file in the project (after applying these changes).`,
        });
        continue;
      }
      // Named imports must be exported by the target file.
      const names = exportsFor(imp.resolvedFilePath);
      if (names === null) continue; // star barrel — unverifiable, skip
      for (const n of imp.importedNames) {
        if (!names.has(n.name)) {
          findings.push({
            severity: "error",
            stage: 3,
            path: change.path,
            message: `"${n.name}" is imported from "${imp.resolvedFilePath}", which does not export it.`,
          });
        }
      }
      if (imp.defaultImport && !names.has("default")) {
        findings.push({
          severity: "warning",
          stage: 3,
          path: change.path,
          message: `Default import from "${imp.resolvedFilePath}", but no default export was detected there.`,
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Stage 4 — Caller impact (reverse graph walk)                        */
/* ------------------------------------------------------------------ */

function stage4(
  diffs: Map<string, SymbolDiff>,
  changedPaths: Set<string>,
  analysis: DepLenzAnalysisResult,
): { findings: VerifyFinding[]; mustUpdate: MustUpdateEntry[] } {
  const findings: VerifyFinding[] = [];
  const mustUpdate = new Map<string, MustUpdateEntry>();

  for (const diff of diffs.values()) {
    const breaking: { sym: DepLenzSymbol; reason: string; newSig?: string }[] =
      [
        ...diff.removedExports.map((sym) => ({
          sym,
          reason: `export "${sym.name}" was REMOVED from ${diff.path}`,
        })),
        ...diff.changedSignatures.map(({ before, after }) => ({
          sym: before,
          reason: `signature of "${before.name}" changed: ${before.signature} -> ${after.signature}`,
          newSig: after.signature,
        })),
      ];

    for (const b of breaking) {
      const node = analysis.nodesMap.get(`${diff.path}:${b.sym.name}`);
      if (!node) continue;

      for (const dep of node.dependents) {
        const callerFile = dep.symbol.filePath;
        const callerInPaste = changedPaths.has(callerFile);

        if (!callerInPaste) {
          const key = `${callerFile}:${dep.symbol.name}`;
          if (!mustUpdate.has(key)) {
            mustUpdate.set(key, {
              file: callerFile,
              symbol: dep.symbol.name,
              reason: b.reason,
            });
          }
          findings.push({
            severity: "error",
            stage: 4,
            path: callerFile,
            message: `${dep.symbol.name} (${callerFile}:${dep.symbol.lineStart}) calls ${b.sym.name}, but ${b.reason} — and this caller was NOT updated in the paste.`,
          });
        }
      }
    }
  }

  return { findings, mustUpdate: [...mustUpdate.values()] };
}

/* ------------------------------------------------------------------ */
/* Stage 5 — Contract & preservation                                   */
/* ------------------------------------------------------------------ */

function stage5(
  changes: SmartPasteChange[],
  diffs: Map<string, SymbolDiff>,
  analysis: DepLenzAnalysisResult,
  markersExpected: boolean,
): VerifyFinding[] {
  const findings: VerifyFinding[] = [];

  for (const change of changes) {
    if (change.action !== "modify") continue;
    const diff = diffs.get(change.path);
    if (!diff) continue;

    // Silent edits: bodies changed with zero markers (when markers were on).
    if (
      markersExpected &&
      diff.changedBodies.length > 0 &&
      change.markerCount === 0
    ) {
      findings.push({
        severity: "warning",
        stage: 5,
        path: change.path,
        message: `${diff.changedBodies.length} symbol body/bodies changed but the file carries no ${SMART_PASTE_MARKER} markers — silent edits the reviewer cannot see.`,
      });
    }
    if (
      markersExpected &&
      change.markerCount > 0 &&
      diff.changedBodies.length === 0 &&
      diff.addedSymbols.length === 0 &&
      diff.removedExports.length === 0
    ) {
      findings.push({
        severity: "info",
        stage: 5,
        path: change.path,
        message: `${change.markerCount} marker(s) present but no symbol-level diff detected — marker noise.`,
      });
    }

    // Duplicate / re-implementation detection.
    for (const added of diff.addedSymbols) {
      const candidates = analysis.symbols.filter(
        (s) => s.name === added.name && s.filePath !== change.path,
      );
      if (candidates.length > 0) {
        findings.push({
          severity: "warning",
          stage: 5,
          path: change.path,
          message: `New symbol "${added.name}" already exists in ${candidates[0].filePath} — possible re-implementation; reuse the existing helper instead.`,
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

export function verifySmartPaste(
  parse: SmartPasteParseResult,
  files: ProcessedFile[],
  analysis: DepLenzAnalysisResult,
  options: VerifyOptions,
): VerifyReport {
  const findings: VerifyFinding[] = [];
  const originalByPath = new Map<string, string>();
  for (const f of files) {
    if (f.textContent != null) {
      originalByPath.set(f.relativePath, f.textContent);
    }
  }
  const changedPaths = new Set(parse.changes.map((c) => c.path));

  // package.json dependencies (for stage 3 package checks)
  let packageDeps: Set<string> | null = null;
  const pkgFile = files.find((f) => f.name === "package.json" && f.textContent);
  if (pkgFile?.textContent) {
    try {
      const pkg = JSON.parse(pkgFile.textContent);
      packageDeps = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
        ...Object.keys(pkg.peerDependencies ?? {}),
      ]);
    } catch {
      packageDeps = null;
    }
  }

  // Stage 1
  findings.push(...stage1(parse, originalByPath));

  // Stage 2 — symbol diffs for modified files with known originals
  const diffs = new Map<string, SymbolDiff>();
  for (const change of parse.changes) {
    if (change.action !== "modify") continue;
    const original = originalByPath.get(change.path);
    if (original === undefined) continue;
    const diff = diffFileSymbols(change.path, original, change.content);
    diffs.set(change.path, diff);

    for (const sym of diff.removedExports) {
      findings.push({
        severity: "error",
        stage: 2,
        path: change.path,
        message: `BREAKING: exported ${sym.kind} "${sym.name}" (${sym.signature}) was removed.`,
      });
    }
    for (const { before, after } of diff.changedSignatures) {
      findings.push({
        severity: "warning",
        stage: 2,
        path: change.path,
        message: `Contract changed: ${before.signature}  ->  ${after.signature}`,
      });
    }
    for (const binding of diff.droppedImportsStillUsed) {
      findings.push({
        severity: "error",
        stage: 2,
        path: change.path,
        message: `Import "${binding}" was dropped but is still referenced in the file — it will not compile.`,
      });
    }
  }

  // Stage 3 — import resolution on the virtual project
  const virtual = buildVirtualContents(files, parse.changes);
  findings.push(...stage3(parse.changes, virtual, packageDeps));

  // Stage 4 — caller impact (files that must change but weren't pasted)
  const s4 = stage4(diffs, changedPaths, analysis);
  findings.push(...s4.findings);

  // Arity detail for callers that WERE updated: verify call sites in the
  // NEW caller content against the NEW target signature.
  for (const diff of diffs.values()) {
    for (const { before, after } of diff.changedSignatures) {
      if (before.kind === "component" || before.kind === "class") continue;
      const { required } = countParams(after.signature);
      if (required === 0) continue;
      const node = analysis.nodesMap.get(`${diff.path}:${before.name}`);
      if (!node) continue;
      for (const dep of node.dependents) {
        if (!changedPaths.has(dep.symbol.filePath)) continue;
        const content = virtual.get(dep.symbol.filePath);
        if (!content) continue;
        for (const argCount of countCallArgs(content, before.name)) {
          if (argCount < required) {
            findings.push({
              severity: "warning",
              stage: 4,
              path: dep.symbol.filePath,
              message: `Call site ${before.name}(${argCount} arg${argCount === 1 ? "" : "s"}) in ${dep.symbol.name} provides fewer arguments than the new signature requires (${required}).`,
            });
          }
        }
      }
    }
  }

  // Stage 5 — preservation & contract
  findings.push(
    ...stage5(parse.changes, diffs, analysis, options.markersExpected),
  );

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;
  const preservedCount = [...diffs.values()].reduce(
    (n, d) => n + d.preserved,
    0,
  );

  const summary =
    errorCount === 0 && warningCount === 0
      ? `All 5 stages passed. ${preservedCount} untouched symbol(s) verified preserved.`
      : `${errorCount} error(s), ${warningCount} warning(s) across 5 stages · ${s4.mustUpdate.length} file(s) must change but weren't in the paste · ${preservedCount} symbol(s) preserved.`;

  return {
    findings: findings.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity] || a.stage - b.stage;
    }),
    errorCount,
    warningCount,
    infoCount,
    mustUpdate: s4.mustUpdate,
    preservedCount,
    summary,
  };
}
