import React, { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  FileArchive,
  FileText,
  Sparkles,
  HelpCircle,
  FolderTree,
  ListFilter,
  BarChart3,
  Download,
  ImageIcon,
  Code2,
  ShieldAlert,
  ChevronDown,
  Network,
  MoreVertical,
} from "lucide-react";
import {
  FolderAnalysisStats,
  ExcludedFolderInfo,
  WorkspaceTab,
} from "@myproject/core/types";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface DesktopHeaderProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  stats: FolderAnalysisStats | null;
  onOpenFolderClick: () => void;
  onLoadSampleClick: () => void;
  onDownloadZipClick: () => void;
  onDownloadPdfClick: () => void;
  onDownloadImageClick?: () => void;
  onHelpClick: () => void;
  onGoHomeClick?: () => void;
  isZipping?: boolean;
  excludedFolders?: ExcludedFolderInfo[];
  onReviewExclusionsClick?: () => void;
}

/* ------------------------------------------------------------------ */
/* Shared outside-click hook for dropdowns                             */
/* ------------------------------------------------------------------ */

function useClickOutside(
  isOpen: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, ref, close]);
}

/* ------------------------------------------------------------------ */
/* Consolidated export menu                                            */
/* ------------------------------------------------------------------ */

interface ExportMenuProps {
  disabled: boolean;
  isZipping?: boolean;
  onZip: () => void;
  onPdf: () => void;
  onImage?: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  disabled,
  isZipping,
  onZip,
  onPdf,
  onImage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(isOpen, ref, () => setIsOpen(false));

  const run = (action?: () => void) => {
    setIsOpen(false);
    action?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Export options"
        className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title={disabled ? "Open a project to enable exports" : "Export options"}
      >
        <Download className="w-3.5 h-3.5 text-slate-400" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-subtle text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Export Project
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => run(onZip)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
            >
              <FileArchive className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-semibold text-slate-200">
                  {isZipping ? "Archiving…" : "Flat ZIP Archive"}
                </span>
                <span className="block text-[10px] text-slate-500">
                  All stripped files at root level
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => run(onPdf)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-semibold text-slate-200">
                  Structure PDF
                </span>
                <span className="block text-[10px] text-slate-500">
                  Vector tree + inventory report
                </span>
              </span>
            </button>

            {onImage && (
              <button
                type="button"
                onClick={() => run(onImage)}
                className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <span className="block text-xs font-semibold text-slate-200">
                    Image (PNG / JPEG)
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    High-res sheet via PDF Architect
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Overflow "More" menu — secondary actions on small screens.          */
/* Below lg, Sample / Help / Review Exclusions / the active-project    */
/* readout live here instead of crowding the header row.               */
/* ------------------------------------------------------------------ */

interface OverflowMenuProps {
  projectName: string | null;
  projectFileCount: number | null;
  excludedCount: number;
  onLoadSample: () => void;
  onReviewExclusions?: () => void;
  onHelp: () => void;
}

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  projectName,
  projectFileCount,
  excludedCount,
  onLoadSample,
  onReviewExclusions,
  onHelp,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(isOpen, ref, () => setIsOpen(false));

  const run = (action?: () => void) => {
    setIsOpen(false);
    action?.();
  };

  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="More actions"
        title="More actions"
        className={`relative p-1.5 rounded-lg border transition-colors ${
          isOpen
            ? "bg-purple-600/15 border-purple-500/40 text-purple-300"
            : "surface-raised border-chrome text-slate-300 hover:text-white"
        }`}
      >
        <MoreVertical className="w-4 h-4" />
        {/* Dot indicator when exclusions need attention */}
        {excludedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-[var(--surface-header)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Active project readout — the header pill is hidden on small
              screens, so mobile users see it here instead. */}
          {projectName && (
            <div className="px-4 py-2.5 border-b border-subtle">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Active Project
              </span>
              <div className="flex items-center space-x-2 text-xs text-slate-300 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono font-medium text-purple-400 truncate">
                  {projectName}
                </span>
                <span className="text-slate-500 shrink-0">•</span>
                <span className="shrink-0">{projectFileCount} files</span>
              </div>
            </div>
          )}

          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => run(onLoadSample)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-semibold text-slate-200">
                  Load Sample Project
                </span>
                <span className="block text-[10px] text-slate-500">
                  Explore the workspace with demo data
                </span>
              </span>
            </button>

            {excludedCount > 0 && onReviewExclusions && (
              <button
                type="button"
                onClick={() => run(onReviewExclusions)}
                className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <span className="block text-xs font-semibold text-warn">
                    Review Exclusions ({excludedCount})
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    Heavy folders kept out of this import
                  </span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => run(onHelp)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-semibold text-slate-200">
                  Shortcuts &amp; Documentation
                </span>
                <span className="block text-[10px] text-slate-500">
                  Keyboard guide and feature overview
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Single-row consolidated header                                      */
/*                                                                     */
/* Layout contract per breakpoint:                                     */
/*   <md    brand(icon) · tab icons (scroll) · Open · Export · More    */
/*   md+    brand(text) · tab labels        · +Theme                   */
/*   lg+    + project pill · +Sample · +Help (overflow menu hidden)    */
/*   xl+    + exclusion pill inline                                    */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "files", label: "Files", icon: ListFilter },
  { id: "tree", label: "Tree", icon: FolderTree },
  { id: "pdf", label: "PDF & Image", icon: FileText },
  { id: "analytics", label: "Stats", icon: BarChart3 },
  { id: "analyzer", label: "Analyzer", icon: Code2 },
  { id: "deplenz", label: "DepLenz", icon: Network },
] as const;

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onOpenFolderClick,
  onLoadSampleClick,
  onDownloadZipClick,
  onDownloadPdfClick,
  onDownloadImageClick,
  onHelpClick,
  onGoHomeClick,
  isZipping,
  excludedFolders,
  onReviewExclusionsClick,
}) => {
  const badgeFor = (id: (typeof TABS)[number]["id"]): string | null => {
    if (!stats) return null;
    if (id === "files") return String(stats.totalFiles);
    if (id === "tree") return `${stats.totalFolders} dirs`;
    return null;
  };

  const excludedCount = excludedFolders?.length ?? 0;

  return (
    <header className="surface-header border-b border-chrome text-slate-200 select-none sticky top-0 z-40">
      {/* ROW 1 — brand + primary actions (constant across all sizes) */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2">
        {/* Brand - clicking returns to homepage */}
        <button
          type="button"
          onClick={onGoHomeClick}
          className="flex items-center space-x-2.5 text-left group hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          title="Go to Homepage"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-600 group-hover:bg-purple-500 flex items-center justify-center text-white shadow-sm transition-colors">
            <FolderTree className="w-4 h-4" />
          </div>
          <span className="hidden sm:block font-semibold text-sm tracking-tight text-slate-100 group-hover:text-purple-300 transition-colors">
            MyProject Analyzer
          </span>
        </button>

        {/* On wide screens the tabs live inline in this row (below). On
            narrow screens this spacer pushes the action cluster right. */}
        <div className="flex-1 min-w-0" />

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Target folder pill (wide screens; mirrored in overflow menu) */}
          {stats && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 surface-raised rounded-full border border-chrome text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-medium text-accent max-w-[140px] truncate">
                {stats.rootName}
              </span>
              <span className="text-slate-500">•</span>
              <span>{stats.totalFiles} files</span>
            </div>
          )}

          {/* Exclusion pill (extra-wide; mirrored in overflow menu) */}
          {excludedCount > 0 && (
            <button
              type="button"
              onClick={onReviewExclusionsClick}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-warn-soft hover:opacity-90 rounded-full border border-warn text-warn text-xs transition-colors cursor-pointer"
              title="Review automatically excluded folders"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">Excluded ({excludedCount})</span>
            </button>
          )}

          {/* Sample + Help: inline on lg+, in the overflow menu below */}
          <button
            type="button"
            onClick={onLoadSampleClick}
            aria-label="Load demo folder"
            className="hidden lg:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-300 transition-colors border border-chrome"
            title="Load sample folder structure"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample</span>
          </button>

          <button
            type="button"
            onClick={onHelpClick}
            aria-label="Help and shortcuts"
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-hover)] transition-colors"
            title="Shortcuts & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Primary CTA — always visible */}
          <button
            type="button"
            onClick={onOpenFolderClick}
            aria-label="Open folder"
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Folder</span>
          </button>

          <ExportMenu
            disabled={!stats}
            isZipping={isZipping}
            onZip={onDownloadZipClick}
            onPdf={onDownloadPdfClick}
            onImage={onDownloadImageClick}
          />

          <ThemeSwitcher />

          {/* Overflow menu — small screens only */}
          <OverflowMenu
            projectName={stats?.rootName ?? null}
            projectFileCount={stats?.totalFiles ?? null}
            excludedCount={excludedCount}
            onLoadSample={onLoadSampleClick}
            onReviewExclusions={onReviewExclusionsClick}
            onHelp={onHelpClick}
          />
        </div>
      </div>

      {/* ROW 2 — full tab bar with labels, own dedicated strip.
          Shown on narrow/medium screens; on wide screens the tabs are
          inline in row 1 instead (see below). */}
      {/* Inline tabs — wide screens only (xl+), where they genuinely fit.
            On narrower screens the dedicated second row above is used. */}
      {/* Tab bar — always rendered: row 2 on narrow screens, inline on xl+ */}
      <nav
        className="flex items-center gap-1 overflow-x-auto scrollbar-none scroll-fade-x px-3 sm:px-5 py-1.5"
        aria-label="Views"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = badgeFor(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              title={tab.label}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border shrink-0 ${
                isActive
                  ? "chip-accent"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{tab.label}</span>
              {badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium border ${
                    isActive
                      ? "bg-accent-soft text-accent border-accent"
                      : "bg-[var(--surface-raised)] text-slate-500 border-subtle"
                  }`}
                >
                  {badge}
                </span>
              )}{" "}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
