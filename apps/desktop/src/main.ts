/**
 * Electron main process.
 *
 * Dev:  loads the Vite dev server — the SAME renderer as the web app.
 * Prod: loads the built renderer from disk (wired up in the packaging step).
 *
 * IPC surface (Step 1): native folder picker, recursive folder walk,
 * gated text reads, native save dialog. The renderer may only walk/read
 * inside folders the user explicitly picked via the native dialog.
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { readFile, stat, writeFile } from "node:fs/promises";
import {
  DesktopIpc,
  type PickFolderIpcResult,
  type SaveFileIpcResult,
  type WalkFolderIpcResult,
} from "@myproject/platform/bridge";
import { walkFiles } from "./fs-walk";

const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ?? "http://localhost:3000";

/* ------------------------------------------------------------------ */
/* Security boundary                                                   */
/*                                                                     */
/* The renderer may only walk/read inside folders the user explicitly  */
/* picked via the native dialog — a compromised renderer can't roam    */
/* the disk. Text reads are additionally gated: size cap + NUL sniff.  */
/* ------------------------------------------------------------------ */

const allowedRoots = new Set<string>();
const MAX_TEXT_READ_BYTES = 512 * 1024;
const SNIFF_BYTES = 4096;

function isUnderAllowedRoot(p: string): boolean {
  const resolved = path.resolve(p);
  for (const root of allowedRoots) {
    const rel = path.relative(root, resolved);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      return true;
    }
  }
  return false;
}

/** Size-capped, NUL-sniffed UTF-8 read. null = binary/oversized/unreadable. */
async function readTextGated(absPath: string): Promise<string | null> {
  try {
    const st = await stat(absPath);
    if (!st.isFile() || st.size > MAX_TEXT_READ_BYTES) return null;
    const buf = await readFile(absPath);
    const sniff = buf.subarray(0, Math.min(SNIFF_BYTES, buf.length));
    if (sniff.includes(0)) return null; // NUL byte → binary
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0a0a0f", // match app background — no white flash on boot
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  // External links open in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    // Packaging step points this at the bundled renderer.
    void win.loadFile(path.join(app.getAppPath(), "renderer", "index.html"));
  } else {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  }
}

/* ------------------------------------------------------------------ */
/* IPC handlers                                                        */
/* ------------------------------------------------------------------ */

function registerIpc(): void {
  ipcMain.handle(
    DesktopIpc.pickFolder,
    async (): Promise<PickFolderIpcResult> => {
      if (!mainWindow) return { canceled: true };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Choose a project folder",
        buttonLabel: "Analyze",
        properties: ["openDirectory"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }
      const picked = path.resolve(result.filePaths[0]);
      allowedRoots.add(picked);
      return { canceled: false, path: picked };
    },
  );

  ipcMain.handle(
    DesktopIpc.walkFolder,
    async (_event, rootPath: string): Promise<WalkFolderIpcResult> => {
      if (typeof rootPath !== "string" || !isUnderAllowedRoot(rootPath)) {
        return {
          ok: false,
          entries: [],
          error: "Not a picked folder — pick it via the dialog first.",
        };
      }
      try {
        const entries = await walkFiles(rootPath);
        return { ok: true, entries };
      } catch (err) {
        return {
          ok: false,
          entries: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  ipcMain.handle(
    DesktopIpc.readFileText,
    async (_event, absPath: string): Promise<string | null> => {
      if (typeof absPath !== "string" || !isUnderAllowedRoot(absPath)) {
        return null;
      }
      return readTextGated(absPath);
    },
  );

  ipcMain.handle(
    DesktopIpc.readFilesText,
    async (_event, absPaths: string[]): Promise<(string | null)[]> => {
      const paths = Array.isArray(absPaths) ? absPaths : [];
      return Promise.all(
        paths.map((p) =>
          typeof p === "string" && isUnderAllowedRoot(p)
            ? readTextGated(p)
            : null,
        ),
      );
    },
  );

  ipcMain.handle(
    DesktopIpc.saveFile,
    async (
      _event,
      suggestedName: string,
      data: ArrayBuffer,
    ): Promise<SaveFileIpcResult> => {
      if (!mainWindow) return { saved: false };
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save export",
        defaultPath: suggestedName,
      });
      if (result.canceled || !result.filePath) return { saved: false };
      // Save destination is user-chosen via the dialog — no root check.
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
      await writeFile(result.filePath, bytes);
      return { saved: true, path: result.filePath };
    },
  );
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

void app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    // macOS: re-create window when dock icon clicked with no windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows/Linux: quit when all windows are closed.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
