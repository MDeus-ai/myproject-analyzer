
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
import { DesktopHeader } from "./components/DesktopHeader";
import { HomePage } from "./components/HomePage";
import { FolderDropzone } from "./components/FolderDropzone";
import { FlatFilesView } from "./components/FlatFilesView";
import { DirectoryTreeView } from "./components/DirectoryTreeView";
import { PdfArchitectView } from "./components/PdfArchitectView";
import { AnalyticsView } from "./components/AnalyticsView";
import { CodeAnalyzerView } from "./components/CodeAnalyzerView";
import { DepLenzView } from "./components/DepLenzView";
import { FilePreviewModal } from "./components/FilePreviewModal";
import { HelpShortcutsModal } from "./components/HelpShortcutsModal";
import { ExclusionWarningModal } from "./components/ExclusionWarningModal";
import { ImportProgressOverlay } from "./components/ImportProgressOverlay";

import {
  CollisionStrategy,
  ProcessedFile,
  FolderScanResult,
  ExcludedFolderInfo,
  WorkspaceTab,
} from "./types";
import { buildFolderTree } from "./utils/treeBuilder";
import { resolveCollisions } from "./utils/collisionResolver";
import {
  createFlatZip,
  triggerFileDownload,
  ZipProgress,
} from "./utils/zipExporter";
import { generateFolderPdf, downloadPdf } from "./utils/pdfGenerator";
import { getScenarioProject, SampleScenarioId } from "./utils/sampleProject";
import { processFileList, ScanProgress } from "./utils/folderReader";
import { isSecretFile } from "./utils/secretsDetector";
import { ShieldAlert, ArrowRight, CheckCircle2, X } from "lucide-react";

interface ImportToast {
  rootName: string;
  fileCount: number;
  gitignoreSkipped?: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "workspace">("home");
  const [rawFiles, setRawFiles] = useState<ProcessedFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>("");
  const [collisionStrategy, setCollisionStrategy] =
    useState<CollisionStrategy>("enumerate");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("files");

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

  // Import progress & success feedback
  const [importProgress, setImportProgress] = useState<ScanProgress | null>(
    null,
  );
  const [importToast, setImportToast] = useState<ImportToast | null>(null);

  // Zipping progress
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | undefined>();

  // Hidden folder input ref
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Test scenarios are developer QA — only surfaced behind ?dev=1 so the
  // panel (and its fixture-building code paths) stays out of the normal UI.
  const showScenarios = useMemo(
    () => new URLSearchParams(window.location.search).get("dev") === "1",
    [],
  );

  // Compute resolved flattened files based on selected collision strategy
  const { resolvedFiles, collisionCount } = useMemo(() => {
    if (rawFiles.length === 0) {
      return { resolvedFiles: [], collisionCount: 0 };
    }
    return resolveCollisions(rawFiles, collisionStrategy);
  }, [rawFiles, collisionStrategy]);

  // Compute folder hierarchy tree and statistics
  const { rootNode, stats } = useMemo(() => {
    if (resolvedFiles.length === 0) {
      return { rootNode: null, stats: null };
    }
    const tree = buildFolderTree(rawFiles, rootFolderName || "folder");
    return {
      rootNode: tree.root,
      stats: {
        ...tree.stats,
        collisionCount,
      },
    };
  }, [rawFiles, resolvedFiles, rootFolderName, collisionCount]);

  // Auto-dismiss the "project loaded" toast
  useEffect(() => {
    if (!importToast) return;
    const timer = setTimeout(() => setImportToast(null), 4500);
    return () => clearTimeout(timer);
  }, [importToast]);

  // Handle files loaded from picker or drag-drop
  const handleFilesLoaded = useCallback(
    (files: ProcessedFile[], folderName: string, gitignoreSkipped = 0) => {
      setRawFiles(files);
      setRootFolderName(folderName);
      setActiveTab("files");
      setCurrentView("workspace");
      setImportToast({
        rootName: folderName,
        fileCount: files.length,
        gitignoreSkipped,
      });
    },
    [],
  );

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
      }
    },
    [handleFilesLoaded],
  );

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
      }
      setIsExclusionModalOpen(false);
    },
    [handleFilesLoaded, pendingScanResult],
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

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1" && rawFiles.length === 0) {
      handleLoadSample();
    }
  }, [handleLoadSample, rawFiles.length]);

  // Global Keyboard Shortcuts
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
        folderInputRef.current?.click();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (resolvedFiles.length > 0 && !isZipping) {
          handleDownloadZip();
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
  });

  // Download all stripped files as a flat ZIP archive
  const handleDownloadZip = async () => {
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
      triggerFileDownload(zipBlob, `${safeName}_flat_files.zip`);
    } catch (err) {
      console.error("Failed to create ZIP:", err);
    } finally {
      setIsZipping(false);
      setZipProgress(undefined);
    }
  };

  // Direct PDF download trigger
  const handleDownloadPdfDirect = () => {
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
    downloadPdf(doc, `${safeName}_structure_${dateStr}.pdf`);
  };

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
    <div className="flex flex-col h-screen w-screen bg-[var(--app-bg)] text-slate-100 overflow-hidden font-sans">
      {/* Hidden WebKit folder input */}
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

      {currentView === "home" ? (
        /* ================= SOFTWARE HOMEPAGE ================= */
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Active project banner on homepage if files exist in memory */}
          {resolvedFiles.length > 0 && (
            <div className="surface-header border-b border-chrome px-4 py-2 flex items-center justify-between text-xs text-slate-300 sticky top-0 z-50">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Active workspace loaded:{" "}
                  <strong className="font-mono text-slate-100">
                    {rootFolderName}
                  </strong>{" "}
                  ({resolvedFiles.length} files)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("workspace")}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-sm"
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
            onOpenFolderPicker={() => folderInputRef.current?.click()}
            onScanProgress={setImportProgress}
            showScenarios={showScenarios}
          />
        </div>
      ) : (
        /* ================= WORKSPACE INTERFACE ================= */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Application Header */}
          <DesktopHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            stats={stats}
            onOpenFolderClick={() => folderInputRef.current?.click()}
            onLoadSampleClick={handleLoadSample}
            onDownloadZipClick={handleDownloadZip}
            onDownloadPdfClick={handleDownloadPdfDirect}
            onDownloadImageClick={() => setActiveTab("pdf")}
            onHelpClick={() => setIsHelpOpen(true)}
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
              both categories, with a way back to the review modal */}
          {(excludedFolders.length > 0 || gitignoreExcludedCount > 0) &&
            resolvedFiles.length > 0 && (
              <div className="bg-warn-soft border-b border-warn px-4 py-1.5 flex items-center justify-between text-xs text-warn">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-warn shrink-0" />
                  <span>
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

                {pendingScanResult && (
                  <button
                    type="button"
                    onClick={() => setIsExclusionModalOpen(true)}
                    className="text-amber-400 hover:text-amber-300 underline font-medium ml-4 shrink-0 cursor-pointer"
                  >
                    Review Exclusions
                  </button>
                )}
              </div>
            )}

          {/* Persistent warning banner when possible secrets were detected */}
          {detectedSecretFiles.length > 0 && resolvedFiles.length > 0 && (
            <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-1.5 flex items-center space-x-2 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Possible secrets detected:</strong>{" "}
                {detectedSecretFiles.slice(0, 3).join(", ")}
                {detectedSecretFiles.length > 3
                  ? ` +${detectedSecretFiles.length - 3} more`
                  : ""}
                . These files will be included in exports — review before
                sharing output with AI tools.
              </span>
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
                    onDownloadAllZip={handleDownloadZip}
                    isZipping={isZipping}
                    zipProgress={zipProgress}
                    onOpenAnotherFolder={() => folderInputRef.current?.click()}
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
                    files={rawFiles}
                    rootFolderName={rootFolderName}
                  />
                )}

                {activeTab === "deplenz" && (
                  <DepLenzView
                    files={rawFiles}
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

      {/* Import success toast */}
      {importToast && !importProgress && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-3 pl-4 pr-3 py-3 rounded-2xl surface-card border border-chrome shadow-2xl max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
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

