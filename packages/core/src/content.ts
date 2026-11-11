/**
 * Content hydration — the single funnel for every read of file text.
 *
 * Phase 0 refactor: components and exporters must no longer assume
 * file.textContent is populated. Snapshot imports (the current web
 * behavior) still read eagerly at scan time, so for them every call
 * below resolves on the first line. Live/desktop sessions populate
 * textContent lazily through this module.
 *
 * Caching: a successful read is stored back onto file.textContent, so
 * hydration happens at most once per file per session — identical to
 * today's memory profile for snapshot imports.
 */

import type { FileContentSource, ProcessedFile } from "./types";
import { readTextIfReadable } from "./folderReader";
import { MAX_TEXT_READ_SIZE } from "./codeAnalyzer";
import { getPathTextReader } from "./contentReader";

/**
 * Synchronous peek for render paths that cannot await. Returns the
 * already-hydrated content, or undefined — callers render
 * getMissingContentReason() in that case, exactly as before.
 */
export function peekTextContent(file: ProcessedFile): string | undefined {
  return file.textContent;
}

/**
 * Returns the file's text content, hydrating it on first access.
 * Returns undefined when the file genuinely has no readable text
 * (binary, over the size cap, or unreadable source).
 */
export async function getTextContent(
  file: ProcessedFile,
): Promise<string | undefined> {
  // 1. Already hydrated — the common path for snapshot imports.
  if (file.textContent !== undefined) return file.textContent;

  // 2. Resolve the content source (explicit source, else legacy blob).
  const source: FileContentSource | undefined =
    file.source ?? (file.blob ? { kind: "blob", blob: file.blob } : undefined);
  if (!source) return undefined;

  let text: string | undefined;

  if (source.kind === "path") {
    if (!source.absolutePath) return undefined;
    const reader = getPathTextReader();
    if (!reader) {
      console.warn(
        "[content] path-backed file but no PathTextReader registered — " +
          "call setPathTextReader() during app boot.",
      );
      return undefined;
    }
    text = await reader.readPathText(source.absolutePath, file.name, file.type);
  } else {
    const blob = source.blob;
    if (!blob) return undefined;
    if (blob.size > MAX_TEXT_READ_SIZE) return undefined;
    // Same gate the scanner uses: extension allowlist → binary-MIME exit →
    // NUL-byte sniff. Readability decisions stay consistent whether content
    // is read at scan time or hydrated later.
    text = await readTextIfReadable(blob, file.name, file.type);
  }

  if (text !== undefined) {
    file.textContent = text; // hydrate once; subsequent calls are free
  }
  return text;
}

/**
 * Drops hydrated content so it can be re-read later (memory pressure in
 * live sessions). Only files with an explicit re-readable source are
 * evictable; blob-without-source files keep their content because there
 * is no guaranteed way to get it back. Returns true when eviction happened.
 */
export function evictTextContent(file: ProcessedFile): boolean {
  if (file.textContent === undefined) return false;
  if (!file.source) return false;
  file.textContent = undefined;
  return true;
}

/**
 * Batch hydration for exporters (ZIP, code bundles) with progress and
 * periodic event-loop yields. For snapshot imports the pending list is
 * empty and this resolves immediately.
 */
export async function hydrateFilesForExport(
  files: ProcessedFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ hydrated: number; skipped: number }> {
  const pending = files.filter(
    (f) => f.textContent === undefined && (f.source || f.blob),
  );
  const total = pending.length;
  let hydrated = 0;
  let done = 0;

  for (const file of pending) {
    const text = await getTextContent(file);
    if (text !== undefined) hydrated++;
    done++;
    if (onProgress && (done % 10 === 0 || done === total)) {
      onProgress(done, total);
    }
    if (done % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return { hydrated, skipped: total - hydrated };
}
