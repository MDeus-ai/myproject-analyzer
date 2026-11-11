/**
 * PlatformBridge — the seam between the shared app and its host runtime.
 *
 * One interface, two implementations:
 *   - WebPlatformBridge       (packages/platform-web)   — browser
 *   - ElectronPlatformBridge  (packages/platform-electron, Phase 1) — desktop
 *
 * Anything the web app physically cannot do (watch sessions, writing to
 * disk, native dialogs) is an optional method gated behind a
 * PlatformCapabilities flag, so shared UI can degrade explicitly instead
 * of branching on user agents.
 */

import type { FolderScanResult, ProcessedFile } from "@myproject/core/types";
import type { ScanProgress } from "@myproject/core/folderReader";
import type { SmartPasteChange } from "@myproject/core/smartPaste";

export interface PlatformCapabilities {
  /** Live folder watching sessions (desktop only). */
  watch: boolean;
  /** Native OS open/save dialogs. */
  nativeDialogs: boolean;
  /** Can write Smart Paste changes back to real files on disk. */
  applyToDisk: boolean;
  /** Saves to a user-chosen path via dialog instead of a browser download. */
  saveToPath: boolean;
}

/* ---- Live watch (Phase 2; absent on web) ---- */

export interface WatchOptions {
  excludedPatterns: string[];
  respectGitignore: boolean;
}

export type WatchEventType =
  | "add"
  | "change"
  | "unlink"
  | "addDir"
  | "unlinkDir";

export interface WatchEvent {
  type: WatchEventType;
  /** POSIX-style path relative to the watched root. */
  path: string;
  size?: number;
  mtimeMs?: number;
  /** Present when the host computed a cheap content hash for the change. */
  contentHash?: string;
}

export interface WatchEventBatch {
  sessionId: string;
  events: WatchEvent[];
}

/* ---- Smart Paste apply-to-disk (Phase 3; desktop only) ---- */

export interface ApplyOptions {
  dryRun?: boolean;
  stripMarkers?: boolean;
  /** Skip verification errors (user explicitly confirmed). */
  force?: boolean;
}

export interface ApplyResultFile {
  path: string;
  action: "modified" | "created" | "deleted" | "skipped";
  reason?: string;
}

export interface ApplyResult {
  ok: boolean;
  files: ApplyResultFile[];
  /** Directory holding pre-write backups, when the host created one. */
  backupDir?: string;
  errors: string[];
}

/* ---- The bridge ---- */

export interface PlatformBridge {
  readonly id: "web" | "electron";
  readonly capabilities: PlatformCapabilities;

  /**
   * Opens a folder picker and scans the selection.
   * Web: returns null — the UI must use its hidden <input webkitdirectory>
   * and route the FileList through scanFileObjects (existing behavior).
   */
  pickFolder(): Promise<FolderScanResult | null>;

  /** Scans browser File objects (webkitdirectory input, scenarios). */
  scanFileObjects(
    files: File[] | FileList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult>;

  /** Scans HTML5 drag-and-drop items (web only). */
  scanDroppedItems?(
    items: DataTransferItemList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult>;

  /** Reads a file's text through the platform's own channel. */
  readText(file: ProcessedFile): Promise<string | undefined>;

  /** Object URL for image previews (web: createObjectURL; desktop: custom protocol). */
  createPreviewUrl?(file: ProcessedFile): string | undefined;
  revokePreviewUrl?(url: string): void;

  /** Persists an export. Web: browser download. Desktop: save dialog + disk write. */
  saveBlob(blob: Blob, suggestedName: string): Promise<void>;

  /* ---- Live mode (desktop) ---- */
  startWatch?(rootPath: string, opts: WatchOptions): Promise<string>; // → sessionId
  stopWatch?(sessionId: string): Promise<void>;
  /** Subscribe to batched watch events. Returns an unsubscribe function. */
  onWatchEvent?(cb: (batch: WatchEventBatch) => void): () => void;

  /* ---- Smart Paste round trip (desktop) ---- */
  applyChanges?(
    changes: SmartPasteChange[],
    opts: ApplyOptions,
  ): Promise<ApplyResult>;
}
