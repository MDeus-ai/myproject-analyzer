
import React, { useState, useMemo, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  Search,
  CheckSquare,
  Square,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { ProcessedFile } from "../types";
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  countLines,
  estimateTokens,
  getRelativePathFromRoot,
  isLockfile,
  AnalyzerStyle,
} from "../utils/codeAnalyzer";
import { formatBytes } from "../utils/fileHelpers";
import { triggerFileDownload } from "../utils/zipExporter";
import { copyToClipboard } from "../utils/clipboard";
import { isSecretFile, getSecretWarning } from "../utils/secretsDetector";
import { AnalyzerTextPreview } from "./AnalyzerTextPreview";

interface CodeAnalyzerViewProps {
  files: ProcessedFile[];
  rootFolderName: string;
}

/** Above this combined content size, only the active format is generated
 *  (avoids holding 6 multi-MB strings in memory at once). */
const MAX_MULTI_FORMAT_CHARS = 6_000_000;

const FORMAT_META: Record<
  AnalyzerStyle,
  { label: string; hint: string; ext: string; mime: string }
> = {
  standard: {
    label: "Standard",
    hint: "Full metadata headers with separator banners",
    ext: "txt",
    mime: "text/plain;charset=utf-8",
  },
  compact: {
    label: "Compact",
    hint: "Token-efficient: path header + code only",
    ext: "txt",
    mime: "text/plain;charset=utf-8",
  },
  markdown: {
    label: "Markdown",
    hint: "Fenced code blocks — great for docs, GitHub and chat UIs",
    ext: "md",
    mime: "text/markdown;charset=utf-8",
  },
  xml: {
    label: "XML",
    hint: "CDATA-wrapped tags — ideal for Claude-style prompts",
    ext: "xml",
    mime: "application/xml;charset=utf-8",
  },
  jsonl: {
    label: "JSONL",
    hint: "One JSON record per line — RAG pipelines & vector DB ingestion",
    ext: "jsonl",
    mime: "application/x-ndjson;charset=utf-8",
  },
  json: {
    label: "JSON",
    hint: "One valid JSON document — scripts, tooling & custom pipelines",
    ext: "json",
    mime: "application/json;charset=utf-8",
  },
};

const FORMAT_ORDER: AnalyzerStyle[] = [
  "standard",
  "compact",
  "markdown",
  "xml",
  "jsonl",
  "json",
];

/** Token count above which a file row is highlighted as heavy. */
const HEAVY_FILE_TOKENS = 10_000;

export const CodeAnalyzerView: React.FC<CodeAnalyzerViewProps> = ({
  files,
  rootFolderName,
}) => {
  const analyzedFiles = useMemo(() => {
    return files.map((file) => ({
      ...file,
      meta: identifyCodeFileType(file.name),
      lines: countLines(file.textContent || ""),
      tokens: estimateTokens(file.textContent || ""),
      // Dependency lockfiles are technically code but huge and near-zero
      // value to an LLM — flagged in the list, deselected by default.
      isLock: isLockfile(file.name),
      locationFromRoot: getRelativePathFromRoot(file, rootFolderName),
    }));
  }, [files, rootFolderName]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    analyzedFiles.forEach((f) => {
      if ((f.meta.isCode || f.textContent) && !f.isLock) initial.add(f.id);
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [formatStyle, setFormatStyle] = useState<AnalyzerStyle>("standard");
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false);
  const [addTableOfContents, setAddTableOfContents] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reset the selection to defaults whenever a different project is loaded
  // while this view is mounted (Open Folder / Sample from the header) —
  // otherwise stale ids from the previous project linger (or, worse,
  // lockfiles from the new project stay selected).
  useEffect(() => {
    const initial = new Set<string>();
    analyzedFiles.forEach((f) => {
      if ((f.meta.isCode || f.textContent) && !f.isLock) initial.add(f.id);
    });
    setSelectedIds(initial);
  }, [analyzedFiles]);

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

  // Secret files among the current selection (for the warning banner)
  const selectedSecretFiles = useMemo(() => {
    return selectedFiles.filter((f) => isSecretFile(f.name)).map((f) => f.name);
  }, [selectedFiles]);

  const totalSelectedChars = useMemo(
    () =>
      selectedFiles.reduce((acc, f) => acc + (f.textContent?.length || 0), 0),
    [selectedFiles],
  );

  // Generate the combined output. For reasonably sized selections we build
  // every format at once so switching formats is instant and the picker can
  // show live token estimates per format. For very large bundles we only
  // build the active format.
  const combinedByFormat = useMemo(() => {
    if (selectedFiles.length === 0) return null;
    const styles =
      totalSelectedChars > MAX_MULTI_FORMAT_CHARS
        ? [formatStyle]
        : FORMAT_ORDER;
    const out = {} as Record<AnalyzerStyle, string>;
    for (const style of styles) {
      out[style] = combineMultipleCodeFiles(selectedFiles, {
        style,
        includeLineNumbers,
        rootFolderName,
        addTableOfContents,
      });
    }
    return out;
  }, [
    selectedFiles,
    totalSelectedChars,
    formatStyle,
    includeLineNumbers,
    rootFolderName,
    addTableOfContents,
  ]);

  const combinedText =
    combinedByFormat?.[formatStyle] ??
    "No files selected. Please select one or more files from the left panel.";

  const tokenEstimates = useMemo(() => {
    if (!combinedByFormat) return null;
    const out = {} as Partial<Record<AnalyzerStyle, number>>;
    for (const style of FORMAT_ORDER) {
      if (combinedByFormat[style] !== undefined) {
        out[style] = estimateTokens(combinedByFormat[style]);
      }
    }
    return out;
  }, [combinedByFormat]);

  const compactSavings = useMemo(() => {
    const standard = tokenEstimates?.standard;
    const compact = tokenEstimates?.compact;
    if (!standard || !compact || standard <= 0) return 0;
    return Math.max(0, Math.round((1 - compact / standard) * 100));
  }, [tokenEstimates]);

  const totalLines = useMemo(
    () => selectedFiles.reduce((acc, f) => acc + f.lines, 0),
    [selectedFiles],
  );
  const estimatedTokensCount = estimateTokens(combinedText);

  // Line numbers and a table of contents only apply to the prose formats.
  const lineNumbersSupported =
    formatStyle === "standard" || formatStyle === "markdown";
  const tocSupported = lineNumbersSupported;

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
      if (f.meta.isCode && !f.isLock) next.add(f.id);
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

  const handleDownloadCombined = () => {
    const meta = FORMAT_META[formatStyle];
    const safeName =
      rootFolderName.replace(/[^a-zA-Z0-9_-]/g, "_") || "codebase";
    const blob = new Blob([combinedText], { type: meta.mime });
    triggerFileDownload(blob, `${safeName}_codefile_analysis.${meta.ext}`);
  };

  const handleDownloadSingleFile = (file: ProcessedFile) => {
    const meta = FORMAT_META[formatStyle];
    const singleText = formatSingleCodeFile(file, {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
    });
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const blob = new Blob([singleText], { type: meta.mime });
    triggerFileDownload(blob, `${safeName}_analysis.${meta.ext}`);
  };

  const formatTooltip = (style: AnalyzerStyle): string => {
    const tokens = tokenEstimates?.[style];
    return `${FORMAT_META[style].hint}${
      tokens !== undefined ? ` · ~${tokens.toLocaleString()} tokens` : ""
    }`;
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
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-info text-[10px] font-mono font-medium border border-cyan-500/25">
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
          {FORMAT_ORDER.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setFormatStyle(style)}
              title={formatTooltip(style)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                formatStyle === style
                  ? "surface-raised text-info shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {FORMAT_META[style].label}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-300">
          <label
            className={`flex items-center space-x-1.5 ${
              tocSupported ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
            title={
              tocSupported
                ? "Include a table of contents"
                : "Table of contents is only available for Standard and Markdown"
            }
          >
            <input
              type="checkbox"
              checked={addTableOfContents && tocSupported}
              disabled={!tocSupported}
              onChange={(e) => setAddTableOfContents(e.target.checked)}
              className="rounded border-slate-700 bg-transparent text-cyan-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>TOC</span>
          </label>
          <label
            className={`flex items-center space-x-1.5 ${
              lineNumbersSupported
                ? "cursor-pointer"
                : "opacity-40 cursor-not-allowed"
            }`}
            title={
              lineNumbersSupported
                ? "Prefix code lines with line numbers"
                : "Line numbers are only available for Standard and Markdown"
            }
          >
            <input
              type="checkbox"
              checked={includeLineNumbers && lineNumbersSupported}
              disabled={!lineNumbersSupported}
              onChange={(e) => setIncludeLineNumbers(e.target.checked)}
              className="rounded border-slate-700 bg-transparent text-cyan-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
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
                <Check className="w-3.5 h-3.5 text-ok" />
                <span className="text-ok">Copied!</span>
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
            onClick={handleDownloadCombined}
            disabled={selectedFiles.length === 0}
            aria-label="Download combined output file"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title={`Download unified ${FORMAT_META[formatStyle].label} file with all file metadata and contents`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .{FORMAT_META[formatStyle].ext}</span>
          </button>
        </div>
      </div>

      {/* Secrets warning banner — only when secret files are in the selection */}
      {selectedSecretFiles.length > 0 && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center space-x-2 text-xs text-danger">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="leading-relaxed">
            <strong>Heads up:</strong> {getSecretWarning(selectedSecretFiles)}
          </span>
        </div>
      )}

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
                  className="text-info hover:opacity-80 text-[11px]"
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
              const isSecret = isSecretFile(file.name);
              return (
                <div
                  key={file.id}
                  onClick={() => toggleFile(file.id)}
                  className={`flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                    isSelected
                      ? isSecret
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-cyan-500/10 border-cyan-500/30"
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
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-subtle ${
                          isSecret
                            ? "bg-rose-500/15 text-danger"
                            : "surface-raised text-info"
                        }`}
                      >
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
                      {file.textContent != null && (
                        <>
                          <span>•</span>
                          <span
                            className={
                              file.tokens > HEAVY_FILE_TOKENS
                                ? "text-warn font-semibold"
                                : ""
                            }
                            title="Estimated tokens for this file"
                          >
                            ~{file.tokens.toLocaleString()} tok
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="capitalize">{file.meta.language}</span>
                      {file.isLock && (
                        <span className="text-warn font-semibold">
                          • lockfile — off by default
                        </span>
                      )}
                      {isSecret && (
                        <span className="text-danger font-semibold">
                          • secrets?
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingleFile(file);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                    title={`Export this single file in ${FORMAT_META[formatStyle].label} format`}
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
                    {rootFolderName || "codebase"}_analysis.
                    {FORMAT_META[formatStyle].ext}
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="font-mono text-[11px]">
                  {selectedFiles.length} files • {totalLines} lines •{" "}
                  {formatBytes(combinedText.length)} •{" "}
                  <span className="text-info">
                    ~{estimatedTokensCount.toLocaleString()} tokens
                  </span>
                </span>
                {formatStyle === "compact" && compactSavings > 0 && (
                  <>
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <span className="font-mono text-[11px] text-ok">
                      -{compactSavings}% tokens vs Standard
                    </span>
                  </>
                )}
                <div className="ml-auto flex items-center space-x-2 text-[11px]">
                  <span className="hidden md:inline text-slate-500">
                    {FORMAT_META[formatStyle].label}
                  </span>
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
                <AnalyzerTextPreview text={combinedText} format={formatStyle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
