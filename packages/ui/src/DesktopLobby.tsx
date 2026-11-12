import React, { useState, useCallback, useEffect } from "react";
import {
  FolderOpen,
  Sparkles,
  Clock,
  Pin,
  Trash2,
  Palette,
  Type,
  Sun,
  Moon,
  Check,
  ArrowRight,
  Cpu,
  Layers,
  Code2,
  GitCommit,
  Compass,
  Upload,
  Terminal,
  ShieldCheck,
  Search,
  Sliders,
  BookOpen,
} from "lucide-react";
import {
  FolderScanResult,
} from "@myproject/core/types";
import {
  readDroppedEntries,
  ScanProgress,
} from "@myproject/core/folderReader";
import { SampleScenarioId } from "@myproject/core/sampleProject";
import { formatBytes } from "@myproject/core/fileHelpers";
import {
  APP_THEMES,
  AppearanceMode,
  FONT_STYLE_OPTIONS,
  FONT_SIZE_OPTIONS,
  FontStyleId,
  FontSizeScale,
  ProjectHistoryEntry,
  applyTheme,
  applyAppearance,
  applyTypographySettings,
  getActiveThemeId,
  getSavedAppearance,
  getSavedFontStyle,
  getSavedFontSize,
  loadProjectHistory,
  togglePinProjectInHistory,
  removeProjectFromHistory,
  swatchBackground,
} from "@myproject/core/themes";
import { CodeSyntaxHighlighter } from "./CodeSyntaxHighlighter";

export interface DesktopLobbyProps {
  onScanResult: (result: FolderScanResult) => void;
  onOpenFolderPicker: () => void;
  onLoadScenario: (scenarioId: SampleScenarioId) => void;
  onLoadHistoryEntry: (entry: ProjectHistoryEntry) => void;
  onScanProgress?: (progress: ScanProgress | null) => void;
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
    label: "Rust (engine.rs)",
    filePath: "src/engine.rs",
    code: `use crate::storage::{MemTable, StorageBackend};

pub struct KvEngine {
    memtable: MemTable,
    ops_count: u64,
}

impl KvEngine {
    pub fn set(&mut self, key: &str, value: &[u8]) -> Result<u64, String> {
        // Append mutation & increment sequence counter
        self.ops_count += 1;
        self.memtable.put(key.to_string(), value.to_vec())?;
        Ok(self.ops_count)
    }
}`,
  },
  cpp: {
    label: "C++20 (world.cpp)",
    filePath: "src/world.cpp",
    code: `#include "world.hpp"
#include <cmath>

namespace chrono {

void PhysicsWorld::stepSimulation(double dt) {
    // Symplectic Euler integration across rigid bodies
    for (auto& body : m_bodies) {
        if (body.invMass <= 0.0) continue;
        body.velocity = body.velocity + (m_gravity * dt);
        body.position = body.position + (body.velocity * dt);
    }
}

} // namespace chrono`,
  },
  ts: {
    label: "TypeScript (useAuth.ts)",
    filePath: "src/hooks/useAuth.ts",
    code: `import { verifySessionToken, SessionUser } from "../services/auth";

export async function authenticateWorkspace(
  token: string,
): Promise<SessionUser | null> {
  // Validate bearer credentials & hydrate permissions
  const session = await verifySessionToken(token);
  return session.isValid ? session.user : null;
}`,
  },
};

function formatRelativeTimestamp(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 45_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const DesktopLobby: React.FC<DesktopLobbyProps> = ({
  onScanResult,
  onOpenFolderPicker,
  onLoadScenario,
  onLoadHistoryEntry,
  onScanProgress,
  onSwitchToClassicGuide,
  activeProjectName,
  activeFileCount = 0,
  onReturnToWorkspace,
}) => {
  // History state
  const [historyEntries, setHistoryEntries] = useState<ProjectHistoryEntry[]>(
    () => loadProjectHistory(),
  );
  const [historyQuery, setHistoryQuery] = useState("");
  const [stackFilter, setStackFilter] = useState<
    "all" | "web" | "rust" | "cpp"
  >("all");

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  // Settings state
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
  const [previewLang, setPreviewLang] = useState<"rust" | "cpp" | "ts">("rust");
  const [rightPanelTab, setRightPanelTab] = useState<
    "appearance" | "typography"
  >("appearance");

  // Refresh history whenever lobby mounts
  useEffect(() => {
    setHistoryEntries(loadProjectHistory());
  }, []);

  const handleSelectTheme = (id: string) => {
    applyTheme(id);
    setActiveThemeId(id);
  };

  const handleSelectAppearance = (mode: AppearanceMode) => {
    applyAppearance(mode);
    setAppearance(mode);
  };

  const handleSelectFontStyle = (styleId: FontStyleId) => {
    setFontStyle(styleId);
    applyTypographySettings(styleId, fontSize);
  };

  const handleSelectFontSize = (sizeScale: FontSizeScale) => {
    setFontSize(sizeScale);
    applyTypographySettings(fontStyle, sizeScale);
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistoryEntries(togglePinProjectInHistory(id));
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistoryEntries(removeProjectFromHistory(id));
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
    if (stackFilter !== "all" && entry.stackKind !== stackFilter) {
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col bg-[var(--app-bg)] text-slate-100 select-none overflow-y-auto"
    >
      {/* Top Desktop Command Header */}
      <header className="surface-header border-b border-chrome px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shadow-inner">
            <Terminal className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold tracking-tight text-slate-100 font-display">
                MyProject Analyzer
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono font-semibold text-purple-300 uppercase tracking-wider">
                Desktop Command Lobby
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <Cpu className="w-3 h-3" />
                Web · Rust · C/C++20 AST
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Polyglot architecture visualizer, token-efficient evolution logs,
              and surgical LLM workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeFileCount > 0 && onReturnToWorkspace && (
            <button
              type="button"
              onClick={onReturnToWorkspace}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>
                Resume {activeProjectName} ({activeFileCount})
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onSwitchToClassicGuide && (
            <button
              type="button"
              onClick={onSwitchToClassicGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-elevated hover:bg-[var(--surface-hover)] border border-chrome text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors cursor-pointer"
              title="View full feature overview & architecture guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Product Tour</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFolderPicker}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open Project Folder</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Desktop Lobby Grid */}
      <div className="max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* ==================== LEFT/CENTER: WORKSPACE LAUNCHPAD & PROJECT HISTORY (7 cols) ==================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Quick Open / Drag & Drop + Multi-Language Reference Starters */}
          <section
            className={`rounded-2xl border transition-all p-5 ${
              isDragging
                ? "border-purple-400 bg-purple-950/30 shadow-xl"
                : "border-chrome surface-card"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-chrome/70">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">
                    Open or Drop Any Codebase Folder
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Drag a folder anywhere into this window or browse from disk.
                    Heavy folders (<code className="font-mono">node_modules</code>,{" "}
                    <code className="font-mono">target</code>,{" "}
                    <code className="font-mono">build</code>) and{" "}
                    <code className="font-mono">.gitignore</code> rules are
                    filtered automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFolderPicker}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shrink-0 shadow-sm cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Disk…</span>
              </button>
            </div>

            {dropError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-danger-soft border border-danger text-xs text-danger">
                {dropError}
              </div>
            )}

            {/* Multi-Language Sample Codebases */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Instant Polyglot Reference Workspaces
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any stack to inspect its AST & dependency graph
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Web Dev Starter */}
                <button
                  type="button"
                  onClick={() => onLoadScenario("web")}
                  data-testid="lobby-load-web"
                  className="group text-left p-3 rounded-xl surface-elevated hover:bg-[var(--surface-hover)] border border-chrome hover:border-purple-500/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30">
                        Web Dev · TS/React
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs font-bold text-slate-100 font-mono truncate">
                      acme-saas-platform
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      React components, hooks, auth services & REST API modules
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-chrome/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>15 files</span>
                    <span>.tsx · .ts · .css</span>
                  </div>
                </button>

                {/* Rust Starter */}
                <button
                  type="button"
                  onClick={() => onLoadScenario("rust")}
                  data-testid="lobby-load-rust"
                  className="group text-left p-3 rounded-xl surface-elevated hover:bg-[var(--surface-hover)] border border-chrome hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
                        Rust Cargo Crate
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs font-bold text-slate-100 font-mono truncate">
                      orbit-kv-engine
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Structs, traits, impl methods, WAL & TCP query router
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-chrome/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>7 files</span>
                    <span>.rs · Cargo.toml</span>
                  </div>
                </button>

                {/* C++20 Starter */}
                <button
                  type="button"
                  onClick={() => onLoadScenario("cpp")}
                  data-testid="lobby-load-cpp"
                  className="group text-left p-3 rounded-xl surface-elevated hover:bg-[var(--surface-hover)] border border-chrome hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        C/C++20 Native
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs font-bold text-slate-100 font-mono truncate">
                      chrono-physics-engine
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      Header/impl bridging, classes, Vec3 math & spatial solver
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-chrome/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>7 files</span>
                    <span>.cpp · .hpp · CMake</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Previously Loaded Projects History */}
          <section className="rounded-2xl border border-chrome surface-card p-5 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  Recent & Pinned Projects History
                </h2>
                <span className="px-2 py-0.5 rounded-md surface-elevated border border-chrome text-[11px] font-mono text-slate-400">
                  {filteredHistory.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Stack Filter Tabs */}
                <div className="flex items-center rounded-lg surface-elevated border border-chrome p-0.5 text-[11px]">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "web", label: "Web" },
                      { id: "rust", label: "Rust" },
                      { id: "cpp", label: "C/C++" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStackFilter(tab.id)}
                      className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        stackFilter === tab.id
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search History */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Filter history…"
                    className="pl-8 pr-2.5 py-1 rounded-lg surface-input border text-xs text-slate-200 placeholder-slate-500 w-36 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border border-dashed border-chrome rounded-xl">
                <Clock className="w-7 h-7 text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-300">
                  No matching projects in history
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Open any folder from disk or click one of the reference
                  stacks above to populate your workspace history.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((entry) => {
                  const stackBadgeClass =
                    entry.stackKind === "rust"
                      ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                      : entry.stackKind === "cpp"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                        : entry.stackKind === "web"
                          ? "bg-sky-950/60 text-sky-300 border-sky-500/30"
                          : "bg-purple-950/60 text-purple-300 border-purple-500/30";

                  return (
                    <div
                      key={entry.id}
                      data-testid={`history-project-${entry.name}`}
                      className="group flex items-center justify-between gap-3 p-3 rounded-xl surface-elevated hover:bg-[var(--surface-hover)] border border-chrome hover:border-purple-500/40 transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => onLoadHistoryEntry(entry)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-600/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Code2 className="w-4 h-4 text-purple-300" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold font-mono text-slate-100 truncate">
                              {entry.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${stackBadgeClass}`}
                            >
                              {entry.stackLabel}
                            </span>
                            {entry.pinned && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-600/20 text-purple-300 border border-purple-500/30">
                                Pinned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                            <span>{entry.fileCount} files</span>
                            <span>·</span>
                            <span>{formatBytes(entry.totalSize)}</span>
                            <span>·</span>
                            <span>
                              {formatRelativeTimestamp(entry.lastOpenedAt)}
                            </span>
                            {entry.topExtensions.length > 0 && (
                              <>
                                <span className="hidden sm:inline">·</span>
                                <span className="hidden sm:inline text-slate-500">
                                  {entry.topExtensions.slice(0, 4).join(" ")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, entry.id)}
                          title={
                            entry.pinned ? "Unpin project" : "Pin to top"
                          }
                          aria-label={`${entry.pinned ? "Unpin" : "Pin"} ${entry.name}`}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            entry.pinned
                              ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                              : "border-transparent text-slate-500 hover:text-slate-200 hover:bg-[var(--surface-card)]"
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistory(e, entry.id)}
                          title="Remove from history"
                          aria-label={`Remove ${entry.name} from history`}
                          className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-rose-400 hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onLoadHistoryEntry(entry)}
                          className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Feature Highlights Strip at bottom of left column */}
            <div className="mt-5 pt-4 border-t border-chrome/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="flex items-start gap-2 p-2.5 rounded-xl surface-elevated border border-chrome/60">
                <Compass className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    DepLenz Subsystems
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    Visualizes structs, traits, C++ headers & module clusters
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-xl surface-elevated border border-chrome/60">
                <GitCommit className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    Evolution Handover Log
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    ~20-token delta ledger for multi-LLM session handovers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-xl surface-elevated border border-chrome/60">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    5-Stage Smart Paste
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    Verifies syntax, imports, call sites & line diffs before apply
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ==================== RIGHT: DESKTOP SETTINGS & LIVE CODE PREVIEW (5 cols) ==================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="rounded-2xl border border-chrome surface-card p-5 flex flex-col gap-5">
            {/* Settings Header & Sub-tab switcher */}
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-chrome/70">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  Studio Preferences & Typography
                </h2>
              </div>

              <div className="flex items-center rounded-lg surface-elevated border border-chrome p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("appearance")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rightPanelTab === "appearance"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme & Palette</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("typography")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    rightPanelTab === "typography"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Fonts & Size</span>
                </button>
              </div>
            </div>

            {rightPanelTab === "appearance" ? (
              <div className="space-y-4">
                {/* Dark / Light Mode */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Surface Appearance
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAppearance("dark")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        appearance === "dark"
                          ? "bg-purple-600/20 border-purple-500 text-slate-100 shadow-sm"
                          : "surface-elevated border-chrome text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark Studio</span>
                      {appearance === "dark" && (
                        <Check className="w-3.5 h-3.5 text-purple-400 ml-auto" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAppearance("light")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        appearance === "light"
                          ? "bg-purple-600/20 border-purple-500 text-slate-100 shadow-sm"
                          : "surface-elevated border-chrome text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Daylight Paper</span>
                      {appearance === "light" && (
                        <Check className="w-3.5 h-3.5 text-purple-400 ml-auto" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Color Palette Swatches */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Accent Color Palette
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {APP_THEMES.map((theme) => {
                      const isSelected = theme.id === activeThemeId;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => handleSelectTheme(theme.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-600/15 border-purple-500 text-slate-100"
                              : "surface-elevated border-chrome text-slate-300 hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-lg shrink-0 border border-white/20 shadow-inner flex items-center justify-center"
                            style={{ background: swatchBackground(theme) }}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white drop-shadow" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">
                              {theme.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {theme.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Font Family Selector */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Interface & Workspace Font Style
                  </label>
                  <div className="space-y-2">
                    {FONT_STYLE_OPTIONS.map((opt) => {
                      const isSelected = opt.id === fontStyle;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectFontStyle(opt.id)}
                          className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-600/15 border-purple-500 text-slate-100"
                              : "surface-elevated border-chrome text-slate-300 hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold">{opt.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {opt.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font & Code Size Scaling */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Code & Inspector Font Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {FONT_SIZE_OPTIONS.map((opt) => {
                      const isSelected = opt.id === fontSize;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectFontSize(opt.id)}
                          className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-600/20 border-purple-500 text-slate-100"
                              : "surface-elevated border-chrome text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className="text-xs font-bold">{opt.name}</span>
                          <span className="text-[10px] font-mono text-purple-300 mt-0.5">
                            {opt.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Live Syntax-Highlighted Code Preview */}
            <div className="pt-3 border-t border-chrome/70">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Live Syntax & Font Preview
                </span>

                <div className="flex items-center rounded-lg surface-elevated border border-chrome p-0.5 text-[10px] font-mono">
                  {(["rust", "cpp", "ts"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreviewLang(lang)}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        previewLang === lang
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
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

              <div className="rounded-xl border border-chrome overflow-hidden surface-deep">
                <div className="px-3 py-1.5 border-b border-chrome/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{activeSnippet.filePath}</span>
                  <span className="text-purple-300">{activeSnippet.label}</span>
                </div>
                <CodeSyntaxHighlighter
                  code={activeSnippet.code}
                  filePath={activeSnippet.filePath}
                  showLineNumbers={true}
                  maxHeightClass="max-h-52"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
