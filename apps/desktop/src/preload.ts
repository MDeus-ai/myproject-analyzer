/**
 * Preload bridge. Every desktop capability the renderer gets arrives here
 * as a typed API matching DesktopHostBridge from @myproject/platform.
 * Sandboxed preload: contextBridge + ipcRenderer + webUtils only.
 */
import { contextBridge, ipcRenderer, webUtils } from "electron";
import { DesktopIpc } from "@myproject/platform/bridge";
import type {
  ApplyChangeIpcFile,
  ApplyChangesIpcOptions,
  ApplyChangesIpcResult,
  DesktopHostBridge,
  PickFolderIpcResult,
  SaveFileIpcResult,
  StartWatchIpcOptions,
  StartWatchIpcResult,
  StopWatchIpcResult,
  WalkFolderIpcResult,
} from "@myproject/platform/bridge";
import type { WatchEventBatch } from "@myproject/platform/types";

const bridge: DesktopHostBridge = {
  platform: "electron",
  versions: {
    electron: process.versions.electron ?? "unknown",
    chrome: process.versions.chrome ?? "unknown",
    node: process.versions.node ?? "unknown",
  },

  pickFolder: (): Promise<PickFolderIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.pickFolder),

  walkFolder: (rootPath: string): Promise<WalkFolderIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.walkFolder, rootPath),

  readFileText: (absolutePath: string): Promise<string | null> =>
    ipcRenderer.invoke(DesktopIpc.readFileText, absolutePath),

  readFilesText: (absolutePaths: string[]): Promise<(string | null)[]> =>
    ipcRenderer.invoke(DesktopIpc.readFilesText, absolutePaths),

  saveFile: (
    suggestedName: string,
    data: ArrayBuffer,
  ): Promise<SaveFileIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.saveFile, suggestedName, data),

  startWatch: (
    rootPath: string,
    opts: StartWatchIpcOptions,
  ): Promise<StartWatchIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.startWatch, rootPath, opts),

  stopWatch: (sessionId: string): Promise<StopWatchIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.stopWatch, sessionId),

  onWatchEvent: (cb: (batch: WatchEventBatch) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      batch: WatchEventBatch,
    ): void => cb(batch);
    ipcRenderer.on(DesktopIpc.watchEvent, listener);
    return () => ipcRenderer.removeListener(DesktopIpc.watchEvent, listener);
  },
  applyChanges: (
    rootPath: string,
    changes: ApplyChangeIpcFile[],
    opts: ApplyChangesIpcOptions,
  ): Promise<ApplyChangesIpcResult> =>
    ipcRenderer.invoke(DesktopIpc.applyChanges, rootPath, changes, opts),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return "";
    }
  },
};

contextBridge.exposeInMainWorld("myprojectDesktop", bridge);
