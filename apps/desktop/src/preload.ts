/**
 * Preload bridge. Keep this minimal and explicit — every desktop
 * capability the renderer gets arrives here as a typed API.
 * (IPC-backed native scanning lands in Step 1B.)
 */
import { contextBridge } from "electron";

export interface DesktopRuntimeInfo {
  platform: "electron";
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
}

const runtimeInfo: DesktopRuntimeInfo = {
  platform: "electron",
  versions: {
    electron: process.versions.electron ?? "unknown",
    chrome: process.versions.chrome ?? "unknown",
    node: process.versions.node ?? "unknown",
  },
};

contextBridge.exposeInMainWorld("myprojectDesktop", runtimeInfo);
