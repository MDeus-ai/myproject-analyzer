import React, { useState } from 'react';
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
} from 'lucide-react';
import { ExcludedFolderInfo, ProcessedFile } from '../types';

interface ExclusionWarningModalProps {
  isOpen: boolean;
  rootName: string;
  detectedExclusions: ExcludedFolderInfo[];
  totalExcludedFiles: number;
  cleanFiles: ProcessedFile[];
  allRawFiles?: ProcessedFile[];
  onConfirmImport: (selectedFiles: ProcessedFile[], activeExclusions: ExcludedFolderInfo[]) => void;
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
  const [excludedFolderNames, setExcludedFolderNames] = useState<Set<string>>(() => {
    return new Set(detectedExclusions.map(e => e.name.toLowerCase()));
  });

  if (!isOpen) return null;

  const toggleExclusion = (name: string) => {
    setExcludedFolderNames(prev => {
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
      const activeExclusions = detectedExclusions.filter(e =>
        excludedFolderNames.has(e.name.toLowerCase())
      );
      const filtered = allRawFiles.filter(file => {
        const segments = file.pathSegments || file.relativePath.split(/[\\/]/);
        return !segments.some(seg => excludedFolderNames.has(seg.toLowerCase()));
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
    if (lower === 'node_modules' || lower === 'vendor') {
      return <Package className="w-4 h-4 text-amber-400" />;
    }
    if (lower === '.git') {
      return <Layers className="w-4 h-4 text-rose-400" />;
    }
    return <FolderMinus className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exclusion-modal-title"
      >
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="exclusion-modal-title"
                className="font-bold text-base sm:text-lg text-slate-100 flex items-center space-x-2"
              >
                <span>Heavy Folders Automatically Excluded</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-medium">
                  Notice
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target project: <span className="font-mono text-amber-200 font-semibold">{rootName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel import"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">
                Performance & Cleanliness Protection
              </p>
              We detected <strong className="text-white">{detectedExclusions.length} heavy or generated directory(ies)</strong> containing roughly <strong className="text-white">{totalExcludedFiles.toLocaleString()} files</strong>.
              Excluding them prevents browser crashes and ensures your stripped files list, structure PDF, and CodeFile Analyzer only contain your actual source code.
            </div>
          </div>

          {/* List of detected heavy folders with checkboxes */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Detected Folders to Exclude (Checked = Excluded):</span>
              <span>{cleanFiles.length} clean source files ready</span>
            </div>

            <div className="space-y-2">
              {detectedExclusions.map(folder => {
                const isExcluded = excludedFolderNames.has(folder.name.toLowerCase());

                return (
                  <div
                    key={folder.name}
                    onClick={() => toggleExclusion(folder.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isExcluded
                        ? 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-950/30 border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => toggleExclusion(folder.name)}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                        aria-label={`Exclude ${folder.name}`}
                        onClick={e => e.stopPropagation()}
                      />

                      <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                        {getFolderIcon(folder.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-100">
                            {folder.name}/
                          </span>
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
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
                        <span className="text-amber-400 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Excluded</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Included</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source files preview hint */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>
                Importing will include <strong className="text-slate-200">{cleanFiles.length} project source files</strong>.
              </span>
            </div>
            <span className="text-emerald-400 font-medium">Safe to import</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleIncludeAll}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Import all files including node_modules (may cause browser lag)"
          >
            Include Everything (Import All)
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmClean}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all active:scale-95"
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
