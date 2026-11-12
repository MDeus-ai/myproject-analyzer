import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { CollisionStrategy, ProcessedFile } from "@myproject/core/types";
import {
  formatBytes,
  formatDate,
  getFileCategory,
} from "@myproject/core/fileHelpers";
import { triggerFileDownload } from "@myproject/core/zipExporter";
import { copyToClipboard } from "@myproject/core/clipboard";
import { useVirtualRows } from "./useVirtualRows";

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

/** Fixed row height — every cell truncates to a single line, so rows are
 *  stable. Required for windowing math. */
const ROW_H = 44;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date" | "ext">(
    "name",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesSearch =
          file.flattenedName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.relativePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.extension.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (selectedCategory === "all") return true;
        return getFileCategory(file.name, file.type) === selectedCategory;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name")
          cmp = a.flattenedName.localeCompare(b.flattenedName);
        else if (sortBy === "size") cmp = a.size - b.size;
        else if (sortBy === "date") cmp = a.lastModified - b.lastModified;
        else if (sortBy === "ext") cmp = a.extension.localeCompare(b.extension);
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [files, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Windowed rendering: large projects have thousands of rows; mounting all
  // of them is what made tab switches and watch refreshes stutter.
  const {
    ref: scrollRef,
    start,
    end,
    padTop,
    padBottom,
    onScroll,
  } = useVirtualRows(filteredFiles.length, ROW_H);

  // Reset scroll when the filter set changes, so the window starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const toggleSelectFile = (id: string) => {
    const updated = new Set(selectedFileIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setSelectedFileIds(updated);
  };

  const handleDownloadSingle = (file: ProcessedFile) => {
    if (file.blob) {
      triggerFileDownload(file.blob, file.flattenedName);
    } else if (file.textContent) {
      triggerFileDownload(
        new Blob([file.textContent], { type: file.type }),
        file.flattenedName,
      );
    }
  };

  const handleCopyPath = async (file: ProcessedFile) => {
    const succeeded = await copyToClipboard(file.relativePath);
    if (succeeded) {
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const getCategoryIcon = (file: ProcessedFile) => {
    const cat = getFileCategory(file.name, file.type);
    switch (cat) {
      case "code":
        return <FileCode className="w-4 h-4 text-slate-400" />;
      case "image":
        return <FileImage className="w-4 h-4 text-slate-400" />;
      case "document":
        return <FileTextIcon className="w-4 h-4 text-slate-400" />;
      case "audio":
      case "video":
        return <FileAudio className="w-4 h-4 text-slate-400" />;
      case "data":
        return <FileSpreadsheet className="w-4 h-4 text-slate-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] text-slate-100">
      {/* Single consolidated toolbar */}
      <div className="surface-header border-b border-chrome px-4 sm:px-5 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Title group */}
        <div className="flex items-center space-x-2.5 mr-2">
          <div className="p-1.5 rounded-lg icon-chip border">
            <FolderMinus className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-semibold text-slate-100">
                Stripped Flat Files
              </h1>
              <span className="px-1.5 py-0.5 rounded-full surface-raised border border-subtle text-slate-400 text-[10px] font-mono">
                {files.length}
              </span>
              {collisionCount > 0 && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-warn-soft text-warn text-[10px] font-medium border border-warn">
                  <AlertTriangle className="w-3 h-3 text-warn" />
                  <span>
                    {collisionCount} collision{collisionCount > 1 ? "s" : ""}{" "}
                    resolved
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Nested paths stripped — every file at root.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, paths, extensions..."
            className="w-full pl-8 pr-3 py-1.5 surface-inset rounded-lg border border-subtle text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: "all", label: "All" },
            { id: "code", label: "Code" },
            { id: "document", label: "Docs" },
            { id: "image", label: "Images" },
            { id: "data", label: "Data" },
            { id: "other", label: "Other" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer border ${
                selectedCategory === cat.id
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "surface-raised border-chrome text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-2 ml-auto">
          <select
            id="collision-select"
            aria-label="Duplicate handling strategy"
            value={collisionStrategy}
            onChange={(e) =>
              onStrategyChange(e.target.value as CollisionStrategy)
            }
            className="surface-raised text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-chrome focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="enumerate">Auto-number duplicates</option>
            <option value="prefix-path">Prefix path</option>
            <option value="overwrite">Overwrite</option>
          </select>

          <div className="flex items-center space-x-1 surface-raised px-2 py-1.5 rounded-lg border border-chrome text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort files by"
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="date">Date</option>
              <option value="ext">Ext</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="px-1 text-accent hover:opacity-80 font-mono font-bold cursor-pointer"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          <button
            type="button"
            onClick={onDownloadAllZip}
            disabled={isZipping || files.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>{isZipping ? "Archiving..." : "Flat ZIP"}</span>
          </button>
        </div>
      </div>

      {/* Zipping Progress Bar (only while zipping) */}
      {isZipping && zipProgress && (
        <div className="bg-accent-soft border-b border-accent px-6 py-2 flex items-center space-x-4">
          <div className="flex-1 surface-inset h-1.5 rounded-full overflow-hidden border border-subtle">
            <div
              className="bg-purple-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${zipProgress.percent}%` }}
            />
          </div>
          <span className="text-xs text-accent font-mono whitespace-nowrap">
            {zipProgress.percent}% • {zipProgress.currentFile}
          </span>
        </div>
      )}

      {/* Files Table — virtualized scroll container */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
      >
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Filter className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-300 font-medium text-sm">
              No matching files found
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="surface-card rounded-2xl border border-chrome overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="surface-inset border-b border-chrome text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
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
                        className="rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">
                      Stripped File Name (In Flat Root)
                    </th>
                    <th className="py-3 px-4">Original Nested Path</th>
                    <th className="py-3 px-3">Type / Ext</th>
                    <th className="py-3 px-3 text-right">Size</th>
                    <th className="py-3 px-4 hidden md:table-cell">
                      Last Modified
                    </th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                  {padTop > 0 && (
                    <tr aria-hidden="true">
                      <td
                        colSpan={7}
                        style={{ height: padTop, padding: 0, border: 0 }}
                      />
                    </tr>
                  )}
                  {filteredFiles.slice(start, end).map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    const isRenamed = file.flattenedName !== file.originalName;

                    return (
                      <tr
                        key={file.id}
                        style={{ height: ROW_H }}
                        className={`transition-colors hover:bg-[var(--surface-hover)] ${
                          isSelected ? "bg-accent-soft" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(file.id)}
                            aria-label={`Select ${file.flattenedName}`}
                            className="rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-4 font-sans font-medium text-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="shrink-0">
                              {getCategoryIcon(file)}
                            </span>
                            <span
                              className={`truncate max-w-xs ${isRenamed ? "text-accent font-semibold" : ""}`}
                              title={file.flattenedName}
                            >
                              {file.flattenedName}
                            </span>
                            {isRenamed && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-warn-soft text-warn font-sans border border-warn font-medium shrink-0"
                                title={`Original was: ${file.originalName}`}
                              >
                                Renamed
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          <div className="flex items-center space-x-1.5 group">
                            <span
                              className="truncate max-w-sm"
                              title={file.relativePath}
                            >
                              {file.relativePath}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPath(file)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                              title="Copy original path"
                            >
                              {copiedId === file.id ? (
                                <Check className="w-3 h-3 text-ok" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full chip-accent border text-[10px] font-mono uppercase font-bold tracking-wider">
                            {file.extension || "FILE"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatBytes(file.size)}
                        </td>

                        <td className="py-2.5 px-4 text-slate-400 text-[11px] hidden md:table-cell">
                          {formatDate(file.lastModified)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => onPreviewFile(file)}
                              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors"
                              title="Preview file content"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(file)}
                              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors"
                              title="Download this file stripped"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {padBottom > 0 && (
                    <tr aria-hidden="true">
                      <td
                        colSpan={7}
                        style={{ height: padBottom, padding: 0, border: 0 }}
                      />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="surface-inset border-t border-chrome px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing{" "}
                <span className="font-semibold text-slate-200">
                  {filteredFiles.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-200">
                  {files.length}
                </span>{" "}
                stripped files
                {selectedFileIds.size > 0 && (
                  <span className="ml-3 text-accent font-medium">
                    ({selectedFileIds.size} selected)
                  </span>
                )}
              </div>
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
        )}
      </div>
    </div>
  );
};
