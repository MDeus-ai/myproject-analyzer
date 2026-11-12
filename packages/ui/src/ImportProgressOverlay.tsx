
import React from "react";
import { Loader2, FolderInput } from "lucide-react";
import { ScanProgress } from "@myproject/core/folderReader";

interface ImportProgressOverlayProps {
  progress: ScanProgress;
}

/**
 * Full-screen progress indicator shown while a project folder is being
 * scanned and read into memory. Gives clear feedback for large projects:
 * phase label, live file counter, current file name and a progress bar.
 */
export const ImportProgressOverlay: React.FC<ImportProgressOverlayProps> = ({
  progress,
}) => {
  const { phase, processed, total, currentFile } = progress;
  const percent =
    total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 rounded-2xl surface-card border border-chrome shadow-2xl p-6"
        role="status"
        aria-live="polite"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            {phase === "scanning" ? (
              <FolderInput className="w-5 h-5 animate-pulse" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              {phase === "scanning"
                ? "Scanning folder structure…"
                : "Importing project files…"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {phase === "scanning"
                ? "Walking the directory tree and checking for heavy folders."
                : "Reading file contents and building metadata."}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--surface-inset)] border border-subtle overflow-hidden mb-2.5">
          {percent !== null ? (
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-150"
              style={{ width: `${percent}%` }}
            />
          ) : (
            <div className="h-full w-1/3 bg-purple-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Counts */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
          <span>
            {phase === "scanning" ? (
              <span>
                <strong className="text-slate-200">
                  {processed.toLocaleString()}
                </strong>{" "}
                files found
              </span>
            ) : (
              <span>
                <strong className="text-slate-200">
                  {processed.toLocaleString()}
                </strong>
                {" / "}
                {total.toLocaleString()} files
              </span>
            )}
          </span>
          {percent !== null && (
            <span className="text-purple-400 font-semibold">{percent}%</span>
          )}
        </div>

        {/* Current file */}
        {currentFile && (
          <p
            className="text-[11px] font-mono text-slate-500 truncate"
            title={currentFile}
          >
            {currentFile}
          </p>
        )}

        <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-subtle">
          Everything is read locally in your browser — nothing is uploaded.
        </p>
      </div>
    </div>
  );
};
