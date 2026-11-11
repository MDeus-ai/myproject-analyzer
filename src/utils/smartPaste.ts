/**
 * Smart Paste — structured LLM output protocol for DepLenz.
 *
 * Smart Paste extends the Surgical LLM Prompt with a strict output contract:
 * the model returns COMPLETE files wrapped in machine-parseable markers, so
 * its response can be pasted straight back into DepLenz, parsed into
 * per-file changes, and re-integrated into the loaded codebase (per-file
 * copy, or a bundled ZIP of every changed file) without breaking the
 * dependency tree the prompt was generated from.
 *
 * Protocol (v1.1):
 *
 *   <<<SMART_PASTE_FILE path="src/App.tsx" action="modify">>>
 *   ...complete file contents...
 *   <<<END_SMART_PASTE_FILE>>>
 *
 *   <<<SMART_PASTE_MANIFEST>>>
 *   - path: src/App.tsx | action: modify | reason: wired the new handler
 *   <<<END_SMART_PASTE_MANIFEST>>>
 *
 * v1.1 changes:
 *  - [0] section: the contract now carries the exact set of files this
 *    change can touch (target + caller + callee files, from the live
 *    dependency graph), so the model can't invent paths.
 *  - [1] explicitly reminds the model that the COMPLETE current target
 *    file is included in the prompt and must be reproduced in full.
 *
 * Added/modified regions are optionally marked inline with single-line
 * comments containing the [SMART-PASTE] token.
 */

import JSZip from "jszip";
import type { ProcessedFile } from "../types";

/* ------------------------------------------------------------------ */
/* Protocol constants                                                  */
/* ------------------------------------------------------------------ */

export const SMART_PASTE_PROTOCOL_VERSION = "1.1";
export const SMART_PASTE_FILE_OPEN = "<<<SMART_PASTE_FILE";
export const SMART_PASTE_FILE_CLOSE = "<<<END_SMART_PASTE_FILE>>>";
export const SMART_PASTE_MANIFEST_OPEN = "<<<SMART_PASTE_MANIFEST>>>";
export const SMART_PASTE_MANIFEST_CLOSE = "<<<END_SMART_PASTE_MANIFEST>>>";

/** Inline comment token placed above every added/modified block. */
export const SMART_PASTE_MARKER = "[SMART-PASTE]";

export type SmartPasteAction = "modify" | "create" | "delete";

export interface SmartPasteSymbolRef {
  name: string;
  filePath: string;
  signature?: string;
}

export interface SmartPastePromptOptions {
  targetName: string;
  targetFilePath: string;
  targetSignature?: string;
  /** Direct callers — contracts that must keep compiling against the target. */
  callers: SmartPasteSymbolRef[];
  /** Internal callees — helpers that already exist and must be reused. */
  callees: SmartPasteSymbolRef[];
  /** npm packages already imported by the target. */
  externalPackages: string[];
  /**
   * Every file this change can touch (target + caller + callee files).
   * Emitted as the [0] scope section: the model's file blocks may only
   * target these paths, plus brand-new files via action="create".
   */
  touchedFiles?: string[];
  /** Request inline [SMART-PASTE] marker comments on changed regions. */
  includeMarkers: boolean;
}

export interface SmartPasteChange {
  path: string;
  action: SmartPasteAction;
  /** Complete file contents (empty string for delete). */
  content: string;
  /** Number of inline [SMART-PASTE] marker comments in the content. */
  markerCount: number;
  /** True when the path matches a file in the currently loaded project. */
  existsInProject: boolean;
}

export interface SmartPasteParseResult {
  changes: SmartPasteChange[];
  /** Human-readable, non-fatal protocol violations. */
  warnings: string[];
  /** Manifest summary lines, when the model emitted a manifest block. */
  manifest: string[];
}

/* ------------------------------------------------------------------ */
/* Prompt contract builder                                             */
/* ------------------------------------------------------------------ */

/**
 * Builds the Smart Paste output contract that is appended to the surgical
 * prompt. The contract is generated FROM the live dependency tree so the
 * model knows exactly which files the change can touch, which callers must
 * keep compiling, which helpers already exist, and which packages are
 * already available.
 */
export function buildSmartPasteInstructions(
  options: SmartPastePromptOptions,
): string {
  const {
    targetName,
    targetFilePath,
    targetSignature,
    callers,
    callees,
    externalPackages,
    touchedFiles,
    includeMarkers,
  } = options;

  const fmtRef = (r: SmartPasteSymbolRef) =>
    `   - ${r.name}  (${r.filePath})${r.signature ? `\n     ${r.signature}` : ""}`;

  const callersText = callers.length
    ? callers.map(fmtRef).join("\n")
    : "   (none detected — the target has no known callers in this project)";
  const calleesText = callees.length
    ? callees.map(fmtRef).join("\n")
    : "   (none detected — the target is a leaf symbol)";
  const packagesText = externalPackages.length
    ? externalPackages.map((p) => `   - ${p}`).join("\n")
    : "   (none detected)";

  // [0] Touch scope — generated from the live dependency graph. File blocks
  // outside this list (other than genuine action="create" additions) are
  // almost always hallucinated paths, so the contract forbids them upfront
  // and the verifier flags them on paste-back.
  const touchedSection =
    touchedFiles && touchedFiles.length > 0
      ? [
          "[0] FILES THIS CHANGE CAN TOUCH — your file blocks may ONLY",
          '    target these paths (plus brand-new files via action="create"):',
          ...touchedFiles.map((p) => `    - ${p}`),
          "",
        ]
      : [];

  const markersSection = includeMarkers
    ? [
        "[3] MARKING YOUR CHANGES — markers ENABLED",
        `    Immediately above EVERY block of code you add or change, place ONE`,
        `    single-line comment containing the token ${SMART_PASTE_MARKER}, in`,
        `    the file's own comment style:`,
        `      TS/JS:   // ${SMART_PASTE_MARKER} <what changed and why>`,
        `      JSX:     {/* ${SMART_PASTE_MARKER} <what changed> */}`,
        `      CSS:     /* ${SMART_PASTE_MARKER} <what changed> */`,
        `      HTML:    <!-- ${SMART_PASTE_MARKER} <what changed> -->`,
        `      Py/YAML: # ${SMART_PASTE_MARKER} <what changed>`,
        `    Markers must be single-line. Do not mark code you left untouched.`,
      ].join("\n")
    : [
        "[3] MARKING YOUR CHANGES — markers DISABLED for this run.",
        `    Do NOT add any ${SMART_PASTE_MARKER} comments anywhere.`,
      ].join("\n");

  const rule = "=".repeat(70);

  return [
    rule,
    `SMART PASTE — STRUCTURED OUTPUT CONTRACT (DepLenz v${SMART_PASTE_PROTOCOL_VERSION})`,
    rule,
    "Your answer will be pasted back into DepLenz, parsed by a machine, and",
    "mapped onto the existing codebase described above. Obey this contract",
    "EXACTLY — deviations (markdown fences, prose between blocks, partial",
    "files, invented paths) break re-integration.",
    "",
    ...touchedSection,
    "[1] OUTPUT FORMAT — one COMPLETE file block per changed file:",
    "",
    `${SMART_PASTE_FILE_OPEN} path="<exact root-relative path>" action="modify">>>`,
    "<the ENTIRE file, every line, nothing omitted>",
    SMART_PASTE_FILE_CLOSE,
    "",
    '    - action="modify"  an existing file you are changing',
    '    - action="create"  a brand-new file (full contents)',
    '    - action="delete"  remove a file (body may be empty)',
    '    - NEVER emit diffs, "// ... rest unchanged", or truncated snippets —',
    "      each block REPLACES the whole file in the project.",
    "    - The COMPLETE current content of the target file is included in",
    "      this prompt — reproduce it entirely with your changes applied,",
    "      including every import line. Never invent lines you were shown.",
    "    - Do NOT wrap blocks in triple-backtick fences. No commentary",
    "      between blocks; explanations belong only in the manifest.",
    "",
    "[2] MANIFEST — exactly once, after all file blocks:",
    "",
    SMART_PASTE_MANIFEST_OPEN,
    "- path: <path> | action: <modify|create|delete> | reason: <one line>",
    SMART_PASTE_MANIFEST_CLOSE,
    "",
    markersSection,
    "",
    `[4] RESPECT THE DEPENDENCY TREE — you are editing "${targetName}"`,
    `    in ${targetFilePath}.`,
    targetSignature ? `    Signature: ${targetSignature}` : "",
    "",
    "    A. UPSTREAM CALLERS — these symbols invoke the target. Its public",
    "       contract (name, parameters, return shape) must keep compiling",
    "       for them. If you change the contract, you MUST also emit updated",
    "       file blocks for every affected caller:",
    callersText,
    "",
    "    B. DOWNSTREAM DEPENDENCIES — these helpers ALREADY EXIST in the",
    "       codebase. Import and reuse them; do not re-implement, rename,",
    "       or duplicate them:",
    calleesText,
    "",
    "    C. PACKAGES already imported by the target (adding a new runtime",
    "       dependency requires listing it explicitly in the manifest):",
    packagesText,
    "",
    "[5] STYLE & INTEGRITY",
    "    - Match the language, framework, import style, naming and",
    "      formatting of the files shown in this prompt.",
    "    - Preserve every symbol, import and export unrelated to the",
    "      requested change.",
    "    - Paths must match the root-relative paths in this prompt exactly.",
    rule,
    "END OF SMART PASTE CONTRACT",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Response parser                                                     */
/* ------------------------------------------------------------------ */

const FILE_BLOCK_RE =
  /<<<SMART_PASTE_FILE\s+([^>]*?)>>>([\s\S]*?)<<<END_SMART_PASTE_FILE>>>/g;
const MANIFEST_RE =
  /<<<SMART_PASTE_MANIFEST>>>([\s\S]*?)<<<END_SMART_PASTE_MANIFEST>>>/;
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
  }
  return out;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/** Strips blank edge lines and stray markdown fences around a block body. */
function stripEdgeFences(content: string): string {
  const lines = content.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length && /^```[\w-]*$/.test(lines[0].trim())) lines.shift();
  if (lines.length && /^```$/.test(lines[lines.length - 1].trim())) lines.pop();
  return lines.join("\n");
}

/** Normalizes a model-emitted path and removes traversal segments. */
export function sanitizeSmartPastePath(rawPath: string): string {
  return rawPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((seg) => seg !== ".." && seg !== "." && seg !== "")
    .join("/");
}

/**
 * Parses an LLM response into structured per-file changes. Tolerates the
 * model wrapping blocks in markdown fences; reports protocol violations as
 * warnings instead of failing hard.
 */
export function parseSmartPasteResponse(
  rawText: string,
  projectFiles: ProcessedFile[] = [],
): SmartPasteParseResult {
  const warnings: string[] = [];
  const changes: SmartPasteChange[] = [];
  const manifest: string[] = [];

  const text = rawText ?? "";
  if (!text.trim()) {
    return { changes, warnings: ["Response is empty."], manifest };
  }

  // Guard: the generated prompt (or just its contract) was pasted back
  // instead of the model's response. The contract contains a template
  // manifest block that would otherwise be parsed as a real manifest.
  if (
    text.includes("SMART PASTE — STRUCTURED OUTPUT CONTRACT") ||
    text.includes("END OF SMART PASTE CONTRACT") ||
    text.includes("DEPLENZ SURGICAL CONTEXT")
  ) {
    warnings.push(
      "This looks like the DepLenz-generated prompt, not an LLM response — it contains the output contract itself. Copy the prompt to your model, then paste the model's ANSWER here.",
    );
  }

  const knownPaths = new Set(
    projectFiles.map((f) => f.relativePath.replace(/\\/g, "/")),
  );

  const seenPaths = new Set<string>();
  let match: RegExpExecArray | null;
  FILE_BLOCK_RE.lastIndex = 0;

  while ((match = FILE_BLOCK_RE.exec(text)) !== null) {
    const attrs = parseAttributes(match[1]);
    const rawPath = (attrs.path ?? attrs.file ?? "").trim();
    if (!rawPath) {
      warnings.push("Skipped a file block with no path attribute.");
      continue;
    }

    const path = sanitizeSmartPastePath(rawPath);
    if (path !== rawPath.replace(/\\/g, "/").replace(/^\/+/, "")) {
      warnings.push(`Path "${rawPath}" was sanitized to "${path}".`);
    }

    let action = (attrs.action ?? "modify").toLowerCase() as SmartPasteAction;
    if (!["modify", "create", "delete"].includes(action)) {
      warnings.push(
        `Unknown action "${attrs.action}" for ${path} — treated as "modify".`,
      );
      action = "modify";
    }

    const content = stripEdgeFences(match[2] ?? "");
    if (action !== "delete" && content.trim() === "") {
      warnings.push(`File block for ${path} is empty.`);
    }

    if (seenPaths.has(path)) {
      warnings.push(`Duplicate block for ${path} — the later block wins.`);
      const idx = changes.findIndex((c) => c.path === path);
      if (idx >= 0) changes.splice(idx, 1);
    }
    seenPaths.add(path);

    const existsInProject = knownPaths.has(path);
    if (action === "modify" && !existsInProject) {
      warnings.push(
        `"${path}" is marked modify but does not exist in the loaded project (it will be created).`,
      );
    }
    if (action === "create" && existsInProject) {
      warnings.push(
        `"${path}" is marked create but already exists in the loaded project (it will overwrite).`,
      );
    }

    changes.push({
      path,
      action,
      content,
      markerCount: countOccurrences(content, SMART_PASTE_MARKER),
      existsInProject,
    });
  }

  if (changes.length === 0) {
    // Distinguish "pasted code without fences" from "nothing usable at all"
    // so the warning tells the user exactly how to recover.
    const looksLikeCode =
      /\b(import|export|function|const|interface|class)\b/.test(text) ||
      text.includes("=>") ||
      text.includes("</");
    warnings.push(
      looksLikeCode
        ? `No Smart Paste file blocks found, but the paste contains code. Wrap each file in ${SMART_PASTE_FILE_OPEN} path="..." action="modify">>> … ${SMART_PASTE_FILE_CLOSE} markers, or paste the model's full response.`
        : `No Smart Paste file blocks found. Expected ${SMART_PASTE_FILE_OPEN} path="..." action="...">>> markers.`,
    );
  }

  const manifestMatch = MANIFEST_RE.exec(text);
  if (manifestMatch) {
    for (const line of manifestMatch[1].split("\n")) {
      const t = line.trim();
      if (!t) continue;
      // The contract's own template line (present when the prompt itself
      // is pasted back) is not a real manifest entry.
      if (t.includes("<modify|create|delete>") || /\bpath:\s*<path>/i.test(t)) {
        continue;
      }
      manifest.push(t.replace(/^[-*]\s*/, ""));
    }
  }

  return { changes, warnings, manifest };
}

/* ------------------------------------------------------------------ */
/* Marker stripping (clean exports when markers are disabled)          */
/* ------------------------------------------------------------------ */

/**
 * Removes Smart Paste marker comments from exported content. Full-line
 * marker comments are dropped entirely; inline trailing markers are excised
 * leaving the surrounding code intact.
 */
export function stripSmartPasteMarkers(content: string): string {
  const lines = content.split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    if (!line.includes(SMART_PASTE_MARKER)) {
      kept.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (
      trimmed.startsWith(`//${SMART_PASTE_MARKER}`) ||
      trimmed.startsWith(`// ${SMART_PASTE_MARKER}`) ||
      trimmed.startsWith(`/* ${SMART_PASTE_MARKER}`) ||
      trimmed.startsWith(`{/* ${SMART_PASTE_MARKER}`) ||
      trimmed.startsWith(`<!-- ${SMART_PASTE_MARKER}`) ||
      trimmed.startsWith(`# ${SMART_PASTE_MARKER}`)
    ) {
      continue; // full-line marker comment
    }
    const cleaned = line
      .replace(/\s*\/\/\s*\[SMART-PASTE\].*$/, "")
      .replace(/\s*\{\/\*\s*\[SMART-PASTE\][^*]*\*\/\}/, "")
      .replace(/\s*\/\*\s*\[SMART-PASTE\][^*]*\*\//, "")
      .replace(/\s*<!--\s*\[SMART-PASTE\].*?-->/, "");
    kept.push(cleaned.replace(/\s+$/, ""));
  }

  return kept.join("\n");
}

/* ------------------------------------------------------------------ */
/* ZIP export                                                          */
/* ------------------------------------------------------------------ */

/**
 * Bundles all changed files into a ZIP archive that PRESERVES the original
 * folder structure (unlike the flat-file stripper), plus a manifest file
 * describing every change. Deleted files are listed in the manifest only.
 */
export async function createSmartPasteZip(
  changes: SmartPasteChange[],
  options: { stripMarkers: boolean },
): Promise<Blob> {
  const zip = new JSZip();
  const manifestLines: string[] = [
    "SMART PASTE — CHANGED FILES MANIFEST",
    `Generated: ${new Date().toISOString()}`,
    `Protocol: v${SMART_PASTE_PROTOCOL_VERSION}`,
    `Files: ${changes.length}`,
    `Markers stripped: ${options.stripMarkers ? "yes" : "no"}`,
    "",
  ];

  for (const change of changes) {
    manifestLines.push(
      `[${change.action.toUpperCase()}] ${change.path}${
        change.markerCount > 0 ? ` (${change.markerCount} markers)` : ""
      }`,
    );
    if (change.action === "delete") continue;
    const safePath = sanitizeSmartPastePath(change.path);
    if (!safePath) continue;
    const content = options.stripMarkers
      ? stripSmartPasteMarkers(change.content)
      : change.content;
    zip.file(safePath, content);
  }

  zip.file("SMART_PASTE_MANIFEST.txt", manifestLines.join("\n"));
  return zip.generateAsync({ type: "blob" });
}
