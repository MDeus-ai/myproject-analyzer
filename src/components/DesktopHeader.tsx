import React from 'react';
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
} from 'lucide-react';
import { FolderAnalysisStats } from '../types';

interface DesktopHeaderProps {
  activeTab: 'files' | 'tree' | 'pdf' | 'analytics' | 'analyzer';
  setActiveTab: (tab: 'files' | 'tree' | 'pdf' | 'analytics' | 'analyzer') => void;
  stats: FolderAnalysisStats | null;
  onOpenFolderClick: () => void;
  onLoadSampleClick: () => void;
  onDownloadZipClick: () => void;
  onDownloadPdfClick: () => void;
  onDownloadImageClick?: () => void;
  onHelpClick: () => void;
  isZipping?: boolean;
}

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
  isZipping,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-200 select-none sticky top-0 z-40">
      {/* Top simulated macOS window titlebar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center space-x-2">
          {/* Traffic lights */}
          <div className="flex space-x-2 mr-3">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/40" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40" />
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-blue-600/20 text-blue-400">
              <FolderTree className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-100">
              MyProject Analyzer
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
              v1.0 Desktop
            </span>
          </div>
        </div>

        {/* Center: Current Folder Info Pill */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          {stats ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-850 rounded-full border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Target Folder:</span>
              <span className="font-mono font-medium text-blue-300">{stats.rootName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{stats.totalFiles} files</span>
            </div>
          ) : (
            <span className="text-slate-500 italic">No folder opened</span>
          )}
        </div>

        {/* Right window actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onLoadSampleClick}
            aria-label="Load demo folder"
            className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            title="Load sample folder structure for instant testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Load Sample</span>
          </button>

          <button
            type="button"
            onClick={onOpenFolderClick}
            aria-label="Open folder"
            className="flex items-center space-x-1.5 text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder</span>
          </button>

          <button
            type="button"
            onClick={onHelpClick}
            aria-label="Help and shortcuts"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Shortcuts & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main navigation toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-sm">
        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2" aria-label="Views">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Stripped Files (Flat)</span>
            {stats && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                {stats.totalFiles}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'tree'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Directory Tree</span>
            {stats && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {stats.totalFolders} dirs
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'pdf'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Structure Architect</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'analyzer'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>CodeFile Analyzer</span>
          </button>
        </nav>

        {/* Global Export Actions */}
        {stats && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onDownloadZipClick}
              disabled={isZipping}
              aria-label="Download flattened files ZIP"
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Download all files stripped of folders as a flat .zip archive"
            >
              <FileArchive className="w-3.5 h-3.5 text-blue-400" />
              <span>{isZipping ? 'Packing ZIP...' : 'Export Flat ZIP'}</span>
            </button>

            {onDownloadImageClick && (
              <button
                type="button"
                onClick={onDownloadImageClick}
                aria-label="Download Structure Image"
                className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-medium transition-all shadow-sm active:scale-95"
                title="Download directory structure & inventory as a high-resolution PNG image"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Export Image</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDownloadPdfClick}
              aria-label="Download Structure PDF"
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all shadow-sm active:scale-95"
              title="Download directory structure & inventory as a vector PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
