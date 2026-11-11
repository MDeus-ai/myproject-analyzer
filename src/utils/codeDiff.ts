/**
 * Line-based diff for Smart Paste previews — shows exactly how a parsed
 * file block would rewrite the loaded project file: added lines in green,
 * removed lines in red, unchanged context dimmed and collapsible.
 *
 * LCS dynamic programming with a cell cap; very large files fall back to
 * a whole-file replacement view (removed-then-added).
 */

export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/** Marker produced by collapseContext for long runs of unchanged lines. */
export interface DiffGap {
  type: "gap";
  count: number;
}

export type DiffViewItem = DiffLine | DiffGap;

const MAX_CELLS = 6_000_000;

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText === "" ? [] : oldText.split("\n");
  const b = newText === "" ? [] : newText.split("\n");
  const n = a.length;
  const m = b.length;

  // Fallback for very large files: treat as a full replacement.
  if (n * m > MAX_CELLS) {
    const out: DiffLine[] = [];
    a.forEach((text, idx) =>
      out.push({ type: "removed", text, oldLineNumber: idx + 1 }),
    );
    b.forEach((text, idx) =>
      out.push({ type: "added", text, newLineNumber: idx + 1 }),
    );
    return out;
  }

  // LCS lengths table.
  const W = m + 1;
  const dp = new Int32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) {
    const row = i * W;
    const next = (i + 1) * W;
    for (let j = m - 1; j >= 0; j--) {
      dp[row + j] =
        a[i] === b[j]
          ? dp[next + j + 1] + 1
          : Math.max(dp[next + j], dp[row + j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({
        type: "context",
        text: a[i],
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      });
      i++;
      j++;
    } else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) {
      out.push({ type: "removed", text: a[i], oldLineNumber: i + 1 });
      i++;
    } else {
      out.push({ type: "added", text: b[j], newLineNumber: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "removed", text: a[i], oldLineNumber: i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ type: "added", text: b[j], newLineNumber: j + 1 });
    j++;
  }
  return out;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  let added = 0,
    removed = 0,
    unchanged = 0;
  for (const l of lines) {
    if (l.type === "added") added++;
    else if (l.type === "removed") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}

/**
 * Keeps changed lines plus `radius` lines of context on each side; long
 * unchanged runs become gap markers so previews stay compact.
 */
export function collapseContext(lines: DiffLine[], radius = 3): DiffViewItem[] {
  if (lines.length === 0) return [];
  const keep = new Array<boolean>(lines.length).fill(false);
  for (let idx = 0; idx < lines.length; idx++) {
    if (lines[idx].type !== "context") {
      const from = Math.max(0, idx - radius);
      const to = Math.min(lines.length - 1, idx + radius);
      for (let k = from; k <= to; k++) keep[k] = true;
    }
  }
  const out: DiffViewItem[] = [];
  let gap = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    if (keep[idx]) {
      if (gap > 0) {
        out.push({ type: "gap", count: gap });
        gap = 0;
      }
      out.push(lines[idx]);
    } else {
      gap++;
    }
  }
  if (gap > 0) out.push({ type: "gap", count: gap });
  return out;
}
