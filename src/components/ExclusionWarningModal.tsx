import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  FolderMinus,
  Check,
  X,
  FileCode2,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { ExcludedFolderInfo, ProcessedFile } from "../types";

interface ExclusionWarningModalProps {
  isOpen: boolean;
  rootName: string;
  detectedExclusions: ExcludedFolderInfo[];
  totalExcludedFiles: number;
  cleanFiles: ProcessedFile[];
  allRawFiles?: ProcessedFile[];
  onConfirmImport: (
    selectedFiles: ProcessedFile[],
    activeExclusions: ExcludedFolderInfo[],
  ) => void;
  onCancel: () => void;
}

export const ExclusionWarningModal: React.FC<ExclusionWarningModalProps> = ({
  isOpen,
  rootName,
  detectedExclusions,
  totalExcludedFiles,
  cleanFiles,
  allRawFiles = [],
  onConfirmImport,
  onCancel,
}) => {
  // Track which detected folders are checked for exclusion (all checked by default)
  const [excludedFolderNames, setExcludedFolderNames] = useState<Set<string>>(
    () => new Set(detectedExclusions.map((e) => e.name.toLowerCase())),
  );

  // Re-sync the checklist when a different project is scanned while this modal
  // stays mounted (e.g. reviewing exclusions, then importing another folder).
  useEffect(() => {
    setExcludedFolderNames(
      new Set(detectedExclusions.map((e) => e.name.toLowerCase())),
    );
  }, [detectedExclusions]);

  if (!isOpen) return null;

  const toggleExclusion = (name: string) => {
    setExcludedFolderNames((prev) => {
      const next = new Set(prev);
      const lower = name.toLowerCase();
      if (next.has(lower)) {
        next.delete(lower);
      } else {
        next.add(lower);
      }
      return next;
    });
  };

  const handleConfirmClean = () => {
    // If all detected folders are still excluded, use cleanFiles directly
    if (excludedFolderNames.size === detectedExclusions.length) {
      onConfirmImport(cleanFiles, detectedExclusions);
      return;
    }

    // If user unchecked some, filter from allRawFiles
    if (allRawFiles.length > 0) {
      const activeExclusions = detectedExclusions.filter((e) =>
        excludedFolderNames.has(e.name.toLowerCase()),
      );
      const filtered = allRawFiles.filter((file) => {
        const segments = file.pathSegments || file.relativePath.split(/[\\/]/);
        return !segments.some((seg) =>
          excludedFolderNames.has(seg.toLowerCase()),
        );
      });
      onConfirmImport(filtered, activeExclusions);
    } else {
      onConfirmImport(cleanFiles, detectedExclusions);
    }
  };

  const handleIncludeAll = () => {
    if (allRawFiles.length > 0) {
      onConfirmImport(allRawFiles, []);
    } else {
      onConfirmImport(cleanFiles, []);
    }
  };

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === "node_modules" || lower === "vendor") {
      return <Package className="w-4 h-4 text-warn" />;
    }
    if (lower === ".git") {
      return <Layers className="w-4 h-4 text-rose-400" />;
    }
    return <FolderMinus className="w-4 h-4 text-warn" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl surface-card border border-warn rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                <span>Heavy Folders Automatically Excluded</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warn-soft text-warn border border-warn font-semibold uppercase tracking-wider">
                  Notice
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
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-warn-soft border border-warn flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-warn mb-0.5">
                Performance &amp; Cleanliness Protection
              </p>
              We detected{" "}
              <strong className="text-slate-100">
                {detectedExclusions.length} heavy or generated directory(ies)
              </strong>{" "}
              containing roughly{" "}
              <strong className="text-slate-100">
                {totalExcludedFiles.toLocaleString()} files
              </strong>
              . Excluding them prevents browser freezes and keeps your stripped
              files list, structure PDF, and CodeFile Analyzer limited to your
              actual source code.
            </div>
          </div>

          {/* List of detected heavy folders with checkboxes */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Detected folders to exclude (checked = excluded):</span>
              <span>{cleanFiles.length} clean source files ready</span>
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

          {/* Source files preview hint */}
          <div className="p-3 rounded-xl surface-inset border border-subtle flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>
                Importing will include{" "}
                <strong className="text-slate-200">
                  {cleanFiles.length} project source files
                </strong>
                .
              </span>
            </div>
            <span className="text-emerald-400 font-medium">Safe to import</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 surface-raised border-t border-subtle flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleIncludeAll}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Import all files including heavy folders (may cause browser lag)"
          >
            Include Everything (Import All)
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-slate-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmClean}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Import Clean Project ({cleanFiles.length} files)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
