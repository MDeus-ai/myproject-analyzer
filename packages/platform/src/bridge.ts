/**
 * Desktop host bridge — the contract between the Electron preload
 * (window.myprojectDesktop) and the renderer-side ElectronPlatformBridge.
 * Standalone DTOs only: this file is bundled into main, preload AND the
 * renderer, so it must not import anything at runtime.
 */

import type { ApplyResultFile, WatchEventBatch } from "./types";

export const DesktopIpc = {
  pickFolder: "dialog:pickFolder",
  walkFolder: "fs:walkFolder",
  readFileText: "fs:readFileText",
  readFilesText: "fs:readFilesText",
  saveFile: "dialog:saveFile",
  startWatch: "watch:start",
  stopWatch: "watch:stop",
  /** Push channel: main → renderer, batched watch events. */
  watchEvent: "watch:event",
  applyChanges: "fs:applyChanges",
} as const;

export interface PickFolderIpcResult {
  canceled: boolean;
  /** Absolute path of the chosen folder. Present iff canceled === false. */
  path?: string;
}

export interface WalkedEntry {
  /** Absolute path on disk. */
  absPath: string;
  /** POSIX separators, relative to the walked root, no root prefix. */
  relPath: string;
  name: string;
  size: number;
  mtimeMs: number;
}

export interface WalkFolderIpcResult {
  ok: boolean;
  entries: WalkedEntry[];
  error?: string;
}

export interface SaveFileIpcResult {
  saved: boolean;
  path?: string;
}

export interface StartWatchIpcOptions {
  excludedPatterns: string[];
  respectGitignore: boolean;
}

export interface StartWatchIpcResult {
  ok: boolean;
  sessionId?: string;
  error?: string;
}

export interface StopWatchIpcResult {
  ok: boolean;
}

/* ---- Smart Paste apply-to-disk (Phase 3) ---- */

/** Minimal IPC shape of a SmartPasteChange (only what main needs). */
export interface ApplyChangeIpcFile {
  path: string;
  action: "modify" | "create" | "delete";
  content: string;
}

export interface ApplyChangesIpcOptions {
  dryRun: boolean;
  stripMarkers: boolean;
  /** Renderer confirmed applying despite verification errors. */
  force: boolean;
}

export interface ApplyChangesIpcResult {
  ok: boolean;
  files: ApplyResultFile[];
  /** null (not undefined) for structured-clone safety. */
  backupDir: string | null;
  errors: string[];
}

/* ---- Native Rust Engine IPC (Phase 4) ---- */

export interface EngineFileInputIpc {
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  textContent?: string;
  absolutePath?: string;
}

export interface EngineSearchOptionsIpc {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  isRegex?: boolean;
  fileFilter?: string;
}

export interface EngineBuildGraphIpcResult {
  ok: boolean;
  backend: "rust-napi" | "node-main";
  /** JSON-serialized or plain-object SerializedDepLenzAnalysisResult. */
  graphJson: string | null;
  error?: string;
}

export interface EngineSearchIpcResult {
  ok: boolean;
  backend: "rust-napi" | "node-main";
  matchesJson: string | null;
  error?: string;
}

export interface EngineEstimateTokensIpcResult {
  ok: boolean;
  backend: "rust-napi" | "node-main";
  tokensJson: string | null;
  error?: string;
}

/**
 * Presence of this global on window IS the Electron detection signal.
 * IPC payloads use null (not undefined) for maximum structured-clone safety.
 */
export interface DesktopHostBridge {
  readonly platform: "electron";
  readonly versions: { electron: string; chrome: string; node: string };

  /** Native folder picker. */
  pickFolder(): Promise<PickFolderIpcResult>;
  /** Recursive walk of a previously picked folder (main enforces this). */
  walkFolder(rootPath: string): Promise<WalkFolderIpcResult>;
  /** Gated text read (size cap + binary sniff in main). Null = unreadable. */
  readFileText(absolutePath: string): Promise<string | null>;
  /** Batched variant — results align 1:1 with the input array. */
  readFilesText(absolutePaths: string[]): Promise<(string | null)[]>;
  /** Native save dialog + disk write. */
  saveFile(
    suggestedName: string,
    data: ArrayBuffer,
  ): Promise<SaveFileIpcResult>;
  /** Real absolute path for a drag-dropped File ("" when unavailable). */
  getPathForFile(file: File): string;

  /* ---- Live watch (Phase 2) ---- */
  /** Starts a watcher on a previously picked folder. */
  startWatch(
    rootPath: string,
    opts: StartWatchIpcOptions,
  ): Promise<StartWatchIpcResult>;
  stopWatch(sessionId: string): Promise<StopWatchIpcResult>;
  /** Subscribe to batched watch events. Returns an unsubscribe function. */
  onWatchEvent(cb: (batch: WatchEventBatch) => void): () => void;

  /* ---- Smart Paste apply-to-disk (Phase 3) ---- */
  /**
   * Applies file changes under a previously picked root, backing up every
   * file it overwrites or deletes first. Main enforces path containment;
   * verification policy (force) is the renderer's responsibility.
   */
  applyChanges(
    rootPath: string,
    changes: ApplyChangeIpcFile[],
    opts: ApplyChangesIpcOptions,
  ): Promise<ApplyChangesIpcResult>;

  /* ---- Native Rust Engine (Phase 4) ---- */
  engineBuildGraph?(
    files: EngineFileInputIpc[],
  ): Promise<EngineBuildGraphIpcResult>;
  engineSearch?(
    files: EngineFileInputIpc[],
    opts: EngineSearchOptionsIpc,
    symbolsMapJson: string | null,
  ): Promise<EngineSearchIpcResult>;
  engineEstimateTokens?(
    files: EngineFileInputIpc[],
    includeToc: boolean,
    includeLineNumbers: boolean,
  ): Promise<EngineEstimateTokensIpcResult>;
}

declare global {
  interface Window {
    myprojectDesktop?: DesktopHostBridge;
  }
}
