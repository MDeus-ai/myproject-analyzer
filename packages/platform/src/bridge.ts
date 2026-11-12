/**
 * Desktop host bridge — the contract between the Electron preload
 * (window.myprojectDesktop) and the renderer-side ElectronPlatformBridge.
 * Standalone DTOs only: this file is bundled into main, preload AND the
 * renderer, so it must not import anything at runtime.
 */

export const DesktopIpc = {
  pickFolder: "dialog:pickFolder",
  walkFolder: "fs:walkFolder",
  readFileText: "fs:readFileText",
  readFilesText: "fs:readFilesText",
  saveFile: "dialog:saveFile",
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
}

declare global {
  interface Window {
    myprojectDesktop?: DesktopHostBridge;
  }
}
