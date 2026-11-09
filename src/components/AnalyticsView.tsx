import React from 'react';
import {
  BarChart3,
  HardDrive,
  FileText,
  FolderTree,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { FolderAnalysisStats, ProcessedFile } from '../types';
import { formatBytes } from '../utils/fileHelpers';

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
  // Sort extensions by count
  const sortedExtensions = Object.entries(stats.extensionCounts).sort(
    ([, a], [, b]) => b.count - a.count
  );

  // Top 5 largest files
  const largestFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 6);

  // Deepest directory paths
  const deepestFiles = [...files]
    .sort((a, b) => b.pathSegments.length - a.pathSegments.length)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <span>Folder Structure Analytics & Metrics</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Deep diagnostic audit of files, hierarchy depth, duplicate collisions, and storage weight.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Files Stripped</span>
          <span className="text-2xl font-bold text-blue-400 font-mono">
            {stats.totalFiles.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Subdirectories</span>
          <span className="text-2xl font-bold text-indigo-400 font-mono">
            {stats.totalFolders.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Folder Size</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            {formatBytes(stats.totalSize)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Max Hierarchy Depth</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">
            {stats.maxDepth} levels
          </span>
        </div>
      </div>

      {/* Collision Audit Alert */}
      {collisionCount > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-600/30 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-amber-300">
              {collisionCount} Name Collisions Handled
            </h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              When flattening all files to the root, multiple files shared identical names across
              different subdirectories. They are smoothly auto-disambiguated using your selected
              strategy so no data is lost.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-600/20 text-xs text-emerald-300 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Clean Flat Namespace: Zero file name collisions detected across all subfolders.</span>
        </div>
      )}

      {/* Grid: Extension Distribution & Largest Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extension Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>File Extension Breakdown</span>
            <span className="text-[11px] text-slate-500 lowercase font-normal">
              {sortedExtensions.length} unique types
            </span>
          </h3>

          <div className="space-y-3">
            {sortedExtensions.slice(0, 8).map(([ext, data]) => {
              const percent = Math.round((data.count / stats.totalFiles) * 100);
              return (
                <div key={ext} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 font-medium">
                      .{ext || 'none'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {data.count} files ({percent}%) • {formatBytes(data.size)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Largest Files Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
            Heaviest Files in Archive
          </h3>

          <div className="space-y-2.5">
            {largestFiles.map((file, i) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0">
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
  );
};
