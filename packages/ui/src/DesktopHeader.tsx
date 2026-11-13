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
  Check,
  Layers,
  BookOpen,
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
  onDocsClick?: () => void;
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
        className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
          isOpen ? "border-accent text-accent" : ""
        }`}
        title={disabled ? "Open a project to enable exports" : "Export options"}
      >
        <Download className="w-3.5 h-3.5 text-accent" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-subtle text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Export Project
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => run(onZip)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
            >
              <FileArchive className="w-4 h-4 text-accent shrink-0 mt-0.5" />
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
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
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
                className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
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
/* Workspace Views Definitions                                         */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    id: "files",
    label: "Files",
    description: "Flattened file list & collision resolver",
    icon: ListFilter,
  },
  {
    id: "tree",
    label: "Tree",
    description: "Interactive folder hierarchy explorer",
    icon: FolderTree,
  },
  {
    id: "pdf",
    label: "PDF & Image",
    description: "Vector blueprint & high-res sheet exporter",
    icon: FileText,
  },
  {
    id: "analytics",
    label: "Stats",
    description: "Language distribution & size telemetry",
    icon: BarChart3,
  },
  {
    id: "analyzer",
    label: "Analyzer",
    description: "Multi-file code bundle & token estimator",
    icon: Code2,
  },
  {
    id: "deplenz",
    label: "DepLenz",
    description: "Dependency graph, surgical prompt & evolution log",
    icon: Network,
  },
] as const;

type TabItem = (typeof TABS)[number];

/* ------------------------------------------------------------------ */
/* Theme-styled View Overflow Dropdown ("More Views" / View Switcher)  */
/* Ensures the toolbar NEVER wraps to a second row at any width.       */
/* ------------------------------------------------------------------ */

interface ViewsOverflowDropdownProps {
  overflowTabs: readonly TabItem[];
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  badgeFor: (id: WorkspaceTab) => string | null;
  allCollapsed: boolean;
}

const ViewsOverflowDropdown: React.FC<ViewsOverflowDropdownProps> = ({
  overflowTabs,
  activeTab,
  setActiveTab,
  badgeFor,
  allCollapsed,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(isOpen, ref, () => setIsOpen(false));

  if (overflowTabs.length === 0) return null;

  const activeInOverflow = overflowTabs.find((t) => t.id === activeTab);
  const ActiveIcon = activeInOverflow?.icon ?? Layers;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={allCollapsed ? "Switch workspace view" : "More workspace views"}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border cursor-pointer ${
          activeInOverflow || isOpen
            ? "chip-accent"
            : "surface-raised border-chrome text-slate-300 hover:text-slate-100 hover:bg-[var(--surface-raised-hover)]"
        }`}
      >
        <ActiveIcon className="w-3.5 h-3.5 shrink-0" />
        <span>
          {activeInOverflow
            ? activeInOverflow.label
            : allCollapsed
              ? "Views"
              : `More (${overflowTabs.length})`}
        </span>
        {activeInOverflow && badgeFor(activeInOverflow.id) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium bg-accent-soft text-accent border border-accent">
            {badgeFor(activeInOverflow.id)}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Workspace views"
          className="absolute left-0 top-full mt-2 w-68 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          <div className="px-4 py-2 border-b border-subtle text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace Views
          </div>
          <div className="p-1.5 space-y-0.5">
            {overflowTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              const badge = badgeFor(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "chip-accent border"
                      : "border border-transparent hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span className="flex items-start gap-2.5 min-w-0 flex-1">
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isSelected ? "text-accent" : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-xs font-semibold truncate ${
                          isSelected ? "text-accent" : "text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate">
                        {tab.description}
                      </span>
                    </span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          isSelected
                            ? "bg-accent-soft text-accent"
                            : "surface-raised text-slate-400"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Overflow "More" menu — secondary actions when horizontal width      */
/* doesn't fit every auxiliary button inline.                          */
/* ------------------------------------------------------------------ */

interface OverflowMenuProps {
  projectName: string | null;
  projectFileCount: number | null;
  excludedCount: number;
  onLoadSample: () => void;
  onReviewExclusions?: () => void;
  onDocs?: () => void;
  onHelp: () => void;
}

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  projectName,
  projectFileCount,
  excludedCount,
  onLoadSample,
  onReviewExclusions,
  onDocs,
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
    <div ref={ref} className="relative xl:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="More actions"
        title="More actions"
        className={`relative p-1.5 rounded-lg border transition-colors cursor-pointer ${
          isOpen
            ? "chip-accent"
            : "surface-raised border-chrome text-slate-300 hover:text-slate-100 hover:bg-[var(--surface-raised-hover)]"
        }`}
      >
        <MoreVertical className="w-4 h-4" />
        {excludedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-[var(--surface-header)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {projectName && (
            <div className="px-4 py-2.5 border-b border-subtle">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Active Project
              </span>
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 min-w-0">
                <span className="font-mono font-semibold text-accent truncate">
                  {projectName}
                </span>
                <span className="text-slate-500 shrink-0">·</span>
                <span className="shrink-0 font-mono tabular-nums">
                  {projectFileCount} files
                </span>
              </div>
            </div>
          )}

          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => run(onLoadSample)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
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
                className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
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

            {onDocs && (
              <button
                type="button"
                onClick={() => run(onDocs)}
                className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  <span className="block text-xs font-semibold text-slate-200">
                    Full Documentation &amp; Search
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    User guide &amp; technical developer deep dive
                  </span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => run(onHelp)}
              className="w-full flex items-start space-x-3 p-2 rounded-xl hover:bg-[var(--surface-hover)] text-left transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-semibold text-slate-200">
                  Keyboard Shortcuts
                </span>
                <span className="block text-[10px] text-slate-500">
                  Quick shortcut reference drawer
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
/* Strictly Single-Row Consolidated Desktop Toolbar                    */
/*                                                                     */
/* Dynamically measures width via ResizeObserver so tabs sit inline    */
/* in the single header row and overflow gracefully into a theme-      */
/* styled dropdown when the window narrows — NEVER creating a 2nd row. */
/* ------------------------------------------------------------------ */

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
  onDocsClick,
  onGoHomeClick,
  isZipping,
  excludedFolders,
  onReviewExclusionsClick,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const [visibleTabCount, setVisibleTabCount] = useState<number>(TABS.length);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateVisibleCount = (width: number) => {
      if (width >= 1560) {
        setVisibleTabCount(TABS.length); // All 6 inline on ultra-wide
      } else if (width >= 1320) {
        setVisibleTabCount(4); // 4 inline + More (2) on standard desktop (1440px)
      } else if (width >= 1100) {
        setVisibleTabCount(3); // 3 inline + More (3)
      } else if (width >= 860) {
        setVisibleTabCount(2); // 2 inline + More (4)
      } else {
        setVisibleTabCount(0); // Single compact "Views" dropdown
      }
    };

    updateVisibleCount(el.clientWidth || window.innerWidth);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          updateVisibleCount(entry.contentRect.width);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const badgeFor = (id: WorkspaceTab): string | null => {
    if (!stats) return null;
    if (id === "files") return String(stats.totalFiles);
    if (id === "tree") return `${stats.totalFolders} dirs`;
    return null;
  };

  const excludedCount = excludedFolders?.length ?? 0;
  const inlineTabs = TABS.slice(0, visibleTabCount);
  const overflowTabs = TABS.slice(visibleTabCount);

  return (
    <header
      ref={headerRef}
      className="surface-header border-b border-chrome text-slate-200 select-none sticky top-0 z-40"
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-12">
        {/* Brand - clicking returns to homepage / lobby */}
        <button
          type="button"
          onClick={onGoHomeClick}
          className="flex items-center space-x-2 text-left group hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          title="Return to Home / Lobby"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-600 group-hover:bg-purple-500 flex items-center justify-center text-white shadow-sm transition-colors">
            <FolderTree className="w-4 h-4" />
          </div>
          <span className="hidden sm:block font-semibold text-sm tracking-tight text-slate-100 group-hover:text-accent transition-colors whitespace-nowrap">
            MyProject Analyzer
          </span>
        </button>

        {/* Subtle divider separating brand from inline view tabs */}
        <div
          className="h-5 w-px bg-[var(--border-chrome)] shrink-0"
          aria-hidden="true"
        />

        {/* Inline View Tabs + Overflow Dropdown (Strictly Single Row) */}
        <nav
          className="flex items-center gap-1 min-w-0 flex-1"
          aria-label="Views"
        >
          {inlineTabs.map((tab) => {
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
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                  isActive
                    ? "chip-accent"
                    : "text-slate-400 border-transparent hover:text-slate-100 hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-medium tabular-nums border ${
                      isActive
                        ? "bg-accent-soft text-accent border-accent"
                        : "surface-raised text-slate-400 border-subtle"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          <ViewsOverflowDropdown
            overflowTabs={overflowTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            badgeFor={badgeFor}
            allCollapsed={visibleTabCount === 0}
          />
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active folder readout (wide screens; mirrored in overflow menu) */}
          {stats && (
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 surface-raised rounded-lg border border-chrome text-xs text-slate-300">
              <span className="font-mono font-semibold text-accent max-w-[130px] truncate">
                {stats.rootName}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono tabular-nums text-slate-300">
                {stats.totalFiles} files
              </span>
            </div>
          )}

          {/* Exclusion warning button (extra-wide; mirrored in overflow menu) */}
          {excludedCount > 0 && (
            <button
              type="button"
              onClick={onReviewExclusionsClick}
              className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1 bg-warn-soft hover:opacity-90 rounded-lg border border-warn text-warn text-xs transition-colors cursor-pointer"
              title="Review automatically excluded folders"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-warn" />
              <span className="font-mono">Excluded ({excludedCount})</span>
            </button>
          )}

          {/* Sample + Help: inline on xl+, in the overflow menu below xl */}
          <button
            type="button"
            onClick={onLoadSampleClick}
            aria-label="Load demo folder"
            className="hidden xl:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 transition-colors border border-chrome cursor-pointer"
            title="Load sample folder structure"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample</span>
          </button>

          {onDocsClick && (
            <button
              type="button"
              onClick={onDocsClick}
              aria-label="Open full documentation"
              className="hidden lg:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 transition-colors border border-chrome cursor-pointer"
              title="Open searchable User Guide & Technical Documentation"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Docs</span>
            </button>
          )}

          <button
            type="button"
            onClick={onHelpClick}
            aria-label="Help and shortcuts"
            className="hidden xl:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Primary CTA — always visible */}
          <button
            type="button"
            onClick={onOpenFolderClick}
            aria-label="Open folder"
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
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

          {/* Overflow menu — below xl */}
          <OverflowMenu
            projectName={stats?.rootName ?? null}
            projectFileCount={stats?.totalFiles ?? null}
            excludedCount={excludedCount}
            onLoadSample={onLoadSampleClick}
            onReviewExclusions={onReviewExclusionsClick}
            onDocs={onDocsClick}
            onHelp={onHelpClick}
          />
        </div>
      </div>
    </header>
  );
};
