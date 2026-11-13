/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { DesktopHeader } from "@myproject/ui";
import { DesktopLobby } from "@myproject/ui";
import { HomePage } from "@myproject/ui";
import { DocumentationView } from "@myproject/ui";
import { FolderDropzone } from "@myproject/ui";
import { FlatFilesView } from "@myproject/ui";
import { DirectoryTreeView } from "@myproject/ui";
import { PdfArchitectView } from "@myproject/ui";
import { AnalyticsView } from "@myproject/ui";
import { CodeAnalyzerView } from "@myproject/ui";
import { DepLenzView } from "@myproject/ui";
import { FilePreviewModal } from "@myproject/ui";
import { HelpShortcutsModal } from "@myproject/ui";
import { ExclusionWarningModal } from "@myproject/ui";
import { ImportProgressOverlay } from "@myproject/ui";
import { useDebouncedValue } from "@myproject/ui";

import {
  CollisionStrategy,
  ProcessedFile,
  FolderScanResult,
  ExcludedFolderInfo,
  WorkspaceTab,
} from "@myproject/core/types";
import { buildFolderTree } from "@myproject/core/treeBuilder";
import { resolveCollisions } from "@myproject/core/collisionResolver";
import { createFlatZip, ZipProgress } from "@myproject/core/zipExporter";
import { generateFolderPdf } from "@myproject/core/pdfGenerator";
import {
  getScenarioProject,
  SampleScenarioId,
} from "@myproject/core/sampleProject";
import { processFileList, ScanProgress } from "@myproject/core/folderReader";
import { isSecretFile } from "@myproject/core/secretsDetector";
import { DEFAULT_EXCLUSION_RULES } from "@myproject/core/folderExclusions";
import { getFileExtension } from "@myproject/core/fileHelpers";
import { detectCodebaseStack } from "@myproject/core/depLenz";
import {
  recordProjectInHistory,
  ProjectHistoryEntry,
} from "@myproject/core/themes";
import {
  createEvolutionEntry,
  appendEvolutionEntry,
} from "@myproject/core/evolutionLog";
import { getPlatform } from "@myproject/platform";
import type { WatchEventBatch } from "@myproject/platform";
import { ShieldAlert, ArrowRight, CheckCircle2, X, Terminal } from "lucide-react";

interface ImportToast {
  rootName: string;
  fileCount: number;
  gitignoreSkipped?: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "workspace" | "docs">(
    () =>
      new URLSearchParams(window.location.search).get("view") === "docs"
        ? "docs"
        : "home",
  );
  const [previousView, setPreviousView] = useState<"home" | "workspace">("home");
  const [docsInitialQuery, setDocsInitialQuery] = useState<string>("");
  const [docsInitialAudience, setDocsInitialAudience] = useState<
    "all" | "user" | "developer"
  >("all");
  const [rawFiles, setRawFiles] = useState<ProcessedFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>("");
  const [collisionStrategy, setCollisionStrategy] =
    useState<CollisionStrategy>("enumerate");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("files");

  // Desktop Lobby appears ONLY on Desktop versions of the software
  // (Electron runtime, or ?desktop=1 for preview/verification).
  // Web edition always uses the web Landing Page (HomePage).
  const isDesktopApp = useMemo(
    () =>
      getPlatform().id === "electron" ||
      new URLSearchParams(window.location.search).get("desktop") === "1",
    [],
  );

  const handleOpenDocumentation = useCallback(
    (
      initialQuery = "",
      initialAudience: "all" | "user" | "developer" = "all",
    ) => {
      setPreviousView(currentView === "workspace" ? "workspace" : "home");
      setDocsInitialQuery(initialQuery);
      setDocsInitialAudience(initialAudience);
      setCurrentView("docs");
    },
    [currentView],
  );

  // Preview & Modal states
  const [previewFile, setPreviewFile] = useState<ProcessedFile | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Auto-exclusion states
  const [excludedFolders, setExcludedFolders] = useState<ExcludedFolderInfo[]>(
    [],
  );
  const [pendingScanResult, setPendingScanResult] =
    useState<FolderScanResult | null>(null);
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);

  // Files kept out by .gitignore after the user's review choices — tracked
  // separately from heavy folders so the banner can report both honestly.
  const [gitignoreExcludedCount, setGitignoreExcludedCount] = useState(0);

  // Secrets detection state
  const [detectedSecretFiles, setDetectedSecretFiles] = useState<string[]>([]);

  // Dismiss states for post-import warning banners (reset on new folder import)
  const [isExclusionBannerDismissed, setIsExclusionBannerDismissed] =
    useState(false);
  const [isSecretsBannerDismissed, setIsSecretsBannerDismissed] =
    useState(false);

  // Import progress & success feedback
  const [importProgress, setImportProgress] = useState<ScanProgress | null>(
    null,
  );
  const [importToast, setImportToast] = useState<ImportToast | null>(null);

  // Zipping progress
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | undefined>();

  // ---- Live watch (desktop only, capabilities.watch) ----
  const watchSessionRef = useRef<string | null>(null);
  const watchUnsubRef = useRef<(() => void) | null>(null);
  const watchRootRef = useRef<{ abs: string; name: string } | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchNotice, setWatchNotice] = useState<string | null>(null);

  // Hidden folder input ref
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Test scenarios are developer QA — only surfaced behind ?dev=1 so the
  // panel (and its fixture-building code paths) stays out of the normal UI.
  const showScenarios = useMemo(
    () => new URLSearchParams(window.location.search).get("dev") === "1",
    [],
  );

  // ------------------------------------------------------------------
  // Derived pipeline runs on a SETTLED copy of rawFiles. During a live-
  // watch burst (saving files in an external editor), batches arrive every
  // ~150ms; debouncing collapses N batches into ONE recompute of collision
  // resolution + tree building (both walk every file). Project loads and
  // clears flush immediately so imports never feel delayed.
  // ------------------------------------------------------------------
  const settledFiles = useDebouncedValue(
    rawFiles,
    200,
    (prev, next) => prev.length === 0 || next.length === 0,
  );

  // Compute resolved flattened files based on selected collision strategy
  const { resolvedFiles, collisionCount } = useMemo(() => {
    if (settledFiles.length === 0) {
      return { resolvedFiles: [], collisionCount: 0 };
    }
    return resolveCollisions(settledFiles, collisionStrategy);
  }, [settledFiles, collisionStrategy]);

  // Compute folder hierarchy tree and statistics
  const { rootNode, stats } = useMemo(() => {
    if (settledFiles.length === 0) {
      return { rootNode: null, stats: null };
    }
    const tree = buildFolderTree(settledFiles, rootFolderName || "folder");
    return {
      rootNode: tree.root,
      stats: {
        ...tree.stats,
        collisionCount,
      },
    };
  }, [settledFiles, rootFolderName, collisionCount]);

  // Auto-dismiss the "project loaded" toast
  useEffect(() => {
    if (!importToast) return;
    const timer = setTimeout(() => setImportToast(null), 4500);
    return () => clearTimeout(timer);
  }, [importToast]);

  // Handle files loaded from picker or drag-drop
  const handleFilesLoaded = useCallback(
    (
      files: ProcessedFile[],
      folderName: string,
      gitignoreSkipped = 0,
      sampleScenarioId?: "web" | "rust" | "cpp",
    ) => {
      setRawFiles(files);
      setRootFolderName(folderName);
      setIsExclusionBannerDismissed(false);
      setIsSecretsBannerDismissed(false);
      setActiveTab("files");
      setCurrentView("workspace");
      setImportToast({
        rootName: folderName,
        fileCount: files.length,
        gitignoreSkipped,
      });

      // Record project in persistent Desktop Lobby history
      try {
        const stackInfo = detectCodebaseStack(files);
        const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
        const extCounts = new Map<string, number>();
        for (const f of files) {
          const ext = f.extension
            ? `.${f.extension.replace(/^\./, "")}`
            : "";
          if (ext) extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
        }
        const topExtensions = [...extCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([ext]) => ext);

        const inferredSample: "web" | "rust" | "cpp" | undefined =
          sampleScenarioId ??
          (folderName === "acme-saas-platform"
            ? "web"
            : folderName === "orbit-kv-engine"
              ? "rust"
              : folderName === "chrono-physics-engine"
                ? "cpp"
                : undefined);

        const canCacheInline =
          !inferredSample && files.length <= 45 && totalSize <= 240_000;

        recordProjectInHistory({
          id: inferredSample ? `sample:${inferredSample}` : `folder:${folderName}`,
          name: folderName,
          fileCount: files.length,
          totalSize,
          stackLabel: stackInfo.label,
          stackKind:
            stackInfo.primary === "rust"
              ? "rust"
              : stackInfo.primary === "cpp"
                ? "cpp"
                : stackInfo.primary === "web"
                  ? "web"
                  : stackInfo.primary === "polyglot"
                    ? "polyglot"
                    : "general",
          sourceKind: inferredSample ? "sample" : "folder",
          sampleScenarioId: inferredSample,
          topExtensions,
          cachedFiles: canCacheInline
            ? files.map((f) => ({
                name: f.name,
                originalPath: f.relativePath,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified,
                content: f.textContent,
              }))
            : undefined,
        });
      } catch {
        // Non-fatal history persistence
      }
    },
    [],
  );

  // ------------------------------------------------------------------
  // Live watch (Phase 2). Only active after a NATIVE import — web and
  // drag-drop scans carry no rootAbsolutePath, so this is a no-op there.
  // ------------------------------------------------------------------

  // Auto-dismiss the "files changed on disk" notice
  useEffect(() => {
    if (!watchNotice) return;
    const timer = setTimeout(() => setWatchNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [watchNotice]);

  const handleWatchBatch = useCallback(async (batch: WatchEventBatch) => {
    // Stale batches from a previous session must never touch the new project.
    if (watchSessionRef.current !== batch.sessionId) return;
    const ctx = watchRootRef.current;
    if (!ctx) return;

    // addDir/unlinkDir are ignored — files inside emit their own events.
    const fileEvents = batch.events.filter(
      (e) => e.type !== "addDir" && e.type !== "unlinkDir",
    );
    if (fileEvents.length === 0) return;

    const platform = getPlatform();

    // 1. Build file shells, then read ALL fresh content in parallel through
    //    the platform channel (gated: size cap + binary sniff, same as the
    //    scan). Was: one awaited IPC round-trip per file — a 30-file burst
    //    took 30 serialized round trips before React saw anything.
    const freshFiles: ProcessedFile[] = fileEvents
      .filter((e) => e.type !== "unlink")
      .map((e) => {
        const rel = `${ctx.name}/${e.path}`;
        const segs = rel.split("/");
        const name = segs[segs.length - 1] ?? e.path;
        return {
          id: `watch-${rel}-${e.mtimeMs ?? Date.now()}`,
          name,
          originalName: name,
          flattenedName: name,
          relativePath: rel,
          pathSegments: segs,
          directoryPath: segs.length > 2 ? segs.slice(1, -1).join("/") : "",
          size: e.size ?? 0,
          type: "",
          extension: getFileExtension(name),
          lastModified: e.mtimeMs ?? Date.now(),
          source: {
            kind: "path",
            absolutePath: `${ctx.abs.replace(/[\\/]+$/, "")}/${e.path}`,
          },
        } as ProcessedFile;
      });

    const texts = await Promise.all(
      freshFiles.map((f) => platform.readText(f)),
    );
    freshFiles.forEach((f, i) => {
      if (texts[i] !== undefined) f.textContent = texts[i];
    });

    const removedRels = new Set(
      fileEvents
        .filter((e) => e.type === "unlink")
        .map((e) => `${ctx.name}/${e.path}`),
    );

    // 2. One atomic state update: drop removed + replaced, append fresh.
    //    Preserve object identity for byte-identical files (mtime-only
    //    touches) so per-file caches and downstream memos survive; bail out
    //    entirely when nothing actually changed.
    setRawFiles((prev) => {
      if (freshFiles.length === 0 && removedRels.size === 0) return prev;

      const prevByRel = new Map(prev.map((f) => [f.relativePath, f]));
      const freshByRel = new Map<string, ProcessedFile>();
      for (const f of freshFiles) {
        const old = prevByRel.get(f.relativePath);
        freshByRel.set(
          f.relativePath,
          old && old.size === f.size && old.textContent === f.textContent
            ? old
            : f,
        );
      }

      // Rebuild in prev order so the identity comparison below is meaningful.
      const next: ProcessedFile[] = [];
      for (const f of prev) {
        if (removedRels.has(f.relativePath)) continue;
        next.push(freshByRel.get(f.relativePath) ?? f);
      }
      for (const f of freshFiles) {
        if (!prevByRel.has(f.relativePath)) {
          next.push(freshByRel.get(f.relativePath)!);
        }
      }

      return next.length === prev.length && next.every((f, i) => f === prev[i])
        ? prev
        : next;
    });

    // 3. Keep the secrets banner honest for newly appeared secret files.
    if (freshFiles.some((f) => isSecretFile(f.name))) {
      setDetectedSecretFiles((prev) => {
        const next = new Set(prev);
        for (const f of freshFiles) {
          if (isSecretFile(f.name)) next.add(f.relativePath);
        }
        return [...next];
      });
    }

    const changed = freshFiles.length + removedRels.size;
    setWatchNotice(
      `${changed} file${changed === 1 ? "" : "s"} updated on disk — views refreshed`,
    );

    try {
      const evoChanges = [
        ...freshFiles.slice(0, 4).map((f) => ({
          path: f.relativePath,
          action: "modify" as const,
          addedLines: 4,
          removedLines: 1,
          symbolsChanged: [] as string[],
        })),
        ...[...removedRels].slice(0, 2).map((rel) => ({
          path: rel,
          action: "delete" as const,
          addedLines: 0,
          removedLines: 4,
          symbolsChanged: [] as string[],
        })),
      ];
      const entry = createEvolutionEntry({
        source: "live-watch",
        summary: `Live disk edit (${changed} file${changed === 1 ? "" : "s"} updated)`,
        changes: evoChanges,
      });
      appendEvolutionEntry(ctx.name, entry);
    } catch {
      // ignore
    }
  }, []);

  const stopWatching = useCallback(async () => {
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
    watchRootRef.current = null;
    const platform = getPlatform();
    const sessionId = watchSessionRef.current;
    watchSessionRef.current = null;
    setIsWatching(false);
    if (sessionId && platform.stopWatch) {
      try {
        await platform.stopWatch(sessionId);
      } catch {
        // session already gone (window closed) — fine
      }
    }
  }, []);

  const startWatching = useCallback(
    async (rootAbsolutePath: string, rootName: string) => {
      const platform = getPlatform();
      if (
        !platform.capabilities.watch ||
        !platform.startWatch ||
        !platform.onWatchEvent
      ) {
        return;
      }
      await stopWatching();
      try {
        const sessionId = await platform.startWatch(rootAbsolutePath, {
          excludedPatterns: DEFAULT_EXCLUSION_RULES.filter(
            (r) => r.isDefault,
          ).map((r) => r.pattern),
          respectGitignore: true,
        });
        watchSessionRef.current = sessionId;
        watchRootRef.current = { abs: rootAbsolutePath, name: rootName };
        watchUnsubRef.current = platform.onWatchEvent(handleWatchBatch);
        setIsWatching(true);
      } catch (err) {
        console.error("[watch] failed to start:", err);
        setWatchNotice(
          "Live watch failed to start — disk changes won't auto-refresh",
        );
      }
    },
    [stopWatching, handleWatchBatch],
  );

  /** Native scan → watch it. Web/drag-drop scan → kill any stale watcher. */
  const maybeStartWatch = useCallback(
    (scan: FolderScanResult) => {
      if (scan.rootAbsolutePath) {
        void startWatching(scan.rootAbsolutePath, scan.rootName);
      } else {
        void stopWatching();
      }
    },
    [startWatching, stopWatching],
  );

  // Stop the watcher when the app unmounts.
  useEffect(() => {
    return () => {
      void stopWatching();
    };
  }, [stopWatching]);

  // Intercept incoming scans before importing.
  //
  // Nothing is excluded silently: the review modal opens whenever ANYTHING
  // was left out — heavy folders (node_modules, .git, ...) OR files matched
  // by the project's own .gitignore — listing every excluded group with its
  // files and letting the user re-include any of them.
  const handleScanResult = useCallback(
    (scanResult: FolderScanResult) => {
      setDetectedSecretFiles(scanResult.detectedSecretFiles || []);
      const hasHeavy =
        scanResult.detectedExclusions &&
        scanResult.detectedExclusions.length > 0;
      const hasGitignoreRemovals =
        (scanResult.gitignoreRemovedFiles?.length ?? 0) > 0;

      if (hasHeavy || hasGitignoreRemovals) {
        setPendingScanResult(scanResult);
        setIsExclusionModalOpen(true);
      } else {
        // Direct clean import — zero exclusions of any kind
        setExcludedFolders([]);
        setGitignoreExcludedCount(0);
        handleFilesLoaded(scanResult.files, scanResult.rootName, 0);
        maybeStartWatch(scanResult);
      }
    },
    [handleFilesLoaded, maybeStartWatch],
  );

  // Open Folder routes through the platform bridge: native dialog + native
  // scan on desktop (capabilities.nativeDialogs), hidden webkitdirectory
  // input on web. Both paths converge on handleScanResult.
  const handleOpenFolder = useCallback(() => {
    const platform = getPlatform();
    if (platform.capabilities.nativeDialogs) {
      void platform.pickFolder().then((result: FolderScanResult | null) => {
        if (result) handleScanResult(result);
      });
      return;
    }
    folderInputRef.current?.click();
  }, [handleScanResult]);

  // User confirmed their choices in the review modal
  const handleConfirmExclusionImport = useCallback(
    (
      selectedFiles: ProcessedFile[],
      activeExclusions: ExcludedFolderInfo[],
      gitignoreCount: number,
    ) => {
      setExcludedFolders(activeExclusions);
      setGitignoreExcludedCount(gitignoreCount);
      // Recompute the secrets banner from the files actually approved —
      // re-included groups (heavy folders, .gitignore-removed .env*) are
      // caught here, and removed ones no longer keep the banner alive.
      setDetectedSecretFiles(
        selectedFiles
          .filter((f) => isSecretFile(f.name))
          .map((f) => f.relativePath),
      );
      if (pendingScanResult) {
        handleFilesLoaded(
          selectedFiles,
          pendingScanResult.rootName,
          gitignoreCount,
        );
        maybeStartWatch(pendingScanResult);
      }
      setIsExclusionModalOpen(false);
    },
    [handleFilesLoaded, pendingScanResult, maybeStartWatch],
  );

  // Cancel review modal
  const handleCancelExclusionImport = useCallback(() => {
    setIsExclusionModalOpen(false);
    setPendingScanResult(null);
  }, []);

  // ------------------------------------------------------------------
  // Sample & scenario loading.
  //
  // CRITICAL: scenarios are File objects and MUST go through
  // processFileList() — the same production reader used by real folder
  // imports. This is what makes them genuine tests of the reader's
  // text-reading gate, size cap, gitignore parsing, and secrets
  // detection. Handing ProcessedFile objects straight to the app would
  // bypass all of it.
  // ------------------------------------------------------------------
  const loadScenario = useCallback(
    async (scenarioId: SampleScenarioId) => {
      const scenario = getScenarioProject(scenarioId);
      setImportProgress({
        phase: "reading",
        processed: 0,
        total: scenario.files.length,
        currentFile: "",
      });
      try {
        const result = await processFileList(scenario.files, {
          onProgress: setImportProgress,
        });
        handleScanResult(result);
      } finally {
        setImportProgress(null);
      }
    },
    [handleScanResult],
  );

  // Load sample demo project (clean)
  const handleLoadSample = useCallback(() => {
    void loadScenario("clean");
  }, [loadScenario]);

  // Load sample demo project with heavy folders (node_modules, .git, dist)
  const handleLoadSampleWithHeavy = useCallback(() => {
    void loadScenario("heavy");
  }, [loadScenario]);

  // Load a test scenario
  const handleLoadScenario = useCallback(
    (scenarioId: SampleScenarioId) => {
      void loadScenario(scenarioId);
    },
    [loadScenario],
  );

  // Load a project from the Desktop Lobby history
  const handleLoadHistoryEntry = useCallback(
    (entry: ProjectHistoryEntry) => {
      if (entry.sampleScenarioId) {
        void loadScenario(entry.sampleScenarioId);
        return;
      }
      if (entry.cachedFiles && entry.cachedFiles.length > 0) {
        const restored: ProcessedFile[] = entry.cachedFiles.map((cf, idx) => {
          const segs = cf.originalPath.split("/");
          return {
            id: `hist-${idx}-${cf.originalPath}`,
            name: cf.name,
            originalName: cf.name,
            flattenedName: cf.name,
            relativePath: cf.originalPath,
            pathSegments: segs,
            directoryPath: segs.length > 2 ? segs.slice(1, -1).join("/") : "",
            size: cf.size,
            type: cf.type,
            extension: getFileExtension(cf.name),
            lastModified: cf.lastModified,
            textContent: cf.content,
          } as unknown as ProcessedFile;
        });
        setExcludedFolders([]);
        setGitignoreExcludedCount(0);
        handleFilesLoaded(restored, entry.name, 0);
        return;
      }
      handleOpenFolder();
    },
    [loadScenario, handleFilesLoaded, handleOpenFolder],
  );

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1" && rawFiles.length === 0) {
      handleLoadSample();
    }
  }, [handleLoadSample, rawFiles.length]);

  // Download all stripped files as a flat ZIP archive
  const handleDownloadZip = useCallback(async () => {
    if (resolvedFiles.length === 0 || isZipping) return;

    setIsZipping(true);
    setZipProgress({ percent: 0, currentFile: "Initializing flat archive..." });

    try {
      const zipBlob = await createFlatZip(resolvedFiles, (progress) => {
        setZipProgress(progress);
      });

      const safeName = (rootFolderName || "flattened_files").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      await getPlatform().saveBlob(zipBlob, `${safeName}_flat_files.zip`);
    } catch (err) {
      console.error("Failed to create ZIP:", err);
    } finally {
      setIsZipping(false);
      setZipProgress(undefined);
    }
  }, [resolvedFiles, isZipping, rootFolderName]);

  // Direct PDF download trigger
  const handleDownloadPdfDirect = useCallback(() => {
    if (!rootNode || !stats) return;
    const doc = generateFolderPdf(rootNode, stats, resolvedFiles, {
      title: `Directory Structure: ${stats.rootName}`,
      includeTree: true,
      includeStats: true,
      includeInventoryTable: true,
      includeSizes: true,
      includeDates: true,
      treeStyle: "standard",
      themeColor: "blue",
      treeFont: "sans",
      treeFontSize: 9.5,
    });
    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = stats.rootName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const pdfBlob = doc.output("blob");
    void getPlatform().saveBlob(pdfBlob, `${safeName}_structure_${dateStr}.pdf`);
  }, [rootNode, stats, resolvedFiles]);

  // Global Keyboard Shortcuts — real dependency array (was: re-registered on
  // every render). The two download handlers are useCallback'ed above.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFolder();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (resolvedFiles.length > 0 && !isZipping) {
          void handleDownloadZip();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (rootNode && stats) {
          handleDownloadPdfDirect();
        }
      } else if (e.key === "Escape") {
        setPreviewFile(null);
        setIsHelpOpen(false);
        setIsExclusionModalOpen(false);
      } else if (e.key === "1") {
        setCurrentView("workspace");
        setActiveTab("files");
      } else if (e.key === "2") {
        setCurrentView("workspace");
        setActiveTab("tree");
      } else if (e.key === "3") {
        setCurrentView("workspace");
        setActiveTab("pdf");
      } else if (e.key === "4") {
        setCurrentView("workspace");
        setActiveTab("analytics");
      } else if (e.key === "5") {
        setCurrentView("workspace");
        setActiveTab("analyzer");
      } else if (e.key === "6") {
        setCurrentView("workspace");
        setActiveTab("deplenz");
      } else if (e.key === "?") {
        setIsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleOpenFolder,
    resolvedFiles.length,
    isZipping,
    rootNode,
    stats,
    handleDownloadZip,
    handleDownloadPdfDirect,
  ]);

  const handleFolderPickerChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportProgress({
        phase: "reading",
        processed: 0,
        total: e.target.files.length,
        currentFile: "",
      });
      try {
        const scanResult = await processFileList(e.target.files, {
          onProgress: setImportProgress,
        });
        handleScanResult(scanResult);
      } finally {
        setImportProgress(null);
        e.target.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-[var(--app-bg)] text-slate-100 overflow-hidden font-sans">
      {/* Hidden WebKit folder input (web fallback path) */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in WebKit/Blink
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFolderPickerChange}
      />

      {currentView === "docs" ? (
        /* ================= BUILT-IN SEARCHABLE DOCUMENTATION PAGE ================= */
        <DocumentationView
          onBack={() =>
            setCurrentView(
              previousView === "workspace" && resolvedFiles.length > 0
                ? "workspace"
                : "home",
            )
          }
          backLabel={
            previousView === "workspace" && resolvedFiles.length > 0
              ? `Back to Workspace (${rootFolderName})`
              : isDesktopApp
                ? "Back to Desktop Workbench"
                : "Back to Home"
          }
          initialQuery={docsInitialQuery}
          initialAudience={docsInitialAudience}
          onOpenFolder={handleOpenFolder}
          onLoadSample={handleLoadSample}
        />
      ) : currentView === "home" ? (
        isDesktopApp ? (
          /* ================= NATIVE DESKTOP WORKBENCH LOBBY (Desktop Only, Edge-to-Edge) ================= */
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            <DesktopLobby
              onScanResult={handleScanResult}
              onOpenFolderPicker={handleOpenFolder}
              onLoadScenario={handleLoadScenario}
              onLoadHistoryEntry={handleLoadHistoryEntry}
              onScanProgress={setImportProgress}
              onOpenDocumentation={handleOpenDocumentation}
              onSwitchToClassicGuide={() => handleOpenDocumentation("", "all")}
              activeProjectName={rootFolderName}
              activeFileCount={resolvedFiles.length}
              onReturnToWorkspace={() => setCurrentView("workspace")}
            />
          </div>
        ) : (
          /* ================= WEB EDITION LANDING PAGE (Web Only) ================= */
          <div className="flex-1 overflow-y-auto">
            {resolvedFiles.length > 0 && (
              <div className="surface-header border-b border-chrome px-6 py-2 flex items-center justify-between text-xs text-slate-300 sticky top-0 z-50">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>
                    Active workspace loaded:{" "}
                    <strong className="text-white font-mono">
                      {rootFolderName}
                    </strong>{" "}
                    ({resolvedFiles.length} files)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView("workspace")}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all shadow-sm cursor-pointer"
                >
                  <span>Return to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <HomePage
              onScanResult={handleScanResult}
              onLoadSample={handleLoadSample}
              onLoadSampleWithHeavyFolders={handleLoadSampleWithHeavy}
              onLoadScenario={handleLoadScenario}
              onOpenFolderPicker={handleOpenFolder}
              onScanProgress={setImportProgress}
              onOpenDocumentation={handleOpenDocumentation}
              showScenarios={showScenarios}
            />
          </div>
        )
      ) : (
        /* ================= WORKSPACE INTERFACE ================= */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Application Header */}
          <DesktopHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            stats={stats}
            onOpenFolderClick={handleOpenFolder}
            onLoadSampleClick={handleLoadSample}
            onDownloadZipClick={() => void handleDownloadZip()}
            onDownloadPdfClick={handleDownloadPdfDirect}
            onDownloadImageClick={() => setActiveTab("pdf")}
            onHelpClick={() => setIsHelpOpen(true)}
            onDocsClick={() => handleOpenDocumentation("", "all")}
            onGoHomeClick={() => setCurrentView("home")}
            isZipping={isZipping}
            excludedFolders={excludedFolders}
            onReviewExclusionsClick={() => {
              if (pendingScanResult) {
                setIsExclusionModalOpen(true);
              }
            }}
          />

          {/* Persistent banner listing everything that was excluded —
              both categories, with a way back to the review modal and a close button */}
          {(excludedFolders.length > 0 || gitignoreExcludedCount > 0) &&
            resolvedFiles.length > 0 &&
            !isExclusionBannerDismissed && (
              <div className="bg-warn-soft border-b border-warn px-4 py-1.5 flex items-center justify-between gap-3 text-xs text-warn">
                <div className="flex items-center space-x-2 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-warn shrink-0" />
                  <span className="truncate">
                    {excludedFolders.length > 0 && (
                      <>
                        <strong>Auto-Excluded Heavy Folders:</strong>{" "}
                        {excludedFolders
                          .map((f) => `${f.name}/ (~${f.fileCount} items)`)
                          .join(", ")}
                        .{" "}
                      </>
                    )}
                    {gitignoreExcludedCount > 0 && (
                      <>
                        <strong>{gitignoreExcludedCount} file(s)</strong>{" "}
                        excluded via .gitignore.{" "}
                      </>
                    )}
                    Excluded items were kept out to ensure instant loading and
                    clean output.
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pendingScanResult && (
                    <button
                      type="button"
                      onClick={() => setIsExclusionModalOpen(true)}
                      className="text-warn hover:opacity-80 underline font-medium shrink-0 cursor-pointer"
                    >
                      Review Exclusions
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExclusionBannerDismissed(true)}
                    aria-label="Close exclusion warning"
                    data-testid="close-exclusion-warning"
                    title="Close warning"
                    className="p-1 rounded-md text-warn hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          {/* Persistent warning banner when possible secrets were detected */}
          {detectedSecretFiles.length > 0 &&
            resolvedFiles.length > 0 &&
            !isSecretsBannerDismissed && (
              <div className="bg-danger-soft border-b border-danger px-4 py-1.5 flex items-center justify-between gap-3 text-xs text-danger">
                <div className="flex items-center space-x-2 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                  <span className="truncate">
                    <strong>Possible secrets detected:</strong>{" "}
                    {detectedSecretFiles.slice(0, 3).join(", ")}
                    {detectedSecretFiles.length > 3
                      ? ` +${detectedSecretFiles.length - 3} more`
                      : ""}
                    . These files will be included in exports — review before
                    sharing output with AI tools.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSecretsBannerDismissed(true)}
                  aria-label="Close secrets warning"
                  data-testid="close-secrets-warning"
                  title="Close warning"
                  className="p-1 rounded-md text-danger hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          {/* Main Workspace Tabs */}
          <main className="flex-1 overflow-hidden relative flex flex-col bg-[var(--app-bg)]">
            {resolvedFiles.length === 0 ? (
              /* Empty state inside workspace */
              <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                <FolderDropzone
                  onScanResult={handleScanResult}
                  onLoadSample={handleLoadSample}
                  onLoadSampleWithHeavyFolders={handleLoadSampleWithHeavy}
                  onLoadScenario={handleLoadScenario}
                  onScanProgress={setImportProgress}
                  onBrowseClick={handleOpenFolder}
                  showScenarios={showScenarios}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === "files" && (
                  <FlatFilesView
                    files={resolvedFiles}
                    collisionStrategy={collisionStrategy}
                    onStrategyChange={setCollisionStrategy}
                    collisionCount={collisionCount}
                    onPreviewFile={setPreviewFile}
                    onDownloadAllZip={() => void handleDownloadZip()}
                    isZipping={isZipping}
                    zipProgress={zipProgress}
                    onOpenAnotherFolder={handleOpenFolder}
                  />
                )}

                {activeTab === "tree" && rootNode && (
                  <DirectoryTreeView
                    rootNode={rootNode}
                    onSelectFile={setPreviewFile}
                  />
                )}

                {activeTab === "pdf" && rootNode && stats && (
                  <PdfArchitectView
                    rootNode={rootNode}
                    stats={stats}
                    files={resolvedFiles}
                  />
                )}

                {activeTab === "analytics" && stats && (
                  <AnalyticsView
                    stats={stats}
                    files={resolvedFiles}
                    collisionCount={collisionCount}
                  />
                )}

                {activeTab === "analyzer" && (
                  <CodeAnalyzerView
                    files={settledFiles}
                    rootFolderName={rootFolderName}
                  />
                )}

                {activeTab === "deplenz" && (
                  <DepLenzView
                    files={settledFiles}
                    onSelectFile={setPreviewFile}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Exclusion Review Modal — lists every excluded group (heavy folders
          and .gitignore rule groups) with its files; each re-includable.
          Rebuilds from baseFiles, which contains every scanned file. */}
      {pendingScanResult && (
        <ExclusionWarningModal
          isOpen={isExclusionModalOpen}
          rootName={pendingScanResult.rootName}
          detectedExclusions={pendingScanResult.detectedExclusions}
          cleanFiles={pendingScanResult.files}
          baseFiles={pendingScanResult.baseFiles}
          gitignoreRemovedFiles={pendingScanResult.gitignoreRemovedFiles}
          onConfirmImport={handleConfirmExclusionImport}
          onCancel={handleCancelExclusionImport}
        />
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Help & Shortcuts Drawer */}
      <HelpShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Global import progress overlay */}
      {importProgress && <ImportProgressOverlay progress={importProgress} />}

      {/* Live-watch status pill (desktop) */}
      {isWatching && (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-5 z-40 flex items-center space-x-2 px-3 py-2 rounded-xl surface-card border border-chrome shadow-2xl text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Live — watching{" "}
            <span className="font-mono text-slate-100">{rootFolderName}</span>{" "}
            for changes
          </span>
        </div>
      )}

      {/* Watch change notice */}
      {watchNotice && (
        <div className="fixed bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.5rem))] left-5 z-40 flex items-center space-x-2 px-3 py-2 rounded-xl surface-card border border-chrome shadow-2xl text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{watchNotice}</span>
          <button
            type="button"
            onClick={() => setWatchNotice(null)}
            aria-label="Close watch notice"
            className="p-0.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Import success toast */}
      {importToast && !importProgress && (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-50 flex items-center space-x-3 pl-4 pr-3 py-3 rounded-2xl surface-card border border-chrome shadow-2xl max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
          <div className="text-xs min-w-0">
            <p className="font-semibold text-slate-100">Project loaded</p>
            <p className="text-slate-400 truncate">
              {importToast.fileCount.toLocaleString()} files imported from{" "}
              <span className="font-mono text-slate-200">
                {importToast.rootName}
              </span>
              {importToast.gitignoreSkipped
                ? ` · ${importToast.gitignoreSkipped} excluded via .gitignore`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportToast(null)}
            aria-label="Dismiss"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[var(--surface-hover)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
