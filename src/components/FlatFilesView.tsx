import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileArchive,
  Download,
  Eye,
  ArrowUpDown,
  AlertTriangle,
  FolderMinus,
  Check,
  FileCode,
  FileImage,
  FileText as FileTextIcon,
  FileAudio,
  FileSpreadsheet,
  File,
  Copy,
  FolderOpen,
} from 'lucide-react';
import { CollisionStrategy, ProcessedFile } from '../types';
import { formatBytes, formatDate, getFileCategory } from '../utils/fileHelpers';
import { triggerFileDownload } from '../utils/zipExporter';

interface FlatFilesViewProps {
  files: ProcessedFile[];
  collisionStrategy: CollisionStrategy;
  onStrategyChange: (strategy: CollisionStrategy) => void;
  collisionCount: number;
  onPreviewFile: (file: ProcessedFile) => void;
  onDownloadAllZip: () => void;
  isZipping?: boolean;
  zipProgress?: { percent: number; currentFile: string };
  onOpenAnotherFolder: () => void;
}

export const FlatFilesView: React.FC<FlatFilesViewProps> = ({
  files,
  collisionStrategy,
  onStrategyChange,
  collisionCount,
  onPreviewFile,
  onDownloadAllZip,
  isZipping,
  zipProgress,
  onOpenAnotherFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'ext'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    return files
      .filter(file => {
        const matchesSearch =
          file.flattenedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.relativePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.extension.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedCategory === 'all') return true;
        const cat = getFileCategory(file.name, file.type);
        return cat === selectedCategory;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') {
          cmp = a.flattenedName.localeCompare(b.flattenedName);
        } else if (sortBy === 'size') {
          cmp = a.size - b.size;
        } else if (sortBy === 'date') {
          cmp = a.lastModified - b.lastModified;
        } else if (sortBy === 'ext') {
          cmp = a.extension.localeCompare(b.extension);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [files, searchQuery, selectedCategory, sortBy, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const toggleSelectFile = (id: string) => {
    const updated = new Set(selectedFileIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedFileIds(updated);
  };

  const handleDownloadSingle = (file: ProcessedFile) => {
    if (file.blob) {
      triggerFileDownload(file.blob, file.flattenedName);
    } else if (file.textContent) {
      const blob = new Blob([file.textContent], { type: file.type });
      triggerFileDownload(blob, file.flattenedName);
    }
  };

  const handleCopyPath = (file: ProcessedFile) => {
    navigator.clipboard.writeText(file.relativePath);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getCategoryIcon = (file: ProcessedFile) => {
    const cat = getFileCategory(file.name, file.type);
    switch (cat) {
      case 'code':
        return <FileCode className="w-4 h-4 text-sky-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-emerald-400" />;
      case 'document':
        return <FileTextIcon className="w-4 h-4 text-blue-400" />;
      case 'audio':
      case 'video':
        return <FileAudio className="w-4 h-4 text-purple-400" />;
      case 'data':
        return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top Banner: Collision strategy & Stripping status */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
              <FolderMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold text-slate-100">
                  Stripped Flat Files
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-medium">
                  {files.length} total files
                </span>
                {collisionCount > 0 && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>{collisionCount} name collision{collisionCount > 1 ? 's' : ''} resolved</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                All nested directory paths have been stripped. Every file now exists at the root.
              </p>
            </div>
          </div>

          {/* Collision Resolution Settings */}
          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <label htmlFor="collision-select" className="text-xs text-slate-400 pl-2 font-medium">
              Duplicate Handling:
            </label>
            <select
              id="collision-select"
              value={collisionStrategy}
              onChange={e => onStrategyChange(e.target.value as CollisionStrategy)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="enumerate">Auto-number: name (1).ext</option>
              <option value="prefix-path">Prefix Path: folder_sub_name.ext</option>
              <option value="overwrite">Overwrite / Keep Unique</option>
            </select>
          </div>
        </div>
      </div>

      {/* Control bar: search, category filters, sorting, bulk download */}
      <div className="p-4 sm:px-6 bg-slate-900/60 border-b border-slate-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search stripped files, original paths, extensions..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'code', label: 'Code' },
            { id: 'document', label: 'Docs' },
            { id: 'image', label: 'Images' },
            { id: 'data', label: 'Data' },
            { id: 'other', label: 'Other' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort & Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="name" className="bg-slate-900">Sort by Name</option>
              <option value="size" className="bg-slate-900">Sort by Size</option>
              <option value="date" className="bg-slate-900">Sort by Date</option>
              <option value="ext" className="bg-slate-900">Sort by Extension</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-1 text-blue-400 hover:text-blue-300 font-mono font-bold"
              title="Toggle sort direction"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button
            type="button"
            onClick={onDownloadAllZip}
            disabled={isZipping || files.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Archiving...' : 'Download Flat ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Zipping Progress Bar */}
      {isZipping && zipProgress && (
        <div className="bg-blue-950/80 border-b border-blue-900/60 px-6 py-2.5 flex items-center space-x-4">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${zipProgress.percent}%` }}
            />
          </div>
          <span className="text-xs text-blue-300 font-mono whitespace-nowrap">
            {zipProgress.percent}% • {zipProgress.currentFile}
          </span>
        </div>
      )}

      {/* Files Table / Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Filter className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-300 font-medium text-sm">No matching files found</p>
            <p className="text-slate-500 text-xs mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedFileIds.size === filteredFiles.length &&
                          filteredFiles.length > 0
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all stripped files"
                        className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Stripped File Name (In Flat Root)</th>
                    <th className="py-3 px-4">Original Nested Path</th>
                    <th className="py-3 px-3">Type / Ext</th>
                    <th className="py-3 px-3 text-right">Size</th>
                    <th className="py-3 px-4">Last Modified</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredFiles.map(file => {
                    const isSelected = selectedFileIds.has(file.id);
                    const isRenamed = file.flattenedName !== file.originalName;

                    return (
                      <tr
                        key={file.id}
                        className={`hover:bg-slate-850/60 transition-colors ${
                          isSelected ? 'bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(file.id)}
                            aria-label={`Select ${file.flattenedName}`}
                            className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Flat Name */}
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="shrink-0">{getCategoryIcon(file)}</span>
                            <span
                              className={`truncate max-w-xs ${
                                isRenamed ? 'text-blue-300 font-semibold' : ''
                              }`}
                              title={file.flattenedName}
                            >
                              {file.flattenedName}
                            </span>
                            {isRenamed && (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30"
                                title={`Original was: ${file.originalName}`}
                              >
                                Renamed
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Original Path */}
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          <div className="flex items-center space-x-1.5 group">
                            <span className="truncate max-w-sm" title={file.relativePath}>
                              {file.relativePath}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPath(file)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                              title="Copy original path"
                            >
                              {copiedId === file.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Extension */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                            {file.extension || 'FILE'}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatBytes(file.size)}
                        </td>

                        {/* Modified Date */}
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {formatDate(file.lastModified)}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => onPreviewFile(file)}
                              className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition-colors"
                              title="Preview file content"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(file)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                              title="Download this file stripped"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-slate-950/70 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing <span className="font-semibold text-slate-200">{filteredFiles.length}</span> of{' '}
                <span className="font-semibold text-slate-200">{files.length}</span> stripped files
                {selectedFileIds.size > 0 && (
                  <span className="ml-3 text-blue-400 font-medium">
                    ({selectedFileIds.size} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onOpenAnotherFolder}
                  className="flex items-center space-x-1 text-slate-400 hover:text-slate-200"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Choose Another Folder</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
