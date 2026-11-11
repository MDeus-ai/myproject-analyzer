import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  FolderMinus,
  Check,
  X,
  FileCode2,
  FileMinus,
  Package,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ExcludedFolderInfo, ProcessedFile } from "@myproject/core/types";
import { hydrateTextContent } from "@myproject/core/folderReader";
import { isSecretFile } from "@myproject/core/secretsDetector";

interface GitignoreRemovedEntry {
  file: ProcessedFile;
  pattern: string;
}

interface GitignoreGroup {
  pattern: string;
  files: ProcessedFile[];
  hasSecrets: boolean;
}

/** Cap for the expandable per-rule path list (keeps the DOM small). */
const MAX_LISTED_PATHS = 100;

interface ExclusionWarningModalProps {
  isOpen: boolean;
  rootName: string;
  detectedExclusions: ExcludedFolderInfo[];
  cleanFiles: ProcessedFile[];
  /** Every scanned file — both heavy folders and .gitignore groups are
   *  re-includable from this pool. */
  baseFiles?: ProcessedFile[];
  /** Files removed by .gitignore, each tagged with its rule pattern. */
  gitignoreRemovedFiles?: GitignoreRemovedEntry[];
  onConfirmImport: (
    selectedFiles: ProcessedFile[],
    activeExclusions: ExcludedFolderInfo[],
    gitignoreExcludedCount: number,
  ) => void;
  onCancel: () => void;
}

export const ExclusionWarningModal: React.FC<ExclusionWarningModalProps> = ({
  isOpen,
  rootName,
  detectedExclusions,
  cleanFiles,
  baseFiles = [],
  gitignoreRemovedFiles = [],
  onConfirmImport,
  onCancel,
}) => {
  // Heavy folders: checked = excluded (all checked by default)
  const [excludedFolderNames, setExcludedFolderNames] = useState<Set<string>>(
    () => new Set(detectedExclusions.map((e) => e.name.toLowerCase())),
  );
  // .gitignore rule groups: checked = rule respected / files excluded.
  // Default: all respected — the user wrote those rules intentionally.
  const [excludedGitignorePatterns, setExcludedGitignorePatterns] = useState<
    Set<string>
  >(() => new Set(gitignoreRemovedFiles.map((g) => g.pattern)));
  const [isHydrating, setIsHydrating] = useState(false);

  // Re-sync when a different project is scanned while this modal stays mounted.
  useEffect(() => {
    setExcludedFolderNames(
      new Set(detectedExclusions.map((e) => e.name.toLowerCase())),
    );
  }, [detectedExclusions]);
  useEffect(() => {
    setExcludedGitignorePatterns(
      new Set(gitignoreRemovedFiles.map((g) => g.pattern)),
    );
  }, [gitignoreRemovedFiles]);

  // Group .gitignore removals by rule pattern for display.
  const gitignoreGroups = useMemo<GitignoreGroup[]>(() => {
    const map = new Map<string, ProcessedFile[]>();
    for (const { file, pattern } of gitignoreRemovedFiles) {
      const arr = map.get(pattern) || [];
      arr.push(file);
      map.set(pattern, arr);
    }
    return Array.from(map.entries())
      .map(([pattern, files]) => ({
        pattern,
        files,
        hasSecrets: files.some((f) => isSecretFile(f.name)),
      }))
      .sort((a, b) => b.files.length - a.files.length);
  }, [gitignoreRemovedFiles]);

  // Per-file lookup of which gitignore pattern removed it (for rebuilds).
  const removedPatternByFile = useMemo(() => {
    const map = new Map<ProcessedFile, string>();
    for (const { file, pattern } of gitignoreRemovedFiles) {
      map.set(file, pattern);
    }
    return map;
  }, [gitignoreRemovedFiles]);

  const pool = baseFiles.length > 0 ? baseFiles : cleanFiles;

  // Live computation of exactly what the current checkbox state imports.
  const selectedFiles = useMemo(() => {
    return pool.filter((file) => {
      const segments = file.pathSegments || file.relativePath.split(/[\\/]/);
      if (
        excludedFolderNames.size > 0 &&
        segments.some((seg) => excludedFolderNames.has(seg.toLowerCase()))
      ) {
        return false;
      }
      const pattern = removedPatternByFile.get(file);
      if (pattern && excludedGitignorePatterns.has(pattern)) {
        return false;
      }
      return true;
    });
  }, [
    pool,
    excludedFolderNames,
    excludedGitignorePatterns,
    removedPatternByFile,
  ]);

  if (!isOpen) return null;

  const heavyTotal = detectedExclusions.reduce((s, e) => s + e.fileCount, 0);
  const gitignoreTotal = gitignoreRemovedFiles.length;
  const hasHeavy = detectedExclusions.length > 0;
  const hasGitignore = gitignoreGroups.length > 0;

  const toggleExclusion = (name: string) => {
    setExcludedFolderNames((prev) => {
      const next = new Set(prev);
      const lower = name.toLowerCase();
      if (next.has(lower)) next.delete(lower);
      else next.add(lower);
      return next;
    });
  };

  const toggleGitignorePattern = (pattern: string) => {
    setExcludedGitignorePatterns((prev) => {
      const next = new Set(prev);
      if (next.has(pattern)) next.delete(pattern);
      else next.add(pattern);
      return next;
    });
  };

  const activeGitignoreExcludedCount = gitignoreGroups
    .filter((g) => excludedGitignorePatterns.has(g.pattern))
    .reduce((s, g) => s + g.files.length, 0);

  /**
   * Confirms the current selection. Reads text content for any
   * previously-excluded files now being included (their text was skipped
   * at scan time) so they export with real content.
   */
  const confirmSelection = async (
    filesToImport: ProcessedFile[],
    heavyNames: Set<string>,
    giCount: number,
  ) => {
    const activeExclusions = detectedExclusions.filter((e) =>
      heavyNames.has(e.name.toLowerCase()),
    );
    setIsHydrating(true);
    try {
      await hydrateTextContent(filesToImport);
      onConfirmImport(filesToImport, activeExclusions, giCount);
    } finally {
      setIsHydrating(false);
    }
  };

  const handleConfirm = () => {
    const defaultsUntouched =
      excludedFolderNames.size === detectedExclusions.length &&
      excludedGitignorePatterns.size === gitignoreGroups.length;
    if (defaultsUntouched) {
      onConfirmImport(
        cleanFiles,
        detectedExclusions,
        activeGitignoreExcludedCount,
      );
      return;
    }
    void confirmSelection(
      selectedFiles,
      excludedFolderNames,
      activeGitignoreExcludedCount,
    );
  };

  const handleIncludeAll = () => {
    // Everything in — heavy folders and .gitignore-removed files alike.
    void confirmSelection(pool, new Set(), 0);
  };

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === "node_modules" || lower === "vendor") {
      return <Package className="w-4 h-4 text-warn" />;
    }
    if (lower === ".git") {
      return <Layers className="w-4 h-4 text-warn" />;
    }
    return <FolderMinus className="w-4 h-4 text-warn" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl surface-card border border-warn rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exclusion-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 surface-raised border-b border-subtle flex items-start justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-warn-soft border border-warn text-warn">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="exclusion-modal-title"
                className="font-semibold text-base text-slate-100 flex items-center space-x-2"
              >
                <span>
                  {hasHeavy
                    ? "Review Excluded Items"
                    : "Files Excluded by .gitignore"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warn-soft text-warn border border-warn font-semibold uppercase tracking-wider">
                  Review
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target project:{" "}
                <span className="font-mono text-slate-200 font-semibold">
                  {rootName}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel import"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Explanation Alert — honest, per-category totals */}
          <div className="p-3.5 rounded-xl bg-warn-soft border border-warn flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-warn mb-0.5">
                Nothing is excluded silently
              </p>
              {hasHeavy && (
                <>
                  <strong className="text-slate-100">
                    {detectedExclusions.length} heavy or generated
                    directory(ies)
                  </strong>{" "}
                  (~{heavyTotal.toLocaleString()} files) were auto-excluded to
                  prevent browser freezes.
                </>
              )}{" "}
              {hasGitignore && (
                <>
                  <strong className="text-slate-100">
                    {gitignoreTotal.toLocaleString()} file(s)
                  </strong>{" "}
                  matched rules in your project's{" "}
                  <code className="text-slate-200">.gitignore</code>.
                </>
              )}{" "}
              Every group is listed below with its files — uncheck anything you
              want included.
            </div>
          </div>

          {/* Section 1: Heavy folders */}
          {hasHeavy && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Heavy folders (checked = excluded):</span>
                <span>{selectedFiles.length} files will import</span>
              </div>

              <div className="space-y-2">
                {detectedExclusions.map((folder) => {
                  const isExcluded = excludedFolderNames.has(
                    folder.name.toLowerCase(),
                  );
                  return (
                    <div
                      key={folder.name}
                      onClick={() => toggleExclusion(folder.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isExcluded
                          ? "surface-inset border-warn"
                          : "surface-inset border-subtle opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() => toggleExclusion(folder.name)}
                          className="rounded border-slate-600 bg-transparent text-amber-500 focus:ring-0 cursor-pointer"
                          aria-label={`Exclude ${folder.name}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                          {getFolderIcon(folder.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-slate-100">
                              {folder.name}/
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-warn-soft text-warn font-mono">
                              ~{folder.fileCount.toLocaleString()} items
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {folder.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-[11px] font-medium shrink-0 ml-3">
                        {isExcluded ? (
                          <span className="text-warn flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Excluded</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Included</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: .gitignore rule groups — every removal listed */}
          {hasGitignore && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>
                  .gitignore rules (checked = rule respected, files excluded):
                </span>
                {!hasHeavy && (
                  <span>{selectedFiles.length} files will import</span>
                )}
              </div>

              <div className="space-y-2">
                {gitignoreGroups.map((group) => {
                  const isExcluded = excludedGitignorePatterns.has(
                    group.pattern,
                  );
                  const samples = group.files.slice(0, 3);
                  return (
                    <div
                      key={group.pattern}
                      className={`rounded-xl border transition-all ${
                        isExcluded
                          ? "surface-inset border-warn"
                          : "surface-inset border-subtle opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div
                        onClick={() => toggleGitignorePattern(group.pattern)}
                        className="flex items-center justify-between p-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={() =>
                              toggleGitignorePattern(group.pattern)
                            }
                            className="rounded border-slate-600 bg-transparent text-amber-500 focus:ring-0 cursor-pointer"
                            aria-label={`Respect .gitignore rule ${group.pattern}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                            <FileMinus className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-100">
                                {group.pattern}
                              </span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-warn-soft text-warn font-mono">
                                {group.files.length.toLocaleString()} file
                                {group.files.length !== 1 ? "s" : ""}
                              </span>
                              {group.hasSecrets && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-soft text-danger border border-danger font-semibold">
                                  may contain secrets
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] font-medium shrink-0 ml-3">
                          {isExcluded ? (
                            <span className="text-warn flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Excluded</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Included</span>
                          )}
                        </div>
                      </div>

                      {/* The actual files this rule removed */}
                      <div className="px-3 pb-2.5 -mt-1 space-y-0.5">
                        {samples.map((f) => (
                          <p
                            key={f.id}
                            className="text-[10px] font-mono text-slate-500 truncate pl-9"
                          >
                            {f.relativePath}
                          </p>
                        ))}
                        {group.files.length > 3 && (
                          <details className="pl-9">
                            <summary className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer select-none">
                              +{group.files.length - 3} more…
                            </summary>
                            <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto pr-2">
                              {group.files
                                .slice(3, MAX_LISTED_PATHS)
                                .map((f) => (
                                  <p
                                    key={f.id}
                                    className="text-[10px] font-mono text-slate-500 truncate"
                                  >
                                    {f.relativePath}
                                  </p>
                                ))}
                              {group.files.length > MAX_LISTED_PATHS && (
                                <p className="text-[10px] text-slate-600 italic">
                                  …and{" "}
                                  {(
                                    group.files.length - MAX_LISTED_PATHS
                                  ).toLocaleString()}{" "}
                                  more
                                </p>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import summary hint */}
          <div className="p-3 rounded-xl surface-inset border border-subtle flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <FileCode2 className="w-4 h-4 text-slate-400" />
              <span>
                Importing will include{" "}
                <strong className="text-slate-200">
                  {selectedFiles.length} project files
                </strong>
                .
              </span>
            </div>
            <span className="text-ok font-medium">Safe to import</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 surface-raised border-t border-subtle flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleIncludeAll}
            disabled={isHydrating}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Import every scanned file, including heavy folders and .gitignore-removed files. May cause browser lag."
          >
            Include everything ({pool.length.toLocaleString()} files)
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isHydrating}
              className="px-4 py-2 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isHydrating}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60"
            >
              {isHydrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reading file contents…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Import Project ({selectedFiles.length} files)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
