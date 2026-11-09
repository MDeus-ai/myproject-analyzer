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
  ShieldAlert,
  Home,
} from 'lucide-react';
import { FolderAnalysisStats, ExcludedFolderInfo } from '../types';

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
  onGoHomeClick?: () => void;
  isZipping?: boolean;
  excludedFolders?: ExcludedFolderInfo[];
  onReviewExclusionsClick?: () => void;
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
  onGoHomeClick,
  isZipping,
  excludedFolders,
  onReviewExclusionsClick,
}) => {
  return (
    <header className="bg-[#0e0c1a] border-b border-[#241f3d] text-slate-200 select-none sticky top-0 z-40">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[#1f1a36] bg-[#0a0815]/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {/* Logo & Brand title - clicking takes user to homepage */}
          <button
            type="button"
            onClick={onGoHomeClick}
            className="flex items-center space-x-2.5 text-left group hover:opacity-90 transition-opacity cursor-pointer"
            title="Go to Homepage"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <FolderTree className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-purple-200 transition-colors">
                MyProject Analyzer
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-700/50 font-mono font-medium">
                v1.0
              </span>
            </div>
          </button>
        </div>

        {/* Center: Current Target Folder Pill */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          {stats ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-[#16122a] rounded-full border border-[#2d254f] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Target Folder:</span>
              <span className="font-mono font-medium text-purple-300">{stats.rootName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">{stats.totalFiles} files</span>
            </div>
          ) : (
            <span className="text-slate-500 italic text-xs">No project opened</span>
          )}

          {excludedFolders && excludedFolders.length > 0 && (
            <button
              type="button"
              onClick={onReviewExclusionsClick}
              className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-full border border-amber-500/30 text-amber-300 text-xs transition-colors cursor-pointer"
              title="Click to view details about automatically excluded folders"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Excluded ({excludedFolders.length}):{' '}
                <strong className="font-mono">{excludedFolders.map(f => f.name).join(', ')}</strong>
              </span>
            </button>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2">
          {onGoHomeClick && (
            <button
              type="button"
              onClick={onGoHomeClick}
              className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#1a1532] transition-colors border border-[#241f3d]"
              title="Return to Homepage"
            >
              <Home className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLoadSampleClick}
            aria-label="Load demo folder"
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#181330] hover:bg-[#201a40] text-purple-200 transition-colors border border-[#322858]"
            title="Load sample folder structure for instant testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Load Sample</span>
          </button>

          <button
            type="button"
            onClick={onOpenFolderClick}
            aria-label="Open folder"
            className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium transition-all shadow-md shadow-purple-600/30 active:scale-95 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder</span>
          </button>

          <button
            type="button"
            onClick={onHelpClick}
            aria-label="Help and shortcuts"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a1532] transition-colors"
            title="Shortcuts & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Toolbar (Tabs & Global Quick Exports) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#0e0c1a]/95 backdrop-blur-md">
        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-0.5" aria-label="Views">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'files'
                ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181330]'
            }`}
          >
            <ListFilter className="w-4 h-4 text-purple-400" />
            <span>Stripped Files (Flat)</span>
            {stats && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold">
                {stats.totalFiles}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 shadow-sm shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181330]'
            }`}
          >
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <span>Directory Tree</span>
            {stats && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
                {stats.totalFolders} dirs
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-500/40 shadow-sm shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181330]'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>PDF Structure Architect</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-violet-600/25 text-violet-200 border border-violet-500/40 shadow-sm shadow-violet-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181330]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'analyzer'
                ? 'bg-cyan-600/25 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181330]'
            }`}
          >
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>CodeFile Analyzer</span>
          </button>
        </nav>

        {/* Global Export Actions */}
        {stats && (
          <div className="hidden sm:flex items-center space-x-2">
            <button
              type="button"
              onClick={onDownloadZipClick}
              disabled={isZipping}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#1a1532] hover:bg-[#231c44] text-slate-200 transition-colors border border-[#2e2652]"
              title="Download all stripped flat files as a ZIP archive"
            >
              <FileArchive className="w-3.5 h-3.5 text-purple-400" />
              <span>{isZipping ? 'Archiving...' : 'Export Flat ZIP'}</span>
            </button>

            {onDownloadImageClick && (
              <button
                type="button"
                onClick={onDownloadImageClick}
                className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#1a1532] hover:bg-[#231c44] text-slate-200 transition-colors border border-[#2e2652]"
                title="Go to PDF/Image Architect to download PNG/JPEG"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Image</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDownloadPdfClick}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium transition-all shadow-sm"
              title="Generate and download directory structure PDF"
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
