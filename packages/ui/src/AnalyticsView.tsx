import React from "react";
import { BarChart3, AlertTriangle } from "lucide-react";
import { FolderAnalysisStats, ProcessedFile } from "@myproject/core/types";
import { formatBytes } from "@myproject/core/fileHelpers";

interface AnalyticsViewProps {
  stats: FolderAnalysisStats;
  files: ProcessedFile[];
  collisionCount: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  files,
  collisionCount,
}) => {
  const sortedExtensions = Object.entries(stats.extensionCounts).sort(
    ([, a], [, b]) => b.count - a.count,
  );

  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 6);

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] text-slate-100 overflow-y-auto">
      {/* Slim single header row */}
      <div className="surface-header border-b border-chrome px-4 sm:px-5 py-2 flex items-center space-x-2.5">
        <div className="p-1.5 rounded-lg icon-chip border">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <h2 className="text-sm font-semibold text-slate-100">
            Folder Structure Analytics
          </h2>
          <p className="text-[11px] text-slate-500">
            Diagnostic audit of files, depth, collisions and storage weight.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="surface-card border border-chrome p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">
              Total Files Stripped
            </span>
            <span className="text-2xl font-bold text-slate-50 font-mono">
              {stats.totalFiles.toLocaleString()}
            </span>
          </div>

          <div className="surface-card border border-chrome p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">
              Total Subdirectories
            </span>
            <span className="text-2xl font-bold text-slate-50 font-mono">
              {stats.totalFolders.toLocaleString()}
            </span>
          </div>

          <div className="surface-card border border-chrome p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">
              Total Folder Size
            </span>
            <span className="text-2xl font-bold text-slate-50 font-mono">
              {formatBytes(stats.totalSize)}
            </span>
          </div>

          <div className="surface-card border border-chrome p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">
              Max Hierarchy Depth
            </span>
            <span className="text-2xl font-bold text-slate-50 font-mono">
              {stats.maxDepth} levels
            </span>
          </div>
        </div>

        {/* Collision Audit Alert */}
        {collisionCount > 0 ? (
          <div className="p-4 rounded-2xl bg-warn-soft border border-warn flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-warn">
                {collisionCount} Name Collisions Handled
              </h4>
              <p className="text-xs text-warn opacity-80 mt-1 leading-relaxed">
                When flattening all files to the root, multiple files shared
                identical names across different subdirectories. They are
                smoothly auto-disambiguated using your selected strategy so no
                data is lost.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-ok-soft border border-ok text-xs text-ok flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Clean Flat Namespace: Zero file name collisions detected across
              all subfolders.
            </span>
          </div>
        )}

        {/* Grid: Extension Distribution & Largest Files */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Extension Distribution */}
          <div className="surface-card border border-chrome rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>File Extension Breakdown</span>
              <span className="text-[11px] text-slate-500 lowercase font-normal">
                {sortedExtensions.length} unique types
              </span>
            </h3>

            <div className="space-y-3">
              {sortedExtensions.slice(0, 8).map(([ext, data]) => {
                const percent = Math.round(
                  (data.count / stats.totalFiles) * 100,
                );
                return (
                  <div key={ext} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 font-medium">
                        .{ext || "none"}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {data.count} files ({percent}%) •{" "}
                        {formatBytes(data.size)}
                      </span>
                    </div>
                    <div className="w-full surface-inset h-2 rounded-full overflow-hidden border border-subtle">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Largest Files Leaderboard */}
          <div className="surface-card border border-chrome rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Heaviest Files in Archive
            </h3>

            <div className="space-y-2.5">
              {largestFiles.map((file, i) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-xl surface-inset border border-subtle text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full surface-raised flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0 border border-subtle">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <span className="text-slate-200 font-medium block truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate font-mono">
                        {file.relativePath}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-300 font-mono text-xs shrink-0 pl-2">
                    {formatBytes(file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
