/**
 * Token-Efficient Project & Code Evolution Log
 *
 * Tracks iterative changes across a codebase (Smart Paste re-integrations,
 * live-watch disk edits, architectural milestones, and manual notes) and
 * serializes them into an ultra-compact delta log (`~15–25 tokens` per entry)
 * so downstream LLMs receive high-signal handover context without wasting
 * context window budget.
 */

import { ProcessedFile } from "@myproject/core/types";

export type EvolutionSource =
  | "smart-paste"
  | "live-watch"
  | "manual"
  | "snapshot";

export interface EvolutionFileChange {
  path: string;
  action: "modify" | "create" | "delete";
  addedLines: number;
  removedLines: number;
  symbolsChanged: string[];
}

export interface EvolutionEntry {
  id: string;
  timestamp: number;
  source: EvolutionSource;
  summary: string;
  targetSymbol?: string;
  userTaskPrompt?: string;
  changes: EvolutionFileChange[];
  /** Single-line token-optimized representation for LLM handovers. */
  compactDelta: string;
  /** Estimated tokens consumed by `compactDelta`. */
  estimatedTokens: number;
}

export interface EvolutionHandoverResult {
  text: string;
  includedCount: number;
  totalCount: number;
  estimatedTokens: number;
}

const EVOLUTION_STORAGE_PREFIX = "myproject_evolution_log_v1:";
const MAX_STORED_ENTRIES = 60;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

function formatShortTime(ts: number): string {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "00:00";
  }
}

function shortSourceTag(source: EvolutionSource): string {
  switch (source) {
    case "smart-paste":
      return "paste";
    case "live-watch":
      return "watch";
    case "manual":
      return "note";
    case "snapshot":
      return "init";
  }
}

function shortActionCode(action: "modify" | "create" | "delete"): string {
  switch (action) {
    case "create":
      return "A";
    case "delete":
      return "D";
    case "modify":
    default:
      return "M";
  }
}

/**
 * Computes fast line additions/deletions between two strings without heavy allocations.
 */
export function computeQuickLineDelta(
  beforeText: string | undefined,
  afterText: string | undefined,
): { addedLines: number; removedLines: number } {
  if (!beforeText && !afterText) return { addedLines: 0, removedLines: 0 };
  if (!beforeText) {
    return {
      addedLines: (afterText || "").split("\n").length,
      removedLines: 0,
    };
  }
  if (!afterText) {
    return {
      addedLines: 0,
      removedLines: beforeText.split("\n").length,
    };
  }

  const beforeLines = beforeText.split("\n");
  const afterLines = afterText.split("\n");

  const beforeFreq = new Map<string, number>();
  for (const raw of beforeLines) {
    const l = raw.trim();
    if (!l) continue;
    beforeFreq.set(l, (beforeFreq.get(l) ?? 0) + 1);
  }

  let shared = 0;
  let afterNonEmpty = 0;
  for (const raw of afterLines) {
    const l = raw.trim();
    if (!l) continue;
    afterNonEmpty++;
    const count = beforeFreq.get(l) ?? 0;
    if (count > 0) {
      shared++;
      beforeFreq.set(l, count - 1);
    }
  }

  let beforeNonEmpty = 0;
  for (const raw of beforeLines) {
    if (raw.trim()) beforeNonEmpty++;
  }

  return {
    addedLines: Math.max(0, afterNonEmpty - shared),
    removedLines: Math.max(0, beforeNonEmpty - shared),
  };
}

/**
 * Extracts changed top-level symbol names between two versions of a file.
 */
export function detectChangedSymbolNames(
  beforeText: string | undefined,
  afterText: string | undefined,
): string[] {
  const extractQuickSymbols = (src: string | undefined): Map<string, string> => {
    const map = new Map<string, string>();
    if (!src) return map;
    const lines = src.split("\n");
    const headRe =
      /^(?:export\s+(?:default\s+)?)?(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=|fn\s+([A-Za-z_]\w*)|(?:class|struct|trait|enum|interface)\s+([A-Za-z_]\w*)|(?:[\w:<>*&]+\s+)+([A-Za-z_]\w*(?:::[A-Za-z_]\w*)?)\s*\()/;
    for (let i = 0; i < lines.length; i++) {
      const tr = lines[i].trim();
      if (!tr || tr.startsWith("//") || tr.startsWith("#") || tr.startsWith("/*"))
        continue;
      const m = headRe.exec(tr);
      if (!m) continue;
      const name = m[1] || m[2] || m[3] || m[4] || m[5];
      if (!name || ["if", "for", "while", "switch", "catch", "return"].includes(name))
        continue;
      const snippet = lines.slice(i, Math.min(lines.length, i + 18)).join("\n");
      map.set(name, snippet);
    }
    return map;
  };

  const beforeMap = extractQuickSymbols(beforeText);
  const afterMap = extractQuickSymbols(afterText);
  const changed: string[] = [];

  for (const [name, body] of afterMap) {
    if (!beforeMap.has(name) || beforeMap.get(name) !== body) {
      changed.push(name);
    }
  }
  for (const name of beforeMap.keys()) {
    if (!afterMap.has(name) && !changed.includes(name)) {
      changed.push(`-${name}`);
    }
  }
  return changed.slice(0, 5);
}

/**
 * Builds the ultra-compact single-line delta representation for an evolution entry.
 * Example:
 * `[14:22|paste] src/auth.ts(M +12/-3: validateToken) :: Add JWT expiry guard`
 */
export function formatEntryCompactDelta(
  entry: Omit<EvolutionEntry, "compactDelta" | "estimatedTokens">,
): string {
  const timeTag = formatShortTime(entry.timestamp);
  const srcTag = shortSourceTag(entry.source);

  const fileParts = entry.changes.slice(0, 4).map((c) => {
    const shortPath =
      c.path.split("/").slice(-2).join("/") || c.path;
    const act = shortActionCode(c.action);
    const delta =
      c.action === "delete"
        ? `-${c.removedLines}`
        : c.action === "create"
          ? `+${c.addedLines}`
          : `+${c.addedLines}/-${c.removedLines}`;
    const symList = c.symbolsChanged ?? (c as { symbols?: string[] }).symbols ?? [];
    const syms =
      symList.length > 0
        ? `:${symList.slice(0, 3).join(",")}`
        : "";
    return `${shortPath}(${act} ${delta}${syms})`;
  });

  const moreFiles =
    entry.changes.length > 4 ? ` +${entry.changes.length - 4}more` : "";
  const filesSegment =
    fileParts.length > 0
      ? `${fileParts.join(", ")}${moreFiles}`
      : entry.targetSymbol
        ? `target:${entry.targetSymbol}`
        : "workspace";

  const cleanSummary = (entry.summary || entry.userTaskPrompt || "Code update")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 95);

  return `[${timeTag}|${srcTag}] ${filesSegment} :: ${cleanSummary}`;
}

export function createEvolutionEntry(params: {
  source: EvolutionSource;
  summary: string;
  targetSymbol?: string;
  userTaskPrompt?: string;
  changes?: EvolutionFileChange[];
  timestamp?: number;
}): EvolutionEntry {
  const timestamp = params.timestamp ?? Date.now();
  const id = `evo_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;
  const base = {
    id,
    timestamp,
    source: params.source,
    summary: params.summary.trim() || "Updated project code",
    targetSymbol: params.targetSymbol,
    userTaskPrompt: params.userTaskPrompt?.trim() || undefined,
    changes: params.changes ?? [],
  };
  const compactDelta = formatEntryCompactDelta(base);
  return {
    ...base,
    compactDelta,
    estimatedTokens: estimateTokens(compactDelta),
  };
}

/**
 * Builds an EvolutionEntry automatically from a Smart Paste operation.
 */
export function buildEvolutionEntryFromSmartPaste(params: {
  changes: {
    path: string;
    action: "modify" | "create" | "delete";
    content: string;
  }[];
  originalFiles: ProcessedFile[];
  targetSymbol?: string;
  userTaskPrompt?: string;
  manifest?: string[];
  timestamp?: number;
}): EvolutionEntry {
  const origByPath = new Map<string, ProcessedFile>();
  for (const f of params.originalFiles) {
    origByPath.set(f.relativePath, f);
    const stripped = f.relativePath.includes("/")
      ? f.relativePath.slice(f.relativePath.indexOf("/") + 1)
      : f.relativePath;
    if (!origByPath.has(stripped)) origByPath.set(stripped, f);
  }

  const evoChanges: EvolutionFileChange[] = params.changes.map((c) => {
    const orig = origByPath.get(c.path)?.textContent;
    const after = c.action === "delete" ? undefined : c.content;
    const { addedLines, removedLines } = computeQuickLineDelta(orig, after);
    const symbolsChanged = detectChangedSymbolNames(orig, after);
    return {
      path: c.path,
      action: c.action,
      addedLines,
      removedLines,
      symbolsChanged,
    };
  });

  const summary =
    params.userTaskPrompt?.trim() ||
    (params.manifest && params.manifest.length > 0
      ? params.manifest[0]
      : params.targetSymbol
        ? `Smart Paste update on ${params.targetSymbol} (${evoChanges.length} file${evoChanges.length === 1 ? "" : "s"})`
        : `Applied Smart Paste across ${evoChanges.length} file${evoChanges.length === 1 ? "" : "s"}`);

  return createEvolutionEntry({
    source: "smart-paste",
    summary,
    targetSymbol: params.targetSymbol,
    userTaskPrompt: params.userTaskPrompt,
    changes: evoChanges,
    timestamp: params.timestamp,
  });
}

/**
 * Formats recent evolution entries into a token-budgeted LLM handover block.
 * Fits within `maxTokenBudget` tokens so it can be interwoven into Surgical Prompts
 * with minimal context overhead.
 */
export function formatCompactEvolutionHandover(
  entries: EvolutionEntry[],
  maxTokenBudget = 160,
): EvolutionHandoverResult {
  if (!entries || entries.length === 0) {
    return {
      text: "",
      includedCount: 0,
      totalCount: 0,
      estimatedTokens: 0,
    };
  }

  // Sort newest first so the most recent changes get priority in the budget
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const header =
    "=== PROJECT EVOLUTION LOG (RECENT DELTAS — DO NOT REGRESS THESE CHANGES) ===";
  const footer =
    "============================================================================";
  const baseOverheadTokens = estimateTokens(header + "\n" + footer);

  const selectedLines: string[] = [];
  let runningTokens = baseOverheadTokens;

  for (const entry of sorted) {
    const line = `- ${entry.compactDelta}`;
    const lineTokens = estimateTokens(line + "\n");
    if (
      selectedLines.length > 0 &&
      runningTokens + lineTokens > maxTokenBudget
    ) {
      break;
    }
    selectedLines.push(line);
    runningTokens += lineTokens;
  }

  const omitted = entries.length - selectedLines.length;
  if (omitted > 0) {
    selectedLines.push(`# (+${omitted} older evolution entries omitted for token efficiency)`);
  }

  const text = [header, ...selectedLines, footer].join("\n");
  return {
    text,
    includedCount: Math.min(entries.length, selectedLines.length - (omitted > 0 ? 1 : 0)),
    totalCount: entries.length,
    estimatedTokens: estimateTokens(text),
  };
}

/* ------------------------------------------------------------------ */
/* Persistence Helpers (localStorage with safe fallback)               */
/* ------------------------------------------------------------------ */

const memoryStore = new Map<string, EvolutionEntry[]>();

function getProjectKey(projectName: string): string {
  const clean = (projectName || "default").trim().toLowerCase();
  return `${EVOLUTION_STORAGE_PREFIX}${clean}`;
}

export function loadEvolutionLog(projectName: string): EvolutionEntry[] {
  const key = getProjectKey(projectName);
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return memoryStore.get(key) ?? [];
}

export function saveEvolutionLog(
  projectName: string,
  entries: EvolutionEntry[],
): void {
  const key = getProjectKey(projectName);
  const capped = entries.slice(-MAX_STORED_ENTRIES);
  memoryStore.set(key, capped);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(capped));
    }
  } catch {
    // Ignore storage errors
  }
}

export function appendEvolutionEntry(
  projectName: string,
  entry: EvolutionEntry,
): EvolutionEntry[] {
  const current = loadEvolutionLog(projectName);
  const next = [...current, entry].slice(-MAX_STORED_ENTRIES);
  saveEvolutionLog(projectName, next);
  return next;
}

export function clearEvolutionLog(projectName: string): void {
  const key = getProjectKey(projectName);
  memoryStore.delete(key);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}
