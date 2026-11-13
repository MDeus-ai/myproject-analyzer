import React, { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  Sparkles,
  Clock,
  Pin,
  Trash2,
  Sun,
  Moon,
  Palette,
  Type,
  Code2,
  Cpu,
  Layers,
  Search,
  ArrowRight,
  Check,
  BookOpen,
  ShieldCheck,
  Terminal,
  FileCode,
  FolderGit2,
  Sliders,
  Upload,
  HardDrive,
  X,
} from "lucide-react";
import {
  APP_THEMES,
  FONT_STYLE_OPTIONS,
  FONT_SIZE_OPTIONS,
  AppearanceMode,
  FontStyleId,
  FontSizeScale,
  ProjectHistoryEntry,
  getActiveThemeId,
  getSavedAppearance,
  getSavedFontStyle,
  getSavedFontSize,
  applyTheme,
  applyAppearance,
  applyTypographySettings,
  swatchBackground,
  loadProjectHistory,
  togglePinProjectInHistory,
  removeProjectFromHistory,
  clearProjectHistory,
} from "@myproject/core/themes";
import { SampleScenarioId } from "@myproject/core/sampleProject";
import { FolderScanResult } from "@myproject/core/types";
import { readDroppedEntries, ScanProgress } from "@myproject/core/folderReader";
import { formatBytes } from "@myproject/core/fileHelpers";
import { CodeSyntaxHighlighter } from "./CodeSyntaxHighlighter";
import { ThemeSwitcher } from "./ThemeSwitcher";

export interface DesktopLobbyProps {
  onScanResult: (result: FolderScanResult) => void;
  onOpenFolderPicker: () => void;
  onLoadScenario: (scenarioId: SampleScenarioId) => void;
  onLoadHistoryEntry: (entry: ProjectHistoryEntry) => void;
  onScanProgress?: (progress: ScanProgress | null) => void;
  onOpenDocumentation?: (initialQuery?: string, initialAudience?: "all" | "user" | "developer") => void;
  onSwitchToClassicGuide?: () => void;
  activeProjectName?: string;
  activeFileCount?: number;
  onReturnToWorkspace?: () => void;
}

const PREVIEW_SNIPPETS: Record<
  "rust" | "cpp" | "ts",
  { label: string; filePath: string; code: string }
> = {
  rust: {
    label: "Rust (Cargo)",
    filePath: "src/engine.rs",
    code: `use crate::storage::{WalRecord, StorageEngine};

#[derive(Debug, Clone)]
pub struct OrbitKvNode<'a> {
    pub namespace: &'a str,
    pub max_segments: usize,
}

pub trait QueryExecutor {
    fn execute_batch(&mut self, keys: &[String]) -> Result<usize, String>;
}`,
  },
  cpp: {
    label: "C++20 Native",
    filePath: "src/world.cpp",
    code: `#include "world.hpp"
#include <vector>

namespace chrono {
void PhysicsWorld::stepSimulation(double dt) {
    integrateForces(dt);
     BroadphasePairs pairs = detectCollisions();
    solveConstraints(pairs, dt);
}
}`,
  },
  ts: {
    label: "TypeScript / React",
    filePath: "src/DepLenzView.tsx",
    code: `import { buildCodebaseDependencyGraph } from "@myproject/core/depLenz";

export function analyzeModuleTopology(files: ProcessedFile[]) {
  const graph = buildCodebaseDependencyGraph(files);
  return {
    stack: graph.projectStack?.label ?? "Polyglot",
    clusters: graph.moduleClusters?.length ?? 0,
  };
}`,
  },
};

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export const DesktopLobby: React.FC<DesktopLobbyProps> = ({
  onScanResult,
  onOpenFolderPicker,
  onLoadScenario,
  onLoadHistoryEntry,
  onScanProgress,
  onOpenDocumentation,
  onSwitchToClassicGuide,
  activeProjectName,
  activeFileCount = 0,
  onReturnToWorkspace,
}) => {
  // Appearance & Typography state
  const [activeThemeId, setActiveThemeId] = useState<string>(() =>
    getActiveThemeId(),
  );
  const [appearance, setAppearance] = useState<AppearanceMode>(() =>
    getSavedAppearance(),
  );
  const [fontStyle, setFontStyle] = useState<FontStyleId>(() =>
    getSavedFontStyle(),
  );
  const [fontSize, setFontSize] = useState<FontSizeScale>(() =>
    getSavedFontSize(),
  );

  // Project History state
  const [historyEntries, setHistoryEntries] = useState<ProjectHistoryEntry[]>(
    () => loadProjectHistory(),
  );
  const [historyQuery, setHistoryQuery] = useState("");
  const [stackFilter, setStackFilter] = useState<
    "all" | "pinned" | "web" | "rust" | "cpp"
  >("all");

  // Live code preview tab in Typography / Theme inspector
  const [previewLang, setPreviewLang] = useState<"rust" | "cpp" | "ts">("rust");

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    setHistoryEntries(loadProjectHistory());
  }, [activeProjectName, activeFileCount]);

  const handleSelectTheme = (themeId: string) => {
    applyTheme(themeId);
    setActiveThemeId(themeId);
  };

  const handleSelectAppearance = (mode: AppearanceMode) => {
    applyAppearance(mode);
    setAppearance(mode);
  };

  const handleSelectFontStyle = (styleId: FontStyleId) => {
    setFontStyle(styleId);
    applyTypographySettings(styleId, fontSize);
  };

  const handleSelectFontSize = (sizeId: FontSizeScale) => {
    setFontSize(sizeId);
    applyTypographySettings(fontStyle, sizeId);
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistoryEntries(togglePinProjectInHistory(id));
  };

  const handleRemoveEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistoryEntries(removeProjectFromHistory(id));
  };

  const handleClearUnpinned = () => {
    setHistoryEntries(clearProjectHistory());
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDropError(null);

      if (!e.dataTransfer.items || e.dataTransfer.items.length === 0) return;

      onScanProgress?.({
        phase: "scanning",
        processed: 0,
        total: 0,
        currentFile: "",
      });
      try {
        const result = await readDroppedEntries(e.dataTransfer.items, {
          onProgress: onScanProgress ?? undefined,
        });
        if (
          result.files.length === 0 &&
          (!result.baseFiles || result.baseFiles.length === 0)
        ) {
          setDropError(
            "No files found in dropped item. Please drop a project folder.",
          );
        } else {
          onScanResult(result);
        }
      } catch (err) {
        console.error(err);
        setDropError("Failed to read dropped folder structure.");
      } finally {
        onScanProgress?.(null);
      }
    },
    [onScanResult, onScanProgress],
  );

  const filteredHistory = historyEntries.filter((entry) => {
    if (stackFilter === "pinned" && !entry.pinned) return false;
    if (
      stackFilter !== "all" &&
      stackFilter !== "pinned" &&
      entry.stackKind !== stackFilter
    ) {
      return false;
    }
    if (historyQuery.trim()) {
      const q = historyQuery.toLowerCase();
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.stackLabel.toLowerCase().includes(q) ||
        entry.topExtensions.some((ext) => ext.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeSnippet = PREVIEW_SNIPPETS[previewLang];
  const activeThemeObj =
    APP_THEMES.find((t) => t.id === activeThemeId) ?? APP_THEMES[0];
  const activeFontStyleObj =
    FONT_STYLE_OPTIONS.find((f) => f.id === fontStyle) ?? FONT_STYLE_OPTIONS[0];
  const activeFontSizeObj =
    FONT_SIZE_OPTIONS.find((s) => s.id === fontSize) ?? FONT_SIZE_OPTIONS[1];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full h-full flex-1 flex flex-col bg-[var(--app-bg)] text-slate-100 select-none overflow-hidden"
    >
      {/* ================================================================== */}
      {/* TOP NATIVE DESKTOP TITLE & COMMAND BAR (Full-Bleed, Single Row)    */}
      {/* ================================================================== */}
      <header className="surface-header border-b border-chrome px-4 h-12 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-100 font-display whitespace-nowrap">
              MyProject Analyzer
            </h1>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">
              Desktop Workbench
            </span>
            <span className="hidden md:inline text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="hidden md:inline text-[11px] font-mono text-accent whitespace-nowrap">
              Web · Rust · C/C++20 AST
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeFileCount > 0 && onReturnToWorkspace && (
            <button
              type="button"
              onClick={onReturnToWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg chip-accent border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <span>
                Resume {activeProjectName} ({activeFileCount})
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenDocumentation && (
            <button
              type="button"
              onClick={() => onOpenDocumentation()}
              data-testid="lobby-open-docs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              title="Open comprehensive User Guide & Developer Technical Documentation"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Documentation</span>
            </button>
          )}

          {onSwitchToClassicGuide && (
            <button
              type="button"
              onClick={onSwitchToClassicGuide}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              title="View web product overview"
            >
              <span>Product Overview</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFolderPicker}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Project Folder</span>
          </button>

          <ThemeSwitcher />
        </div>
      </header>

      {/* ================================================================== */}
      {/* FULL-BLEED 3-PANE DESKTOP WORKBENCH (Zero Side Paddings)           */}
      {/* ================================================================== */}
      <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-chrome)] overflow-y-auto lg:overflow-hidden">
        {/* ==================== PANE 1: LEFT PROJECT EXPLORER & HISTORY DOCK (3 cols) ==================== */}
        <aside className="lg:col-span-3 flex flex-col min-h-0 h-full surface-section overflow-hidden">
          <div className="p-3.5 border-b border-chrome flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Recent Workspaces
                </h2>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {historyEntries.length} saved
              </span>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search project history…"
                aria-label="Search recent projects"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg surface-card border border-chrome text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Stack Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg surface-card border border-subtle overflow-x-auto scrollbar-none">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "pinned", label: "Pinned" },
                  { id: "web", label: "Web" },
                  { id: "rust", label: "Rust" },
                  { id: "cpp", label: "C++" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStackFilter(tab.id)}
                  className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    stackFilter === tab.id
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Project List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center">
                <FolderGit2 className="w-7 h-7 text-slate-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-medium text-slate-300">
                  No matching projects in history
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Open a folder from disk or launch a polyglot starter template.
                </p>
              </div>
            ) : (
              filteredHistory.map((entry) => {
                const isCurrentlyActive =
                  activeFileCount > 0 && activeProjectName === entry.name;
                return (
                  <div
                    key={entry.id}
                    onClick={() => onLoadHistoryEntry(entry)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onLoadHistoryEntry(entry);
                      }
                    }}
                    data-testid={`history-item-${entry.name}`}
                    className={`group px-3.5 py-3 flex items-start justify-between gap-2.5 transition-colors cursor-pointer ${
                      isCurrentlyActive
                        ? "bg-accent-soft"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 font-mono text-[10px] font-bold mt-0.5 ${
                          entry.stackKind === "rust"
                            ? "kind-badge kind-struct"
                            : entry.stackKind === "cpp"
                              ? "kind-badge kind-trait"
                              : "kind-badge kind-function"
                        }`}
                      >
                        {entry.stackKind === "rust"
                          ? "RS"
                          : entry.stackKind === "cpp"
                            ? "C++"
                            : "TS"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 font-mono truncate group-hover:text-accent transition-colors">
                            {entry.name}
                          </span>
                          {entry.pinned && (
                            <Pin className="w-3 h-3 text-amber-400 fill-amber-400/30 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                          <span>{entry.stackLabel}</span>
                          <span>·</span>
                          <span>{entry.fileCount} files</span>
                          <span>·</span>
                          <span>{formatBytes(entry.totalSize)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-mono">
                          <span>{formatRelativeTime(entry.lastOpenedAt)}</span>
                          {entry.topExtensions.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="truncate">
                                {entry.topExtensions.join(" ")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, entry.id)}
                        title={
                          entry.pinned
                            ? "Unpin from top"
                            : "Pin workspace to top"
                        }
                        aria-label={
                          entry.pinned
                            ? `Unpin ${entry.name}`
                            : `Pin ${entry.name}`
                        }
                        className={`p-1 rounded-md border transition-colors cursor-pointer ${
                          entry.pinned
                            ? "border-warn text-warn bg-warn-soft"
                            : "border-transparent text-slate-500 hover:text-slate-200 hover:bg-[var(--surface-raised)]"
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveEntry(e, entry.id)}
                        title="Remove from history"
                        aria-label={`Remove ${entry.name} from history`}
                        className="p-1 rounded-md border border-transparent text-slate-500 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Left Dock Footer */}
          <div className="px-3.5 py-2.5 border-t border-chrome surface-header flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Click any entry to load</span>
            {historyEntries.some((e) => !e.pinned) && (
              <button
                type="button"
                onClick={handleClearUnpinned}
                className="text-slate-400 hover:text-danger transition-colors cursor-pointer font-medium"
              >
                Clear unpinned
              </button>
            )}
          </div>
        </aside>

        {/* ==================== PANE 2: CENTER WORKBENCH LAUNCHPAD & LIVE CODE INSPECTOR (5 cols) ==================== */}
        <main className="lg:col-span-5 flex flex-col min-h-0 h-full surface-card overflow-y-auto divide-y divide-[var(--border-chrome)]">
          {/* Section A: Native Disk Import & Drop Target */}
          <section
            className={`p-5 transition-colors ${
              isDragging ? "bg-accent-soft" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl surface-raised border border-chrome flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">
                    Import Local Repository or Drop Folder
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Drop any project directory into this workbench or browse
                    from disk. Heavy build artifacts (
                    <code className="font-mono text-slate-300">
                      node_modules
                    </code>
                    , <code className="font-mono text-slate-300">target</code>,{" "}
                    <code className="font-mono text-slate-300">build</code>) and{" "}
                    <code className="font-mono text-slate-300">.gitignore</code>{" "}
                    rules are filtered automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFolderPicker}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shrink-0 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Disk…</span>
              </button>
            </div>

            {dropError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-danger-soft border border-danger text-xs text-danger flex items-center justify-between gap-2">
                <span>{dropError}</span>
                <button
                  type="button"
                  onClick={() => setDropError(null)}
                  aria-label="Close error message"
                  className="p-0.5 rounded hover:bg-rose-500/20 text-danger transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* Section B: Polyglot Reference Workspaces */}
          <section className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Polyglot Reference Workspaces
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                1-click AST &amp; dependency graph templates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Web Dev Starter */}
              <button
                type="button"
                onClick={() => onLoadScenario("web")}
                data-testid="lobby-load-web"
                className="group text-left p-3.5 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome hover:border-accent transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-accent">
                      Web Dev · TS/React
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-bold text-slate-100 font-mono truncate">
                    acme-saas-platform
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    React components, custom hooks, auth services &amp; REST API
                    modules
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>15 files</span>
                  <span>.tsx · .ts · .css</span>
                </div>
              </button>

              {/* Rust Crate Starter */}
              <button
                type="button"
                onClick={() => onLoadScenario("rust")}
                data-testid="lobby-load-rust"
                className="group text-left p-3.5 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome hover:border-accent transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-amber-400">
                      Rust · Cargo Crate
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-bold text-slate-100 font-mono truncate">
                    orbit-kv-engine
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    Structs, traits, impl blocks, WAL storage &amp; query parser
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>7 files</span>
                  <span>.rs · Cargo.toml</span>
                </div>
              </button>

              {/* C/C++ Engine Starter */}
              <button
                type="button"
                onClick={() => onLoadScenario("cpp")}
                data-testid="lobby-load-cpp"
                className="group text-left p-3.5 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome hover:border-accent transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-emerald-400">
                      C/C++20 · CMake
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-bold text-slate-100 font-mono truncate">
                    chrono-physics-engine
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    Header/source bridging, SIMD Vec3 math &amp; rigid-body
                    solver
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>8 files</span>
                  <span>.hpp · .cpp · CMake</span>
                </div>
              </button>
            </div>
          </section>

          {/* Section C: Live Polyglot Syntax & Typography Inspector */}
          <section className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Syntax &amp; Typography Preview
                  </h2>
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg surface-raised border border-chrome">
                  {(["rust", "cpp", "ts"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreviewLang(lang)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                        previewLang === lang
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      {lang === "rust"
                        ? "Rust"
                        : lang === "cpp"
                          ? "C++20"
                          : "TS"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-chrome overflow-hidden code-well">
                <div className="px-3 py-1.5 border-b border-subtle flex items-center justify-between text-[11px] font-mono text-slate-400 surface-raised">
                  <span>{activeSnippet.filePath}</span>
                  <span className="text-accent font-semibold">
                    {activeSnippet.label} · {activeFontSizeObj.badge}
                  </span>
                </div>
                <CodeSyntaxHighlighter
                  code={activeSnippet.code}
                  filePath={activeSnippet.filePath}
                  showLineNumbers={true}
                  maxHeightClass="max-h-56"
                />
              </div>
            </div>

            {/* Documentation & Architecture Quick Access Bar */}
            {onOpenDocumentation && (
              <div className="mt-4 pt-4 border-t border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenDocumentation("", "user")}
                  className="p-3 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-100">
                      User Guide &amp; Workflows
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Plain-English guide to every feature &amp; export
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDocumentation("", "developer")}
                  className="p-3 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-100">
                      Developer Architecture Docs
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      AST parsers, Rust N-API engine &amp; security specs
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                </button>
              </div>
            )}
          </section>
        </main>

        {/* ==================== PANE 3: RIGHT STUDIO PREFERENCES & APPEARANCE DOCK (4 cols) ==================== */}
        <aside className="lg:col-span-4 flex flex-col min-h-0 h-full surface-section overflow-y-auto divide-y divide-[var(--border-chrome)]">
          {/* Inspector Header */}
          <div className="p-3.5 surface-header flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Studio Appearance &amp; Typography
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Auto-saved
            </span>
          </div>

          {/* 1. Light / Dark Mode Switch */}
          <div className="p-4">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Appearance Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectAppearance("dark")}
                data-testid="lobby-appearance-dark"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  appearance === "dark"
                    ? "chip-accent"
                    : "surface-card border-chrome text-slate-400 hover:text-slate-100"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Studio</span>
                {appearance === "dark" && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectAppearance("light")}
                data-testid="lobby-appearance-light"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  appearance === "light"
                    ? "chip-accent"
                    : "surface-card border-chrome text-slate-400 hover:text-slate-100"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Paper</span>
                {appearance === "light" && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2. Brand Color Palettes */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-accent" />
                Accent Color Palette
              </span>
              <span className="text-[11px] font-mono text-accent">
                {activeThemeObj.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {APP_THEMES.map((theme) => {
                const isSelected = theme.id === activeThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    data-testid={`lobby-theme-${theme.id}`}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "chip-accent"
                        : "surface-card border-chrome hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md shrink-0 border border-black/20 shadow-sm"
                      style={{ background: swatchBackground(theme) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-accent" : "text-slate-200"
                        }`}
                      >
                        {theme.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {theme.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Font Family Style */}
          <div className="p-4">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-accent" />
              Typography Family
            </span>

            <div className="grid grid-cols-2 gap-2">
              {FONT_STYLE_OPTIONS.map((opt) => {
                const isSelected = opt.id === fontStyle;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectFontStyle(opt.id)}
                    data-testid={`lobby-font-style-${opt.id}`}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "chip-accent"
                        : "surface-card border-chrome hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-accent" : "text-slate-200"
                        }`}
                      >
                        {opt.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Code & UI Font Size Scale */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Editor &amp; UI Font Scale
              </span>
              <span className="text-[11px] font-mono text-accent">
                {activeFontSizeObj.name} ({activeFontSizeObj.badge})
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const isSelected = opt.id === fontSize;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectFontSize(opt.id)}
                    data-testid={`lobby-font-size-${opt.id}`}
                    className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "chip-accent"
                        : "surface-card border-chrome text-slate-300 hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="block text-xs font-bold font-mono">
                      {opt.badge}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {opt.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM NATIVE DESKTOP STATUS BAR (Full-Bleed)                      */}
      {/* ================================================================== */}
      <footer className="surface-header border-t border-chrome px-4 h-7 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-3 min-w-0 truncate">
          <span className="flex items-center gap-1.5 text-slate-300">
            <HardDrive className="w-3 h-3 text-accent" />
            <span>Desktop Workbench Ready</span>
          </span>
          <span>·</span>
          <span className="hidden sm:inline">
            Auto-Shield: node_modules, target, build, .gitignore
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span>
            Theme: <strong className="text-slate-200">{activeThemeObj.name}</strong> ({appearance})
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">
            Font: <strong className="text-slate-200">{activeFontStyleObj.name}</strong> ({activeFontSizeObj.badge})
          </span>
        </div>
      </footer>
    </div>
  );
};
