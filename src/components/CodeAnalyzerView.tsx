import React, { useState, useMemo } from 'react';
import {
  Code2,
  FileCode,
  Copy,
  Check,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ProcessedFile } from '../types';
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  AnalyzerFormatOptions,
  countLines,
  estimateTokens,
} from '../utils/codeAnalyzer';
import { formatBytes } from '../utils/fileHelpers';
import { triggerFileDownload } from '../utils/zipExporter';

interface CodeAnalyzerViewProps {
  files: ProcessedFile[];
  rootFolderName: string;
}

export const CodeAnalyzerView: React.FC<CodeAnalyzerViewProps> = ({
  files,
  rootFolderName,
}) => {
  // Identify all code files
  const analyzedFiles = useMemo(() => {
    return files.map(file => {
      const meta = identifyCodeFileType(file.name);
      const lines = countLines(file.textContent || '');
      let relFromRoot = file.relativePath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
      if (rootFolderName && relFromRoot.startsWith(rootFolderName + '/')) {
        relFromRoot = relFromRoot.slice(rootFolderName.length + 1);
      }
      return {
        ...file,
        meta,
        lines,
        locationFromRoot: relFromRoot,
      };
    });
  }, [files, rootFolderName]);

  // Selected file IDs (default: all files that have text content or are identified as code)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    analyzedFiles.forEach(f => {
      if (f.meta.isCode || f.textContent) {
        initial.add(f.id);
      }
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [formatStyle, setFormatStyle] = useState<'standard' | 'markdown' | 'xml'>('standard');
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false);
  const [addTableOfContents, setAddTableOfContents] = useState(true);
  const [copied, setCopied] = useState(false);

  // Filtered files list for left sidebar
  const filteredFiles = useMemo(() => {
    return analyzedFiles.filter(f => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.locationFromRoot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.meta.fileType.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedTypeFilter === 'all') return true;
      return f.meta.fileType.toLowerCase() === selectedTypeFilter.toLowerCase();
    });
  }, [analyzedFiles, searchQuery, selectedTypeFilter]);

  // Distinct file types present in project
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    analyzedFiles.forEach(f => {
      if (f.meta.fileType && f.meta.fileType !== 'unknown') {
        types.add(f.meta.fileType);
      }
    });
    return Array.from(types).sort();
  }, [analyzedFiles]);

  // Selected files in sequence
  const selectedFiles = useMemo(() => {
    return analyzedFiles.filter(f => selectedIds.has(f.id));
  }, [analyzedFiles, selectedIds]);

  // Generate combined text output
  const combinedText = useMemo(() => {
    if (selectedFiles.length === 0) {
      return 'No files selected. Please select one or more files from the left panel.';
    }

    const options: AnalyzerFormatOptions = {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
      addTableOfContents,
    };

    return combineMultipleCodeFiles(selectedFiles, options);
  }, [selectedFiles, formatStyle, includeLineNumbers, rootFolderName, addTableOfContents]);

  // Combined stats
  const totalLines = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + f.lines, 0);
  }, [selectedFiles]);

  const totalChars = combinedText.length;
  const estimatedTokensCount = estimateTokens(combinedText);

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredFiles.forEach(f => next.add(f.id));
      setSelectedIds(next);
    }
  };

  const selectOnlyCodeFiles = () => {
    const next = new Set<string>();
    analyzedFiles.forEach(f => {
      if (f.meta.isCode) next.add(f.id);
    });
    setSelectedIds(next);
  };

  const toggleFile = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Actions
  const handleCopyCombined = () => {
    navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCombined = (ext: 'txt' | 'md' = 'txt') => {
    const safeName = rootFolderName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'codebase';
    const blob = new Blob([combinedText], { type: 'text/plain;charset=utf-8' });
    triggerFileDownload(blob, `${safeName}_codefile_analysis.${ext}`);
  };

  const handleDownloadSingleFile = (file: ProcessedFile) => {
    const singleText = formatSingleCodeFile(file, {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
    });
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const blob = new Blob([singleText], { type: 'text/plain;charset=utf-8' });
    triggerFileDownload(blob, `${safeName}_analysis.txt`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:px-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-slate-100">
                CodeFile Analyzer
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-medium border border-cyan-500/30">
                Location & Type Bundler
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies file location from project root, detects code type, and structures into unified exportable text files.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopyCombined}
            disabled={selectedFiles.length === 0}
            aria-label="Copy combined text"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Copy all combined code files to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy Combined Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownloadCombined('txt')}
            disabled={selectedFiles.length === 0}
            aria-label="Download combined text file"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Download unified text file with all file metadata and contents"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Combined File (.txt)</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: File Explorer & Type Filters */}
        <div className="w-full lg:w-96 bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search file name or path..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Quick Type Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('all')}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedTypeFilter === 'all'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({analyzedFiles.length})
              </button>
              {availableTypes.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-2 py-0.5 rounded-lg font-mono font-medium transition-colors uppercase whitespace-nowrap ${
                    selectedTypeFilter === t
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  .{t}
                </button>
              ))}
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-1 hover:text-slate-200 text-[11px]"
                >
                  {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Toggle Visible</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={selectOnlyCodeFiles}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px]"
                >
                  Select All Code
                </button>
              </div>

              <span className="font-mono text-[11px] text-slate-400">
                {selectedFiles.length}/{analyzedFiles.length} selected
              </span>
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredFiles.map(file => {
              const isSelected = selectedIds.has(file.id);

              return (
                <div
                  key={file.id}
                  onClick={() => toggleFile(file.id)}
                  className={`flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/25 border border-cyan-800/40'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFile(file.id)}
                    aria-label={`Include ${file.name}`}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer mt-1"
                    onClick={e => e.stopPropagation()}
                  />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 truncate font-mono">
                        {file.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 text-[10px] font-mono uppercase font-bold">
                        {file.meta.fileType}
                      </span>
                    </div>

                    {/* Relative Location from Root */}
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {file.locationFromRoot}
                    </p>

                    {/* Metrics */}
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-1">
                      <span>{file.lines} lines</span>
                      <span>•</span>
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{file.meta.language}</span>
                    </div>
                  </div>

                  {/* Single File Export Button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleDownloadSingleFile(file);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors shrink-0"
                    title="Export this single file with metadata wrapper"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Formatted Code Output Viewer */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Format Settings Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-slate-400 font-medium">Structure Preset:</span>
              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormatStyle('standard')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    formatStyle === 'standard'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Standard Delimited
                </button>
                <button
                  type="button"
                  onClick={() => setFormatStyle('markdown')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    formatStyle === 'markdown'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Markdown Blocks
                </button>
                <button
                  type="button"
                  onClick={() => setFormatStyle('xml')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    formatStyle === 'xml'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  XML Tags
                </button>
              </div>
            </div>

            {/* Options Toggles */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={addTableOfContents}
                  onChange={e => setAddTableOfContents(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Table of Contents</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeLineNumbers}
                  onChange={e => setIncludeLineNumbers(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Line Numbers</span>
              </label>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="px-4 sm:px-6 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center space-x-3">
              <span>
                <strong className="text-slate-200">{selectedFiles.length}</strong> files combined
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-200">{totalLines}</strong> code lines
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-200">{formatBytes(totalChars)}</strong> total text
              </span>
              <span>•</span>
              <span className="text-cyan-300">
                ~{estimatedTokensCount.toLocaleString()} tokens
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleDownloadCombined('md')}
                className="text-slate-400 hover:text-cyan-300 transition-colors"
                title="Download as Markdown file"
              >
                Save as .md
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => handleDownloadCombined('txt')}
                className="text-slate-400 hover:text-cyan-300 transition-colors"
                title="Download as Text file"
              >
                Save as .txt
              </button>
            </div>
          </div>

          {/* Code Viewer Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
            <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono">
                    {rootFolderName || 'codebase'}_analysis.txt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCombined}
                  className="flex items-center space-x-1 text-slate-400 hover:text-cyan-300 transition-colors text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy Document'}</span>
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-x-auto">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-all">
                  {combinedText}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
