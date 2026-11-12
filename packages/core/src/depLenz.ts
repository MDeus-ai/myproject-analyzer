/**
 * DepLenz — Intelligent Web Development Codebase Lens & Dependency Graph
 *
 * Provides:
 * 1. Global codebase keyword search with enclosing function detection.
 * 2. Static AST-like function & component dependency mapping (calls & callers)
 *    — including default imports, re-export/barrel chains, React.lazy()
 *    bindings and namespace imports.
 * 3. Surgical LLM prompt context extraction (target + full target file +
 *    referenced types + callers + dependencies) to avoid dumping entire
 *    codebases into LLMs.
 * 4. Two-step plan mode (compact map prompt -> plan -> right-sized context).
 */

import { ProcessedFile } from "@myproject/core/types";
import { getDepLenzEngine } from "@myproject/core/engineBridge";

export type SymbolKind =
  | "function"
  | "component"
  | "hook"
  | "method"
  | "class"
  | "struct"
  | "trait";

export type CodebaseStackKind = "web" | "rust" | "cpp" | "polyglot";

export interface ProjectStackSummary {
  primary: CodebaseStackKind;
  label: string;
  languages: string[];
}

export interface ModuleCluster {
  id: string;
  name: string;
  role: string;
  language: string;
  fileCount: number;
  symbolIds: string[];
  inboundCalls: number;
  outboundCalls: number;
}

export interface ModuleCommunicationEdge {
  id: string;
  sourceModule: string;
  targetModule: string;
  callCount: number;
  examples: string[];
}

export interface DepLenzSymbol {
  id: string; // e.g. "src/utils/treeBuilder.ts:buildFolderTree"
  name: string;
  kind: SymbolKind;
  filePath: string;
  fileName: string;
  lineStart: number;
  lineEnd: number;
  signature: string;
  body: string;
  isExported: boolean;
  isDefaultExport: boolean;
  docComment?: string;
  calls: string[]; // names of other symbols invoked in body
  language?: "ts" | "js" | "rust" | "cpp" | "other";
  moduleName?: string;
}

export interface FileImport {
  importedNames: { name: string; alias?: string }[];
  defaultImport?: string;
  namespaceImport?: string;
  sourcePath: string; // e.g. "@myproject/core/treeBuilder" or "react"
  isRelative: boolean;
  resolvedFilePath?: string; // resolved against project files
  /** import type { X } from ... — erased at runtime, still a contract edge. */
  isTypeOnly?: boolean;
  /** export { X } from "./y" / export * from "./y" (barrel files). */
  isReExport?: boolean;
  starReExport?: boolean;
  /** import("./y") — lazy / code-split edges, or C/C++ #include wildcards. */
  isDynamic?: boolean;
  /** True when an import brings all exported symbols of the target file into scope (e.g. C/C++ #include "foo.h" or Rust `use mod::*`). */
  isWildcardInclude?: boolean;
}

/** A type/interface/enum/struct/trait declaration — included in surgical bundles so the
 *  LLM sees the real contracts behind signatures. */
export interface TypeDeclaration {
  name: string;
  kind: "interface" | "type" | "enum" | "struct" | "trait" | "class";
  filePath: string;
  lineStart: number;
  lineEnd: number;
  body: string;
  isExported: boolean;
  /** Uppercase identifiers referenced inside the declaration body. */
  references: string[];
}

export interface DepLenzGraphNode {
  symbol: DepLenzSymbol;
  dependencies: { symbol: DepLenzSymbol; viaImport?: string }[]; // callees
  dependents: { symbol: DepLenzSymbol; viaImport?: string }[]; // callers
  externalDependencies: string[]; // e.g. 'react', 'lodash', 'tokio', '<vector>'
  /** Direct edges in both directions (kept for backward compatibility). */
  impactRadius: number;
  impactLevel: "low" | "medium" | "high";
  /** Direct upstream callers (dependents.length). */
  directCallers: number;
  /** Direct downstream callees (dependencies.length). */
  directCallees: number;
  /** Transitive unique upstream dependents — the true "who breaks" set. */
  blastRadius: number;
}

export interface CodebaseSearchMatch {
  id: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  lineText: string;
  enclosingSymbol?: DepLenzSymbol;
  matchLength: number;
}

export interface CodebaseSearchOptions {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  isRegex?: boolean;
  fileFilter?: string;
}

export interface SurgicalContextBundle {
  targetSymbol: DepLenzSymbol;
  callers: DepLenzSymbol[];
  callees: DepLenzSymbol[];
  externalDeps: string[];
  /** Every file the change can touch: target + caller files + callee files. */
  touchedFiles: string[];
  /** Type declarations referenced by the included signatures. */
  referencedTypes: TypeDeclaration[];
  /** Extra files pulled in by the two-step plan flow. */
  plannedFiles: string[];
  formattedPrompt: string;
  estimatedTokens: number;
  characterCount: number;
}

export type SyntaxDiagnosticCategory =
  | "unclosed-delimiter"
  | "mismatched-delimiter"
  | "unexpected-delimiter"
  | "unterminated-literal"
  | "json-syntax"
  | "malformed-declaration";

export interface SyntaxDiagnostic {
  id: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
  codeSnippet?: string;
  category: SyntaxDiagnosticCategory;
}

export interface DepLenzAnalysisResult {
  symbols: DepLenzSymbol[];
  nodesMap: Map<string, DepLenzGraphNode>;
  fileSymbolsMap: Map<string, DepLenzSymbol[]>;
  fileTypesMap: Map<string, TypeDeclaration[]>;
  /** Type declarations by name (across all code files). */
  typeIndex: Map<string, TypeDeclaration[]>;
  totalFunctions: number;
  totalComponents: number;
  totalHooks: number;
  totalStructs?: number;
  totalTraits?: number;
  totalClasses?: number;
  totalDependenciesMapped: number;
  analyzedFilesCount: number;
  diagnostics: SyntaxDiagnostic[];
  totalSyntaxWarnings: number;
  filesWithSyntaxErrors: string[];
  projectStack?: ProjectStackSummary;
  moduleClusters?: ModuleCluster[];
  moduleEdges?: ModuleCommunicationEdge[];
}

/* ------------------------------------------------------------------ */
/* Multi-Language File Filter Helpers (Web Dev + Rust + C/C++)        */
/* ------------------------------------------------------------------ */

const WEB_AND_SYSTEMS_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "html",
  "css",
  "scss",
  "json",
  "rs",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hh",
  "hpp",
  "hxx",
  "ino",
  "toml",
]);

const CODE_FILE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "rs",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hh",
  "hpp",
  "hxx",
  "ino",
]);

const CPP_EXTENSIONS = new Set([
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hh",
  "hpp",
  "hxx",
  "ino",
]);

export function isRustFilePath(filePathOrExt: string): boolean {
  const clean = filePathOrExt.toLowerCase();
  return clean === "rs" || clean.endsWith(".rs");
}

export function isCppFilePath(filePathOrExt: string): boolean {
  const clean = filePathOrExt.toLowerCase();
  if (CPP_EXTENSIONS.has(clean)) return true;
  const dot = clean.lastIndexOf(".");
  return dot !== -1 && CPP_EXTENSIONS.has(clean.slice(dot + 1));
}

export function detectFileLanguageTag(
  filePath: string,
): "ts" | "js" | "rust" | "cpp" | "other" {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".rs")) return "rust";
  if (isCppFilePath(lower)) return "cpp";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "ts";
  if (
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs") ||
    lower.endsWith(".vue") ||
    lower.endsWith(".svelte")
  ) {
    return "js";
  }
  return "other";
}

export function detectFenceLanguage(filePath: string): string {
  const tag = detectFileLanguageTag(filePath);
  if (tag === "rust") return "rust";
  if (tag === "cpp") return "cpp";
  if (tag === "js") return "javascript";
  return "typescript";
}

export function detectCodebaseStack(
  files: ProcessedFile[],
): ProjectStackSummary {
  let webCount = 0;
  let rustCount = 0;
  let cppCount = 0;
  const langs = new Set<string>();

  for (const f of files) {
    const ext = f.extension.toLowerCase();
    if (ext === "rs") {
      rustCount++;
      langs.add("Rust");
    } else if (CPP_EXTENSIONS.has(ext)) {
      cppCount++;
      langs.add(ext === "c" ? "C" : "C++");
    } else if (["ts", "tsx"].includes(ext)) {
      webCount++;
      langs.add("TypeScript");
    } else if (["js", "jsx", "mjs", "cjs", "vue", "svelte"].includes(ext)) {
      webCount++;
      langs.add("JavaScript");
    }
  }

  const activeStacks =
    (webCount > 0 ? 1 : 0) + (rustCount > 0 ? 1 : 0) + (cppCount > 0 ? 1 : 0);

  if (activeStacks > 1) {
    return {
      primary: "polyglot",
      label: `Polyglot Lens (${Array.from(langs).join(" + ")})`,
      languages: Array.from(langs),
    };
  }
  if (rustCount > 0) {
    return {
      primary: "rust",
      label: "Rust Systems Lens",
      languages: Array.from(langs),
    };
  }
  if (cppCount > 0) {
    return {
      primary: "cpp",
      label: "C/C++ Native Lens",
      languages: Array.from(langs),
    };
  }
  return {
    primary: "web",
    label: "Web Dev Codebase Lens",
    languages: langs.size > 0 ? Array.from(langs) : ["TypeScript", "JavaScript"],
  };
}

export function isWebDevFile(file: ProcessedFile): boolean {
  const ext = file.extension.toLowerCase();
  return WEB_AND_SYSTEMS_EXTENSIONS.has(ext);
}

export function isCodeFile(file: ProcessedFile): boolean {
  const ext = file.extension.toLowerCase();
  return CODE_FILE_EXTENSIONS.has(ext);
}

/* ------------------------------------------------------------------ */
/* Balanced parameter / signature scanning                            */
/*                                                                    */
/* FIX 2a: the old extraction used `([^)]*)` on a single line, which  */
/* truncated at the first ")" — a signature like                     */
/*   Button({ onClick }: { onClick?: () => void })                    */
/* was cut off at "onClick?: (". The scanner below walks the actual   */
/* characters with a depth counter (string/comment aware, multi-line) */
/* so signatures are ALWAYS complete.                                 */
/* ------------------------------------------------------------------ */

interface ParamScanResult {
  params: string;
  returnType: string;
  /** True when the closing paren is followed by `=>` (arrow function). */
  afterArrow: boolean;
}

/**
 * Given lines and the position of an opening "(", returns the full
 * (possibly multi-line) parameter text plus the return type that follows.
 */
function scanBalancedParams(
  lines: string[],
  startLine: number,
  startCol: number,
): ParamScanResult | null {
  let depth = 0;
  const buf: string[] = [];
  let inS = false,
    inD = false,
    inT = false,
    inBC = false;
  let endLine = -1,
    endCol = -1;

  outer: for (let l = startLine; l < lines.length; l++) {
    const text = lines[l];
    for (let c = l === startLine ? startCol : 0; c < text.length; c++) {
      const ch = text[c];
      const nx = c + 1 < text.length ? text[c + 1] : "";
      if (inBC) {
        if (ch === "*" && nx === "/") {
          inBC = false;
          c++;
        }
        continue;
      }
      if (inS || inD || inT) {
        if (ch === "\\") {
          if (depth > 0) buf.push(ch, nx);
          c++;
          continue;
        }
        if (inS && ch === "'") inS = false;
        else if (inD && ch === '"') inD = false;
        else if (inT && ch === "`") inT = false;
        if (depth > 0) buf.push(ch);
        continue;
      }
      if (ch === "/" && nx === "/") break; // rest of line is a comment
      if (ch === "/" && nx === "*") {
        inBC = true;
        c++;
        continue;
      }
      if (ch === "'") {
        inS = true;
        if (depth > 0) buf.push(ch);
        continue;
      }
      if (ch === '"') {
        inD = true;
        if (depth > 0) buf.push(ch);
        continue;
      }
      if (ch === "`") {
        inT = true;
        if (depth > 0) buf.push(ch);
        continue;
      }
      if (ch === "(") {
        depth++;
        if (depth > 1) buf.push(ch);
        continue;
      }
      if (ch === ")") {
        depth--;
        if (depth === 0) {
          endLine = l;
          endCol = c;
          break outer;
        }
        buf.push(ch);
        continue;
      }
      if (depth > 0) buf.push(ch);
    }
    if (depth > 0) buf.push("\n");
  }

  if (endLine < 0) return null;

  const tail =
    lines[endLine].slice(endCol + 1) +
    (endLine + 1 < lines.length ? "\n" + lines[endLine + 1] : "");
  const arrowM = /^\s*(?::\s*([^=]+?))?\s*=>/.exec(tail);
  if (arrowM) {
    return {
      params: buf.join(""),
      returnType: (arrowM[1] || "").trim(),
      afterArrow: true,
    };
  }
  const retM = /^\s*(?::|->)\s*([^={;]+?)\s*(?:where\b|[{;]|$)/.exec(tail);
  return {
    params: buf.join(""),
    returnType: retM ? retM[1].trim() : "",
    afterArrow: false,
  };
}

/* ------------------------------------------------------------------ */
/* Static Symbol Extraction for Web Dev, Rust, and C/C++ Stacks       */
/* ------------------------------------------------------------------ */

/** Fast 32-bit FNV-1a content fingerprint for per-file parse caching. */
function fingerprintContent(content: string): string {
  let h = 0x811c9dc5;
  const len = content.length;
  // Sample every char for <= 64KB, or stride for huge files so hashing is sub-0.1ms
  const step = len > 65536 ? Math.floor(len / 32768) : 1;
  for (let i = 0; i < len; i += step) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${len}:${h >>> 0}`;
}

const MAX_FILE_CACHE_ENTRIES = 12000;
const symbolExtractCache = new Map<string, DepLenzSymbol[]>();
const typeExtractCache = new Map<string, TypeDeclaration[]>();
const lazyExtractCache = new Map<string, LazyBinding[]>();
const syntaxDiagnosticCache = new Map<string, SyntaxDiagnostic[]>();

function setBoundedCache<T>(map: Map<string, T>, key: string, value: T): void {
  if (map.size >= MAX_FILE_CACHE_ENTRIES) {
    // Evict oldest ~20% of entries
    let count = 0;
    const limit = Math.floor(MAX_FILE_CACHE_ENTRIES * 0.2);
    for (const k of map.keys()) {
      map.delete(k);
      if (++count >= limit) break;
    }
  }
  map.set(key, value);
}

export function inferModuleNameFromPath(filePath: string): string {
  const segs = filePath.split("/").filter(Boolean);
  if (segs.length <= 1) return "root";
  // Strip common top-level wrapper folder if present
  const startIdx =
    segs.length > 2 && ["src", "lib", "include", "app", "packages", "apps"].includes(segs[1])
      ? 2
      : segs[0] === "src" || segs[0] === "include" || segs[0] === "lib"
        ? 1
        : segs.length > 2
          ? 1
          : 0;
  if (startIdx >= segs.length - 1) {
    return segs[segs.length - 2] || "core";
  }
  return segs.slice(startIdx, segs.length - 1).join("/") || segs[0];
}

function extractRustSymbolsFromFile(
  lines: string[],
  filePath: string,
  fileName: string,
): DepLenzSymbol[] {
  const symbols: DepLenzSymbol[] = [];
  const seenIds = new Set<string>();
  const moduleName = inferModuleNameFromPath(filePath);

  const fnHeadRe =
    /^(pub(?:\s*\([^)]+\))?\s+)?(?:default\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+(?:"[^"]*"\s+)?)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^{;(]*>)?\s*(\()/;
  const structHeadRe =
    /^(pub(?:\s*\([^)]+\))?\s+)?struct\s+([A-Za-z_][A-Za-z0-9_]*)/;
  const traitHeadRe =
    /^(pub(?:\s*\([^)]+\))?\s+)?(?:unsafe\s+)?trait\s+([A-Za-z_][A-Za-z0-9_]*)/;
  const implHeadRe =
    /^impl(?:\s*<[^>]*>)?\s+(?:([A-Za-z_][A-Za-z0-9_:<>]*)\s+for\s+)?([A-Za-z_][A-Za-z0-9_]*)/;

  let currentImplTarget: string | null = null;
  let implBraceDepth = 0;
  let runningBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("#[") ||
      trimmed.startsWith("#![")
    ) {
      for (const ch of rawLine) {
        if (ch === "{") runningBraceDepth++;
        else if (ch === "}") runningBraceDepth--;
      }
      if (currentImplTarget && runningBraceDepth < implBraceDepth) {
        currentImplTarget = null;
      }
      continue;
    }

    const implMatch = implHeadRe.exec(trimmed);
    if (implMatch) {
      currentImplTarget = implMatch[2];
      for (const ch of rawLine) {
        if (ch === "{") runningBraceDepth++;
        else if (ch === "}") runningBraceDepth--;
      }
      implBraceDepth = runningBraceDepth;
      continue;
    }

    const fnMatch = fnHeadRe.exec(trimmed);
    if (fnMatch) {
      const isPub = Boolean(fnMatch[1]) || Boolean(currentImplTarget);
      const rawName = fnMatch[2];
      const startCol = rawLine.indexOf(trimmed) + fnMatch[0].length - 1;
      const scan = scanBalancedParams(lines, i, startCol);
      const params = scan ? scan.params : "";
      const returnType = scan ? scan.returnType : "";
      const lineStart = i + 1;
      const isTraitMethodSig =
        trimmed.endsWith(";") && !trimmed.includes("{");
      const { lineEnd, body } = isTraitMethodSig
        ? { lineEnd: i + 1, body: rawLine }
        : extractBlockBody(lines, i);
      const isMethod = Boolean(currentImplTarget);
      const symbolName = rawName;
      const id =
        isMethod && seenIds.has(`${filePath}:${symbolName}`)
          ? `${filePath}:${currentImplTarget}::${symbolName}`
          : `${filePath}:${symbolName}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        const sigPrefix = currentImplTarget
          ? `fn ${currentImplTarget}::${rawName}`
          : `fn ${rawName}`;
        const signature = cleanSignature(
          `${sigPrefix}(${params})${returnType ? ` -> ${returnType}` : ""}`,
        );
        symbols.push({
          id,
          name: symbolName,
          kind: isMethod ? "method" : "function",
          filePath,
          fileName,
          lineStart,
          lineEnd,
          signature,
          body,
          isExported: isPub,
          isDefaultExport: rawName === "main" || rawName === "new",
          calls: extractInvokedNames(body, rawName),
          language: "rust",
          moduleName,
        });
      }

      // Advance line counter while updating brace depth for enclosing impl tracking
      for (let k = i; k < lineEnd && k < lines.length; k++) {
        for (const ch of lines[k]) {
          if (ch === "{") runningBraceDepth++;
          else if (ch === "}") runningBraceDepth--;
        }
      }
      if (currentImplTarget && runningBraceDepth < implBraceDepth) {
        currentImplTarget = null;
      }
      i = Math.max(i, lineEnd - 1);
      continue;
    }

    const structMatch = structHeadRe.exec(trimmed);
    if (structMatch) {
      const isPub = Boolean(structMatch[1]);
      const name = structMatch[2];
      const lineStart = i + 1;
      const { lineEnd, body } = trimmed.includes("{")
        ? extractBlockBody(lines, i)
        : { lineEnd: i + 1, body: rawLine };
      const id = `${filePath}:${name}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        symbols.push({
          id,
          name,
          kind: "struct",
          filePath,
          fileName,
          lineStart,
          lineEnd,
          signature: cleanSignature(`struct ${name}`),
          body,
          isExported: isPub,
          isDefaultExport: false,
          calls: extractInvokedNames(body, name),
          language: "rust",
          moduleName,
        });
      }
    }

    const traitMatch = traitHeadRe.exec(trimmed);
    if (traitMatch) {
      const isPub = Boolean(traitMatch[1]);
      const name = traitMatch[2];
      const lineStart = i + 1;
      const { lineEnd, body } = extractBlockBody(lines, i);
      const id = `${filePath}:${name}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        symbols.push({
          id,
          name,
          kind: "trait",
          filePath,
          fileName,
          lineStart,
          lineEnd,
          signature: cleanSignature(`trait ${name}`),
          body,
          isExported: isPub,
          isDefaultExport: false,
          calls: extractInvokedNames(body, name),
          language: "rust",
          moduleName,
        });
      }
    }

    for (const ch of rawLine) {
      if (ch === "{") runningBraceDepth++;
      else if (ch === "}") runningBraceDepth--;
    }
    if (currentImplTarget && runningBraceDepth < implBraceDepth) {
      currentImplTarget = null;
    }
  }

  return symbols;
}

const CPP_CONTROL_NON_FUNCTIONS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "sizeof",
  "alignof",
  "decltype",
  "static_assert",
  "throw",
  "delete",
  "new",
  "operator",
]);

function extractCppSymbolsFromFile(
  lines: string[],
  filePath: string,
  fileName: string,
): DepLenzSymbol[] {
  const symbols: DepLenzSymbol[] = [];
  const seenIds = new Set<string>();
  const moduleName = inferModuleNameFromPath(filePath);

  const classOrStructRe =
    /^(?:template\s*<[^>]*>\s*)?(class|struct)\s+(?:[A-Z0-9_]+\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^{;]+)?\{/;
  const methodOrFnHeadRe =
    /^(?:template\s*<[^>]*>\s*)?(?:(?:inline|static|virtual|explicit|constexpr|consteval|friend|extern)\s+)*([A-Za-z_][A-Za-z0-9_:<>,\s*&~]*?)\s+([A-Za-z_~][A-Za-z0-9_]*(?:::[A-Za-z_~][A-Za-z0-9_]*)?)\s*(\()/;

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("#")
    ) {
      i++;
      continue;
    }

    // 1. Class or struct block
    const csMatch = classOrStructRe.exec(trimmed);
    if (csMatch) {
      const kind = csMatch[1] === "struct" ? "struct" : "class";
      const name = csMatch[2];
      const lineStart = i + 1;
      const { lineEnd, body } = extractBlockBody(lines, i);
      const id = `${filePath}:${name}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        symbols.push({
          id,
          name,
          kind,
          filePath,
          fileName,
          lineStart,
          lineEnd,
          signature: cleanSignature(`${kind} ${name}`),
          body,
          isExported: true,
          isDefaultExport: false,
          calls: extractInvokedNames(body, name),
          language: "cpp",
          moduleName,
        });
      }
      i++;
      continue;
    }

    // 2. Function or ClassName::methodName definition
    const fnMatch = methodOrFnHeadRe.exec(trimmed);
    if (fnMatch) {
      const returnTypeRaw = fnMatch[1].trim();
      const qualifiedName = fnMatch[2].trim();
      const shortName = qualifiedName.includes("::")
        ? qualifiedName.split("::").pop()!
        : qualifiedName;

      if (
        !CPP_CONTROL_NON_FUNCTIONS.has(shortName) &&
        !CPP_CONTROL_NON_FUNCTIONS.has(returnTypeRaw) &&
        !returnTypeRaw.startsWith("return") &&
        !returnTypeRaw.startsWith("else")
      ) {
        const startCol = rawLine.indexOf(trimmed) + fnMatch[0].length - 1;
        const scan = scanBalancedParams(lines, i, startCol);
        if (scan) {
          // Check if followed by `{` on this line or next line (definition vs prototype)
          const lookahead =
            lines[i] +
            (i + 1 < lines.length ? "\n" + lines[i + 1] : "") +
            (i + 2 < lines.length ? "\n" + lines[i + 2] : "");
          const hasBody = lookahead.includes("{");
          const isHeader =
            filePath.endsWith(".h") ||
            filePath.endsWith(".hpp") ||
            filePath.endsWith(".hh") ||
            filePath.endsWith(".hxx");

          if (hasBody || isHeader) {
            const lineStart = i + 1;
            const { lineEnd, body } = hasBody
              ? extractBlockBody(lines, i)
              : { lineEnd: i + 1, body: rawLine };
            const isMethod = qualifiedName.includes("::");
            const id = seenIds.has(`${filePath}:${shortName}`)
              ? `${filePath}:${qualifiedName}`
              : `${filePath}:${shortName}`;

            if (!seenIds.has(id)) {
              seenIds.add(id);
              const signature = cleanSignature(
                `${returnTypeRaw} ${qualifiedName}(${scan.params})`,
              );
              symbols.push({
                id,
                name: shortName,
                kind: isMethod ? "method" : "function",
                filePath,
                fileName,
                lineStart,
                lineEnd,
                signature,
                body,
                isExported: !/\bstatic\b/.test(returnTypeRaw) || isMethod,
                isDefaultExport: shortName === "main",
                calls: extractInvokedNames(body, shortName),
                language: "cpp",
                moduleName,
              });
            }
            if (hasBody) {
              i = Math.max(i + 1, lineEnd);
              continue;
            }
          }
        }
      }
    }

    i++;
  }

  return symbols;
}

/**
 * Parses a code file content line by line to extract functions,
 * components, hooks, methods, structs, traits, and classes across
 * TypeScript/JavaScript, Rust, and C/C++. Signatures are extracted with
 * balanced scanning — never truncated, multi-line aware, return types
 * included.
 */
export function extractSymbolsFromFile(
  content: string,
  filePath: string,
  fileName: string,
): DepLenzSymbol[] {
  if (!content) return [];

  const cacheKey = `${filePath}\0${fileName}\0${fingerprintContent(content)}`;
  const cached = symbolExtractCache.get(cacheKey);
  if (cached) return cached;

  const lines = content.split("\n");

  if (isRustFilePath(filePath) || isRustFilePath(fileName)) {
    const rustSymbols = extractRustSymbolsFromFile(lines, filePath, fileName);
    setBoundedCache(symbolExtractCache, cacheKey, rustSymbols);
    return rustSymbols;
  }

  if (isCppFilePath(filePath) || isCppFilePath(fileName)) {
    const cppSymbols = extractCppSymbolsFromFile(lines, filePath, fileName);
    setBoundedCache(symbolExtractCache, cacheKey, cppSymbols);
    return cppSymbols;
  }

  const symbols: DepLenzSymbol[] = [];
  const langTag = detectFileLanguageTag(filePath);
  const moduleName = inferModuleNameFromPath(filePath);

  // Head patterns capture the NAME and (for callables) end exactly at the
  // opening "(" — parameter text is then balanced-scanned, never regexed.
  const functionDeclHead =
    /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([a-zA-Z0-9_$]+)\s*(?:<[^{;=]*>)?\s*(\()/;
  const arrowDeclHead =
    /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::\s*((?:[^=]|=(?=>))+?))?\s*=(?![=>])\s*(?:(?:React\.)?(?:memo|forwardRef)\s*\(\s*)?(?:async\s*)?(\()?/;
  const functionExprHead =
    /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::\s*((?:[^=]|=(?=>))+?))?\s*=(?![=>])\s*(?:async\s+)?function\s*\*?\s*(?:[a-zA-Z0-9_$]+)?\s*(\()/;
  const classDeclRegex =
    /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/;

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*")
    ) {
      i++;
      continue;
    }

    const isExported = trimmed.startsWith("export");
    const isDefaultExport = /^export\s+default\b/.test(trimmed);
    let name = "";
    let kind: SymbolKind = "function";
    let params = "";
    let returnType = "";
    let matched = false;

    const callableHead =
      functionDeclHead.exec(trimmed) || functionExprHead.exec(trimmed);
    if (callableHead) {
      name = callableHead[1];
      const startCol = rawLine.indexOf(trimmed) + callableHead[0].length - 1;
      const scan = scanBalancedParams(lines, i, startCol);
      if (scan) {
        params = scan.params;
        returnType = scan.returnType;
        matched = true;
        kind = determineSymbolKind(name, content, i);
      }
    } else {
      const am = arrowDeclHead.exec(trimmed);
      if (am) {
        name = am[1];
        if (am[3] === "(") {
          const startCol = rawLine.indexOf(trimmed) + am[0].length - 1;
          const scan = scanBalancedParams(lines, i, startCol);
          // Must be followed by =>, otherwise it's `const x = (something)`
          if (scan && scan.afterArrow) {
            params = scan.params;
            returnType = scan.returnType;
            matched = true;
            kind = determineSymbolKind(name, content, i);
          }
        } else {
          // Single-param arrow: const f = x => ...
          const rest = trimmed.slice(am[0].length);
          const sp = /^([a-zA-Z_$][\w$]*)\s*=>/.exec(rest);
          if (sp) {
            params = sp[1];
            matched = true;
            kind = determineSymbolKind(name, content, i);
          }
        }
      }
    }

    if (!matched) {
      const cm = classDeclRegex.exec(trimmed);
      if (cm && isValidIdentifier(cm[1])) {
        name = cm[1];
        const lineStart = i + 1;
        const { lineEnd, body } = extractBlockBody(lines, i);
        symbols.push({
          id: `${filePath}:${name}`,
          name,
          kind: "class",
          filePath,
          fileName,
          lineStart,
          lineEnd,
          signature: cleanSignature(`class ${name}`),
          body,
          isExported,
          isDefaultExport,
          calls: extractInvokedNames(body, name),
          language: langTag,
          moduleName,
        });
        i = Math.max(i + 1, lineEnd);
        continue;
      }
      i++;
      continue;
    }

    if (name && isValidIdentifier(name)) {
      const lineStart = i + 1;
      const { lineEnd, body } = extractBlockBody(lines, i);
      const calls = extractInvokedNames(body, name);
      const signature = cleanSignature(
        `${name}(${params})${returnType ? `: ${returnType}` : ""}`,
      );

      symbols.push({
        id: `${filePath}:${name}`,
        name,
        kind,
        filePath,
        fileName,
        lineStart,
        lineEnd,
        signature,
        body,
        isExported,
        isDefaultExport,
        calls,
        language: langTag,
        moduleName,
      });

      i = Math.max(i + 1, lineEnd);
    } else {
      i++;
    }
  }

  setBoundedCache(symbolExtractCache, cacheKey, symbols);
  return symbols;
}

function determineSymbolKind(
  name: string,
  _content: string,
  _lineIndex: number,
): SymbolKind {
  if (/^use[A-Z0-9_]/.test(name)) return "hook";
  if (/^[A-Z][a-zA-Z0-9_$]*$/.test(name)) return "component";
  return "function";
}

function isValidIdentifier(name: string): boolean {
  const reserved = new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "return",
    "describe",
    "it",
    "test",
  ]);
  return !reserved.has(name) && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

function cleanSignature(sig: string): string {
  return sig.replace(/\s+/g, " ").trim();
}

/**
 * Extracts lines belonging to a code block starting at lineIndex using
 * brace balancing.
 */
function extractBlockBody(
  lines: string[],
  startLine: number,
): { lineEnd: number; body: string } {
  let openBraces = 0;
  let hasOpened = false;
  let endLine = startLine;
  const collected: string[] = [];

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    collected.push(line);

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === "{") {
        openBraces++;
        hasOpened = true;
      } else if (char === "}") {
        openBraces--;
      }
    }

    if (hasOpened && openBraces <= 0) {
      endLine = i;
      break;
    }

    if (
      !hasOpened &&
      line.includes("=>") &&
      (line.endsWith(";") || i > startLine + 4)
    ) {
      endLine = i;
      break;
    }
  }

  return {
    lineEnd: endLine + 1,
    body: collected.join("\n"),
  };
}

/**
 * Extracts identifiers called or instantiated inside a function body.
 */
export function extractInvokedNames(body: string, selfName: string): string[] {
  const found = new Set<string>();

  const callRegex =
    /(?:\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:(?:::\s*)?<[^>;{}()]+>\s*)?\()/g;
  let match: RegExpExecArray | null;

  while ((match = callRegex.exec(body)) !== null) {
    const identifier = match[1];
    if (
      identifier !== selfName &&
      !isLanguageKeyword(identifier) &&
      isValidIdentifier(identifier)
    ) {
      found.add(identifier);
    }
  }

  const jsxRegex = /<([A-Z][a-zA-Z0-9_$]*)\b/g;
  while ((match = jsxRegex.exec(body)) !== null) {
    const componentName = match[1];
    if (componentName !== selfName && isValidIdentifier(componentName)) {
      found.add(componentName);
    }
  }

  // Rust / C++ struct literal or brace initialization: `StructName { ... }`
  const structInitRegex = /\b([A-Z][a-zA-Z0-9_]*)\s*\{/g;
  while ((match = structInitRegex.exec(body)) !== null) {
    const structName = match[1];
    if (
      structName !== selfName &&
      !isLanguageKeyword(structName) &&
      isValidIdentifier(structName)
    ) {
      found.add(structName);
    }
  }

  return Array.from(found);
}

const LANGUAGE_KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "new",
  "delete",
  "in",
  "of",
  "await",
  "yield",
  "import",
  "export",
  "from",
  "as",
  "class",
  "function",
  "const",
  "let",
  "var",
  "super",
  "this",
  "require",
  "describe",
  "it",
  "test",
  "expect",
  "console",
  "Math",
  "Object",
  "Array",
  "String",
  "Number",
  "Boolean",
  "Promise",
  "Map",
  "Set",
  "JSON",
  "Error",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  // Rust & C/C++ keywords / std macros
  "fn",
  "pub",
  "mod",
  "use",
  "impl",
  "trait",
  "struct",
  "enum",
  "match",
  "loop",
  "move",
  "mut",
  "ref",
  "Self",
  "self",
  "Some",
  "None",
  "Ok",
  "Err",
  "Box",
  "Vec",
  "Arc",
  "Rc",
  "Mutex",
  "RwLock",
  "Option",
  "Result",
  "sizeof",
  "alignof",
  "static_cast",
  "dynamic_cast",
  "reinterpret_cast",
  "const_cast",
  "printf",
  "fprintf",
  "snprintf",
  "malloc",
  "calloc",
  "realloc",
  "free",
  "memcpy",
  "memset",
  "std",
]);

function isLanguageKeyword(word: string): boolean {
  return LANGUAGE_KEYWORDS.has(word);
}

/* ------------------------------------------------------------------ */
/* Type / interface / enum / struct / trait extraction                 */
/* ------------------------------------------------------------------ */

const TYPE_BUILTINS = new Set([
  "React",
  "Promise",
  "Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Record",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "Readonly",
  "Exclude",
  "Extract",
  "ReturnType",
  "Parameters",
  "Date",
  "RegExp",
  "Error",
  "TypeError",
  "JSON",
  "Math",
  "Number",
  "String",
  "Boolean",
  "Object",
  "Symbol",
  "BigInt",
  "JSX",
  "Element",
  "Node",
  "Event",
  "Buffer",
  "Intl",
  "Vec",
  "Option",
  "Result",
  "Box",
  "Arc",
  "Rc",
  "HashMap",
  "HashSet",
  "BTreeMap",
  "Mutex",
  "RwLock",
]);

function depthDelta(line: string): number {
  let d = 0;
  for (const ch of line) {
    if (ch === "{" || ch === "(" || ch === "[") d++;
    else if (ch === "}" || ch === ")" || ch === "]") d--;
  }
  return d;
}

export function extractTypeDeclarations(
  content: string,
  filePath: string,
): TypeDeclaration[] {
  if (!content) return [];

  const cacheKey = `${filePath}\0${fingerprintContent(content)}`;
  const cached = typeExtractCache.get(cacheKey);
  if (cached) return cached;

  const out: TypeDeclaration[] = [];
  const lines = content.split("\n");
  const isRust = isRustFilePath(filePath);
  const isCpp = isCppFilePath(filePath);

  const head = isRust
    ? /^(pub(?:\s*\([^)]+\))?\s+)?(?:unsafe\s+)?(struct|enum|trait|type)\s+([A-Za-z_]\w*)/
    : isCpp
      ? /^(?:template\s*<[^>]*>\s*)?()(struct|class|enum(?:\s+class)?|using)\s+([A-Za-z_]\w*)/
      : /^(export\s+)?(?:declare\s+)?(interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

  for (let i = 0; i < lines.length; i++) {
    const tr = lines[i].trim();
    if (
      !tr ||
      tr.startsWith("//") ||
      tr.startsWith("*") ||
      tr.startsWith("/*") ||
      tr.startsWith("#")
    )
      continue;
    const m = head.exec(tr);
    if (!m) continue;
    const [, exp, rawKind, name] = m;
    const kind = (
      rawKind.startsWith("enum")
        ? "enum"
        : rawKind === "using"
          ? "type"
          : rawKind
    ) as TypeDeclaration["kind"];

    // Skip forward declarations in C++ like `class Foo;`
    if (isCpp && tr.endsWith(";") && !tr.includes("{") && rawKind !== "using") {
      continue;
    }

    let body = "";
    let lineEnd = i + 1;
    if (kind === "type" || (!tr.includes("{") && tr.endsWith(";"))) {
      // Capture until a top-level ";" (multi-line union/object types or tuple structs).
      const buf = [lines[i]];
      let depth = depthDelta(lines[i]);
      let j = i;
      while (j < lines.length - 1 && j < i + 30) {
        if (depth <= 0 && /;/.test(buf[buf.length - 1])) break;
        j++;
        buf.push(lines[j]);
        depth += depthDelta(lines[j]);
        if (depth <= 0 && /;/.test(lines[j])) break;
      }
      body = buf.join("\n");
      lineEnd = j + 1;
    } else {
      const r = extractBlockBody(lines, i);
      body = r.body;
      lineEnd = r.lineEnd;
    }

    const refs = new Set<string>();
    for (const rm of body.matchAll(/\b([A-Z][A-Za-z0-9_$]*)\b/g)) {
      if (!TYPE_BUILTINS.has(rm[1]) && rm[1] !== name) refs.add(rm[1]);
    }

    out.push({
      name,
      kind,
      filePath,
      lineStart: i + 1,
      lineEnd,
      body,
      isExported: isCpp ? true : !!exp,
      references: [...refs],
    });
  }
  setBoundedCache(typeExtractCache, cacheKey, out);
  return out;
}

/* ------------------------------------------------------------------ */
/* Import / re-export / #include / Rust `use` & `mod` resolution       */
/* ------------------------------------------------------------------ */

export function extractFileImports(
  content: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): FileImport[] {
  if (!content) return [];

  if (isRustFilePath(currentFilePath)) {
    return extractRustFileImports(content, currentFilePath, allFiles);
  }
  if (isCppFilePath(currentFilePath)) {
    return extractCppFileImports(content, currentFilePath, allFiles);
  }

  const imports: FileImport[] = [];
  const importRegex =
    /import\s+(type\s+)?(?:(?:\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)|(?:\{([^}]+)\})|(?:([a-zA-Z0-9_$]+)\s*,\s*\{([^}]+)\}))\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const isTypeOnly = !!match[1];
    const namespaceImport = match[2];
    const defaultImport = match[3] || match[5];
    const namedImportsBlock = match[4] || match[6];
    const sourcePath = match[7];

    const isRelative = sourcePath.startsWith(".") || sourcePath.startsWith("/");
    const importedNames: { name: string; alias?: string }[] = [];

    if (namedImportsBlock) {
      for (const part of namedImportsBlock.split(",")) {
        let clean = part.trim();
        if (!clean) continue;
        if (clean.startsWith("type ")) clean = clean.slice(5).trim();
        if (clean.includes(" as ")) {
          const [orig, alias] = clean.split(/\s+as\s+/);
          importedNames.push({ name: orig.trim(), alias: alias.trim() });
        } else {
          importedNames.push({ name: clean });
        }
      }
    }

    const resolvedFilePath = isRelative
      ? resolveRelativeImportPath(sourcePath, currentFilePath, allFiles)
      : undefined;

    imports.push({
      importedNames,
      defaultImport,
      namespaceImport,
      sourcePath,
      isRelative,
      resolvedFilePath,
      isTypeOnly,
    });
  }

  // FIX 1a: barrel re-exports — `export { A as B } from "./x"`,
  // `export * from "./x"`, `export type { T } from "./x"`.
  const reExportRegex =
    /export\s+(?:type\s+)?(?:\{([^}]+)\}|(\*))\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportRegex.exec(content)) !== null) {
    const namedBlock = match[1];
    const star = !!match[2];
    const sourcePath = match[3];
    const isRelative = sourcePath.startsWith(".") || sourcePath.startsWith("/");
    const importedNames: { name: string; alias?: string }[] = [];
    if (namedBlock) {
      for (const part of namedBlock.split(",")) {
        let clean = part.trim();
        if (!clean) continue;
        if (clean.startsWith("type ")) clean = clean.slice(5).trim();
        if (clean.includes(" as ")) {
          const [orig, alias] = clean.split(/\s+as\s+/);
          importedNames.push({ name: orig.trim(), alias: alias.trim() });
        } else {
          importedNames.push({ name: clean });
        }
      }
    }
    imports.push({
      importedNames,
      sourcePath,
      isRelative,
      resolvedFilePath: isRelative
        ? resolveRelativeImportPath(sourcePath, currentFilePath, allFiles)
        : undefined,
      isReExport: true,
      starReExport: star,
    });
  }

  // FIX 1a: dynamic imports — import("./x") edges (code splitting).
  const dynamicRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(content)) !== null) {
    const sourcePath = match[1];
    const isRelative = sourcePath.startsWith(".") || sourcePath.startsWith("/");
    imports.push({
      importedNames: [],
      sourcePath,
      isRelative,
      resolvedFilePath: isRelative
        ? resolveRelativeImportPath(sourcePath, currentFilePath, allFiles)
        : undefined,
      isDynamic: true,
    });
  }

  return imports;
}

function extractRustFileImports(
  content: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): FileImport[] {
  const imports: FileImport[] = [];

  // 1. `pub mod foo;` / `mod foo;` declarations
  const modRegex = /^(?:\s*pub(?:\([^)]+\))?\s+|\s*)mod\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = modRegex.exec(content)) !== null) {
    const modName = m[1];
    const resolvedFilePath = resolveRelativeImportPath(
      `./${modName}`,
      currentFilePath,
      allFiles,
    );
    imports.push({
      importedNames: [],
      namespaceImport: modName,
      sourcePath: `./${modName}`,
      isRelative: true,
      resolvedFilePath,
      isWildcardInclude: true,
    });
  }

  // 2. `use ...;` statements
  const useRegex = /^(?:\s*pub(?:\([^)]+\))?\s+|\s*)use\s+([^;]+);/gm;
  while ((m = useRegex.exec(content)) !== null) {
    const rawUse = m[1].replace(/\s+/g, " ").trim();
    const isInternal =
      rawUse.startsWith("crate::") ||
      rawUse.startsWith("super::") ||
      rawUse.startsWith("self::");

    // Extract brace group if present: `crate::storage::wal::{WalWriter, WalRecord}`
    const braceIdx = rawUse.indexOf("{");
    let pathPrefix = rawUse;
    const importedNames: { name: string; alias?: string }[] = [];
    let isWildcard = false;

    if (braceIdx !== -1) {
      pathPrefix = rawUse.slice(0, braceIdx).replace(/::\s*$/, "");
      const inside = rawUse.slice(braceIdx + 1, rawUse.lastIndexOf("}"));
      for (const item of inside.split(",")) {
        const cl = item.trim();
        if (!cl || cl === "self") continue;
        if (cl === "*") {
          isWildcard = true;
          continue;
        }
        if (cl.includes(" as ")) {
          const [orig, alias] = cl.split(/\s+as\s+/);
          importedNames.push({ name: orig.trim(), alias: alias.trim() });
        } else {
          const lastSeg = cl.split("::").pop()!.trim();
          importedNames.push({ name: lastSeg });
        }
      }
    } else if (rawUse.endsWith("::*")) {
      pathPrefix = rawUse.slice(0, -3);
      isWildcard = true;
    } else {
      const segs = rawUse.split("::");
      const last = segs.pop()!.trim();
      pathPrefix = segs.join("::");
      if (last.includes(" as ")) {
        const [orig, alias] = last.split(/\s+as\s+/);
        importedNames.push({ name: orig.trim(), alias: alias.trim() });
      } else {
        importedNames.push({ name: last });
      }
    }

    if (isInternal) {
      const relSource = convertRustModulePathToRelative(
        pathPrefix,
        currentFilePath,
      );
      let resolvedFilePath = resolveRelativeImportPath(
        relSource,
        currentFilePath,
        allFiles,
      );
      // If `use crate::module::func_name` had `func_name` as the last segment,
      // `pathPrefix` is `crate::module` which resolves directly to `module.rs`!
      // If `use crate::module` imported the module itself, try including the last item too.
      if (!resolvedFilePath && importedNames.length === 1) {
        const altSource = convertRustModulePathToRelative(
          `${pathPrefix}::${importedNames[0].name}`,
          currentFilePath,
        );
        resolvedFilePath = resolveRelativeImportPath(
          altSource,
          currentFilePath,
          allFiles,
        );
      }

      imports.push({
        importedNames,
        sourcePath: rawUse,
        isRelative: true,
        resolvedFilePath,
        isWildcardInclude: isWildcard,
      });
    } else {
      const crateName = rawUse.split("::")[0].trim();
      imports.push({
        importedNames,
        sourcePath: crateName,
        isRelative: false,
      });
    }
  }

  return imports;
}

function convertRustModulePathToRelative(
  rustPath: string,
  currentFilePath: string,
): string {
  if (rustPath.startsWith("crate::") || rustPath === "crate") {
    const rest = rustPath.slice(5).replace(/^::/, "").replace(/::/g, "/");
    // Find the crate `src/` directory in `currentFilePath`
    const srcIdx = currentFilePath.indexOf("/src/");
    if (srcIdx !== -1) {
      return `${currentFilePath.slice(0, srcIdx + 4)}/${rest || "lib"}`;
    }
    return `./${rest || "lib"}`;
  }
  if (rustPath.startsWith("self::") || rustPath === "self") {
    const rest = rustPath.slice(4).replace(/^::/, "").replace(/::/g, "/");
    return `./${rest}`;
  }
  if (rustPath.startsWith("super::") || rustPath === "super") {
    let cur = rustPath;
    const ups: string[] = [];
    while (cur.startsWith("super")) {
      ups.push("..");
      cur = cur.slice(5).replace(/^::/, "");
    }
    const rest = cur.replace(/::/g, "/");
    return `${ups.join("/")}${rest ? `/${rest}` : ""}`;
  }
  return `./${rustPath.replace(/::/g, "/")}`;
}

function extractCppFileImports(
  content: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): FileImport[] {
  const imports: FileImport[] = [];
  const includeRegex = /^\s*#\s*include\s*([<"])([^>"]+)[>"]/gm;
  let m: RegExpExecArray | null;
  while ((m = includeRegex.exec(content)) !== null) {
    const bracket = m[1];
    const headerPath = m[2].trim();
    const isSystem = bracket === "<";

    // Even `<...>` includes can sometimes point to project headers in `include/`
    const resolvedLocal = resolveRelativeImportPath(
      headerPath.startsWith(".") ? headerPath : `./${headerPath}`,
      currentFilePath,
      allFiles,
    );

    if (!isSystem || resolvedLocal) {
      imports.push({
        importedNames: [],
        sourcePath: headerPath,
        isRelative: true,
        resolvedFilePath: resolvedLocal,
        isWildcardInclude: true,
      });
    } else {
      imports.push({
        importedNames: [],
        sourcePath: `<${headerPath}>`,
        isRelative: false,
        isWildcardInclude: true,
      });
    }
  }
  return imports;
}

/** `export default Identifier;` — links a local symbol to the default slot. */
export function extractFileDefaultRef(content: string): string | undefined {
  const m =
    /^export\s+default\s+(?!function\b|class\b|async\b)([a-zA-Z_$][\w$]*)\s*;?\s*$/m.exec(
      content,
    );
  return m?.[1];
}

export interface LazyBinding {
  name: string;
  sourcePath: string;
}

/** `const Dashboard = lazy(() => import("./pages/Dashboard"))` bindings. */
export function extractLazyBindings(content: string): LazyBinding[] {
  if (!content) return [];
  const cacheKey = fingerprintContent(content);
  const cached = lazyExtractCache.get(cacheKey);
  if (cached) return cached;

  const out: LazyBinding[] = [];
  const re =
    /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:React\.)?lazy\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({ name: m[1], sourcePath: m[2] });
  }
  setBoundedCache(lazyExtractCache, cacheKey, out);
  return out;
}

/**
 * O(1) lookup index for relative import resolution across a ProcessedFile[] array.
 * Eliminates the O(N) linear scan per candidate per import that caused O(N²) stalls
 * on large codebases.
 */
interface FilePathLookupIndex {
  /** Exact relativePath -> relativePath */
  exact: Map<string, string>;
  /** Suffix after a "/" -> first matching relativePath (handles f.relativePath.endsWith(`/${candidate}`)) */
  bySlashSuffix: Map<string, string>;
  /** All relativePaths in original order for rare non-slash suffix matches */
  allPaths: string[];
}

const fileLookupIndexCache = new WeakMap<
  ProcessedFile[],
  FilePathLookupIndex
>();

function getFileLookupIndex(allFiles: ProcessedFile[]): FilePathLookupIndex {
  let index = fileLookupIndexCache.get(allFiles);
  if (index) return index;

  const exact = new Map<string, string>();
  const bySlashSuffix = new Map<string, string>();
  const allPaths: string[] = [];

  for (let i = 0; i < allFiles.length; i++) {
    const rel = allFiles[i].relativePath;
    allPaths.push(rel);
    if (!exact.has(rel)) {
      exact.set(rel, rel);
    }
    let slashIdx = rel.indexOf("/");
    while (slashIdx !== -1) {
      const suffix = rel.slice(slashIdx + 1);
      if (suffix && !bySlashSuffix.has(suffix)) {
        bySlashSuffix.set(suffix, rel);
      }
      slashIdx = rel.indexOf("/", slashIdx + 1);
    }
  }

  index = { exact, bySlashSuffix, allPaths };
  fileLookupIndexCache.set(allFiles, index);
  return index;
}

export function resolveRelativeImportPath(
  importSource: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): string | undefined {
  if (allFiles.length === 0) return undefined;

  let targetBasePath = "";
  if (
    !importSource.startsWith(".") &&
    !importSource.startsWith("/") &&
    importSource.includes("/")
  ) {
    targetBasePath = importSource;
  } else {
    const currentSegments = currentFilePath.split("/");
    currentSegments.pop();

    const sourceSegments = importSource.split("/");
    for (const seg of sourceSegments) {
      if (!seg || seg === ".") continue;
      else if (seg === "..") {
        if (currentSegments.length > 0) currentSegments.pop();
      } else {
        currentSegments.push(seg);
      }
    }
    targetBasePath = currentSegments.join("/");
  }

  const rawClean = importSource.replace(/^\.\//, "");
  const candidates = [
    targetBasePath,
    `${targetBasePath}.ts`,
    `${targetBasePath}.tsx`,
    `${targetBasePath}.js`,
    `${targetBasePath}.jsx`,
    `${targetBasePath}.rs`,
    `${targetBasePath}/mod.rs`,
    `${targetBasePath}.h`,
    `${targetBasePath}.hpp`,
    `${targetBasePath}.hh`,
    `${targetBasePath}.hxx`,
    `${targetBasePath}.cpp`,
    `${targetBasePath}.cc`,
    `${targetBasePath}.c`,
    `${targetBasePath}/index.ts`,
    `${targetBasePath}/index.tsx`,
    `${targetBasePath}/index.js`,
    `${targetBasePath}/index.jsx`,
    rawClean,
    `src/${rawClean}`,
    `include/${rawClean}`,
    `${rawClean}.rs`,
    `src/${rawClean}.rs`,
    `src/${rawClean}/mod.rs`,
  ];

  const index = getFileLookupIndex(allFiles);

  for (const candidate of candidates) {
    if (!candidate) continue;
    // 1. f.relativePath === candidate
    const exactMatch = index.exact.get(candidate);
    if (exactMatch !== undefined) return exactMatch;

    // 2. f.relativePath.endsWith(`/${candidate}`)
    const suffixMatch = index.bySlashSuffix.get(candidate);
    if (suffixMatch !== undefined) return suffixMatch;

    // 3. candidate.endsWith(f.relativePath) — check slash-delimited suffixes of candidate in O(segments)
    let slashIdx = candidate.indexOf("/");
    while (slashIdx !== -1) {
      const sub = candidate.slice(slashIdx + 1);
      const subMatch = index.exact.get(sub);
      if (subMatch !== undefined) return subMatch;
      slashIdx = candidate.indexOf("/", slashIdx + 1);
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Web Dev Codebase Syntax Error & Anomaly Validator                  */
/* ------------------------------------------------------------------ */

interface DelimiterItem {
  char: string;
  line: number;
  col: number;
}

export function validateFileSyntax(
  content: string,
  filePath: string,
  fileName: string,
): SyntaxDiagnostic[] {
  if (!content) return [];
  const cacheKey = `${filePath}\0${fileName}\0${fingerprintContent(content)}`;
  const cached = syntaxDiagnosticCache.get(cacheKey);
  if (cached) return cached;

  const diagnostics: SyntaxDiagnostic[] = [];
  const lines = content.split("\n");

  if (filePath.endsWith(".json") || fileName.endsWith(".json")) {
    try {
      JSON.parse(content);
    } catch (err: any) {
      let line = 1;
      let col = 1;
      const match =
        /line\s+(\d+)\s+column\s+(\d+)/i.exec(err.message) ||
        /at\s+position\s+(\d+)/i.exec(err.message);
      if (match && match[2]) {
        line = parseInt(match[1], 10);
        col = parseInt(match[2], 10);
      } else if (match && match[1]) {
        const pos = parseInt(match[1], 10);
        let count = 0;
        for (let l = 0; l < lines.length; l++) {
          if (count + lines[l].length >= pos) {
            line = l + 1;
            col = Math.max(1, pos - count);
            break;
          }
          count += lines[l].length + 1;
        }
      }
      diagnostics.push({
        id: `${filePath}:${line}:${col}:json`,
        filePath,
        fileName,
        line,
        column: col,
        message: `JSON Syntax Error: ${err.message}`,
        severity: "error",
        codeSnippet: lines[line - 1]?.trim() || lines[0]?.trim(),
        category: "json-syntax",
      });
    }
    setBoundedCache(syntaxDiagnosticCache, cacheKey, diagnostics);
    return diagnostics;
  }

  const stack: DelimiterItem[] = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let templateStartLine = 0;
  let templateStartCol = 0;
  let inMultiComment = false;
  let multiCommentStartLine = 0;

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    let c = 0;

    while (c < lineText.length) {
      const ch = lineText[c];
      const next = c + 1 < lineText.length ? lineText[c + 1] : "";

      if ((inSingleQuote || inDoubleQuote || inTemplate) && ch === "\\") {
        c += 2;
        continue;
      }

      if (inMultiComment) {
        if (ch === "*" && next === "/") {
          inMultiComment = false;
          c += 2;
          continue;
        }
        c++;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
        if (ch === "/" && next === "/") break;
        if (ch === "/" && next === "*") {
          inMultiComment = true;
          multiCommentStartLine = l + 1;
          c += 2;
          continue;
        }
      }

      if (!inDoubleQuote && !inTemplate && ch === "'") {
        if (
          !inSingleQuote &&
          (isRustFilePath(filePath) || isCppFilePath(filePath))
        ) {
          // In Rust (`&'a str`, `'static`) and C++14 (`1'000'000`), single quotes
          // are lifetimes or digit separators unless closed within a few chars (`'x'`, `'\n'`).
          const restOfLine = lineText.slice(c + 1, c + 8);
          if (!/^(\\.|[^'\\])'/.test(restOfLine)) {
            c++;
            continue;
          }
        }
        inSingleQuote = !inSingleQuote;
        c++;
        continue;
      }

      if (!inSingleQuote && !inTemplate && ch === '"') {
        inDoubleQuote = !inDoubleQuote;
        c++;
        continue;
      }

      if (
        !inSingleQuote &&
        !inDoubleQuote &&
        ch === "`" &&
        !isRustFilePath(filePath) &&
        !isCppFilePath(filePath)
      ) {
        if (inTemplate) {
          inTemplate = false;
        } else {
          inTemplate = true;
          templateStartLine = l + 1;
          templateStartCol = c + 1;
        }
        c++;
        continue;
      }

      if (inSingleQuote || inDoubleQuote) {
        c++;
        continue;
      }

      if (inTemplate) {
        if (ch === "$" && next === "{") {
          stack.push({ char: "{", line: l + 1, col: c + 1 });
          c += 2;
          continue;
        }
        c++;
        continue;
      }

      if (ch === "{" || ch === "(" || ch === "[") {
        stack.push({ char: ch, line: l + 1, col: c + 1 });
      } else if (ch === "}" || ch === ")" || ch === "]") {
        if (stack.length === 0) {
          diagnostics.push({
            id: `${filePath}:${l + 1}:${c + 1}:unexpected`,
            filePath,
            fileName,
            line: l + 1,
            column: c + 1,
            message: `Unexpected closing '${ch}' without matching opening delimiter.`,
            severity: "error",
            codeSnippet: lineText.trim(),
            category: "unexpected-delimiter",
          });
        } else {
          const top = stack.pop()!;
          const matches =
            (top.char === "{" && ch === "}") ||
            (top.char === "(" && ch === ")") ||
            (top.char === "[" && ch === "]");

          if (!matches) {
            diagnostics.push({
              id: `${filePath}:${l + 1}:${c + 1}:mismatch`,
              filePath,
              fileName,
              line: l + 1,
              column: c + 1,
              message: `Mismatched delimiter: encountered closing '${ch}' but expected closing for '${top.char}' opened on line ${top.line}.`,
              severity: "error",
              codeSnippet: lineText.trim(),
              category: "mismatched-delimiter",
            });
          }
        }
      }

      c++;
    }

    if (inSingleQuote) {
      diagnostics.push({
        id: `${filePath}:${l + 1}:unterminated-sq`,
        filePath,
        fileName,
        line: l + 1,
        column: lineText.length,
        message: `Unterminated single-quote string literal on line ${l + 1}.`,
        severity: "error",
        codeSnippet: lineText.trim(),
        category: "unterminated-literal",
      });
      inSingleQuote = false;
    }

    if (inDoubleQuote) {
      diagnostics.push({
        id: `${filePath}:${l + 1}:unterminated-dq`,
        filePath,
        fileName,
        line: l + 1,
        column: lineText.length,
        message: `Unterminated double-quote string literal on line ${l + 1}.`,
        severity: "error",
        codeSnippet: lineText.trim(),
        category: "unterminated-literal",
      });
      inDoubleQuote = false;
    }
  }

  if (inTemplate) {
    diagnostics.push({
      id: `${filePath}:${templateStartLine}:${templateStartCol}:unterminated-template`,
      filePath,
      fileName,
      line: templateStartLine,
      column: templateStartCol,
      message: `Unterminated template literal (\`) opened on line ${templateStartLine}.`,
      severity: "error",
      codeSnippet: lines[templateStartLine - 1]?.trim(),
      category: "unterminated-literal",
    });
  }

  if (inMultiComment) {
    diagnostics.push({
      id: `${filePath}:${multiCommentStartLine}:unterminated-comment`,
      filePath,
      fileName,
      line: multiCommentStartLine,
      column: 1,
      message: `Unterminated multi-line comment (/*) opened on line ${multiCommentStartLine}.`,
      severity: "warning",
      codeSnippet: lines[multiCommentStartLine - 1]?.trim(),
      category: "unterminated-literal",
    });
  }

  for (const item of stack) {
    diagnostics.push({
      id: `${filePath}:${item.line}:${item.col}:unclosed`,
      filePath,
      fileName,
      line: item.line,
      column: item.col,
      message: `Unclosed delimiter '${item.char}' opened on line ${item.line}, column ${item.col}. This syntax error disrupts accurate function and dependency extraction.`,
      severity: "error",
      codeSnippet: lines[item.line - 1]?.trim(),
      category: "unclosed-delimiter",
    });
  }

  setBoundedCache(syntaxDiagnosticCache, cacheKey, diagnostics);
  return diagnostics;
}

/* ------------------------------------------------------------------ */
/* Full Codebase Dependency Graph Builder                             */
/* ------------------------------------------------------------------ */

const UPSTREAM_BFS_CAP = 500;

/** Transitive unique upstream dependents — the true "who breaks" set (1b). */
function computeUpstreamBlast(
  startId: string,
  nodesMap: Map<string, DepLenzGraphNode>,
): number {
  const seen = new Set<string>([startId]);
  let frontier = [startId];
  let count = 0;
  while (frontier.length > 0 && count < UPSTREAM_BFS_CAP) {
    const next: string[] = [];
    for (const id of frontier) {
      const node = nodesMap.get(id);
      if (!node) continue;
      for (const dep of node.dependents) {
        if (!seen.has(dep.symbol.id)) {
          seen.add(dep.symbol.id);
          next.push(dep.symbol.id);
          count++;
          if (count >= UPSTREAM_BFS_CAP) break;
        }
      }
    }
    frontier = next;
  }
  return count;
}

export function buildCodebaseDependencyGraph(
  files: ProcessedFile[],
): DepLenzAnalysisResult {
  const codeFiles = files.filter(isCodeFile);
  const allSymbols: DepLenzSymbol[] = [];
  const fileSymbolsMap = new Map<string, DepLenzSymbol[]>();
  const fileSymbolByNameMap = new Map<string, Map<string, DepLenzSymbol>>();
  const fileImportsMap = new Map<string, FileImport[]>();
  const fileImportBindingMap = new Map<
    string,
    Map<
      string,
      { imp: FileImport; isDefaultBinding: boolean; importedName: string }
    >
  >();
  const fileLazyMap = new Map<string, LazyBinding[]>();
  const fileLazyByNameMap = new Map<string, Map<string, LazyBinding>>();
  const fileTypesMap = new Map<string, TypeDeclaration[]>();
  const typeIndex = new Map<string, TypeDeclaration[]>();
  const allDiagnostics: SyntaxDiagnostic[] = [];
  const filesWithSyntaxErrorsSet = new Set<string>();

  // 1. Syntax validation across all code/web files (excluding TOML)
  for (const file of files) {
    if (
      isWebDevFile(file) &&
      file.textContent &&
      file.extension.toLowerCase() !== "toml"
    ) {
      const diags = validateFileSyntax(
        file.textContent,
        file.relativePath,
        file.name,
      );
      if (diags.length > 0) {
        allDiagnostics.push(...diags);
        filesWithSyntaxErrorsSet.add(file.relativePath);
      }
    }
  }

  // 2. Extract symbols, imports, lazy bindings and type declarations
  for (const file of codeFiles) {
    const text = file.textContent || "";
    const rawSymbols = extractSymbolsFromFile(text, file.relativePath, file.name);
    const dedupedById = new Map<string, DepLenzSymbol>();
    for (const sym of rawSymbols) {
      const existing = dedupedById.get(sym.id);
      if (existing) {
        const mergedCalls = new Set([...existing.calls, ...sym.calls]);
        dedupedById.set(sym.id, { ...existing, calls: [...mergedCalls] });
      } else {
        dedupedById.set(sym.id, sym);
      }
    }
    const symbols = [...dedupedById.values()];
    const imports = extractFileImports(text, file.relativePath, files);
    const lazy = extractLazyBindings(text);
    const types = extractTypeDeclarations(text, file.relativePath);

    allSymbols.push(...symbols);
    fileSymbolsMap.set(file.relativePath, symbols);

    const byName = new Map<string, DepLenzSymbol>();
    for (const s of symbols) {
      if (!byName.has(s.name)) byName.set(s.name, s);
    }
    fileSymbolByNameMap.set(file.relativePath, byName);

    fileImportsMap.set(file.relativePath, imports);
    const bindingMap = new Map<
      string,
      { imp: FileImport; isDefaultBinding: boolean; importedName: string }
    >();
    for (const imp of imports) {
      if (imp.defaultImport && !bindingMap.has(imp.defaultImport)) {
        bindingMap.set(imp.defaultImport, {
          imp,
          isDefaultBinding: true,
          importedName: imp.defaultImport,
        });
      }
      for (const n of imp.importedNames) {
        const localName = n.alias ?? n.name;
        if (!bindingMap.has(localName)) {
          bindingMap.set(localName, {
            imp,
            isDefaultBinding: false,
            importedName: n.name,
          });
        }
      }
    }
    fileImportBindingMap.set(file.relativePath, bindingMap);

    fileLazyMap.set(file.relativePath, lazy);
    if (lazy.length > 0) {
      const lMap = new Map<string, LazyBinding>();
      for (const l of lazy) {
        if (!lMap.has(l.name)) lMap.set(l.name, l);
      }
      fileLazyByNameMap.set(file.relativePath, lMap);
    }

    fileTypesMap.set(file.relativePath, types);
    for (const t of types) {
      const arr = typeIndex.get(t.name) || [];
      arr.push(t);
      typeIndex.set(t.name, arr);
    }
  }

  const symbolByName = new Map<string, DepLenzSymbol[]>();
  const symbolById = new Map<string, DepLenzSymbol>();
  for (const sym of allSymbols) {
    symbolById.set(sym.id, sym);
    const list = symbolByName.get(sym.name) || [];
    list.push(sym);
    symbolByName.set(sym.name, list);
  }

  /* ---- FIX 1a: per-file export tables, following re-export chains ---- */
  // exportTable: filePath -> exportedName -> symbolId ("default" = default export)
  const exportTable = new Map<string, Map<string, string>>();
  const tableFor = (fp: string): Map<string, string> => {
    let t = exportTable.get(fp);
    if (!t) {
      t = new Map();
      exportTable.set(fp, t);
    }
    return t;
  };

  // Pass 1: direct exports from declarations.
  for (const sym of allSymbols) {
    if (!sym.isExported) continue;
    const t = tableFor(sym.filePath);
    // Prefer concrete implementation in .cpp/.cc/.c over header prototype when both exist
    const existingId = t.get(sym.name);
    if (!existingId) {
      t.set(sym.name, sym.id);
    }
    if (sym.isDefaultExport) t.set("default", sym.id);
  }
  // `export default Identifier;` references.
  for (const file of codeFiles) {
    const ref = extractFileDefaultRef(file.textContent || "");
    if (!ref) continue;
    const sym = fileSymbolByNameMap.get(file.relativePath)?.get(ref);
    if (sym) tableFor(file.relativePath).set("default", sym.id);
  }

  // Pass 1b (C/C++ header <-> implementation bridge):
  // When `world.cpp` `#include "world.hpp"`, register `world.cpp`'s exported symbols
  // on `world.hpp`'s export table (overwriting header-only prototypes with the real
  // `.cpp` implementation!) so callers that `#include "world.hpp"` link directly to `world.cpp`.
  for (const [fp, imports] of fileImportsMap) {
    if (!isCppFilePath(fp)) continue;
    const isImplFile =
      fp.endsWith(".cpp") ||
      fp.endsWith(".cc") ||
      fp.endsWith(".cxx") ||
      fp.endsWith(".c");
    if (!isImplFile) continue;
    const implSyms = fileSymbolsMap.get(fp) || [];
    for (const imp of imports) {
      if (!imp.isWildcardInclude || !imp.resolvedFilePath) continue;
      const headerTable = tableFor(imp.resolvedFilePath);
      for (const s of implSyms) {
        if (s.isExported) {
          headerTable.set(s.name, s.id);
        }
      }
    }
  }

  // Passes 2..4: re-export fixed-point (barrels and wildcard includes propagate
  // their sources' exports until nothing new appears).
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const [fp, imports] of fileImportsMap) {
      for (const imp of imports) {
        if ((!imp.isReExport && !imp.isWildcardInclude) || !imp.resolvedFilePath)
          continue;
        const src = exportTable.get(imp.resolvedFilePath);
        if (!src) continue;
        const t = tableFor(fp);
        if (imp.starReExport || imp.isWildcardInclude) {
          for (const [name, id] of src) {
            if (name !== "default" && !t.has(name)) {
              t.set(name, id);
              changed = true;
            }
          }
        } else {
          for (const n of imp.importedNames) {
            const exportedAs = n.alias ?? n.name;
            const id = src.get(n.name);
            if (id && !t.has(exportedAs)) {
              t.set(exportedAs, id);
              changed = true;
            }
          }
        }
      }
    }
    if (!changed) break;
  }

  /* ---- Graph nodes ---------------------------------------------------- */
  const nodesMap = new Map<string, DepLenzGraphNode>();
  const nodeDepIds = new Map<string, Set<string>>();
  const nodeDependentIds = new Map<string, Set<string>>();
  const nodeExtDeps = new Map<string, Set<string>>();

  for (const sym of allSymbols) {
    nodesMap.set(sym.id, {
      symbol: sym,
      dependencies: [],
      dependents: [],
      externalDependencies: [],
      impactRadius: 0,
      impactLevel: "low",
      directCallers: 0,
      directCallees: 0,
      blastRadius: 0,
    });
    nodeDepIds.set(sym.id, new Set());
    nodeDependentIds.set(sym.id, new Set());
    nodeExtDeps.set(sym.id, new Set());
  }

  /* ---- Call resolution ------------------------------------------------ */
  let totalDependenciesMapped = 0;

  for (const sym of allSymbols) {
    const currentNode = nodesMap.get(sym.id)!;
    const currentDepSet = nodeDepIds.get(sym.id)!;
    const currentExtSet = nodeExtDeps.get(sym.id)!;
    const fileImports = fileImportsMap.get(sym.filePath) || [];
    const importBindings = fileImportBindingMap.get(sym.filePath);
    const lazyByName = fileLazyByNameMap.get(sym.filePath);
    const sameFileByName = fileSymbolByNameMap.get(sym.filePath);

    const registerEdge = (
      target: DepLenzSymbol,
      viaImport: string | undefined,
    ) => {
      if (target.id === sym.id) return;
      if (!currentDepSet.has(target.id)) {
        currentDepSet.add(target.id);
        currentNode.dependencies.push({ symbol: target, viaImport });
        totalDependenciesMapped++;
      }
      const targetNode = nodesMap.get(target.id);
      const targetDependentSet = nodeDependentIds.get(target.id);
      if (targetNode && targetDependentSet && !targetDependentSet.has(sym.id)) {
        targetDependentSet.add(sym.id);
        targetNode.dependents.push({ symbol: sym, viaImport });
      }
    };

    const registerExternal = (pkg: string) => {
      if (!currentExtSet.has(pkg)) {
        currentExtSet.add(pkg);
        currentNode.externalDependencies.push(pkg);
      }
    };

    // For C/C++ system `<header>` includes or Rust external crates with wildcard/module usage
    for (const imp of fileImports) {
      if (!imp.isRelative && imp.isWildcardInclude) {
        registerExternal(imp.sourcePath);
      }
    }

    // Namespace member accesses: `utils.foo()` via `import * as utils` or `mod::foo()` in Rust.
    const calledNames = new Set(sym.calls);
    for (const imp of fileImports) {
      if (!imp.namespaceImport) continue;
      if (!sym.body.includes(imp.namespaceImport)) continue;
      if (!imp.isRelative && !imp.isTypeOnly) {
        if (
          new RegExp(`\\b${imp.namespaceImport}(?:\\.|::)`).test(sym.body)
        ) {
          registerExternal(imp.sourcePath);
        }
        continue;
      }
      if (!imp.resolvedFilePath) continue;
      const nsRe = new RegExp(
        `\\b${imp.namespaceImport}(?:\\.|::)([A-Za-z_$][A-Za-z0-9_$]*)`,
        "g",
      );
      let nm: RegExpExecArray | null;
      while ((nm = nsRe.exec(sym.body)) !== null) {
        calledNames.add(nm[1]);
      }
    }

    for (const calledName of calledNames) {
      let resolved: DepLenzSymbol | undefined;
      let viaImport: string | undefined;

      // 1. Explicit imports — named, aliased, default — resolved in O(1)
      //    through the file's binding map and the target file's EXPORT TABLE.
      const bound = importBindings?.get(calledName);
      if (bound) {
        const { imp, isDefaultBinding, importedName } = bound;
        viaImport = imp.sourcePath;
        if (!imp.isRelative) {
          if (!imp.isTypeOnly) registerExternal(imp.sourcePath);
        } else if (imp.resolvedFilePath) {
          const table = exportTable.get(imp.resolvedFilePath);
          const id = isDefaultBinding
            ? (table?.get("default") ?? table?.get(calledName))
            : table?.get(importedName);
          if (id) resolved = symbolById.get(id);
          if (!resolved) {
            const foreignByName = fileSymbolByNameMap.get(imp.resolvedFilePath);
            resolved = foreignByName?.get(
              isDefaultBinding ? calledName : importedName,
            );
          }
        }
      }

      // 1b. Wildcard includes (`#include "header.h"`, `mod sub;`, `use crate::mod::*`)
      if (!resolved) {
        for (const imp of fileImports) {
          if (!imp.isWildcardInclude || !imp.resolvedFilePath) continue;
          const table = exportTable.get(imp.resolvedFilePath);
          const id = table?.get(calledName);
          if (id) {
            const candidate = symbolById.get(id);
            if (candidate && candidate.id !== sym.id) {
              resolved = candidate;
              viaImport = imp.sourcePath;
              break;
            }
          }
          const foreign = fileSymbolByNameMap
            .get(imp.resolvedFilePath)
            ?.get(calledName);
          if (foreign && foreign.id !== sym.id) {
            resolved = foreign;
            viaImport = imp.sourcePath;
            break;
          }
        }
      }

      // 2. React.lazy bindings declared in this file (1a):
      if (!resolved && lazyByName) {
        const lazy = lazyByName.get(calledName);
        if (lazy) {
          const targetPath = resolveRelativeImportPath(
            lazy.sourcePath,
            sym.filePath,
            files,
          );
          if (targetPath) {
            const table = exportTable.get(targetPath);
            const id = table?.get("default") ?? table?.get(calledName);
            if (id) resolved = symbolById.get(id);
            if (!resolved) {
              const foreign = fileSymbolsMap.get(targetPath) || [];
              resolved =
                foreign.find((s) => s.isDefaultExport) ??
                fileSymbolByNameMap.get(targetPath)?.get(calledName);
            }
            if (resolved) viaImport = lazy.sourcePath;
          }
        }
      }

      // 3. Same-file symbols (local helpers) — O(1) lookup
      if (!resolved && sameFileByName) {
        const local = sameFileByName.get(calledName);
        if (local && local.id !== sym.id) {
          resolved = local;
        }
      }

      // 4. Global fallback: unique name across the whole project (or prefer non-header implementation in C++)
      if (!resolved) {
        const globalCandidates = symbolByName.get(calledName);
        if (globalCandidates && globalCandidates.length > 0) {
          const nonSelf = globalCandidates.filter((c) => c.id !== sym.id);
          if (nonSelf.length === 1) {
            resolved = nonSelf[0];
          } else if (nonSelf.length > 1 && sym.language === "cpp") {
            const implCandidate = nonSelf.find(
              (c) =>
                c.filePath.endsWith(".cpp") ||
                c.filePath.endsWith(".cc") ||
                c.filePath.endsWith(".c"),
            );
            if (implCandidate) resolved = implCandidate;
          }
        }
      }

      if (resolved) registerEdge(resolved, viaImport);
    }
  }

  /* ---- Impact metrics (1b): callers dominate the risk rating ---------- */
  let totalComponents = 0;
  let totalHooks = 0;
  let totalStructs = 0;
  let totalTraits = 0;
  let totalClasses = 0;

  for (const [, node] of nodesMap) {
    if (
      node.symbol.kind === "component" ||
      node.symbol.kind === "struct" ||
      node.symbol.kind === "class"
    ) {
      totalComponents++;
    }
    if (node.symbol.kind === "hook" || node.symbol.kind === "trait") {
      totalHooks++;
    }
    if (node.symbol.kind === "struct") totalStructs++;
    if (node.symbol.kind === "trait") totalTraits++;
    if (node.symbol.kind === "class") totalClasses++;

    node.directCallers = node.dependents.length;
    node.directCallees = node.dependencies.length;
    // Kept for backward compatibility with the existing UI/tests.
    node.impactRadius = node.directCallers + node.directCallees;
    node.blastRadius = computeUpstreamBlast(node.symbol.id, nodesMap);
    // A change BREAKS the people calling you — not the people you call.
    // Weight transitive upstream dependents double; callees count single.
    const risk = node.blastRadius * 2 + node.directCallees;
    node.impactLevel = risk >= 10 ? "high" : risk >= 4 ? "medium" : "low";
  }

  /* ---- Subsystem / Module Communication Clusters ---------------------- */
  const clusterMap = new Map<
    string,
    {
      files: Set<string>;
      symbolIds: string[];
      langs: Map<string, number>;
      inboundCalls: number;
      outboundCalls: number;
    }
  >();

  for (const sym of allSymbols) {
    const modName = sym.moduleName || inferModuleNameFromPath(sym.filePath);
    let cl = clusterMap.get(modName);
    if (!cl) {
      cl = {
        files: new Set(),
        symbolIds: [],
        langs: new Map(),
        inboundCalls: 0,
        outboundCalls: 0,
      };
      clusterMap.set(modName, cl);
    }
    cl.files.add(sym.filePath);
    cl.symbolIds.push(sym.id);
    const l = sym.language || "ts";
    cl.langs.set(l, (cl.langs.get(l) ?? 0) + 1);
  }

  const modEdgeMap = new Map<
    string,
    { sourceModule: string; targetModule: string; callCount: number; examples: string[] }
  >();

  for (const [, node] of nodesMap) {
    const srcMod =
      node.symbol.moduleName || inferModuleNameFromPath(node.symbol.filePath);
    for (const dep of node.dependencies) {
      const tgtMod =
        dep.symbol.moduleName || inferModuleNameFromPath(dep.symbol.filePath);
      if (srcMod === tgtMod) continue;

      const srcCluster = clusterMap.get(srcMod);
      const tgtCluster = clusterMap.get(tgtMod);
      if (srcCluster) srcCluster.outboundCalls++;
      if (tgtCluster) tgtCluster.inboundCalls++;

      const edgeKey = `${srcMod}->${tgtMod}`;
      let edge = modEdgeMap.get(edgeKey);
      if (!edge) {
        edge = {
          sourceModule: srcMod,
          targetModule: tgtMod,
          callCount: 0,
          examples: [],
        };
        modEdgeMap.set(edgeKey, edge);
      }
      edge.callCount++;
      if (edge.examples.length < 3) {
        edge.examples.push(`${node.symbol.name} → ${dep.symbol.name}`);
      }
    }
  }

  const moduleClusters: ModuleCluster[] = Array.from(clusterMap.entries())
    .map(([name, data]) => {
      let topLang = "ts";
      let maxCount = 0;
      for (const [l, cnt] of data.langs) {
        if (cnt > maxCount) {
          topLang = l;
          maxCount = cnt;
        }
      }
      return {
        id: `mod:${name}`,
        name,
        role: inferFolderRole(name) ?? "core module",
        language: topLang,
        fileCount: data.files.size,
        symbolIds: data.symbolIds,
        inboundCalls: data.inboundCalls,
        outboundCalls: data.outboundCalls,
      };
    })
    .sort((a, b) => b.symbolIds.length - a.symbolIds.length);

  const moduleEdges: ModuleCommunicationEdge[] = Array.from(
    modEdgeMap.entries(),
  )
    .map(([id, e]) => ({
      id,
      ...e,
    }))
    .sort((a, b) => b.callCount - a.callCount);

  return {
    symbols: allSymbols,
    nodesMap,
    fileSymbolsMap,
    fileTypesMap,
    typeIndex,
    totalFunctions: allSymbols.length,
    totalComponents,
    totalHooks,
    totalStructs,
    totalTraits,
    totalClasses,
    totalDependenciesMapped,
    analyzedFilesCount: codeFiles.length,
    diagnostics: allDiagnostics,
    totalSyntaxWarnings: allDiagnostics.length,
    filesWithSyntaxErrors: Array.from(filesWithSyntaxErrorsSet),
    projectStack: detectCodebaseStack(files),
    moduleClusters,
    moduleEdges,
  };
}

/* ------------------------------------------------------------------ */
/* Global Codebase Keyword Search with Enclosing Function Context      */
/* ------------------------------------------------------------------ */

export function searchCodebase(
  files: ProcessedFile[],
  options: CodebaseSearchOptions,
  symbolsMap?: Map<string, DepLenzSymbol[]>,
): CodebaseSearchMatch[] {
  const query = options.query?.trim();
  if (!query) return [];

  const results: CodebaseSearchMatch[] = [];
  const searchFiles = files.filter((f) => isWebDevFile(f) && f.textContent);

  let searchRegex: RegExp;
  try {
    if (options.isRegex) {
      searchRegex = new RegExp(query, options.caseSensitive ? "g" : "gi");
    } else if (options.wholeWord) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      searchRegex = new RegExp(
        `\\b${escaped}\\b`,
        options.caseSensitive ? "g" : "gi",
      );
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      searchRegex = new RegExp(escaped, options.caseSensitive ? "g" : "gi");
    }
  } catch {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    searchRegex = new RegExp(escaped, "gi");
  }

  const filterLower = options.fileFilter
    ? options.fileFilter.toLowerCase()
    : "";
  const canFastSubstringPrecheck =
    !options.isRegex && !options.wholeWord && Boolean(options.caseSensitive);

  for (const file of searchFiles) {
    if (filterLower) {
      if (
        !file.relativePath.toLowerCase().includes(filterLower) &&
        !file.name.toLowerCase().includes(filterLower)
      ) {
        continue;
      }
    }

    const content = file.textContent || "";
    if (!content) continue;

    // Fast whole-file precheck: skip splitting into lines if the file doesn't match at all.
    if (canFastSubstringPrecheck) {
      if (!content.includes(query)) continue;
    } else {
      searchRegex.lastIndex = 0;
      if (!searchRegex.test(content)) continue;
    }

    const lines = content.split("\n");
    const fileSymbols = symbolsMap?.get(file.relativePath) || [];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx];
      if (canFastSubstringPrecheck && !lineText.includes(query)) continue;
      searchRegex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = searchRegex.exec(lineText)) !== null) {
        const lineNumber = lineIdx + 1;
        const columnNumber = match.index + 1;

        const enclosingSymbol = fileSymbols.find(
          (s) => lineNumber >= s.lineStart && lineNumber <= s.lineEnd,
        );

        results.push({
          id: `${file.relativePath}:${lineNumber}:${columnNumber}`,
          filePath: file.relativePath,
          fileName: file.name,
          lineNumber,
          columnNumber,
          lineText: lineText.trimEnd(),
          enclosingSymbol,
          matchLength: match[0].length,
        });

        if (results.length > 250) return results;
        if (!searchRegex.global) break;
      }
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Fix 3a: annotated project map                                       */
/* ------------------------------------------------------------------ */

const FOLDER_ROLE_HINTS: { match: RegExp; role: string }[] = [
  { match: /(^|\/)components?(\/|$)/i, role: "UI components" },
  { match: /(^|\/)pages?(\/|$)/i, role: "route pages" },
  { match: /(^|\/)(views?|screens?)(\/|$)/i, role: "route views" },
  { match: /(^|\/)hooks?(\/|$)/i, role: "custom hooks" },
  { match: /(^|\/)(utils?|helpers?|lib)(\/|$)/i, role: "shared helpers" },
  { match: /(^|\/)(services?|api)(\/|$)/i, role: "data access / API layer" },
  { match: /(^|\/)config(uration)?(\/|$)/i, role: "configuration" },
  {
    match: /(^|\/)(store|state|redux|context)(\/|$)/i,
    role: "state management",
  },
  { match: /(^|\/)styles?(\/|$)/i, role: "styling" },
  { match: /(^|\/)(tests?|__tests__|specs?|e2e)(\/|$)/i, role: "tests" },
  { match: /(^|\/)(assets?|public|static)(\/|$)/i, role: "static assets" },
  { match: /(^|\/)types?(\/|$)/i, role: "shared type declarations" },
  { match: /(^|\/)(routes?|router)(\/|$)/i, role: "routing" },
  { match: /(^|\/)(scripts?|tools?)(\/|$)/i, role: "build / utility scripts" },
  { match: /(^|\/)(docs?|documentation)(\/|$)/i, role: "documentation" },
  { match: /(^|\/)include(\/|$)/i, role: "C/C++ public headers" },
  { match: /(^|\/)(engine|core|kernel)(\/|$)/i, role: "core systems engine" },
  { match: /(^|\/)(storage|wal|db|kv)(\/|$)/i, role: "storage & persistence" },
  { match: /(^|\/)(net|network|rpc|protocol)(\/|$)/i, role: "networking & RPC" },
  { match: /(^|\/)(math|physics|sim|geometry)(\/|$)/i, role: "math & physics" },
  { match: /(^|\/)(render|renderer|gpu|shaders?)(\/|$)/i, role: "rendering pipeline" },
  { match: /(^|\/)(crates|packages|apps)(\/|$)/i, role: "workspace modules" },
];

export function inferFolderRole(path: string): string | null {
  for (const h of FOLDER_ROLE_HINTS) if (h.match.test(path)) return h.role;
  return null;
}

/**
 * Compact annotated directory map (depth ≤ 2, line-capped) — costs a few
 * dozen tokens and tells the model where things live BEFORE it edits, so
 * new files land in the right folder and existing helpers get reused.
 */
export function buildAnnotatedProjectMap(
  files: ProcessedFile[],
  maxLines = 42,
): string {
  const firstSegs = files.map((f) => f.relativePath.split("/")[0]);
  const commonRoot =
    files.length > 0 &&
    firstSegs.every((s) => s === firstSegs[0]) &&
    files.every((f) => f.relativePath.includes("/"))
      ? firstSegs[0]
      : "";
  const strip = (p: string) =>
    commonRoot && p.startsWith(commonRoot + "/")
      ? p.slice(commonRoot.length + 1)
      : p;

  const dirCounts = new Map<string, number>();
  let rootFileCount = 0;
  for (const f of files) {
    const rel = strip(f.relativePath);
    const segs = rel.split("/");
    if (segs.length === 1) {
      rootFileCount++;
      continue;
    }
    dirCounts.set(segs[0], (dirCounts.get(segs[0]) ?? 0) + 1);
    if (segs.length > 2) {
      const d2 = `${segs[0]}/${segs[1]}`;
      dirCounts.set(d2, (dirCounts.get(d2) ?? 0) + 1);
    }
  }

  const lines: string[] = [
    `${commonRoot || "project"}/  (${rootFileCount} root-level files)`,
  ];
  const top = [
    ...new Set([...dirCounts.keys()].map((k) => k.split("/")[0])),
  ].sort();
  let emitted = 1;
  for (const t of top) {
    if (emitted >= maxLines) {
      lines.push(`… (${top.length - emitted + 1} more folders)`);
      break;
    }
    const role = inferFolderRole(t) ?? "project files";
    lines.push(`├─ ${t}/  — ${role} · ${dirCounts.get(t) ?? 0} files`);
    emitted++;
    const children = [...dirCounts.keys()]
      .filter((k) => k.startsWith(`${t}/`) && k.split("/").length === 2)
      .sort();
    for (const c of children.slice(0, 8)) {
      if (emitted >= maxLines) break;
      const cRole = inferFolderRole(c) ?? "files";
      lines.push(
        `│  ├─ ${c.split("/")[1]}/  — ${cRole} · ${dirCounts.get(c)} files`,
      );
      emitted++;
    }
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------- */
/* Surgical LLM Context Extractor ("Prompt Surgeon")                   */
/*                                                                     */
/* Fix 2b: the target file is included COMPLETE (imports and all) —    */
/* the Smart Paste contract demands the model return the whole file,   */
/* so the prompt must show the whole file.                             */
/* Fix 2a: type declarations referenced by the included signatures     */
/* travel with the bundle, so contracts are never guessed.             */
/* ------------------------------------------------------------------- */

const TYPE_REF_GLOBALS = new Set([
  "React",
  "Promise",
  "Array",
  "Record",
  "Partial",
  "Pick",
  "Omit",
  "Readonly",
  "Required",
  "Exclude",
  "Extract",
  "ReturnType",
  "Parameters",
  "Map",
  "Set",
  "String",
  "Number",
  "Boolean",
  "Object",
  "Error",
  "Date",
  "RegExp",
  "JSON",
  "JSX",
  "Element",
  "Node",
  "Event",
  "HTMLElement",
  "CSSProperties",
]);

const MAX_BUNDLE_TYPES = 12;

function collectReferencedTypes(
  signatures: string[],
  analysis: DepLenzAnalysisResult,
): TypeDeclaration[] {
  const out: TypeDeclaration[] = [];
  const seen = new Set<string>();
  const enqueueFromText = (text: string) => {
    for (const m of text.matchAll(/\b([A-Z][A-Za-z0-9_$]*)\b/g)) {
      const name = m[1];
      if (TYPE_REF_GLOBALS.has(name) || seen.has(name)) continue;
      const decls = analysis.typeIndex.get(name);
      if (decls && decls.length > 0) {
        seen.add(name);
        out.push(decls[0]);
      }
    }
  };
  for (const sig of signatures) enqueueFromText(sig);
  // One hop: types referenced by the included types (ButtonProps -> Size).
  const firstWave = [...out];
  for (const decl of firstWave) {
    if (out.length >= MAX_BUNDLE_TYPES) break;
    for (const ref of decl.references) {
      if (seen.has(ref) || TYPE_REF_GLOBALS.has(ref)) continue;
      const decls = analysis.typeIndex.get(ref);
      if (decls && decls.length > 0) {
        seen.add(ref);
        out.push(decls[0]);
        if (out.length >= MAX_BUNDLE_TYPES) break;
      }
    }
  }
  return out.slice(0, MAX_BUNDLE_TYPES);
}

/**
 * Automatically interweaves a User Action Prompt and/or Token-Efficient
 * Evolution Log Handover directly into a generated Surgical or Plan prompt.
 */
export function interweaveSurgicalPrompt(
  basePrompt: string,
  options: {
    userActionPrompt?: string;
    evolutionHandover?: string;
  },
): string {
  if (!basePrompt) return basePrompt;
  const cleanTask = options.userActionPrompt?.trim() || "";
  const cleanEvo = options.evolutionHandover?.trim() || "";

  let output = basePrompt;

  // 1. Replace placeholder `(describe your change here)` in ### N. TASK with the user's action prompt
  if (cleanTask) {
    output = output.replace(
      /\(describe your change here\)/g,
      cleanTask,
    );
  }

  // 2. Inject a prominent USER ACTION DIRECTIVE & EVOLUTION HANDOVER header right after the top banner
  const topBlocks: string[] = [];
  if (cleanTask) {
    topBlocks.push(
      `>>> USER ACTION PROMPT (PRIMARY OBJECTIVE) <<<`,
      cleanTask,
      `>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`,
    );
  }
  if (cleanEvo) {
    topBlocks.push(`${cleanEvo}\n`);
  }

  if (topBlocks.length > 0) {
    const firstBannerClose = output.indexOf(
      "================================================================================\n",
      85,
    );
    if (firstBannerClose !== -1) {
      const insertAt = firstBannerClose + 81;
      output =
        output.slice(0, insertAt) +
        "\n" +
        topBlocks.join("\n") +
        output.slice(insertAt);
    } else {
      output = topBlocks.join("\n") + "\n" + output;
    }
  }

  return output;
}

export function extractSurgicalContext(
  targetId: string,
  analysis: DepLenzAnalysisResult,
  files: ProcessedFile[] = [],
  task = "",
): SurgicalContextBundle | null {
  const node = analysis.nodesMap.get(targetId);
  if (!node) return null;

  const target = node.symbol;
  const callers = node.dependents.map((d) => d.symbol);
  const callees = node.dependencies.map((d) => d.symbol);
  const externalDeps = node.externalDependencies;
  const targetFence = detectFenceLanguage(target.filePath);

  // Fix 2b: the COMPLETE target file (imports included). The output
  // contract demands a complete file back — the prompt must show one.
  const targetFile = files.find((f) => f.relativePath === target.filePath);
  const fullTargetSource = targetFile?.textContent ?? null;

  // Files this change can touch (3b data — shown in prompt AND usable by UI).
  const touchedFiles: string[] = [];
  const pushTouched = (p: string) => {
    if (!touchedFiles.includes(p)) touchedFiles.push(p);
  };
  pushTouched(target.filePath);
  for (const c of callers) pushTouched(c.filePath);
  for (const c of callees) pushTouched(c.filePath);

  const referencedTypes = collectReferencedTypes(
    [
      target.signature,
      ...callers.map((c) => c.signature),
      ...callees.map((c) => c.signature),
    ],
    analysis,
  );

  const parts: string[] = [];

  parts.push(
    `================================================================================`,
  );
  parts.push(`DEPLENZ SURGICAL CONTEXT`);
  parts.push(`TARGET: ${target.name} (${target.kind.toUpperCase()})`);
  parts.push(
    `FILE: ${target.filePath} (lines ${target.lineStart}-${target.lineEnd})`,
  );
  parts.push(
    `IMPACT: ${node.directCallers} direct callers · ${node.directCallees} callees · blast radius ${node.blastRadius} (${node.impactLevel.toUpperCase()} RISK)`,
  );
  parts.push(
    `================================================================================\n`,
  );

  let section = 0;

  // 3a: annotated project map — where things live, before the model edits.
  if (files.length > 0) {
    section++;
    parts.push(
      `### ${section}. PROJECT MAP (annotated — place new files accordingly)`,
    );
    parts.push("```");
    parts.push(buildAnnotatedProjectMap(files));
    parts.push("```\n");
  }

  section++;
  parts.push(`### ${section}. FILES TOUCHED BY THIS CHANGE`);
  parts.push(
    `- ${target.filePath}  (TARGET — you will return this file COMPLETE)`,
  );
  for (const c of callers) {
    parts.push(`- ${c.filePath}  (calls ${target.name} — must keep compiling)`);
  }
  for (const c of callees) {
    parts.push(
      `- ${c.filePath}  (called by ${target.name} — reuse, don't re-implement)`,
    );
  }
  parts.push("");

  section++;
  if (fullTargetSource != null) {
    parts.push(`### ${section}. COMPLETE TARGET FILE — ${target.filePath}`);
    parts.push(
      `This is the ENTIRE current file (${fullTargetSource.split("\n").length} lines), imports included.`,
    );
    parts.push(
      `The output contract requires you to return this file COMPLETE — every line,`,
    );
    parts.push(
      `with your changes applied. Do not invent lines 1-${target.lineStart - 1}; they are here.`,
    );
    parts.push(`\`\`\`${targetFence}\n${fullTargetSource}\n\`\`\`\n`);
  } else {
    parts.push(`### ${section}. TARGET IMPLEMENTATION (${target.name})`);
    parts.push(`File: ${target.filePath}`);
    parts.push(`Signature: ${target.signature}`);
    parts.push(`\`\`\`${targetFence}\n${target.body}\n\`\`\`\n`);
  }

  if (referencedTypes.length > 0) {
    section++;
    parts.push(
      `### ${section}. TYPE CONTRACTS (referenced by the signatures above)`,
    );
    for (const t of referencedTypes) {
      const fence = detectFenceLanguage(t.filePath);
      parts.push(`// ${t.filePath}:${t.lineStart}`);
      parts.push(`\`\`\`${fence}\n${t.body}\n\`\`\``);
    }
    parts.push("");
  }

  if (callers.length > 0) {
    section++;
    parts.push(
      `### ${section}. UPSTREAM CALLERS — ${callers.length} symbol(s) invoke ${target.name}`,
    );
    parts.push(
      `If you change ${target.name}'s contract (name, params, return shape), these MUST be updated too.`,
    );
    for (const caller of callers) {
      const fence = detectFenceLanguage(caller.filePath);
      parts.push(`#### [Caller] ${caller.name} (${caller.kind})`);
      parts.push(`Location: ${caller.filePath}:${caller.lineStart}`);
      parts.push(`Signature: ${caller.signature}`);
      parts.push(`\`\`\`${fence}\n${caller.body}\n\`\`\`\n`);
    }
  }

  if (callees.length > 0) {
    section++;
    parts.push(
      `### ${section}. DOWNSTREAM DEPENDENCIES — already exist; import and REUSE them`,
    );
    for (const callee of callees) {
      const fence = detectFenceLanguage(callee.filePath);
      parts.push(`#### [Dependency] ${callee.name} (${callee.kind})`);
      parts.push(`Location: ${callee.filePath}:${callee.lineStart}`);
      parts.push(`Signature: ${callee.signature}`);
      parts.push(`\`\`\`${fence}\n${callee.body}\n\`\`\`\n`);
    }
  }

  if (externalDeps.length > 0) {
    section++;
    parts.push(`### ${section}. EXTERNAL PACKAGES ALREADY AVAILABLE`);
    parts.push(externalDeps.join(", "));
    parts.push("");
  }

  section++;
  parts.push(`### ${section}. TASK`);
  parts.push(task || "(describe your change here)");
  parts.push("");
  parts.push(
    `================================================================================`,
  );
  parts.push(`END OF SURGICAL CONTEXT`);
  parts.push(
    `================================================================================`,
  );

  const formattedPrompt = parts.join("\n");
  const characterCount = formattedPrompt.length;
  const estimatedTokens = Math.ceil(characterCount / 3.8);

  return {
    targetSymbol: target,
    callers,
    callees,
    externalDeps,
    touchedFiles,
    referencedTypes,
    plannedFiles: [],
    formattedPrompt,
    estimatedTokens,
    characterCount,
  };
}

/* ------------------------------------------------------------------ */
/* Fix 2c: two-step plan mode                                          */
/*                                                                     */
/* Step 1: a cheap "map" prompt (project map + symbol index + target   */
/* detail) asks the model which files/symbols it expects to touch.     */
/* Step 2: DepLenz builds a right-sized context containing exactly     */
/* those files, complete.                                              */
/* ------------------------------------------------------------------ */

export interface PlanTouch {
  path: string;
  symbols: string[];
  change: string;
}

export interface PlannedContextResult {
  prompt: string;
  plannedFiles: string[];
  estimatedTokens: number;
  characterCount: number;
}

export const PLAN_OPEN = "<<<DEPLENZ_PLAN>>>";
export const PLAN_CLOSE = "<<<END_DEPLENZ_PLAN>>>";

const PLAN_SYMBOL_CAP = 250;

export function buildPlanPrompt(
  targetId: string,
  analysis: DepLenzAnalysisResult,
  files: ProcessedFile[],
  task = "",
): string | null {
  const node = analysis.nodesMap.get(targetId);
  if (!node) return null;
  const target = node.symbol;

  const parts: string[] = [];
  parts.push(
    `================================================================================`,
  );
  parts.push(`DEPLENZ PLAN REQUEST (step 1 of 2 — DO NOT WRITE CODE YET)`);
  parts.push(
    `TARGET: ${target.name} (${target.kind}) — ${target.filePath}:${target.lineStart}`,
  );
  parts.push(`Signature: ${target.signature}`);
  parts.push(
    `================================================================================\n`,
  );

  if (files.length > 0) {
    parts.push(`### PROJECT MAP`);
    parts.push("```");
    parts.push(buildAnnotatedProjectMap(files));
    parts.push("```\n");
  }

  parts.push(`### SYMBOL INDEX (name — kind — file:line — signature)`);
  const sorted = [...analysis.symbols].sort((a, b) =>
    a.filePath === b.filePath
      ? a.lineStart - b.lineStart
      : a.filePath.localeCompare(b.filePath),
  );
  const listed = sorted.slice(0, PLAN_SYMBOL_CAP);
  for (const s of listed) {
    parts.push(
      `- ${s.name} (${s.kind}) — ${s.filePath}:${s.lineStart} — ${s.signature}`,
    );
  }
  if (sorted.length > PLAN_SYMBOL_CAP) {
    parts.push(
      `… and ${sorted.length - PLAN_SYMBOL_CAP} more symbols (ask for any file in step 2)`,
    );
  }
  parts.push("");

  parts.push(`### TASK`);
  parts.push(task || "(describe your change here)");
  parts.push("");
  parts.push(`### YOUR JOB NOW`);
  parts.push(
    `Reply with ONLY a plan block listing the files/symbols you expect to touch:`,
  );
  parts.push(PLAN_OPEN);
  parts.push(
    `- file: <root-relative path> | symbols: <names, comma-separated> | change: <one line>`,
  );
  parts.push(PLAN_CLOSE);
  parts.push(
    `DepLenz will then build a complete context for exactly those files (step 2),`,
  );
  parts.push(
    `where you will produce the actual code. Do not write code in this reply.`,
  );

  return parts.join("\n");
}

const PLAN_RE = /<<<DEPLENZ_PLAN>>>([\s\S]*?)<<<END_DEPLENZ_PLAN>>>/;
const PLAN_LINE_RE =
  /file:\s*([^|]+?)\s*(?:\|\s*symbols:\s*([^|]+?))?\s*(?:\|\s*change:\s*(.*))?$/i;

export function parsePlanResponse(text: string): PlanTouch[] {
  const m = PLAN_RE.exec(text ?? "");
  if (!m) return [];
  const out: PlanTouch[] = [];
  for (const rawLine of m[1].split("\n")) {
    const line = rawLine.trim().replace(/^[-*]\s*/, "");
    if (!line) continue;
    const lm = PLAN_LINE_RE.exec(line);
    if (!lm) continue;
    out.push({
      path: lm[1].trim(),
      symbols: (lm[2] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      change: (lm[3] ?? "").trim(),
    });
  }
  return out;
}

/**
 * Step 2: full surgical context for the target PLUS the complete contents
 * of every planned file (capped at 6 extra files — complete files only,
 * never truncated, since truncation is what corrupted paste-backs).
 */
export function buildPlannedContext(
  targetId: string,
  plan: PlanTouch[],
  analysis: DepLenzAnalysisResult,
  files: ProcessedFile[],
  task = "",
): PlannedContextResult | null {
  const base = extractSurgicalContext(targetId, analysis, files, task);
  if (!base) return null;

  const MAX_PLANNED_FILES = 6;
  const plannedFiles: string[] = [];
  const extras: string[] = [];

  for (const touch of plan) {
    if (plannedFiles.length >= MAX_PLANNED_FILES) break;
    const norm = touch.path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (norm === base.targetSymbol.filePath) continue; // already included complete
    const file =
      files.find((f) => f.relativePath === norm) ||
      files.find((f) => norm.endsWith(`/${f.relativePath}`));
    if (!file || file.textContent == null) continue;
    plannedFiles.push(file.relativePath);
    const fence = detectFenceLanguage(file.relativePath);
    extras.push(
      `#### [Planned file] ${file.relativePath}${touch.change ? ` — ${touch.change}` : ""}`,
      `\`\`\`${fence}\n${file.textContent}\n\`\`\`\n`,
    );
  }

  const extraSection =
    extras.length > 0
      ? `### PLANNED FILES (complete contents — the model asked for these in step 1)\n\n${extras.join("\n")}\n\n`
      : "";

  // Splice the planned-files section in before the final banner.
  const prompt = base.formattedPrompt.replace(
    /={80}\nEND OF SURGICAL CONTEXT/,
    `${extraSection}================================================================================\nEND OF SURGICAL CONTEXT`,
  );

  return {
    prompt,
    plannedFiles,
    estimatedTokens: Math.ceil(prompt.length / 3.8),
    characterCount: prompt.length,
  };
}
/* ------------------------------------------------------------------ */
/* Async variants — the UI-facing entry points.                        */
/*                                                                     */
/* They consult the registered DepLenzEngine (native Rust engine on    */
/* desktop — see engineBridge.ts) and fall back to the synchronous     */
/* TypeScript implementation above when no engine is registered or the */
/* engine declines the file set. The sync functions remain the spec.   */
/* ------------------------------------------------------------------ */

export async function buildCodebaseDependencyGraphAsync(
  files: ProcessedFile[],
): Promise<DepLenzAnalysisResult> {
  try {
    const engine = getDepLenzEngine();
    const result = engine ? await engine.buildGraph(files) : null;
    if (result) {
      if (!result.projectStack) {
        result.projectStack = detectCodebaseStack(files);
      }
      return result;
    }
  } catch (err) {
    console.warn("[deplenz] native engine failed, using TS engine:", err);
  }

  // Cooperative time-sliced pre-warming: when analyzing large repositories
  // (>120 files), warm the per-file lookup index and AST/syntax caches in
  // ~10ms slices so the main UI thread never drops frames during navigation.
  if (files.length > 120) {
    getFileLookupIndex(files);
    let sliceStart = performance.now();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const text = f.textContent;
      if (text) {
        if (isWebDevFile(f) && f.extension.toLowerCase() !== "toml") {
          validateFileSyntax(text, f.relativePath, f.name);
        }
        if (isCodeFile(f)) {
          extractSymbolsFromFile(text, f.relativePath, f.name);
          extractLazyBindings(text);
          extractTypeDeclarations(text, f.relativePath);
        }
      }
      if (performance.now() - sliceStart > 10) {
        await new Promise<void>((r) => setTimeout(r, 0));
        sliceStart = performance.now();
      }
    }
  }

  return buildCodebaseDependencyGraph(files);
}

export async function searchCodebaseAsync(
  files: ProcessedFile[],
  options: CodebaseSearchOptions,
  symbolsMap?: Map<string, DepLenzSymbol[]>,
): Promise<CodebaseSearchMatch[]> {
  try {
    const engine = getDepLenzEngine();
    const result = engine
      ? await engine.search(files, options, symbolsMap)
      : null;
    if (result) return result;
  } catch {
    // fall through to the TS engine
  }
  return searchCodebase(files, options, symbolsMap);
}
