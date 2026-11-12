/**
 * Preload bridge. Every desktop capability the renderer gets arrives here
 * as a typed API matching DesktopHostBridge from @myproject/platform.
 * Sandboxed preload: contextBridge + ipcRenderer + webUtils only.
 */
import { contextBridge, ipcRenderer, webUtils } from "electron";
import { DesktopIpc } from "@myproject/platform/bridge";
import type {
  DesktopHostBridge,
  PickFolderIpcResult,
  SaveFileIpcResult,
  WalkFolderIpcResult,
} from "@myproject/platform/bridge";

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

  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return "";
    }
  },
};

contextBridge.exposeInMainWorld("myprojectDesktop", bridge);
