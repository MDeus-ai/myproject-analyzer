/**
 * Electron main process.
 *
 * Dev:  loads the Vite dev server — the SAME renderer as the web app.
 * Prod: loads the built renderer from disk (wired up in the packaging step).
 *
 * IPC surface: native folder picker, recursive folder walk, gated text
 * reads, native save dialog, live folder watching, and Smart Paste
 * apply-to-disk. The renderer may only walk/read/watch/write inside
 * folders the user explicitly picked via the native dialog.
 *
 * Shell polish: single-instance lock, persisted window bounds (validated
 * against connected displays), no native application menu (the renderer
 * ships its own complete shortcut system), optional window icon, and a
 * retry dialog when the dev server is unreachable.
 */
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
} from "electron";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import chokidar, { type FSWatcher } from "chokidar";
import {
  DesktopIpc,
  type ApplyChangeIpcFile,
  type ApplyChangesIpcOptions,
  type ApplyChangesIpcResult,
  type PickFolderIpcResult,
  type SaveFileIpcResult,
  type StartWatchIpcOptions,
  type StartWatchIpcResult,
  type StopWatchIpcResult,
  type WalkFolderIpcResult,
} from "@myproject/platform/bridge";
import type {
  ApplyResultFile,
  WatchEvent,
  WatchEventBatch,
} from "@myproject/platform/types";
import { buildWatchIgnored } from "./watch-filter";
import { DEFAULT_EXCLUSION_RULES } from "@myproject/core/folderExclusions";
import { parseGitignore } from "@myproject/core/gitignoreParser";
import { stripSmartPasteMarkers } from "@myproject/core/smartPaste";
import { walkFiles } from "./fs-walk";
import { WatchBatcher } from "./watch-batcher";
import { planApplyChanges } from "./apply-plan";
import { isDevServerUrl, isSafeExternalUrl } from "./external-url";
import {
  clampBoundsToDisplays,
  loadWindowState,
  saveWindowState,
  windowStateFile,
} from "./window-state";

const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ?? "http://localhost:3000";

/* --------------------------------------------------------------------*/
/* Security boundary                                                   */
/*                                                                     */
/* The renderer may only walk/read/watch/write inside folders the user */
/* explicitly picked via the native dialog — a compromised renderer    */
/* can't roam the disk. Text reads are additionally gated: size cap +  */
/* NUL sniff.                                                          */
/* --------------------------------------------------------------------*/

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
/* Live watch sessions                                                 */
/*                                                                     */
/* One chokidar watcher per started session. Events are coalesced      */
/* through WatchBatcher (~150ms window) and pushed to the renderer     */
/* over a single watch:event channel. Sessions die with the window     */
/* that owns them — watchers never outlive their renderer.             */
/* ------------------------------------------------------------------ */

interface WatchSession {
  id: string;
  root: string;
  watcher: FSWatcher;
  batcher: WatchBatcher;
}

const watchSessions = new Map<string, WatchSession>();

function disposeSession(session: WatchSession): void {
  session.batcher.dispose();
  void Promise.resolve(session.watcher.close()).catch(() => {});
  watchSessions.delete(session.id);
}

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const stateFile = windowStateFile(app.getPath("userData"));
  const saved = loadWindowState(stateFile);
  const workAreas = screen.getAllDisplays().map((d) => d.workArea);
  const restored = saved
    ? clampBoundsToDisplays(saved.bounds, workAreas)
    : null;

  // Optional dev icon — packaging wires the real multi-res .ico (Step 6).
  // Missing file is tolerated: window just uses the Electron default.
  const iconPath = path.join(app.getAppPath(), "assets", "icon.png");

  const win = new BrowserWindow({
    width: restored?.width ?? 1440,
    height: restored?.height ?? 900,
    ...(restored ? { x: restored.x, y: restored.y } : {}),
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0a0a0f", // match app background — no white flash on boot
    autoHideMenuBar: true,
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (restored && saved?.isMaximized) {
    win.maximize();
  }

  // Persist on close. getNormalBounds() returns the pre-maximize rect —
  // exactly what should be restored next launch.
  win.on("close", () => {
    if (win.isDestroyed()) return;
    saveWindowState(stateFile, {
      bounds: win.getNormalBounds(),
      isMaximized: win.isMaximized(),
    });
  });

  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
    // Kill every watcher and untrack its root: the renderer that requested
    // them is gone. A reopened window (macOS) must re-pick its folder.
    for (const session of [...watchSessions.values()]) {
      allowedRoots.delete(session.root);
      disposeSession(session);
    }
  });

  // External links: hand http/https/mailto to the system browser, deny the
  // new window and every other scheme. openExternal on file:/custom schemes
  // can launch arbitrary handler applications — so the allowlist lives in a
  // pure, unit-tested helper (external-url.ts).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    } else {
      console.warn(`[security] blocked window.open: ${url}`);
    }
    return { action: "deny" };
  });

  // The window must never leave the app origin. will-navigate does NOT fire
  // for our programmatic loadURL/loadFile, so this catches exactly the
  // page-initiated cases: link clicks, location.assign, redirects.
  // Dev permits only the dev-server origin; packaged permits nothing.
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = !app.isPackaged && isDevServerUrl(url, DEV_SERVER_URL);
    if (!allowed) {
      event.preventDefault();
      console.warn(`[security] blocked navigation to ${url}`);
    }
  });

  if (app.isPackaged) {
    // Packaging step points this at the bundled renderer.
    void win
      .loadFile(path.join(app.getAppPath(), "renderer", "index.html"))
      .catch((err) => showLoadError(win, err, false));
  } else {
    void win
      .loadURL(DEV_SERVER_URL)
      .catch((err) => showLoadError(win, err, true));
    win.webContents.openDevTools({ mode: "detach" });
  }
}

/** Dev: offer Retry (wait-on race / stale server) — packaged: report + quit. */
function showLoadError(win: BrowserWindow, err: unknown, isDev: boolean): void {
  if (win.isDestroyed()) return;
  const target = isDev
    ? DEV_SERVER_URL
    : path.join(app.getAppPath(), "renderer", "index.html");
  const buttons = isDev ? ["Retry", "Quit"] : ["Quit"];
  const choice = dialog.showMessageBoxSync(win, {
    type: "error",
    title: isDev ? "Dev server unreachable" : "Failed to load the app",
    message: isDev
      ? `Could not load the renderer from ${target}`
      : "The application files could not be loaded.",
    detail: `${
      isDev
        ? 'Start the renderer with "npm run dev" (or use "npm run dev:desktop", which waits for it), then click Retry.'
        : "Try reinstalling the application."
    }\n\n${String(err)}`,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  });
  if (isDev && choice === 0) {
    void win.loadURL(DEV_SERVER_URL).catch((e) => showLoadError(win, e, true));
  } else {
    win.destroy();
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

  ipcMain.handle(
    DesktopIpc.startWatch,
    async (
      _event,
      rootPath: string,
      opts: StartWatchIpcOptions | undefined,
    ): Promise<StartWatchIpcResult> => {
      if (typeof rootPath !== "string" || !isUnderAllowedRoot(rootPath)) {
        return {
          ok: false,
          error: "Not a picked folder — pick it via the dialog first.",
        };
      }

      const root = path.resolve(rootPath);
      const patterns =
        opts?.excludedPatterns ??
        DEFAULT_EXCLUSION_RULES.filter((r) => r.isDefault).map(
          (r) => r.pattern,
        );
      const heavy = new Set(patterns.map((p) => p.trim().toLowerCase()));

      // Same rule set the scan pipeline uses — watched files must match
      // what was imported, or the renderer receives phantom updates.
      let gitignoreRules: ReturnType<typeof parseGitignore> = [];
      if (opts?.respectGitignore) {
        try {
          gitignoreRules = parseGitignore(
            readFileSync(path.join(root, ".gitignore"), "utf8"),
          );
        } catch {
          // no .gitignore — nothing to respect
        }
      }

      const ignored = buildWatchIgnored(root, heavy, gitignoreRules);

      const sessionId = randomUUID();
      const batcher = new WatchBatcher((events) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const batch: WatchEventBatch = { sessionId, events };
        mainWindow.webContents.send(DesktopIpc.watchEvent, batch);
      }, 150);

      const watcher = chokidar.watch(root, {
        ignored, // was: (testPath) => ignored(testPath)
        ignoreInitial: true, // the scan already covered the initial state
        persistent: true,
      });

      watcher.on("all", (event, filePath, stats) => {
        const type: WatchEvent["type"] | null =
          event === "add"
            ? "add"
            : event === "change"
              ? "change"
              : event === "unlink"
                ? "unlink"
                : event === "addDir"
                  ? "addDir"
                  : event === "unlinkDir"
                    ? "unlinkDir"
                    : null;
        if (!type) return;
        const rel = path.relative(root, filePath).split(path.sep).join("/");
        if (!rel) return;

        if (stats) {
          batcher.push({
            type,
            path: rel,
            size: stats.size,
            mtimeMs: stats.mtimeMs,
          });
        } else if (type === "add" || type === "change") {
          stat(filePath).then(
            (st) =>
              batcher.push({
                type,
                path: rel,
                size: st.size,
                mtimeMs: st.mtimeMs,
              }),
            () => batcher.push({ type, path: rel }), // raced deletion
          );
        } else {
          batcher.push({ type, path: rel }); // unlink — no stats exist
        }
      });

      watcher.on("error", (err) => console.error("[watch]", err));

      watchSessions.set(sessionId, { id: sessionId, root, watcher, batcher });
      console.log(`[watch] session ${sessionId} → ${root}`);
      return { ok: true, sessionId };
    },
  );

  ipcMain.handle(
    DesktopIpc.stopWatch,
    async (_event, sessionId: string): Promise<StopWatchIpcResult> => {
      const session =
        typeof sessionId === "string"
          ? watchSessions.get(sessionId)
          : undefined;
      if (session) disposeSession(session);
      return { ok: true };
    },
  );

  ipcMain.handle(
    DesktopIpc.applyChanges,
    async (
      _event,
      rootPath: string,
      changes: ApplyChangeIpcFile[],
      opts: ApplyChangesIpcOptions | undefined,
    ): Promise<ApplyChangesIpcResult> => {
      const fail = (errors: string[]): ApplyChangesIpcResult => ({
        ok: false,
        files: [],
        backupDir: null,
        errors,
      });

      if (typeof rootPath !== "string" || !isUnderAllowedRoot(rootPath)) {
        return fail(["Not a picked folder — pick it via the dialog first."]);
      }

      const root = path.resolve(rootPath);
      const { plan, errors } = planApplyChanges(
        root,
        Array.isArray(changes) ? changes : [],
      );
      const dryRun = opts?.dryRun === true;
      const stripMarkers = opts?.stripMarkers === true;
      // opts.force is intentionally unused in main: verification policy
      // lives in the renderer (it owns the verify report). Main's job is
      // path safety + backups only.

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupDir = path.join(root, `.myproject-backup-${timestamp}`);
      let backupUsed = false;

      const backupFile = async (rel: string, abs: string): Promise<void> => {
        const dest = path.join(backupDir, rel);
        await mkdir(path.dirname(dest), { recursive: true });
        await copyFile(abs, dest);
        backupUsed = true;
      };

      const files: ApplyResultFile[] = [];

      for (const item of plan) {
        try {
          const exists = await stat(item.abs)
            .then((s) => s.isFile())
            .catch(() => false);

          if (item.action === "delete") {
            if (!exists) {
              files.push({
                path: item.rel,
                action: "skipped",
                reason: "not on disk",
              });
              continue;
            }
            if (!dryRun) {
              await backupFile(item.rel, item.abs);
              await rm(item.abs);
            }
            files.push({ path: item.rel, action: "deleted" });
            continue;
          }

          const content = stripMarkers
            ? stripSmartPasteMarkers(item.content)
            : item.content;

          if (!dryRun) {
            if (exists) await backupFile(item.rel, item.abs);
            await mkdir(path.dirname(item.abs), { recursive: true });
            await writeFile(item.abs, content, "utf8");
          }
          files.push({
            path: item.rel,
            action: exists ? "modified" : "created",
            ...(item.action === "create" && exists
              ? { reason: "already existed — backed up and overwritten" }
              : {}),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${item.rel}: ${msg}`);
          files.push({ path: item.rel, action: "skipped", reason: msg });
        }
      }

      return {
        ok: errors.length === 0,
        files,
        backupDir: backupUsed ? backupDir : null,
        errors,
      };
    },
  );
}

/* ------------------------------------------------------------------ */
/* Lifecycle — single instance                                         */
/* ------------------------------------------------------------------ */

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  // Second launch: hand over to the running instance and exit immediately.
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = mainWindow ?? BrowserWindow.getAllWindows()[0] ?? null;
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    } else if (app.isReady()) {
      createWindow();
    }
  });

  void app.whenReady().then(() => {
    // Deliberate: no native application menu. The renderer ships its own
    // complete shortcut system (Ctrl+O/S/P, 1-6, ? handled in App.tsx), and
    // a default menu would double-handle accelerators. autoHideMenuBar only
    // hides the menu until Alt — setting it to null removes it entirely.
    // DevTools open automatically in dev, so no F12 accelerator is needed.
    Menu.setApplicationMenu(null);

    // --- Security hardening (Step 5) ------------------------------------
    // Deny every permission request (camera, mic, notifications, USB,
    // serial, clipboard-sanitized, ...): the app requests none, so anything
    // asking is by definition suspicious. The check handler also denies
    // navigator.permissions.query lookups.
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);

    // The app never uses <webview> — refuse to attach one if markup ever
    // tries (a classic renderer-compromise escalation path).
    app.on("web-contents-created", (_event, contents) => {
      contents.on("will-attach-webview", (event) => {
        event.preventDefault();
        console.warn("[security] blocked <webview> attachment");
      });
    });

    registerIpc();
    createWindow();

    app.on("activate", () => {
      // macOS: re-create window when dock icon clicked with no windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// Windows/Linux: quit when all windows are closed.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
