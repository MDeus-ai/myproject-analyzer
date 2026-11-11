import { ProcessedFile, FolderScanResult } from "../types";
import { getFileExtension } from "./fileHelpers";
import {
  DEFAULT_EXCLUSION_RULES,
  filterFilesByExclusions,
  matchExcludedSegment,
} from "./folderExclusions";
import { isTextReadableFile, MAX_TEXT_READ_SIZE } from "./codeAnalyzer";
import {
  extractGitignoreRules,
  filterFilesByGitignore,
} from "./gitignoreParser";
import { isSecretFile } from "./secretsDetector";

/**
 * Progress events emitted while a project folder is being imported.
 * - `scanning`: walking the dropped directory tree (total is unknown -> 0)
 * - `reading`:  reading file metadata/content (processed out of total)
 */
export interface ScanProgress {
  phase: "scanning" | "reading";
  processed: number;
  total: number;
  currentFile: string;
}

export interface FolderReaderOptions {
  excludedPatterns?: string[];
  enableAutoExclusion?: boolean;
  onProgress?: (progress: ScanProgress) => void;
}

const PROGRESS_THROTTLE_MS = 60;
const SNIFF_BYTES = 4096;

/** MIME families that are never text — skipped without wasting a sniff read. */
const BINARY_MIME_PREFIXES = ["image/", "audio/", "video/"];

/**
 * Decoded-text characters that prove a payload is NOT text:
 *  - U+0000 (NUL): valid UTF-8 source code never contains it; virtually
 *    every binary format does within its first bytes. NOTE: binary payloads
 *    that are mostly ASCII decode WITHOUT producing U+FFFD, so checking only
 *    for the replacement character is not enough — NUL must be checked too.
 *  - U+FFFD: replacement character produced when invalid UTF-8 sequences
 *    are decoded (e.g. a true binary renamed to a text extension).
 * Explicit unicode escapes are used so the literals can't be mangled by
 * editor encoding.
 */
const BINARY_TELLS = /[\u0000\uFFFD]/;

/**
 * Extensions that are ALWAYS plain text — checked before ANY MIME logic.
 *
 * Why this must exist: the OS MIME registry maps ".ts" to video/mp2t
 * (MPEG-2 Transport Stream), so every TypeScript file arrives with
 * type === "video/mp2t". The old gate ran the binary-MIME early exit
 * first, which killed every .ts file before the allowlist or content
 * sniff ever ran — the "(Binary content — not readable as text)" bug.
 */
const TEXT_EXTENSION_OVERRIDES = new Set([
  // JS/TS — "ts" is the actual bug fix
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  "json",
  "jsonc",
  "json5",
  "map",
  // web
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "astro",
  // docs & data
  "md",
  "markdown",
  "mdx",
  "txt",
  "csv",
  "tsv",
  "xml",
  "svg",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "env",
  "properties",
  // languages
  "py",
  "pyi",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "php",
  "lua",
  "dart",
  "r",
  // shell / infra
  "sh",
  "bash",
  "zsh",
  "ps1",
  "sql",
  "graphql",
  "gql",
  "prisma",
  "proto",
  "tf",
  "hcl",
  "gradle",
  "cmake",
  "mk",
  // dotfile-style names (covers getFileExtension(".gitignore") either way)
  "gitignore",
  "gitattributes",
  "editorconfig",
  "npmrc",
  "nvmrc",
  "prettierrc",
  "eslintrc",
  "dockerignore",
  "lock",
  "dockerfile",
  "makefile",
]);

/** Extensionless basenames that are text. */
const TEXT_FILENAME_OVERRIDES = new Set([
  "dockerfile",
  "makefile",
  "license",
  "readme",
  "changelog",
  ".gitignore",
  ".gitattributes",
  ".env",
  ".npmrc",
  ".nvmrc",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
]);

function isTextOverride(name: string): boolean {
  const base = name.split(/[\\/]/).pop()!.toLowerCase();
  if (TEXT_FILENAME_OVERRIDES.has(base)) return true;
  // .env, .env.local, .env.production, .env.example — extension varies, so
  // the extension set alone can't cover the family.
  if (base.startsWith(".env")) return true;
  return TEXT_EXTENSION_OVERRIDES.has(getFileExtension(name).toLowerCase());
}

function isBinaryMime(mime: string): boolean {
  return BINARY_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

/**
 * Pure byte-level text heuristic: NUL bytes are a near-certain binary tell,
 * and text files contain almost no control characters besides \t \n \r.
 */
export function sniffTextBytes(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  let control = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) control++;
  }
  return control / bytes.length < 0.05;
}

/** Sniffs the first 4 KB of a blob for binary signatures. */
export async function sniffIsText(blob: Blob): Promise<boolean> {
  try {
    const buf = new Uint8Array(await blob.slice(0, SNIFF_BYTES).arrayBuffer());
    return sniffTextBytes(buf);
  } catch {
    return false;
  }
}

/**
 * Reads a file's text when it is genuinely text.
 *
 * ORDER IS THE FIX:
 *  1. Extension/filename allowlist — AUTHORITATIVE, runs before any MIME
 *     check (rescues .ts from its bogus video/mp2t MIME type).
 *  2. Binary-MIME early exit — only reached by files that claimed no text
 *     identity, so video/* can now only kill actual videos.
 *  3. NUL-byte content sniff — for the unknown middle ground (.gradle,
 *     .tf, extensionless scripts, empty-MIME files).
 */
export async function readTextIfReadable(
  blob: Blob,
  name: string,
  mimeType: string,
): Promise<string | undefined> {
  if (blob.size > MAX_TEXT_READ_SIZE) return undefined;
  try {
    if (isTextOverride(name) || isTextReadableFile(name, mimeType)) {
      const text = await blob.text();
      // Paranoia guard: the override list also claims genuine MPEG-2 TS
      // videos (recording.ts). A true binary decodes with NUL bytes
      // (U+0000) or replacement chars (U+FFFD) — reject it rather than
      // export garbage. Trade-off: legacy-encoded source files (Latin-1
      // with accented characters) are rejected too; web codebases are
      // overwhelmingly UTF-8, so this is the safe default.
      return BINARY_TELLS.test(text) ? undefined : text;
    }

    if (isBinaryMime(mimeType)) return undefined;

    if (await sniffIsText(blob)) {
      return await blob.text();
    }
  } catch {
    // Locked or unreadable file
  }
  return undefined;
}

/**
 * Reads text content for files that were skipped at scan time (files inside
 * auto-excluded heavy folders keep their Blob but no textContent). Called
 * when the user opts such files back in via the exclusion modal, so they
 * export with real content instead of a false "binary" placeholder.
 */
export async function hydrateTextContent(
  files: ProcessedFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<ProcessedFile[]> {
  const pending = files.filter((f) => f.textContent === undefined && f.blob);
  const total = pending.length;
  let done = 0;

  for (const file of pending) {
    const text = await readTextIfReadable(
      file.blob as Blob,
      file.name,
      file.type,
    );
    if (text !== undefined) {
      file.textContent = text;
    }
    done++;
    if (onProgress && (done % 10 === 0 || done === total)) {
      onProgress(done, total);
    }
    if (done % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return files;
}

/**
 * Applies the full post-scan filter pipeline: heavy-folder exclusion
 * detection, .gitignore rules, and secrets detection.
 *
 * ORDER MATTERS: heavy-folder detection runs FIRST, across every scanned
 * file. A folder named in BOTH the hardcoded list and .gitignore
 * (node_modules/, dist/, ...) is classified as a heavy folder — shown
 * once, in the heavy section. Files .gitignore removes from regular
 * directories are tracked individually (rule-tagged) so the review modal
 * can list them all and let the user re-include any of them.
 */
export function applyScanFilters(
  allRawFiles: ProcessedFile[],
  rootName: string,
  options?: {
    excludedPatterns?: string[];
    enableAutoExclusion?: boolean;
  },
): FolderScanResult {
  const excludedPatterns =
    options?.excludedPatterns ||
    DEFAULT_EXCLUSION_RULES.filter((r) => r.isDefault).map((r) => r.pattern);
  const enableAutoExclusion = options?.enableAutoExclusion !== false;

  const gitignoreRules = extractGitignoreRules(allRawFiles, rootName);

  // 1) Heavy-folder exclusion detection on ALL files (visible + toggleable).
  let detectedExclusions: FolderScanResult["detectedExclusions"] = [];
  let heavySkipped = 0;
  let afterHeavy = allRawFiles;
  if (enableAutoExclusion) {
    const ex = filterFilesByExclusions(allRawFiles, excludedPatterns);
    detectedExclusions = ex.detectedExclusions;
    heavySkipped = ex.totalSkipped;
    afterHeavy = ex.filteredFiles;
  }

  // 2) .gitignore applies to everything the heavy-folder filter kept.
  //    Each removal is tracked with its rule for the review modal.
  let files = afterHeavy;
  let gitignoreRemoved: { file: ProcessedFile; pattern: string }[] = [];
  if (gitignoreRules.length > 0) {
    const gi = filterFilesByGitignore(afterHeavy, gitignoreRules, rootName);
    files = gi.filteredFiles;
    gitignoreRemoved = gi.removed;
  }

  // 3) Secrets detection on the files that will actually be imported — a
  //    .env inside an excluded heavy folder shouldn't trigger the warning.
  const detectedSecretFiles = files
    .filter((f) => isSecretFile(f.name))
    .map((f) => f.relativePath);

  return {
    files,
    rootName,
    detectedExclusions,
    totalExcludedFiles: heavySkipped + gitignoreRemoved.length,
    allRawFiles,
    // Everything is re-includable through the modal, so the rebuild pool
    // is the full scan. The modal itself applies the active exclusions.
    baseFiles: allRawFiles,
    detectedSecretFiles,
    gitignoreRemovedFiles: gitignoreRemoved,
  };
}

/**
 * Parses File objects from a webkitdirectory input into ProcessedFile array,
 * automatically detecting and excluding heavy folders like node_modules.
 * Reports progress through options.onProgress.
 */
export async function processFileList(
  fileList: FileList | File[],
  options?: FolderReaderOptions,
): Promise<FolderScanResult> {
  const allRawFiles: ProcessedFile[] = [];
  const array = Array.from(fileList);
  const total = array.length;

  const excludedPatterns =
    options?.excludedPatterns ||
    DEFAULT_EXCLUSION_RULES.filter((r) => r.isDefault).map((r) => r.pattern);
  const excludedSet = new Set(
    excludedPatterns.map((p) => p.trim().toLowerCase()),
  );
  const enableAutoExclusion = options?.enableAutoExclusion !== false;

  let rootName = "folder";
  if (array.length > 0) {
    const firstRel = array[0].webkitRelativePath || array[0].name;
    const parts = firstRel.split(/[\\/]/);
    if (parts.length > 1) {
      rootName = parts[0];
    }
  }

  let lastEmit = 0;
  const emitProgress = (processed: number, currentFile: string) => {
    if (!options?.onProgress) return;
    const now = performance.now();
    if (now - lastEmit > PROGRESS_THROTTLE_MS || processed === total) {
      lastEmit = now;
      options.onProgress({ phase: "reading", processed, total, currentFile });
    }
  };

  for (let i = 0; i < array.length; i++) {
    const file = array[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split(/[\\/]/).filter(Boolean);
    const name = file.name;
    const extension = getFileExtension(name);

    // Yield to the event loop periodically so the progress UI can paint.
    if (i % 30 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Get directory path (excluding root and filename)
    let directoryPath = "";
    if (parts.length > 2) {
      directoryPath = parts.slice(1, -1).join("/");
    } else if (parts.length === 2 && parts[0] !== rootName) {
      directoryPath = parts[0];
    }

    // Files inside auto-excluded heavy folders keep their Blob (so the user
    // can still include them later) but skip expensive text/preview reads.
    // hydrateTextContent() fills their content in if they get included.
    const isExcluded =
      enableAutoExclusion && matchExcludedSegment(parts, excludedSet) !== null;

    let textContent: string | undefined;
    let previewUrl: string | undefined;

    // Content-based readability: extension/filename allowlist FIRST (this
    // is what rescues .ts files from their video/mp2t MIME type), then the
    // binary-MIME shortcut, then NUL-byte sniffing for unknowns (.gradle,
    // .tf, extensionless files, empty-MIME dotfiles). 512KB size cap.
    if (!isExcluded) {
      textContent = await readTextIfReadable(file, name, file.type || "");
    }

    // Generate object URL for image previews
    if (!isExcluded && file.type.startsWith("image/")) {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {
        // ignore
      }
    }

    allRawFiles.push({
      id: `file-${i}-${Date.now()}`,
      name,
      originalName: name,
      flattenedName: name,
      relativePath: relPath,
      pathSegments: parts,
      directoryPath,
      size: file.size,
      type: file.type || "application/octet-stream",
      extension,
      lastModified: file.lastModified || Date.now(),
      blob: file,
      previewUrl,
      textContent,
    });

    emitProgress(i + 1, name);
  }

  // Shared filter pipeline (gitignore + exclusions + secrets detection)
  return applyScanFilters(allRawFiles, rootName, options);
}

/**
 * Recursively scans files from HTML5 Drag and Drop DataTransferItem list,
 * automatically bypassing heavy folders (e.g. node_modules, .git) for browser performance.
 * Emits `scanning` progress while walking the tree.
 */
export async function readDroppedEntries(
  items: DataTransferItemList,
  options?: FolderReaderOptions,
): Promise<FolderScanResult> {
  const fileEntries: { file: File; path: string }[] = [];
  const detectedExclusionsMap = new Map<
    string,
    { count: number; samplePath: string }
  >();
  let detectedRoot = "";

  const excludedPatterns =
    options?.excludedPatterns ||
    DEFAULT_EXCLUSION_RULES.filter((r) => r.isDefault).map((r) => r.pattern);
  const excludedSet = new Set(
    excludedPatterns.map((p) => p.trim().toLowerCase()),
  );
  const enableAutoExclusion = options?.enableAutoExclusion !== false;

  let foundCount = 0;
  let lastEmit = 0;
  const emitScanProgress = (currentFile: string) => {
    if (!options?.onProgress) return;
    const now = performance.now();
    if (now - lastEmit > PROGRESS_THROTTLE_MS) {
      lastEmit = now;
      options.onProgress({
        phase: "scanning",
        processed: foundCount,
        total: 0,
        currentFile,
      });
    }
  };

  const entries: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry);
      }
    }
  }

  async function traverseEntry(entry: any, path: string): Promise<void> {
    if (entry.isFile) {
      await new Promise<void>((resolve, reject) => {
        entry.file(
          (file: File) => {
            fileEntries.push({ file, path: `${path}/${file.name}` });
            foundCount += 1;
            emitScanProgress(file.name);
            resolve();
          },
          (err: any) => reject(err),
        );
      });
    } else if (entry.isDirectory) {
      if (!detectedRoot && !path) {
        detectedRoot = entry.name;
      }

      const dirName = entry.name;
      const matched = matchExcludedSegment([dirName], excludedSet);

      // If heavy folder like node_modules is detected and auto-exclusion is enabled,
      // skip deep traversal to prevent browser freezing!
      if (enableAutoExclusion && matched) {
        const fullDirPath = path ? `${path}/${dirName}` : dirName;
        let childCount = 0;
        try {
          const dirReader = entry.createReader();
          const batch: any[] = await new Promise((res, rej) =>
            dirReader.readEntries(res, rej),
          );
          childCount = batch.length;
        } catch {
          childCount = 1;
        }

        const curr = detectedExclusionsMap.get(matched) || {
          count: 0,
          samplePath: fullDirPath,
        };
        curr.count += childCount || 1;
        detectedExclusionsMap.set(matched, curr);
        return; // Skip deep recursive traversal
      }

      const dirReader = entry.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        const batch: any[] = [];
        let done = false;
        while (!done) {
          const results: any[] = await new Promise((res, rej) =>
            dirReader.readEntries(res, rej),
          );
          if (results.length === 0) {
            done = true;
          } else {
            batch.push(...results);
          }
        }
        return batch;
      };

      const children = await readAllEntries();
      for (const child of children) {
        await traverseEntry(child, path ? `${path}/${entry.name}` : entry.name);
      }
    }
  }

  for (const entry of entries) {
    await traverseEntry(entry, "");
  }

  const filesWithRelative: File[] = [];
  for (const item of fileEntries) {
    Object.defineProperty(item.file, "webkitRelativePath", {
      value: item.path.replace(/^\/+/, ""),
      writable: false,
    });
    filesWithRelative.push(item.file);
  }

  const result = await processFileList(filesWithRelative, options);
  if (detectedRoot) {
    result.rootName = detectedRoot;
  }

  // Merge directory-level exclusions detected during drag-and-drop traversal
  for (const [name, data] of detectedExclusionsMap.entries()) {
    const existing = result.detectedExclusions.find((e) => e.name === name);
    if (!existing) {
      const rule = DEFAULT_EXCLUSION_RULES.find(
        (r) => r.pattern.toLowerCase() === name.toLowerCase(),
      );
      result.detectedExclusions.push({
        name,
        path: data.samplePath,
        fileCount: data.count,
        description:
          rule?.description || "Heavy dependency or generated directory",
        category: rule?.category || "dependencies",
      });
      result.totalExcludedFiles += data.count;
    }
  }

  return result;
}
