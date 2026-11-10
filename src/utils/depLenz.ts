/**
 * DepLenz — Intelligent Web Development Codebase Lens & Dependency Graph
 *
 * Provides:
 * 1. Global codebase keyword search with enclosing function detection.
 * 2. Static AST-like function & component dependency mapping (calls & callers).
 * 3. Surgical LLM prompt context extraction (target + callers + dependencies)
 *    to avoid dumping entire codebases into LLMs.
 */

import { ProcessedFile } from "../types";

export type SymbolKind = "function" | "component" | "hook" | "method" | "class";

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
}

export interface FileImport {
  importedNames: { name: string; alias?: string }[];
  defaultImport?: string;
  namespaceImport?: string;
  sourcePath: string; // e.g. "./treeBuilder" or "react"
  isRelative: boolean;
  resolvedFilePath?: string; // resolved against project files
}

export interface DepLenzGraphNode {
  symbol: DepLenzSymbol;
  dependencies: { symbol: DepLenzSymbol; viaImport?: string }[]; // callees: what this symbol calls
  dependents: { symbol: DepLenzSymbol; viaImport?: string }[]; // callers: what calls this symbol
  externalDependencies: string[]; // e.g. 'react', 'lodash'
  impactRadius: number; // dependents.length + dependencies.length
  impactLevel: "low" | "medium" | "high";
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
  fileFilter?: string; // e.g. "components" or ".tsx"
}

export interface SurgicalContextBundle {
  targetSymbol: DepLenzSymbol;
  callers: DepLenzSymbol[];
  callees: DepLenzSymbol[];
  externalDeps: string[];
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
  totalFunctions: number;
  totalComponents: number;
  totalHooks: number;
  totalDependenciesMapped: number;
  analyzedFilesCount: number;
  diagnostics: SyntaxDiagnostic[];
  totalSyntaxWarnings: number;
  filesWithSyntaxErrors: string[];
}

/* ------------------------------------------------------------------ */
/* Web Dev File Filter Helpers                                        */
/* ------------------------------------------------------------------ */

const WEB_DEV_EXTENSIONS = new Set([
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
]);

export function isWebDevFile(file: ProcessedFile): boolean {
  const ext = file.extension.toLowerCase();
  return WEB_DEV_EXTENSIONS.has(ext);
}

export function isCodeFile(file: ProcessedFile): boolean {
  const ext = file.extension.toLowerCase();
  return ["ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte"].includes(ext);
}

/* ------------------------------------------------------------------ */
/* Static Symbol Extraction for Web Dev Stacks                         */
/* ------------------------------------------------------------------ */

/**
 * Parses a code file content line by line to extract functions,
 * components, hooks, methods, and classes.
 */
export function extractSymbolsFromFile(
  content: string,
  filePath: string,
  fileName: string,
): DepLenzSymbol[] {
  if (!content) return [];

  const symbols: DepLenzSymbol[] = [];
  const lines = content.split("\n");

  // Regex patterns to identify function and component definitions
  // 1. function name(...) or export [default] function name(...)
  const functionDeclRegex =
    /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/;

  // 2. const/let/var name = (async)? (...) => ...
  const arrowFunctionRegex =
    /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::\s*[^=]+)?=\s*(?:React\.(?:memo|forwardRef)\s*\(\s*)?(?:async\s*)?(?:\(([^)]*)\)|([a-zA-Z0-9_$]+))\s*=>/;

  // 3. const/let/var name = function(...) ...
  const functionExprRegex =
    /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::\s*[^=]+)?=\s*(?:async\s+)?function\s*\(([^)]*)\)/;

  // 4. Class declarations: class Name ...
  const classDeclRegex = /^(?:export\s+(?:default\s+)?)?class\s+([a-zA-Z0-9_$]+)/;

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and single-line comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      i++;
      continue;
    }

    let match: RegExpExecArray | null = null;
    let name = "";
    let signature = "";
    let kind: SymbolKind = "function";
    const isExported = trimmed.startsWith("export");
    const isDefaultExport = trimmed.includes("export default");

    if ((match = functionDeclRegex.exec(trimmed))) {
      name = match[1];
      const params = match[2] || "";
      signature = `${name}(${params})`;
      kind = determineSymbolKind(name, content, i);
    } else if ((match = arrowFunctionRegex.exec(trimmed))) {
      name = match[1];
      const params = match[2] !== undefined ? match[2] : match[3] || "";
      signature = `${name}(${params})`;
      kind = determineSymbolKind(name, content, i);
    } else if ((match = functionExprRegex.exec(trimmed))) {
      name = match[1];
      const params = match[2] || "";
      signature = `${name}(${params})`;
      kind = determineSymbolKind(name, content, i);
    } else if ((match = classDeclRegex.exec(trimmed))) {
      name = match[1];
      signature = `class ${name}`;
      kind = "class";
    }

    if (name && isValidIdentifier(name)) {
      // Find boundary of this symbol (balanced brace matching)
      const lineStart = i + 1;
      const { lineEnd, body } = extractBlockBody(lines, i);

      // Extract invoked symbol names inside body
      const calls = extractInvokedNames(body, name);

      symbols.push({
        id: `${filePath}:${name}`,
        name,
        kind,
        filePath,
        fileName,
        lineStart,
        lineEnd,
        signature: cleanSignature(signature),
        body,
        isExported,
        isDefaultExport,
        calls,
      });

      // Advance to end of block
      i = Math.max(i + 1, lineEnd);
    } else {
      i++;
    }
  }

  return symbols;
}

function determineSymbolKind(name: string, content: string, lineIndex: number): SymbolKind {
  // Custom Hook convention in React/Vue
  if (/^use[A-Z0-9_]/.test(name)) {
    return "hook";
  }

  // React component convention: PascalCase name
  if (/^[A-Z][a-zA-Z0-9_$]*$/.test(name)) {
    return "component";
  }

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
 * Extracts lines belonging to a code block starting at lineIndex using brace balancing.
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

    // Safety fallback: prevent runaway loops on single-line arrow functions without braces
    if (!hasOpened && line.includes("=>") && (line.endsWith(";") || i > startLine + 4)) {
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

  // 1. Function calls: foo(...) or foo.bar(...)
  const callRegex = /(?:\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\()/g;
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

  // 2. React JSX usage: <Header ... or <Button>
  const jsxRegex = /<([A-Z][a-zA-Z0-9_$]*)\b/g;
  while ((match = jsxRegex.exec(body)) !== null) {
    const componentName = match[1];
    if (componentName !== selfName && isValidIdentifier(componentName)) {
      found.add(componentName);
    }
  }

  return Array.from(found);
}

function isLanguageKeyword(word: string): boolean {
  const keywords = new Set([
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
  ]);
  return keywords.has(word);
}

/* ------------------------------------------------------------------ */
/* Import Resolution across Project Files                             */
/* ------------------------------------------------------------------ */

export function extractFileImports(
  content: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): FileImport[] {
  if (!content) return [];

  const imports: FileImport[] = [];
  // Regex for ES imports:
  // import { a, b as c } from './path'
  // import def, { a } from './path'
  // import * as all from './path'
  // import './styles.css'
  const importRegex =
    /import\s+(?:(?:\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)|(?:\{([^}]+)\})|(?:([a-zA-Z0-9_$]+)\s*,\s*\{([^}]+)\}))\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const namespaceImport = match[1];
    const defaultImport = match[2] || match[4];
    const namedImportsBlock = match[3] || match[5];
    const sourcePath = match[6];

    const isRelative = sourcePath.startsWith(".") || sourcePath.startsWith("/");
    const importedNames: { name: string; alias?: string }[] = [];

    if (namedImportsBlock) {
      const parts = namedImportsBlock.split(",");
      for (const part of parts) {
        const clean = part.trim();
        if (!clean) continue;
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
    });
  }

  return imports;
}

export function resolveRelativeImportPath(
  importSource: string,
  currentFilePath: string,
  allFiles: ProcessedFile[],
): string | undefined {
  // Normalize current directory
  const currentSegments = currentFilePath.split("/");
  currentSegments.pop(); // remove current filename

  const sourceSegments = importSource.split("/");

  for (const seg of sourceSegments) {
    if (seg === ".") {
      continue;
    } else if (seg === "..") {
      if (currentSegments.length > 0) currentSegments.pop();
    } else {
      currentSegments.push(seg);
    }
  }

  const targetBasePath = currentSegments.join("/");

  // Try exact match or with common web extensions
  const candidates = [
    targetBasePath,
    `${targetBasePath}.ts`,
    `${targetBasePath}.tsx`,
    `${targetBasePath}.js`,
    `${targetBasePath}.jsx`,
    `${targetBasePath}/index.ts`,
    `${targetBasePath}/index.tsx`,
    `${targetBasePath}/index.js`,
    `${targetBasePath}/index.jsx`,
  ];

  for (const candidate of candidates) {
    const found = allFiles.find(
      (f) =>
        f.relativePath === candidate ||
        f.relativePath.endsWith(`/${candidate}`) ||
        candidate.endsWith(f.relativePath),
    );
    if (found) return found.relativePath;
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
  const diagnostics: SyntaxDiagnostic[] = [];
  const lines = content.split("\n");

  // 1. JSON file validation
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
    return diagnostics;
  }

  // 2. Web dev codefile syntax & delimiter validation (TS, JS, TSX, JSX, Vue, Svelte)
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

      // Escape sequences inside strings
      if ((inSingleQuote || inDoubleQuote || inTemplate) && ch === "\\") {
        c += 2;
        continue;
      }

      // Inside multi-line comment: check for */
      if (inMultiComment) {
        if (ch === "*" && next === "/") {
          inMultiComment = false;
          c += 2;
          continue;
        }
        c++;
        continue;
      }

      // Check comments start
      if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
        if (ch === "/" && next === "/") {
          // single-line comment: skip remaining line
          break;
        }
        if (ch === "/" && next === "*") {
          inMultiComment = true;
          multiCommentStartLine = l + 1;
          c += 2;
          continue;
        }
      }

      // String literals
      if (!inDoubleQuote && !inTemplate && ch === "'") {
        inSingleQuote = !inSingleQuote;
        c++;
        continue;
      }

      if (!inSingleQuote && !inTemplate && ch === '"') {
        inDoubleQuote = !inDoubleQuote;
        c++;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && ch === "`") {
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

      // Inside normal string literal: skip delimiter tracking
      if (inSingleQuote || inDoubleQuote) {
        c++;
        continue;
      }

      // Template expressions ${ ... }
      if (inTemplate) {
        if (ch === "$" && next === "{") {
          stack.push({ char: "{", line: l + 1, col: c + 1 });
          c += 2;
          continue;
        }
        c++;
        continue;
      }

      // Delimiter tracking
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

    // Single/double quotes cannot break across lines in JS/TS without escape
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
      inSingleQuote = false; // recover for remaining lines
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
      inDoubleQuote = false; // recover
    }
  }

  // End of file checks
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

  return diagnostics;
}

/* ------------------------------------------------------------------ */
/* Full Codebase Dependency Graph Builder                             */
/* ------------------------------------------------------------------ */

export function buildCodebaseDependencyGraph(
  files: ProcessedFile[],
): DepLenzAnalysisResult {
  const codeFiles = files.filter(isCodeFile);
  const allSymbols: DepLenzSymbol[] = [];
  const fileSymbolsMap = new Map<string, DepLenzSymbol[]>();
  const fileImportsMap = new Map<string, FileImport[]>();
  const allDiagnostics: SyntaxDiagnostic[] = [];
  const filesWithSyntaxErrorsSet = new Set<string>();

  // 1. Run syntax validation across all web files
  for (const file of files) {
    if (isWebDevFile(file) && file.textContent) {
      const diags = validateFileSyntax(file.textContent, file.relativePath, file.name);
      if (diags.length > 0) {
        allDiagnostics.push(...diags);
        filesWithSyntaxErrorsSet.add(file.relativePath);
      }
    }
  }

  // 2. Extract symbols and imports per code file
  for (const file of codeFiles) {
    const text = file.textContent || "";
    const symbols = extractSymbolsFromFile(text, file.relativePath, file.name);
    const imports = extractFileImports(text, file.relativePath, files);

    allSymbols.push(...symbols);
    fileSymbolsMap.set(file.relativePath, symbols);
    fileImportsMap.set(file.relativePath, imports);
  }

  // Symbol lookup index: name -> symbols[]
  const symbolByName = new Map<string, DepLenzSymbol[]>();
  const symbolById = new Map<string, DepLenzSymbol>();

  for (const sym of allSymbols) {
    symbolById.set(sym.id, sym);
    const list = symbolByName.get(sym.name) || [];
    list.push(sym);
    symbolByName.set(sym.name, list);
  }

  // 2. Second pass: build bi-directional graph nodes
  const nodesMap = new Map<string, DepLenzGraphNode>();

  for (const sym of allSymbols) {
    const node: DepLenzGraphNode = {
      symbol: sym,
      dependencies: [],
      dependents: [],
      externalDependencies: [],
      impactRadius: 0,
      impactLevel: "low",
    };
    nodesMap.set(sym.id, node);
  }

  let totalDependenciesMapped = 0;

  // Resolve calls to dependencies
  for (const sym of allSymbols) {
    const currentNode = nodesMap.get(sym.id)!;
    const fileImports = fileImportsMap.get(sym.filePath) || [];
    const sameFileSymbols = fileSymbolsMap.get(sym.filePath) || [];

    for (const calledName of sym.calls) {
      let resolvedSymbol: DepLenzSymbol | undefined;
      let viaImportSource: string | undefined;

      // 1. Check if it's imported explicitly from another file
      for (const imp of fileImports) {
        if (
          imp.defaultImport === calledName ||
          imp.importedNames.some(
            (n) => (n.alias && n.alias === calledName) || n.name === calledName,
          )
        ) {
          viaImportSource = imp.sourcePath;
          if (imp.resolvedFilePath) {
            const foreignSymbols = fileSymbolsMap.get(imp.resolvedFilePath) || [];
            resolvedSymbol = foreignSymbols.find((s) => s.name === calledName);
          } else if (!imp.isRelative) {
            // It is an external npm package
            if (!currentNode.externalDependencies.includes(imp.sourcePath)) {
              currentNode.externalDependencies.push(imp.sourcePath);
            }
          }
          break;
        }
      }

      // 2. Check same file symbols (local helpers)
      if (!resolvedSymbol) {
        resolvedSymbol = sameFileSymbols.find(
          (s) => s.name === calledName && s.id !== sym.id,
        );
      }

      // 3. Fallback: match by global project symbol name
      if (!resolvedSymbol) {
        const globalCandidates = symbolByName.get(calledName) || [];
        if (globalCandidates.length === 1) {
          resolvedSymbol = globalCandidates[0];
        }
      }

      if (resolvedSymbol) {
        // Register callee (downstream)
        if (!currentNode.dependencies.some((d) => d.symbol.id === resolvedSymbol!.id)) {
          currentNode.dependencies.push({
            symbol: resolvedSymbol,
            viaImport: viaImportSource,
          });
          totalDependenciesMapped++;
        }

        // Register caller (upstream on target)
        const targetNode = nodesMap.get(resolvedSymbol.id);
        if (
          targetNode &&
          !targetNode.dependents.some((d) => d.symbol.id === sym.id)
        ) {
          targetNode.dependents.push({
            symbol: sym,
            viaImport: viaImportSource,
          });
        }
      }
    }
  }

  // Calculate impact radii and levels
  let totalComponents = 0;
  let totalHooks = 0;

  for (const [, node] of nodesMap) {
    if (node.symbol.kind === "component") totalComponents++;
    if (node.symbol.kind === "hook") totalHooks++;

    const radius = node.dependencies.length + node.dependents.length;
    node.impactRadius = radius;
    node.impactLevel = radius >= 6 ? "high" : radius >= 3 ? "medium" : "low";
  }

  return {
    symbols: allSymbols,
    nodesMap,
    fileSymbolsMap,
    totalFunctions: allSymbols.length,
    totalComponents,
    totalHooks,
    totalDependenciesMapped,
    analyzedFilesCount: codeFiles.length,
    diagnostics: allDiagnostics,
    totalSyntaxWarnings: allDiagnostics.length,
    filesWithSyntaxErrors: Array.from(filesWithSyntaxErrorsSet),
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
      searchRegex = new RegExp(`\\b${escaped}\\b`, options.caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      searchRegex = new RegExp(escaped, options.caseSensitive ? "g" : "gi");
    }
  } catch {
    // Fallback on regex error
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    searchRegex = new RegExp(escaped, "gi");
  }

  for (const file of searchFiles) {
    if (options.fileFilter) {
      const filterLower = options.fileFilter.toLowerCase();
      if (
        !file.relativePath.toLowerCase().includes(filterLower) &&
        !file.name.toLowerCase().includes(filterLower)
      ) {
        continue;
      }
    }

    const content = file.textContent || "";
    const lines = content.split("\n");
    const fileSymbols = symbolsMap?.get(file.relativePath) || [];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx];
      searchRegex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = searchRegex.exec(lineText)) !== null) {
        const lineNumber = lineIdx + 1;
        const columnNumber = match.index + 1;

        // Find which function or component encloses this line
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

        // Cap per-file search results to prevent UI flooding
        if (results.length > 250) return results;

        if (!searchRegex.global) break;
      }
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Surgical LLM Context Extractor ("Prompt Surgeon")                  */
/* ------------------------------------------------------------------ */

export function extractSurgicalContext(
  targetId: string,
  analysis: DepLenzAnalysisResult,
): SurgicalContextBundle | null {
  const node = analysis.nodesMap.get(targetId);
  if (!node) return null;

  const target = node.symbol;
  const callers = node.dependents.map((d) => d.symbol);
  const callees = node.dependencies.map((d) => d.symbol);
  const externalDeps = node.externalDependencies;

  // Build a compact, clean surgical prompt
  const parts: string[] = [];

  parts.push(`================================================================================`);
  parts.push(`DEPLENZ SURGICAL CONTEXT FOR LLM`);
  parts.push(`TARGET SYMBOL: ${target.name} (${target.kind.toUpperCase()})`);
  parts.push(`FILE LOCATION: ${target.filePath} (Lines ${target.lineStart}-${target.lineEnd})`);
  parts.push(`IMPACT RADIUS: ${node.impactRadius} (${node.impactLevel.toUpperCase()} BLAST RADIUS)`);
  parts.push(`================================================================================\n`);

  parts.push(`### 1. TARGET IMPLEMENTATION (${target.name})`);
  parts.push(`File: ${target.filePath}`);
  parts.push(`Signature: ${target.signature}`);
  parts.push(`\`\`\`typescript\n${target.body}\n\`\`\`\n`);

  if (callees.length > 0) {
    parts.push(`### 2. DIRECT DEPENDENCIES (Functions/Components called by ${target.name})`);
    parts.push(`Total: ${callees.length} dependencies\n`);
    for (const callee of callees) {
      parts.push(`#### [Dependency] ${callee.name} (${callee.kind})`);
      parts.push(`Location: ${callee.filePath}:${callee.lineStart}`);
      parts.push(`Signature: ${callee.signature}`);
      parts.push(`\`\`\`typescript\n${callee.body}\n\`\`\`\n`);
    }
  }

  if (callers.length > 0) {
    parts.push(`### 3. DIRECT CALLERS (What invokes ${target.name} - Ensure return contracts match)`);
    parts.push(`Total: ${callers.length} callers\n`);
    for (const caller of callers) {
      parts.push(`#### [Caller] ${caller.name} (${caller.kind})`);
      parts.push(`Location: ${caller.filePath}:${caller.lineStart}`);
      parts.push(`Signature: ${caller.signature}`);
      parts.push(`\`\`\`typescript\n${caller.body}\n\`\`\`\n`);
    }
  }

  if (externalDeps.length > 0) {
    parts.push(`### 4. EXTERNAL PACKAGES USED`);
    parts.push(`Packages: ${externalDeps.join(", ")}\n`);
  }

  parts.push(`================================================================================`);
  parts.push(`END OF SURGICAL CONTEXT`);
  parts.push(`================================================================================`);

  const formattedPrompt = parts.join("\n");
  const characterCount = formattedPrompt.length;
  const estimatedTokens = Math.ceil(characterCount / 3.8);

  return {
    targetSymbol: target,
    callers,
    callees,
    externalDeps,
    formattedPrompt,
    estimatedTokens,
    characterCount,
  };
}
