import { ProcessedFile } from "../types";
import { formatBytes, getFileExtension } from "./fileHelpers";

export interface CodeLanguageInfo {
  isCode: boolean;
  language: string;
  fileType: string;
  category: string;
}

/**
 * Output formats supported by the CodeFile Analyzer.
 * - `standard`: full metadata header + separators (human-readable archival)
 * - `compact`:  minimal `# ---- path ----` header + code only (token-efficient)
 * - `markdown`: fenced code blocks with blockquote metadata
 * - `xml`:      CDATA-wrapped, attribute-rich tags (ideal for Claude-style prompts)
 * - `jsonl`:    one JSON record per line (RAG pipelines, vector DB ingestion)
 */
export type AnalyzerStyle =
  | "standard"
  | "compact"
  | "markdown"
  | "xml"
  | "jsonl"
  | "json";

const EXTENSION_MAP: Record<
  string,
  { language: string; fileType: string; category: string }
> = {
  // Web & UI
  html: { language: "HTML", fileType: "html", category: "web" },
  htm: { language: "HTML", fileType: "html", category: "web" },
  xhtml: { language: "XHTML", fileType: "xhtml", category: "web" },
  tsx: { language: "TypeScript React", fileType: "tsx", category: "frontend" },
  jsx: { language: "JavaScript React", fileType: "jsx", category: "frontend" },
  ts: { language: "TypeScript", fileType: "ts", category: "scripting" },
  js: { language: "JavaScript", fileType: "js", category: "scripting" },
  mjs: { language: "JavaScript (ESM)", fileType: "mjs", category: "scripting" },
  cjs: {
    language: "JavaScript (CommonJS)",
    fileType: "cjs",
    category: "scripting",
  },
  vue: { language: "Vue Component", fileType: "vue", category: "frontend" },
  svelte: {
    language: "Svelte Component",
    fileType: "svelte",
    category: "frontend",
  },
  css: { language: "CSS Stylesheet", fileType: "css", category: "styling" },
  scss: { language: "SCSS Stylesheet", fileType: "scss", category: "styling" },
  sass: { language: "SASS Stylesheet", fileType: "sass", category: "styling" },
  less: { language: "LESS Stylesheet", fileType: "less", category: "styling" },
  svg: { language: "SVG Image", fileType: "svg", category: "web" },

  // Systems & Backend
  py: { language: "Python", fileType: "py", category: "backend" },
  go: { language: "Go", fileType: "go", category: "backend" },
  rs: { language: "Rust", fileType: "rs", category: "systems" },
  java: { language: "Java", fileType: "java", category: "backend" },
  c: { language: "C Source", fileType: "c", category: "systems" },
  cpp: { language: "C++ Source", fileType: "cpp", category: "systems" },
  cc: { language: "C++ Source", fileType: "cc", category: "systems" },
  cxx: { language: "C++ Source", fileType: "cxx", category: "systems" },
  h: { language: "C/C++ Header", fileType: "h", category: "systems" },
  hpp: { language: "C++ Header", fileType: "hpp", category: "systems" },
  cs: { language: "C#", fileType: "cs", category: "backend" },
  php: { language: "PHP", fileType: "php", category: "backend" },
  rb: { language: "Ruby", fileType: "rb", category: "backend" },
  swift: { language: "Swift", fileType: "swift", category: "mobile" },
  kt: { language: "Kotlin", fileType: "kt", category: "mobile" },
  kts: { language: "Kotlin Script", fileType: "kts", category: "scripting" },
  dart: { language: "Dart", fileType: "dart", category: "mobile" },
  scala: { language: "Scala", fileType: "scala", category: "backend" },
  clj: { language: "Clojure", fileType: "clj", category: "backend" },
  ex: { language: "Elixir", fileType: "ex", category: "backend" },
  exs: { language: "Elixir Script", fileType: "exs", category: "scripting" },
  lua: { language: "Lua", fileType: "lua", category: "scripting" },
  pl: { language: "Perl", fileType: "pl", category: "scripting" },
  r: { language: "R Script", fileType: "r", category: "data" },

  // Shell & Scripts
  sh: { language: "Shell Script", fileType: "sh", category: "scripting" },
  bash: { language: "Bash Script", fileType: "bash", category: "scripting" },
  zsh: { language: "Zsh Script", fileType: "zsh", category: "scripting" },
  fish: { language: "Fish Script", fileType: "fish", category: "scripting" },
  ps1: { language: "PowerShell", fileType: "ps1", category: "scripting" },
  bat: { language: "Batch Script", fileType: "bat", category: "scripting" },
  cmd: { language: "CMD Script", fileType: "cmd", category: "scripting" },

  // Configuration & Data
  json: { language: "JSON Data", fileType: "json", category: "config" },
  json5: { language: "JSON5 Data", fileType: "json5", category: "config" },
  yaml: {
    language: "YAML Configuration",
    fileType: "yaml",
    category: "config",
  },
  yml: { language: "YAML Configuration", fileType: "yml", category: "config" },
  toml: {
    language: "TOML Configuration",
    fileType: "toml",
    category: "config",
  },
  xml: { language: "XML Document", fileType: "xml", category: "data" },
  sql: {
    language: "SQL Database Script",
    fileType: "sql",
    category: "database",
  },
  graphql: {
    language: "GraphQL Schema/Query",
    fileType: "graphql",
    category: "api",
  },
  gql: { language: "GraphQL Schema/Query", fileType: "gql", category: "api" },
  proto: { language: "Protocol Buffers", fileType: "proto", category: "api" },
  env: {
    language: "Environment Configuration",
    fileType: "env",
    category: "config",
  },
  ini: { language: "INI Configuration", fileType: "ini", category: "config" },
  conf: {
    language: "Config File",
    fileType: "conf",
    category: "config",
  },
  properties: {
    language: "Java Properties",
    fileType: "properties",
    category: "config",
  },

  // Documentation & Text
  md: { language: "Markdown Document", fileType: "md", category: "docs" },
  mdx: { language: "MDX Document", fileType: "mdx", category: "docs" },
  txt: { language: "Plain Text", fileType: "txt", category: "docs" },
  csv: {
    language: "Comma Separated Values",
    fileType: "csv",
    category: "data",
  },
  tsv: { language: "Tab Separated Values", fileType: "tsv", category: "data" },
  lock: {
    language: "Dependency Lockfile",
    fileType: "lock",
    category: "config",
  },
};

/** Dotfiles (no conventional extension) that are known plain-text configs. */
const DOTFILE_MAP: Record<string, { language: string; category: string }> = {
  gitignore: { language: "Git Ignore Rules", category: "config" },
  gitattributes: { language: "Git Attributes", category: "config" },
  dockerignore: { language: "Docker Ignore Rules", category: "config" },
  npmignore: { language: "NPM Ignore Rules", category: "config" },
  npmrc: { language: "NPM Configuration", category: "config" },
  nvmrc: { language: "Node Version Pin", category: "config" },
  babelrc: { language: "Babel Configuration", category: "config" },
  eslintrc: { language: "ESLint Configuration", category: "config" },
  prettierrc: { language: "Prettier Configuration", category: "config" },
  browserslistrc: {
    language: "Browserslist Configuration",
    category: "config",
  },
  editorconfig: { language: "Editor Configuration", category: "config" },
  huskyrc: { language: "Husky Configuration", category: "config" },
  gitkeep: { language: "Directory Placeholder", category: "config" },
  keep: { language: "Directory Placeholder", category: "config" },
};

/** Extensionless files (matched by full lowercase name) that are plain text. */
const FULLNAME_MAP: Record<string, { language: string; category: string }> = {
  license: { language: "License Text", category: "docs" },
  licence: { language: "License Text", category: "docs" },
  changelog: { language: "Changelog", category: "docs" },
  contributing: { language: "Contributing Guide", category: "docs" },
  authors: { language: "Authors List", category: "docs" },
  procfile: { language: "Procfile", category: "config" },
  jenkinsfile: { language: "Jenkins Pipeline", category: "config" },
};

/**
 * Identifies whether a file is a source code/configuration file and returns detailed metadata.
 */
export function identifyCodeFileType(filename: string): CodeLanguageInfo {
  const ext = getFileExtension(filename).toLowerCase();

  // Special full-name matches
  const lowerName = filename.toLowerCase();
  if (lowerName === "dockerfile" || lowerName.startsWith("dockerfile.")) {
    return {
      isCode: true,
      language: "Dockerfile",
      fileType: "dockerfile",
      category: "devops",
    };
  }
  if (lowerName === "makefile" || lowerName === "gnumakefile") {
    return {
      isCode: true,
      language: "Makefile",
      fileType: "makefile",
      category: "devops",
    };
  }
  if (lowerName.startsWith(".env")) {
    return {
      isCode: true,
      language: "Environment Configuration",
      fileType: "env",
      category: "config",
    };
  }

  // Known dotfiles (.gitignore, .editorconfig, .nvmrc, ...)
  if (filename.startsWith(".") && DOTFILE_MAP[ext]) {
    return {
      isCode: true,
      language: DOTFILE_MAP[ext].language,
      fileType: ext,
      category: DOTFILE_MAP[ext].category,
    };
  }

  // Known extensionless files (LICENSE, CHANGELOG, Procfile, ...)
  const fullNameMatch = FULLNAME_MAP[lowerName];
  if (fullNameMatch) {
    return {
      isCode: true,
      language: fullNameMatch.language,
      fileType: lowerName,
      category: fullNameMatch.category,
    };
  }

  const match = EXTENSION_MAP[ext];
  if (match) {
    return {
      isCode: true,
      language: match.language,
      fileType: match.fileType,
      category: match.category,
    };
  }

  return {
    isCode: false,
    language: ext ? ext.toUpperCase() : "Unknown",
    fileType: ext || "unknown",
    category: "other",
  };
}

/**
 * Returns true if the file should be read as text content.
 * Any file identifyCodeFileType marks as code is readable, plus
 * files whose MIME type is a known text-ish type.
 */
export function isTextReadableFile(
  filename: string,
  mimeType?: string,
): boolean {
  if (mimeType) {
    if (mimeType.startsWith("text/")) return true;
    if (
      [
        "application/json",
        "application/javascript",
        "application/xml",
        "application/x-sh",
        "application/yaml",
        "application/x-yaml",
        "application/toml",
      ].includes(mimeType)
    ) {
      return true;
    }
  }
  return identifyCodeFileType(filename).isCode;
}

/** Maximum file size for which text content is read into memory. */
export const MAX_TEXT_READ_SIZE = 512 * 1024; // 512 KB

/**
 * Dependency lockfiles: technically "code" by extension/name, but they are
 * huge and near-zero value to an LLM (package-lock.json alone can be ~40%
 * of a project export). The Analyzer deselects them by default and flags
 * them in the file list.
 */
const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "gemfile.lock",
  "poetry.lock",
  "pipfile.lock",
  "go.sum",
]);

export function isLockfile(filename: string): boolean {
  return LOCKFILE_NAMES.has(filename.toLowerCase());
}
/**
 * Returns an honest reason for missing text content, distinguishing
 * empty files, over-limit files, and true binaries.
 */
export function getMissingContentReason(file: {
  size: number;
  type: string;
}): string {
  if (file.size === 0) return "(File is empty)";
  if (file.size > MAX_TEXT_READ_SIZE) {
    return `(Skipped: file is ${formatBytes(file.size)}, over the ${formatBytes(MAX_TEXT_READ_SIZE)} text read limit)`;
  }
  return "(Binary content — not readable as text)";
}

export interface AnalyzerFormatOptions {
  style?: AnalyzerStyle;
  includeLineNumbers?: boolean;
  rootFolderName?: string;
  addTableOfContents?: boolean;
}

/**
 * Counts total lines in a string of code.
 */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.split("\n").length;
}

/**
 * Simple approximation of token count (~4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Returns the file's path relative to the scanned project root
 * (strips the leading root folder segment when present).
 */
export function getRelativePathFromRoot(
  file: ProcessedFile,
  rootFolderName: string = "",
): string {
  let rel = file.relativePath.replace(/^[\\/]+/, "").replace(/\\/g, "/");
  if (rootFolderName && rel.startsWith(rootFolderName + "/")) {
    rel = rel.slice(rootFolderName.length + 1);
  }
  return rel;
}

function addLineNumbers(content: string): string {
  const lines = content.split("\n");
  const padLength = String(lines.length).length;
  return lines
    .map((line, idx) => `${String(idx + 1).padStart(padLength, " ")} | ${line}`)
    .join("\n");
}

/** Escapes a value for safe inclusion inside a double-quoted XML attribute. */
function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escapes content for inclusion in a CDATA section. A literal `]]>` must never
 * appear inside CDATA, so it is split across two adjacent sections using the
 * standard `]]]]><![CDATA[>` trick.
 */
function escapeCdata(text: string): string {
  return text.replace(/]]>/g, "]]]]><![CDATA[>");
}

/** Builds the JSONL record object for a single file (content stays pristine). */
function buildJsonlFileRecord(file: ProcessedFile, rootFolderName: string) {
  const meta = identifyCodeFileType(file.name);
  const content = file.textContent || getMissingContentReason(file);
  return {
    recordType: "file" as const,
    path: getRelativePathFromRoot(file, rootFolderName),
    name: file.name,
    fileType: meta.fileType,
    language: meta.language,
    category: meta.category,
    size: file.size,
    lines: countLines(content),
    content,
  };
}

/**
 * Formats a single file according to the selected style.
 * Standard: 1) metadata on top, 2) actual content, 3) end indicator.
 */
export function formatSingleCodeFile(
  file: ProcessedFile,
  options: AnalyzerFormatOptions = {},
): string {
  const {
    style = "standard",
    includeLineNumbers = false,
    rootFolderName = "",
  } = options;
  const meta = identifyCodeFileType(file.name);
  const relativeFromRoot = getRelativePathFromRoot(file, rootFolderName);
  const content = file.textContent || getMissingContentReason(file);
  const linesCount = countLines(content);

  // JSONL: one self-contained JSON record (content stays machine-pristine).
  if (style === "jsonl") {
    return JSON.stringify(buildJsonlFileRecord(file, rootFolderName)) + "\n";
  }

  // JSON: single pretty-printed JSON document
  if (style === "json") {
    return (
      JSON.stringify(buildJsonlFileRecord(file, rootFolderName), null, 2) + "\n"
    );
  }

  // Compact: token-efficient — just a path header and the raw code.
  if (style === "compact") {
    return `# ---- ${relativeFromRoot} ----\n${content}\n`;
  }

  // XML: attributes carry metadata, CDATA carries code safely (TSX/HTML can't break it).
  if (style === "xml") {
    return [
      `<file path="${escapeXmlAttr(relativeFromRoot)}" name="${escapeXmlAttr(file.name)}" type="${meta.fileType}" language="${escapeXmlAttr(meta.language)}" size="${file.size}" lines="${linesCount}">`,
      "<![CDATA[",
      escapeCdata(content),
      "]]>",
      "</file>",
      "",
    ].join("\n");
  }

  let formattedCode = content;
  if (includeLineNumbers && content) {
    formattedCode = addLineNumbers(content);
  }

  if (style === "markdown") {
    return [
      `### File: ${file.name}`,
      `> **Location**: \`${relativeFromRoot}\``,
      `> **Type**: \`${meta.fileType}\` (${meta.language})`,
      `> **Size**: ${formatBytes(file.size)} | **Lines**: ${linesCount}`,
      "",
      `\`\`\`${meta.fileType}`,
      formattedCode,
      "```",
      `<!-- END OF FILE: ${relativeFromRoot} -->`,
      "",
    ].join("\n");
  }

  // Default Standard structure:
  // 1) metadata on top (file location in the project, file name and type)
  // 2) the file's actual contents (code)
  // 3) indicate the file's end
  const separator = "=".repeat(80);
  return [
    separator,
    `FILE LOCATION: ${relativeFromRoot}`,
    `FILE NAME: ${file.name}`,
    `FILE TYPE: ${meta.fileType} (${meta.language})`,
    `FILE SIZE: ${formatBytes(file.size)} | LINES: ${linesCount}`,
    separator,
    formattedCode,
    separator,
    `END OF FILE: ${relativeFromRoot}`,
    separator,
    "",
  ].join("\n");
}

/**
 * Combines multiple code files into one single text output, formatted
 * according to the selected style.
 */
export function combineMultipleCodeFiles(
  files: ProcessedFile[],
  options: AnalyzerFormatOptions = {},
): string {
  const {
    style = "standard",
    addTableOfContents = true,
    rootFolderName = "",
  } = options;
  const exportedAt = new Date().toISOString();

  // ---- JSONL: metadata record first, then one record per file --------------
  if (style === "jsonl") {
    const lines = [
      JSON.stringify({
        recordType: "metadata",
        rootFolder: rootFolderName || "Project Root",
        fileCount: files.length,
        exportedAt,
        files: files.map((f) => getRelativePathFromRoot(f, rootFolderName)),
      }),
      ...files.map((f) =>
        JSON.stringify(buildJsonlFileRecord(f, rootFolderName)),
      ),
    ];
    return lines.join("\n") + "\n";
  }

  // ---- JSON: single pretty-printed JSON document ----------------------------
  if (style === "json") {
    const doc = {
      recordType: "document",
      rootFolder: rootFolderName || "Project Root",
      fileCount: files.length,
      exportedAt,
      files: files.map((f) => buildJsonlFileRecord(f, rootFolderName)),
    };
    return JSON.stringify(doc, null, 2) + "\n";
  }

  // ---- Compact: files only, zero document chrome ----------------------------
  if (style === "compact") {
    return files.map((f) => formatSingleCodeFile(f, options)).join("\n");
  }

  // ---- XML: valid document with a root <codebase> element -------------------
  if (style === "xml") {
    const parts: string[] = [
      `<codebase root="${escapeXmlAttr(rootFolderName || "Project Root")}" fileCount="${files.length}" exportedAt="${exportedAt}">`,
    ];
    for (const file of files) {
      parts.push(formatSingleCodeFile(file, options));
    }
    parts.push("</codebase>", "");
    return parts.join("\n");
  }

  // ---- Markdown: native heading + bullet metadata + optional TOC ------------
  if (style === "markdown") {
    const parts: string[] = [
      "# Codefile Analyzer: Combined Project Codebase Archive",
      "",
      `- **Root Folder**: \`${rootFolderName || "Project Root"}\``,
      `- **Total Files Included**: ${files.length}`,
      `- **Export Timestamp**: ${exportedAt.replace("T", " ").substring(0, 19)}`,
      "",
    ];

    if (addTableOfContents && files.length > 1) {
      parts.push("## Table of Contents", "");
      files.forEach((file, idx) => {
        const meta = identifyCodeFileType(file.name);
        parts.push(
          `  ${idx + 1}. [${meta.fileType.toUpperCase()}] ${getRelativePathFromRoot(file, rootFolderName)} (${formatBytes(file.size)})`,
        );
      });
      parts.push("");
    }

    for (const file of files) {
      parts.push(formatSingleCodeFile(file, options));
    }
    return parts.join("\n");
  }

  // ---- Standard: banner header + optional TOC + 3-part file sections --------
  const sections: string[] = [];
  const separator = "=".repeat(80);
  sections.push(
    separator,
    `CODEFILE ANALYZER: COMBINED PROJECT CODEBASE ARCHIVE`,
    `ROOT FOLDER: ${rootFolderName || "Project Root"}`,
    `TOTAL FILES INCLUDED: ${files.length}`,
    `EXPORT TIMESTAMP: ${exportedAt.replace("T", " ").substring(0, 19)}`,
    separator,
    "",
  );

  if (addTableOfContents && files.length > 1) {
    sections.push("TABLE OF CONTENTS:");
    files.forEach((file, idx) => {
      const rel = getRelativePathFromRoot(file, rootFolderName);
      const meta = identifyCodeFileType(file.name);
      sections.push(
        `  ${idx + 1}. [${meta.fileType.toUpperCase()}] ${rel} (${formatBytes(file.size)})`,
      );
    });
    sections.push("", separator, "");
  }

  for (const file of files) {
    sections.push(formatSingleCodeFile(file, options));
  }

  return sections.join("\n");
}
