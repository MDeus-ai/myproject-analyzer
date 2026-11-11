/**
 * Domain types for MyProject Analyzer — shared across web and desktop.
 */

/**
 * Where a file's bytes live and how to read them.
 *
 * - "blob": content is held in memory (web imports, drag-and-drop,
 *   test scenarios). This is every file the web app produces today.
 * - "path": content lives at a real filesystem path (Electron desktop);
 *   read lazily through the registered PathTextReader.
 */
export interface FileContentSource {
  kind: "blob" | "path";
  blob?: Blob;
  /** Absolute path on the local filesystem (desktop only). */
  absolutePath?: string;
}

export interface ProcessedFile {
  id: string;
  name: string;
  originalName: string;
  flattenedName: string;
  relativePath: string;
  pathSegments: string[];
  directoryPath: string;
  size: number;
  type: string;
  extension: string;
  lastModified: number;
  blob?: Blob;
  previewUrl?: string;
  textContent?: string;

  // ---- Phase 0 additions (desktop + lazy content) ----
  /** How to read this file's content on demand. When absent, callers
   *  fall back to `blob` (legacy snapshot behavior). */
  source?: FileContentSource;
  /** Fast content hash. Set by the scanner when cheap to compute; live
   *  mode uses it to distinguish real changes from mtime touches. */
  contentHash?: string;
  /** Live mode: the file changed on disk after the in-memory snapshot
   *  was taken. Drives "externally modified" badges in the UI. */
  externallyModified?: boolean;
}

export type CollisionStrategy = "enumerate" | "prefix-path" | "overwrite";

export type WorkspaceTab =
  | "files"
  | "tree"
  | "pdf"
  | "analytics"
  | "analyzer"
  | "deplenz";

export interface FolderNode {
  name: string;
  relativePath: string;
  depth: number;
  subfolders: Map<string, FolderNode>;
  files: ProcessedFile[];
  totalSize: number;
  totalFilesCount: number;
  totalFoldersCount: number;
}

export interface FolderAnalysisStats {
  rootName: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  maxDepth: number;
  extensionCounts: Record<string, { count: number; size: number }>;
  collisionCount: number;
  scannedAt: Date;
}

export type PdfTreeFont = "mono" | "sans" | "serif";

export interface PdfOptions {
  title: string;
  includeTree: boolean;
  includeStats: boolean;
  includeInventoryTable: boolean;
  includeSizes: boolean;
  includeDates: boolean;
  treeStyle: "standard" | "compact";
  themeColor: "blue" | "indigo" | "emerald" | "amber";
  /** Font family used for the hierarchy tree (and inventory table body). */
  treeFont: PdfTreeFont;
  /** Tree text size in points. */
  treeFontSize: number;
}

export interface ExcludedFolderInfo {
  name: string;
  path: string;
  fileCount: number;
  description: string;
  category: "dependencies" | "vcs" | "build" | "cache" | "env";
}

export interface FolderScanResult {
  files: ProcessedFile[];
  rootName: string;
  detectedExclusions: ExcludedFolderInfo[];
  totalExcludedFiles: number;
  allRawFiles?: ProcessedFile[];
  /**
   * Rebuild pool for the review modal: every scanned file. Both heavy
   * folders and .gitignore groups are re-includable from here.
   */
  baseFiles?: ProcessedFile[];
  /** Paths of files that may contain secrets (.env, credentials, etc.). */
  detectedSecretFiles?: string[];
  /**
   * Files removed by .gitignore rules, each tagged with the rule pattern
   * that removed it. The review modal groups these by rule so users can
   * see — and optionally re-include — every single removal.
   */
  gitignoreRemovedFiles?: { file: ProcessedFile; pattern: string }[];
}
