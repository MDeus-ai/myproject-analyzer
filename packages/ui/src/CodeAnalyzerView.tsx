import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
import { ProcessedFile } from "@myproject/core/types";
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  countLines,
  estimateTokens,
  estimateCombinedTokensByStyle,
  getRelativePathFromRoot,
  isLockfile,
  AnalyzerStyle,
} from "@myproject/core/codeAnalyzer";
import { formatBytes } from "@myproject/core/fileHelpers";
import { copyToClipboard } from "@myproject/core/clipboard";
import {
  isSecretFile,
  getSecretWarning,
} from "@myproject/core/secretsDetector";
import { getPlatform } from "@myproject/platform";
import { AnalyzerTextPreview } from "./AnalyzerTextPreview";
import { useDebouncedValue } from "./useDebouncedValue";
import { useVirtualRows } from "./useVirtualRows";

interface CodeAnalyzerViewProps {
  files: ProcessedFile[];
  rootFolderName: string;
}

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

/** Fixed list-row height for windowing (rows truncate, so it is stable). */
const ROW_H = 76;

export const CodeAnalyzerView: React.FC<CodeAnalyzerViewProps> = ({
  files,
  rootFolderName,
}) => {
  // Cheap per-file fields only. Line/token metrics are NOT computed here —
  // splitting and scanning every file's content on every project change
  // (i.e. every live-watch batch) was a major stall; they are computed
  // lazily per rendered row via getMetrics() below.
  const analyzedFiles = useMemo(() => {
    return files.map((file) => ({
      ...file,
      meta: identifyCodeFileType(file.name),
      // Dependency lockfiles are technically code but huge and near-zero
      // value to an LLM — flagged in the list, deselected by default.
      isLock: isLockfile(file.name),
      locationFromRoot: getRelativePathFromRoot(file, rootFolderName),
    }));
  }, [files, rootFolderName]);

  // Per-file metrics cache. Live watch only replaces CHANGED file objects
  // (unchanged ones keep identity — see App.tsx), so cache keys stay valid
  // for untouched files across watch batches.
  const metricsCache = useRef(
    new Map<string, { lines: number; tokens: number }>(),
  );
  const getMetrics = useCallback((f: ProcessedFile) => {
    const key = `${f.id}|${f.size}|${f.lastModified}`;
    let m = metricsCache.current.get(key);
    if (!m) {
      const t = f.textContent ?? "";
      m = { lines: countLines(t), tokens: estimateTokens(t) };
      metricsCache.current.set(key, m);
    }
    return m;
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    analyzedFiles.forEach((f) => {
      if ((f.meta.isCode || f.textContent) && !f.isLock) initial.add(f.id);
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 120);
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
    const q = debouncedQuery.trim().toLowerCase();
    return analyzedFiles.filter((f) => {
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.locationFromRoot.toLowerCase().includes(q) ||
        f.meta.fileType.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (selectedTypeFilter === "all") return true;
      return f.meta.fileType.toLowerCase() === selectedTypeFilter.toLowerCase();
    });
  }, [analyzedFiles, debouncedQuery, selectedTypeFilter]);

  // Virtualized file list — same reasoning as FlatFilesView.
  const {
    ref: listRef,
    start,
    end,
    padTop,
    padBottom,
    onScroll,
  } = useVirtualRows(filteredFiles.length, ROW_H);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedTypeFilter]);

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

  // Only build the ACTIVE format string synchronously on render — building all
  // 6 multi-MB format strings simultaneously was a major cause of tab-switch lag.
  const combinedText = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "No files selected. Please select one or more files from the left panel.";
    }
    return combineMultipleCodeFiles(selectedFiles, {
      style: formatStyle,
      includeLineNumbers,
      rootFolderName,
      addTableOfContents,
    });
  }, [
    selectedFiles,
    formatStyle,
    includeLineNumbers,
    rootFolderName,
    addTableOfContents,
  ]);

  // O(files) token estimates across all 6 format buttons without allocating
  // 5 unused multi-megabyte strings.
  const tokenEstimates = useMemo(() => {
    if (selectedFiles.length === 0) return null;
    const est = estimateCombinedTokensByStyle(selectedFiles, {
      includeLineNumbers,
      rootFolderName,
      addTableOfContents,
    });
    est[formatStyle] = estimateTokens(combinedText);
    return est;
  }, [
    selectedFiles,
    includeLineNumbers,
    rootFolderName,
    addTableOfContents,
    formatStyle,
    combinedText,
  ]);

  const compactSavings = useMemo(() => {
    const standard = tokenEstimates?.standard;
    const compact = tokenEstimates?.compact;
    if (!standard || !compact || standard <= 0) return 0;
    return Math.max(0, Math.round((1 - compact / standard) * 100));
  }, [tokenEstimates]);

  const totalLines = useMemo(
    () => selectedFiles.reduce((acc, f) => acc + getMetrics(f).lines, 0),
    [selectedFiles, getMetrics],
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
    void getPlatform().saveBlob(
      blob,
      `${safeName}_codefile_analysis.${meta.ext}`,
    );
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
    void getPlatform().saveBlob(blob, `${safeName}_analysis.${meta.ext}`);
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
          <div className="p-1.5 rounded-lg icon-chip border">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-semibold text-slate-100">
                CodeFile Analyzer
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-info-soft text-info text-[10px] font-mono font-medium border border-info">
                {selectedFiles.length}/{analyzedFiles.length} files
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Bundle codefiles with location &amp; type metadata.
            </p>
          </div>
        </div>

        {/* Format preset */}
        <div className="flex items-center bg-[var(--surface-inset)] rounded-lg p-0.5 border border-subtle text-xs overflow-x-auto max-w-full">
          {FORMAT_ORDER.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setFormatStyle(style)}
              title={formatTooltip(style)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                formatStyle === style
                  ? "chip-accent shadow-sm"
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
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCombined}
            disabled={selectedFiles.length === 0}
            aria-label="Download combined output file"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title={`Download unified ${FORMAT_META[formatStyle].label} file with all file metadata and contents`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .{FORMAT_META[formatStyle].ext}</span>
          </button>
        </div>
      </div>

      {/* Secrets warning banner — only when secret files are in the selection */}
      {selectedSecretFiles.length > 0 && (
        <div className="bg-danger-soft border-b border-danger px-4 py-2 flex items-center space-x-2 text-xs text-danger">
          <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
          <span className="leading-relaxed">
            <strong>Heads up:</strong> {getSecretWarning(selectedSecretFiles)}
          </span>
        </div>
      )}

      {/* Main Two-Column Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Column: File Explorer & Type Filters */}
        <div className="w-full lg:w-96 max-h-[46dvh] lg:max-h-none surface-card border-b lg:border-b-0 lg:border-r border-chrome flex flex-col shrink-0">
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

          {/* Files List — virtualized */}
          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto p-2"
          >
            {padTop > 0 && <div style={{ height: padTop }} />}
            {filteredFiles.slice(start, end).map((file) => {
              const isSelected = selectedIds.has(file.id);
              const isSecret = isSecretFile(file.name);
              const { lines, tokens } = getMetrics(file);
              return (
                <div key={file.id} style={{ height: ROW_H }} className="pb-1">
                  <div
                    onClick={() => toggleFile(file.id)}
                    className={`h-full overflow-hidden flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                      isSelected
                        ? isSecret
                          ? "bg-danger-soft border-danger"
                          : "bg-accent-soft border-accent"
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
                              ? "bg-danger-soft text-danger"
                              : "surface-raised text-info"
                          }`}
                        >
                          {file.meta.fileType}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {file.locationFromRoot}
                      </p>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-1 truncate">
                        <span>{lines} lines</span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                        {file.textContent != null && (
                          <>
                            <span>•</span>
                            <span
                              className={
                                tokens > HEAVY_FILE_TOKENS
                                  ? "text-warn font-semibold"
                                  : ""
                              }
                              title="Estimated tokens for this file"
                            >
                              ~{tokens.toLocaleString()} tok
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
                      className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                      title={`Export this single file in ${FORMAT_META[formatStyle].label} format`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {padBottom > 0 && <div style={{ height: padBottom }} />}
          </div>
        </div>

        {/* Right Column: Live Formatted Code Output Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-5xl mx-auto surface-card border border-chrome rounded-2xl shadow-lg overflow-hidden">
              {/* Slim document header with inline stats */}
              <div className="px-4 py-2 border-b border-subtle surface-inset flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
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
                    className="flex items-center space-x-1 text-slate-400 hover:text-slate-100 transition-colors"
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
