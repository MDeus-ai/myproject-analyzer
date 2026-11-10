import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Network,
  Workflow,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  FileCode2,
  Boxes,
  ExternalLink,
  Target,
  Layers,
  Code2,
  Folder,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Maximize2,
  Download,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react";
import { ProcessedFile } from "../types";
import {
  buildCodebaseDependencyGraph,
  searchCodebase,
  extractSurgicalContext,
  DepLenzSymbol,
  SymbolKind,
  DepLenzGraphNode,
  CodebaseSearchMatch,
} from "../utils/depLenz";

interface DepLenzViewProps {
  files: ProcessedFile[];
  onSelectFile?: (file: ProcessedFile) => void;
}

type SubViewMode = "graph" | "search" | "surgical";

export const DepLenzView: React.FC<DepLenzViewProps> = ({
  files,
  onSelectFile,
}) => {
  // 1. Static AST-like Analysis
  const analysis = useMemo(() => {
    return buildCodebaseDependencyGraph(files);
  }, [files]);

  // Distinct folders from files
  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      const segs = f.relativePath.split("/");
      if (segs.length > 1) {
        segs.pop();
        set.add(segs.join("/"));
      }
    });
    return Array.from(set).sort();
  }, [files]);

  // Main UI State
  const [subView, setSubView] = useState<SubViewMode>("graph");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<"all" | SymbolKind>("all");
  const [symbolFilterText, setSymbolFilterText] = useState<string>("");

  // Target Symbol State
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(() => {
    return analysis.symbols.length > 0 ? analysis.symbols[0].id : "";
  });
  const [navHistory, setNavHistory] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [searchPathFilter, setSearchPathFilter] = useState<string>("");

  // Copy feedback states
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // Update selected symbol safely if current selection is invalid
  const activeNode: DepLenzGraphNode | undefined = useMemo(() => {
    if (!selectedSymbolId && analysis.symbols.length > 0) {
      return analysis.nodesMap.get(analysis.symbols[0].id);
    }
    return (
      analysis.nodesMap.get(selectedSymbolId) ||
      (analysis.symbols.length > 0
        ? analysis.nodesMap.get(analysis.symbols[0].id)
        : undefined)
    );
  }, [selectedSymbolId, analysis]);

  // Handle symbol navigation with history tracking
  const handleSelectSymbol = useCallback(
    (symId: string) => {
      if (symId === selectedSymbolId) return;
      if (selectedSymbolId) {
        setNavHistory((prev) => [...prev, selectedSymbolId]);
      }
      setSelectedSymbolId(symId);
    },
    [selectedSymbolId],
  );

  const handleGoBack = useCallback(() => {
    if (navHistory.length === 0) return;
    const previous = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setSelectedSymbolId(previous);
  }, [navHistory]);

  // Filtered symbols for left directory list
  const filteredSymbols = useMemo(() => {
    let list = analysis.symbols;

    if (selectedFolder !== "all") {
      list = list.filter((s) => s.filePath.startsWith(selectedFolder));
    }

    if (selectedKind !== "all") {
      list = list.filter((s) => s.kind === selectedKind);
    }

    if (symbolFilterText.trim()) {
      const q = symbolFilterText.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.filePath.toLowerCase().includes(q) ||
          s.signature.toLowerCase().includes(q),
      );
    }

    return list;
  }, [analysis.symbols, selectedFolder, selectedKind, symbolFilterText]);

  // Keyword Search Matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCodebase(
      files,
      {
        query: searchQuery,
        caseSensitive,
        wholeWord,
        isRegex,
        fileFilter: searchPathFilter,
      },
      analysis.fileSymbolsMap,
    );
  }, [
    files,
    searchQuery,
    caseSensitive,
    wholeWord,
    isRegex,
    searchPathFilter,
    analysis.fileSymbolsMap,
  ]);

  // Surgical Prompt Context Bundle
  const surgicalBundle = useMemo(() => {
    if (!activeNode) return null;
    return extractSurgicalContext(activeNode.symbol.id, analysis);
  }, [activeNode, analysis]);

  // Copy helpers
  const handleCopyPrompt = async () => {
    if (!surgicalBundle) return;
    try {
      await navigator.clipboard.writeText(surgicalBundle.formattedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadPrompt = () => {
    if (!surgicalBundle) return;
    const blob = new Blob([surgicalBundle.formattedPrompt], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deplenz-surgical-${surgicalBundle.targetSymbol.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Helper to open file preview modal
  const handleOpenFileModal = (filePath: string) => {
    const match = files.find(
      (f) => f.relativePath === filePath || filePath.endsWith(f.relativePath),
    );
    if (match && onSelectFile) {
      onSelectFile(match);
    }
  };

  // Badge styling helpers
  const getKindBadgeClass = (kind: SymbolKind) => {
    switch (kind) {
      case "component":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "hook":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "function":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "class":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  const getImpactBadgeClass = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "high":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "low":
      default:
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] surface-card overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top DepLenz Sub-Header & Metrics Banner                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="surface-raised border-b border-chrome px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                DepLenz
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Web Dev Lens
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Precise function dependency trees & surgical codebase navigation
            </p>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">
              {analysis.totalFunctions}
            </span>
            <span className="text-slate-400 text-[11px]">functions</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle hidden md:flex">
            <Boxes className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-slate-200">
              {analysis.totalComponents}
            </span>
            <span className="text-slate-400 text-[11px]">components</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle hidden lg:flex">
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              {analysis.totalDependenciesMapped}
            </span>
            <span className="text-slate-400 text-[11px]">links mapped</span>
          </div>

          {analysis.totalSyntaxWarnings > 0 && (
            <button
              type="button"
              onClick={() => setShowDiagnosticsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 cursor-pointer transition-colors"
              title={`${analysis.totalSyntaxWarnings} syntax issues across ${analysis.filesWithSyntaxErrors.length} files`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">
                {analysis.totalSyntaxWarnings}
              </span>
              <span className="text-[11px] text-amber-400">syntax warnings</span>
            </button>
          )}
        </div>

        {/* Sub-view switcher */}
        <div className="flex items-center p-0.5 rounded-lg surface-card border border-chrome">
          <button
            type="button"
            onClick={() => setSubView("graph")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subView === "graph"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Dependency Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView("search")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subView === "search"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Codebase Search</span>
            {searchMatches.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-400/20 text-purple-200">
                {searchMatches.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubView("surgical")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subView === "surgical"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Surgical LLM Prompt</span>
          </button>
        </div>
      </div>

      {/* Syntax Error Warning Banner */}
      {analysis.totalSyntaxWarnings > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Syntax Warnings Detected ({analysis.totalSyntaxWarnings}):</strong>{" "}
              {analysis.filesWithSyntaxErrors.length} file(s) contain unclosed delimiters, mismatched brackets, or malformed JSON that may reduce dependency accuracy.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowDiagnosticsModal(true)}
            className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            Review {analysis.totalSyntaxWarnings} Diagnostics
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main Dual-Pane Layout                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Function Directory & Filters */}
        <aside className="w-80 md:w-96 border-r border-chrome flex flex-col surface-card shrink-0">
          {/* Filters Bar */}
          <div className="p-3 border-b border-subtle space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter functions / components…"
                value={symbolFilterText}
                onChange={(e) => setSymbolFilterText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg surface-raised border border-subtle text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {symbolFilterText && (
                <button
                  type="button"
                  onClick={() => setSymbolFilterText("")}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ×
                </button>
              )}
            </div>

            {/* Folder Scope Picker */}
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full text-xs rounded-md surface-raised border border-subtle text-slate-300 py-1 px-2 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Folders ({analysis.symbols.length})</option>
                {availableFolders.map((fld) => (
                  <option key={fld} value={fld}>
                    {fld}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol Kind Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(["all", "function", "component", "hook"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKind(k)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full capitalize font-medium transition-colors cursor-pointer shrink-0 ${
                    selectedKind === k
                      ? "bg-purple-600 text-white"
                      : "surface-raised text-slate-400 hover:text-slate-200 border border-subtle"
                  }`}
                >
                  {k === "all" ? "All Types" : k + "s"}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {filteredSymbols.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No matching functions or components found.
              </div>
            ) : (
              filteredSymbols.map((sym) => {
                const isSelected = activeNode?.symbol.id === sym.id;
                const node = analysis.nodesMap.get(sym.id);
                const impact = node ? node.impactLevel : "low";
                const totalDeps = node
                  ? node.dependencies.length + node.dependents.length
                  : 0;

                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleSelectSymbol(sym.id)}
                    className={`w-full text-left p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-purple-600/15 border-l-4 border-purple-500"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getKindBadgeClass(
                              sym.kind,
                            )}`}
                          >
                            {sym.kind}
                          </span>
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {sym.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          {sym.fileName}:{sym.lineStart}
                        </div>
                      </div>

                      {/* Impact Badge */}
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${getImpactBadgeClass(
                          impact,
                        )}`}
                        title={`${node?.dependents.length || 0} callers, ${
                          node?.dependencies.length || 0
                        } callees`}
                      >
                        {totalDeps} links
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500 truncate font-mono">
                      {sym.signature}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Interactive Content */}
        <main className="flex-1 overflow-y-auto flex flex-col surface-canvas">
          {/* MODE 1: VISUAL DEPENDENCY TREE & CALL GRAPH */}
          {subView === "graph" && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Back navigation & Target summary header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-subtle">
                <div className="flex items-center gap-2">
                  {navHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md surface-raised border border-subtle text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                  )}
                  <span className="text-xs text-slate-400">
                    Focused Symbol:
                  </span>
                  <span className="text-xs font-semibold text-purple-300 font-mono">
                    {activeNode?.symbol.name || "None"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubView("surgical")}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer shadow-sm transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Generate Surgical Prompt</span>
                  </button>
                  {activeNode && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenFileModal(activeNode.symbol.filePath)
                      }
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Full File</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Column Visual Flow: [CALLERS (Upstream)] -> [TARGET] -> [CALLEES (Downstream)] */}
              {activeNode ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Column 1: Callers / Dependents (Who calls this?) */}
                  <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 rotate-180" />
                        <span>Callers & Dependents</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full surface-raised text-amber-400 border border-amber-500/30">
                        {activeNode.dependents.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Functions/components that invoke this symbol. Changing its
                      return value or signature may affect these.
                    </p>

                    <div className="space-y-2">
                      {activeNode.dependents.length === 0 ? (
                        <div className="p-4 rounded-xl surface-card border border-subtle text-center text-xs text-slate-500">
                          Root symbol or top-level entry (no detected callers in
                          codebase)
                        </div>
                      ) : (
                        activeNode.dependents.map((dep, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectSymbol(dep.symbol.id)}
                            className="p-3 rounded-xl surface-card border border-subtle hover:border-amber-500/50 hover:bg-[var(--surface-hover)] cursor-pointer transition-all group"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getKindBadgeClass(
                                  dep.symbol.kind,
                                )}`}
                              >
                                {dep.symbol.kind}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                            </div>
                            <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 mt-1 truncate">
                              {dep.symbol.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                              {dep.symbol.fileName}:{dep.symbol.lineStart}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Selected Target Symbol Card */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="p-5 rounded-2xl surface-card border-2 border-purple-500/50 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 px-3 py-1 bg-purple-600 text-[10px] font-bold uppercase tracking-wider text-white rounded-bl-xl">
                        Target Focus
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                          <Code2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getKindBadgeClass(
                                activeNode.symbol.kind,
                              )}`}
                            >
                              {activeNode.symbol.kind}
                            </span>
                            <h3 className="text-base font-bold text-slate-100 truncate">
                              {activeNode.symbol.name}
                            </h3>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                            <span>{activeNode.symbol.filePath}</span>
                            <span>•</span>
                            <span>
                              Lines {activeNode.symbol.lineStart}–
                              {activeNode.symbol.lineEnd}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Blast Radius & Impact Meter */}
                      <div className="mt-4 p-3 rounded-xl surface-raised border border-subtle flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            Change Blast Radius
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {activeNode.impactRadius} total connected nodes
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getImpactBadgeClass(
                            activeNode.impactLevel,
                          )}`}
                        >
                          {activeNode.impactLevel} Risk
                        </span>
                      </div>

                      {/* Signature */}
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Signature
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-subtle font-mono text-xs text-purple-300 break-all">
                          {activeNode.symbol.signature}
                        </div>
                      </div>

                      {/* Implementation Preview */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Source Implementation
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCode(activeNode.symbol.body)
                            }
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedCode ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedCode ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-xl bg-black/50 border border-subtle font-mono text-xs text-slate-300 overflow-x-auto max-h-64 leading-relaxed">
                          {activeNode.symbol.body}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Callees / Dependencies (What does this call?) */}
                  <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                        <span>Dependencies & Callees</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full surface-raised text-sky-400 border border-sky-500/30">
                        {activeNode.dependencies.length +
                          activeNode.externalDependencies.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Functions or components called by this symbol, plus
                      external npm packages required.
                    </p>

                    <div className="space-y-2">
                      {activeNode.dependencies.length === 0 &&
                      activeNode.externalDependencies.length === 0 ? (
                        <div className="p-4 rounded-xl surface-card border border-subtle text-center text-xs text-slate-500">
                          Leaf node (no internal or external dependencies called)
                        </div>
                      ) : (
                        <>
                          {/* Internal Symbol Dependencies */}
                          {activeNode.dependencies.map((dep, idx) => (
                            <div
                              key={`dep-${idx}`}
                              onClick={() => handleSelectSymbol(dep.symbol.id)}
                              className="p-3 rounded-xl surface-card border border-subtle hover:border-sky-500/50 hover:bg-[var(--surface-hover)] cursor-pointer transition-all group"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getKindBadgeClass(
                                    dep.symbol.kind,
                                  )}`}
                                >
                                  {dep.symbol.kind}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                              </div>
                              <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 mt-1 truncate">
                                {dep.symbol.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                {dep.symbol.fileName}:{dep.symbol.lineStart}
                              </div>
                              {dep.viaImport && (
                                <div className="text-[9px] text-slate-500 mt-1 truncate">
                                  via {dep.viaImport}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* External npm packages */}
                          {activeNode.externalDependencies.map((pkg, idx) => (
                            <div
                              key={`pkg-${idx}`}
                              className="p-2.5 rounded-xl surface-raised border border-subtle flex items-center gap-2"
                            >
                              <Boxes className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-slate-300 block truncate">
                                  {pkg}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  external npm package
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  Select a function or component from the directory on the left
                  to view its dependency tree.
                </div>
              )}
            </div>
          )}

          {/* MODE 2: CODEBASE KEYWORD & REGEX SEARCH */}
          {subView === "search" && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Search Control Card */}
              <div className="p-4 rounded-2xl surface-card border border-chrome space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search codebase for keywords, variables, API routes, or patterns…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm rounded-xl surface-raised border border-subtle text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Query modifier buttons */}
                  <div className="flex items-center gap-1.5 surface-raised p-1 rounded-xl border border-subtle">
                    <button
                      type="button"
                      onClick={() => setCaseSensitive(!caseSensitive)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                        caseSensitive
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      title="Case Sensitive (Aa)"
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      onClick={() => setWholeWord(!wholeWord)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                        wholeWord
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      title="Match Whole Word (\b)"
                    >
                      \b
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegex(!isRegex)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                        isRegex
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      title="Regular Expression (.*)"
                    >
                      .*
                    </button>
                  </div>

                  {/* Path Filter input */}
                  <div className="w-48">
                    <input
                      type="text"
                      placeholder="Filter path (e.g. .tsx)…"
                      value={searchPathFilter}
                      onChange={(e) => setSearchPathFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl surface-raised border border-subtle text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div>
                    {searchQuery.trim() ? (
                      <span>
                        Found{" "}
                        <strong className="text-purple-300">
                          {searchMatches.length}
                        </strong>{" "}
                        matches across web development files
                      </span>
                    ) : (
                      <span>
                        Enter a keyword, method name, or regex pattern to locate
                        occurrences and enclosing functions.
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports .ts, .tsx, .js, .jsx, .vue, .svelte, .json, .css
                  </div>
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-2.5">
                {searchMatches.length === 0 ? (
                  searchQuery.trim() ? (
                    <div className="p-12 text-center text-slate-500">
                      <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No occurrences found matching "{searchQuery}".
                    </div>
                  ) : null
                ) : (
                  searchMatches.map((match) => (
                    <div
                      key={match.id}
                      className="p-3.5 rounded-xl surface-card border border-subtle hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileCode2 className="w-4 h-4 text-purple-400" />
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {match.filePath}:{match.lineNumber}:
                            {match.columnNumber}
                          </span>
                        </div>

                        {/* Enclosing function chip */}
                        {match.enclosingSymbol ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectSymbol(match.enclosingSymbol!.id);
                              setSubView("graph");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md surface-raised border border-subtle text-[11px] text-purple-300 hover:border-purple-500 cursor-pointer transition-colors"
                            title="Jump to Function Dependency Tree"
                          >
                            <Target className="w-3 h-3 text-purple-400" />
                            <span>Inside: {match.enclosingSymbol.name}()</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              ({match.enclosingSymbol.kind})
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Module scope (outside functions)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenFileModal(match.filePath)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open File</span>
                        </button>
                      </div>

                      {/* Code line with match */}
                      <pre className="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-slate-300 overflow-x-auto">
                        <span className="text-slate-500 mr-3 select-none">
                          {match.lineNumber}
                        </span>
                        {match.lineText}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MODE 3: SURGICAL LLM PROMPT SURGEON */}
          {subView === "surgical" && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Value Proposition Header */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border border-purple-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      DepLenz Surgical LLM Prompt Extractor
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Instead of pasting 50 files into an LLM and wasting
                      thousands of tokens, DepLenz extracts{" "}
                      <strong>only the target function</strong>, its{" "}
                      <strong>direct callers</strong> (so return types don't
                      break), and its <strong>dependencies</strong> with exact
                      line references.
                    </p>
                  </div>
                </div>

                {surgicalBundle && (
                  <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-mono font-semibold">
                        ~{surgicalBundle.estimatedTokens} tokens
                      </span>
                      <span>
                        Target:{" "}
                        <strong className="text-white">
                          {surgicalBundle.targetSymbol.name}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>{surgicalBundle.callers.length} callers</span>
                      <span>•</span>
                      <span>{surgicalBundle.callees.length} dependencies</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer shadow-sm transition-colors"
                      >
                        {copiedPrompt ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {copiedPrompt ? "Copied Prompt!" : "Copy for LLM"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPrompt}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-raised border border-chrome text-slate-200 hover:text-white cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save .md</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt Preview Codeblock */}
              {surgicalBundle ? (
                <div className="p-4 rounded-2xl surface-card border border-chrome">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Generated Prompt Output
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {surgicalBundle.characterCount.toLocaleString()} chars
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-black/60 border border-subtle font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed select-all">
                    {surgicalBundle.formattedPrompt}
                  </pre>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  Select a function from the directory on the left to generate
                  its surgical context bundle.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Syntax Diagnostics Review Modal */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface-card border border-chrome rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Syntax Diagnostics &amp; Warnings ({analysis.diagnostics.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Detected across {analysis.filesWithSyntaxErrors.length} file(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosticsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-relaxed">
                <strong>Why this matters:</strong> Syntax errors such as unclosed braces, mismatched brackets, or malformed JSON disrupt accurate function block delimiting and can cause downstream callers or callees to be misattributed.
              </div>

              {analysis.diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  className="p-3.5 rounded-xl surface-raised border border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-semibold text-purple-300 text-xs">
                      <FileCode2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>{diag.filePath}:{diag.line}:{diag.column}</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        diag.severity === "error"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {diag.severity}
                    </span>
                  </div>

                  <div className="text-slate-200 leading-normal">
                    {diag.message}
                  </div>

                  {diag.codeSnippet && (
                    <pre className="p-2.5 rounded-lg bg-black/50 font-mono text-[11px] text-slate-300 overflow-x-auto border border-subtle">
                      <span className="text-slate-500 mr-2 select-none">{diag.line} |</span>
                      {diag.codeSnippet}
                    </pre>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiagnosticsModal(false);
                        handleOpenFileModal(diag.filePath);
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Inspect &amp; Fix in File Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setShowDiagnosticsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
