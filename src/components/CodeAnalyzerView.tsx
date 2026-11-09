import React, { useState, useMemo } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  Search,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";
import { ProcessedFile } from "../types";
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  AnalyzerFormatOptions,
  countLines,
  estimateTokens,
} from "../utils/codeAnalyzer";
import { formatBytes } from "../utils/fileHelpers";
import { triggerFileDownload } from "../utils/zipExporter";
import { copyToClipboard } from "../utils/clipboard";
import { AnalyzerTextPreview } from "./AnalyzerTextPreview";

interface CodeAnalyzerViewProps {
  files: ProcessedFile[];
  rootFolderName: string;
}

export const CodeAnalyzerView: React.FC<CodeAnalyzerViewProps> = ({
  files,
  rootFolderName,
}) => {
  const analyzedFiles = useMemo(() => {
    return files.map((file) => {
      const meta = identifyCodeFileType(file.name);
      const lines = countLines(file.textContent || "");
      let relFromRoot = file.relativePath
        .replace(/^[\\/]+/, "")
        .replace(/\\/g, "/");
      if (rootFolderName && relFromRoot.startsWith(rootFolderName + "/")) {
        relFromRoot = relFromRoot.slice(rootFolderName.length + 1);
      }
      return { ...file, meta, lines, locationFromRoot: relFromRoot };
    });
  }, [files, rootFolderName]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    analyzedFiles.forEach((f) => {
      if (f.meta.isCode || f.textContent) initial.add(f.id);
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [formatStyle, setFormatStyle] = useState<
    "standard" | "markdown" | "xml"
  >("standard");
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false);
  const [addTableOfContents, setAddTableOfContents] = useState(true);
  const [copied, setCopied] = useState(false);

  const filteredFiles = useMemo(() => {
    return analyzedFiles.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.locationFromRoot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.meta.fileType.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedTypeFilter === "all") return true;
      return f.meta.fileType.toLowerCase() === selectedTypeFilter.toLowerCase();
    });
  }, [analyzedFiles, searchQuery, selectedTypeFilter]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    analyzedFiles.forEach((f) => {
      if (f.meta.fileType && f.meta.fileType !== "unknown")
        types.add(f.meta.fileType);
    });
    return Array.from(types).sort();
  }, [analyzedFiles]);

  const selectedFiles = useMemo(() => {
    return analyzedFiles.filter((f) => selectedIds.has(f.id));
  }, [analyzedFiles, selectedIds]);

  const combinedText = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "No files selected. Please select one or more files from the left panel.";
    }
    const options: AnalyzerFormatOptions = {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
      addTableOfContents,
    };
    return combineMultipleCodeFiles(selectedFiles, options);
  }, [
    selectedFiles,
    formatStyle,
    includeLineNumbers,
    rootFolderName,
    addTableOfContents,
  ]);

  const totalLines = useMemo(
    () => selectedFiles.reduce((acc, f) => acc + f.lines, 0),
    [selectedFiles],
  );
  const estimatedTokensCount = estimateTokens(combinedText);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredFiles.forEach((f) => next.add(f.id));
      setSelectedIds(next);
    }
  };

  const selectOnlyCodeFiles = () => {
    const next = new Set<string>();
    analyzedFiles.forEach((f) => {
      if (f.meta.isCode) next.add(f.id);
    });
    setSelectedIds(next);
  };

  const toggleFile = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCopyCombined = async () => {
    const succeeded = await copyToClipboard(combinedText);
    if (succeeded) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCombined = (ext: "txt" | "md" = "txt") => {
    const safeName =
      rootFolderName.replace(/[^a-zA-Z0-9_-]/g, "_") || "codebase";
    const blob = new Blob([combinedText], { type: "text/plain;charset=utf-8" });
    triggerFileDownload(blob, `${safeName}_codefile_analysis.${ext}`);
  };

  const handleDownloadSingleFile = (file: ProcessedFile) => {
    const singleText = formatSingleCodeFile(file, {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
    });
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const blob = new Blob([singleText], { type: "text/plain;charset=utf-8" });
    triggerFileDownload(blob, `${safeName}_analysis.txt`);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] text-slate-100 overflow-hidden font-sans">
      {/* Single consolidated toolbar */}
      <div className="surface-header border-b border-chrome px-4 sm:px-5 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Title */}
        <div className="flex items-center space-x-2.5 mr-1">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-semibold text-slate-100">
                CodeFile Analyzer
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-medium border border-cyan-500/25">
                {selectedFiles.length}/{analyzedFiles.length} files
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Bundle codefiles with location &amp; type metadata.
            </p>
          </div>
        </div>

        {/* Format preset */}
        <div className="flex items-center bg-[var(--surface-inset)] rounded-lg p-0.5 border border-subtle text-xs">
          {(
            [
              { id: "standard", label: "Standard" },
              { id: "markdown", label: "Markdown" },
              { id: "xml", label: "XML" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFormatStyle(preset.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                formatStyle === preset.id
                  ? "surface-raised text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addTableOfContents}
              onChange={(e) => setAddTableOfContents(e.target.checked)}
              className="rounded border-slate-700 bg-transparent text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>TOC</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLineNumbers}
              onChange={(e) => setIncludeLineNumbers(e.target.checked)}
              className="rounded border-slate-700 bg-transparent text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Line #</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-auto">
          <button
            type="button"
            onClick={handleCopyCombined}
            disabled={selectedFiles.length === 0}
            aria-label="Copy combined text"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium text-xs transition-all active:scale-95 disabled:opacity-50"
            title="Copy all combined code files to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownloadCombined("txt")}
            disabled={selectedFiles.length === 0}
            aria-label="Download combined text file"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Download unified text file with all file metadata and contents"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: File Explorer & Type Filters */}
        <div className="w-full lg:w-96 surface-card border-b lg:border-b-0 lg:border-r border-chrome flex flex-col shrink-0">
          <div className="p-4 border-b border-subtle space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file name or path..."
                className="w-full pl-8 pr-3 py-1.5 surface-inset rounded-xl border border-subtle text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("all")}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedTypeFilter === "all"
                    ? "bg-cyan-600 text-white"
                    : "surface-raised text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({analyzedFiles.length})
              </button>
              {availableTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-2 py-0.5 rounded-lg font-mono font-medium transition-colors uppercase whitespace-nowrap ${
                    selectedTypeFilter === t
                      ? "bg-cyan-600 text-white"
                      : "surface-raised text-slate-400 hover:text-slate-200"
                  }`}
                >
                  .{t}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-1 hover:text-slate-200 text-[11px]"
                >
                  {selectedIds.size === filteredFiles.length &&
                  filteredFiles.length > 0 ? (
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => toggleFile(file.id)}
                  className={`flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "hover:bg-[var(--surface-hover)] border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFile(file.id)}
                    aria-label={`Include ${file.name}`}
                    className="rounded border-slate-700 bg-transparent text-cyan-500 focus:ring-0 cursor-pointer mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 truncate font-mono">
                        {file.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded surface-raised text-cyan-300 text-[10px] font-mono uppercase font-bold border border-subtle">
                        {file.meta.fileType}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {file.locationFromRoot}
                    </p>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-1">
                      <span>{file.lines} lines</span>
                      <span>•</span>
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{file.meta.language}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingleFile(file);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-[var(--surface-hover)] transition-colors shrink-0"
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-5xl mx-auto surface-card border border-chrome rounded-2xl shadow-lg overflow-hidden">
              {/* Slim document header with inline stats */}
              <div className="px-4 py-2 border-b border-subtle surface-inset flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono">
                    {rootFolderName || "codebase"}_analysis.txt
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="font-mono text-[11px]">
                  {selectedFiles.length} files • {totalLines} lines •{" "}
                  {formatBytes(combinedText.length)} •{" "}
                  <span className="text-cyan-300">
                    ~{estimatedTokensCount.toLocaleString()} tokens
                  </span>
                </span>
                <div className="ml-auto flex items-center space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleDownloadCombined("md")}
                    className="text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Download as Markdown file"
                  >
                    .md
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCombined}
                    className="flex items-center space-x-1 text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-x-auto">
                <AnalyzerTextPreview text={combinedText} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
