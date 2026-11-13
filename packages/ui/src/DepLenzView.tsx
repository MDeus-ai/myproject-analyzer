import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Search,
  Network,
  Workflow,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  FileCode2,
  Boxes,
  ExternalLink,
  Target,
  Code2,
  Folder,
  ChevronRight,
  Download,
  AlertTriangle,
  X,
  Eye,
  Map as MapIcon,
  ClipboardPaste,
  FileArchive,
  FilePenLine,
  FilePlus2,
  FileX2,
  Loader2,
  GitBranch,
  ShieldCheck,
  HardDrive,
  History,
  Sparkles,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { ProcessedFile } from "@myproject/core/types";
import {
  buildCodebaseDependencyGraphAsync,
  searchCodebaseAsync,
  extractSurgicalContext,
  buildPlanPrompt,
  parsePlanResponse,
  buildPlannedContext,
  interweaveSurgicalPrompt,
  isCodeFile,
  SymbolKind,
  DepLenzGraphNode,
  DepLenzAnalysisResult,
  CodebaseSearchMatch,
  PlannedContextResult,
} from "@myproject/core/depLenz";
import {
  EvolutionEntry,
  loadEvolutionLog,
  saveEvolutionLog,
  appendEvolutionEntry,
  clearEvolutionLog,
  createEvolutionEntry,
  buildEvolutionEntryFromSmartPaste,
  formatCompactEvolutionHandover,
} from "@myproject/core/evolutionLog";
import { DepLenzGraphCanvas } from "./DepLenzGraphCanvas";
import {
  CodeSyntaxHighlighter,
  HighlightedLine,
} from "./CodeSyntaxHighlighter";
import {
  buildSmartPasteInstructions,
  parseSmartPasteResponse,
  stripSmartPasteMarkers,
  createSmartPasteZip,
  SMART_PASTE_FILE_OPEN,
  SmartPasteParseResult,
  SmartPasteChange,
} from "@myproject/core/smartPaste";
import {
  verifySmartPaste,
  VerifyReport,
} from "@myproject/core/smartPasteVerify";
import { estimateTokens } from "@myproject/core/codeAnalyzer";
import { copyToClipboard } from "@myproject/core/clipboard";
import { getPlatform } from "@myproject/platform";
import type { ApplyResult } from "@myproject/platform";
import { SmartPasteDiffPreview } from "./SmartPasteDiffPreview";
import { useDebouncedValue } from "./useDebouncedValue";
import { useVirtualRows } from "./useVirtualRows";
import { ThemedDropdown } from "./ThemedDropdown";

interface DepLenzViewProps {
  files: ProcessedFile[];
  onSelectFile?: (file: ProcessedFile) => void;
}

type SubViewMode = "graph" | "map" | "search" | "surgical" | "evolution";

const USER_ACTION_PRESETS: Array<{ label: string; prompt: string }> = [
  {
    label: "Fix Bug & Edge Cases",
    prompt:
      "Identify and fix potential bugs, null/boundary edge cases, and error handling flaws in the target symbol while keeping all upstream caller contracts intact.",
  },
  {
    label: "Optimize Performance",
    prompt:
      "Optimize the target symbol for throughput and minimal allocations without altering its external signature or breaking downstream callees.",
  },
  {
    label: "Refactor & Clean Up",
    prompt:
      "Refactor the target symbol for readability, modularity, and maintainability while preserving 100% behavioral compatibility with existing callers.",
  },
  {
    label: "Add Feature / Extend",
    prompt:
      "Extend the target symbol with the requested capability using backward-compatible parameters/fields and update affected callers if required.",
  },
  {
    label: "Type & Memory Safety",
    prompt:
      "Harden type safety, ownership/borrowing invariants, and resource cleanup across the target symbol and its immediate call boundary.",
  },
];

/** Shown while the first async analysis is in flight. */
const EMPTY_ANALYSIS: DepLenzAnalysisResult = {
  symbols: [],
  nodesMap: new Map(),
  fileSymbolsMap: new Map(),
  fileTypesMap: new Map(),
  typeIndex: new Map(),
  totalFunctions: 0,
  totalComponents: 0,
  totalHooks: 0,
  totalStructs: 0,
  totalTraits: 0,
  totalDependenciesMapped: 0,
  analyzedFilesCount: 0,
  diagnostics: [],
  totalSyntaxWarnings: 0,
  filesWithSyntaxErrors: [],
  projectStack: {
    primary: "web",
    label: "Codebase Lens",
    languages: [],
  },
  moduleClusters: [],
  moduleEdges: [],
};

/** Row height of a symbol-directory entry (p-3 + badge/name/path/signature). */
const SYM_ROW_H = 78;

export const DepLenzView: React.FC<DepLenzViewProps> = ({
  files,
  onSelectFile,
}) => {
  const debouncedFiles = useDebouncedValue(files, 350);

  // Only code files influence the graph — css/json/asset churn is ignored.
  const codeFingerprint = useMemo(
    () =>
      debouncedFiles
        .filter(isCodeFile)
        .map(
          (f) =>
            `${f.relativePath}:${f.size}:${f.lastModified}:${f.textContent?.length ?? 0}`,
        )
        .join("|"),
    [debouncedFiles],
  );

  const [analysisResult, setAnalysisResult] =
    useState<DepLenzAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const analysisSeq = useRef(0);

  useEffect(() => {
    const seq = ++analysisSeq.current;
    setIsAnalyzing(true);
    void buildCodebaseDependencyGraphAsync(debouncedFiles).then((r) => {
      if (analysisSeq.current === seq) {
        setAnalysisResult(r);
        setIsAnalyzing(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFingerprint]);

  const analysis = analysisResult ?? EMPTY_ANALYSIS;

  const canApplyToDisk = useMemo(() => {
    try {
      return (
        getPlatform().capabilities.applyToDisk &&
        files.some((f) => f.source?.kind === "path")
      );
    } catch {
      return false;
    }
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
  const [mobilePane, setMobilePane] = useState<"list" | "content">("list");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<"all" | SymbolKind>("all");
  const [symbolFilterText, setSymbolFilterText] = useState<string>("");
  const [showArchitectureBar, setShowArchitectureBar] = useState<boolean>(true);

  // Target Symbol State
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>("");
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
  const [copiedHandover, setCopiedHandover] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  // User Action Prompt state (interwoven into Surgical LLM Prompt)
  const [userActionPrompt, setUserActionPrompt] = useState<string>("");
  const [includeEvolutionInPrompt, setIncludeEvolutionInPrompt] =
    useState<boolean>(true);
  const [evolutionTokenBudget, setEvolutionTokenBudget] = useState<number>(220);

  // Project & Code Evolution Log state
  const rootKey = files[0]?.pathSegments?.[0] || "workspace";
  const [evolutionEntries, setEvolutionEntries] = useState<EvolutionEntry[]>(
    [],
  );
  const [manualLogSummary, setManualLogSummary] = useState<string>("");
  const [manualLogFiles, setManualLogFiles] = useState<string>("");

  // Load or seed project Evolution Log when rootKey or analysis changes
  useEffect(() => {
    const stored = loadEvolutionLog(rootKey);
    if (stored.length > 0) {
      setEvolutionEntries(stored);
      return;
    }
    if (analysis.symbols.length === 0) return;
    // Seed initial baseline evolution entries tailored to the loaded project
    const firstSym = analysis.symbols[0];
    const secondSym = analysis.symbols[1] ?? firstSym;
    const seeded: EvolutionEntry[] = [
      createEvolutionEntry({
        source: "snapshot",
        summary: `Initial ${analysis.projectStack?.label || "codebase"} graph indexed (${analysis.symbols.length} symbols, ${analysis.totalDependenciesMapped} links)`,
        targetSymbol: firstSym.name,
        changes: [
          {
            path: firstSym.filePath,
            action: "modify",
            addedLines: firstSym.lineEnd - firstSym.lineStart + 1,
            removedLines: 0,
            symbolsChanged: [firstSym.name],
          },
        ],
      }),
      createEvolutionEntry({
        source: "manual",
        summary: `Verified call-graph contract between ${firstSym.name} and ${secondSym.name}`,
        targetSymbol: secondSym.name,
        changes: [
          {
            path: secondSym.filePath,
            action: "modify",
            addedLines: 6,
            removedLines: 2,
            symbolsChanged: [secondSym.name],
          },
        ],
      }),
    ];
    saveEvolutionLog(rootKey, seeded);
    setEvolutionEntries(seeded);
  }, [rootKey, analysis.symbols.length, analysis.projectStack?.label, analysis.totalDependenciesMapped]);

  // Smart Paste state
  const [smartPasteEnabled, setSmartPasteEnabled] = useState<boolean>(true);
  const [smartPasteMarkers, setSmartPasteMarkers] = useState<boolean>(true);
  const [smartPasteInput, setSmartPasteInput] = useState<string>("");
  const [smartPasteResult, setSmartPasteResult] =
    useState<SmartPasteParseResult | null>(null);
  const [copiedSmartPath, setCopiedSmartPath] = useState<string | null>(null);
  const [isZippingSmartPaste, setIsZippingSmartPaste] = useState(false);

  // Apply-to-disk (Phase 3, desktop only)
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [applyDryRun, setApplyDryRun] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  // Two-step plan mode (2c)
  const [planMode, setPlanMode] = useState<boolean>(false);
  const [planInput, setPlanInput] = useState<string>("");
  const [plannedResult, setPlannedResult] =
    useState<PlannedContextResult | null>(null);
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Verification pipeline (Stages 1-5)
  const [verifyReport, setVerifyReport] = useState<VerifyReport | null>(null);
  const [expandedDiffPath, setExpandedDiffPath] = useState<string | null>(null);
  const [isSyntaxBannerDismissed, setIsSyntaxBannerDismissed] = useState(false);
  const [isSmartPasteWarningsDismissed, setIsSmartPasteWarningsDismissed] =
    useState(false);

  useEffect(() => {
    setSelectedSymbolId((prev) =>
      prev && analysis.nodesMap.has(prev)
        ? prev
        : analysis.symbols.length > 0
          ? analysis.symbols[0].id
          : "",
    );
  }, [analysis]);

  useEffect(() => {
    setNavHistory([]);
    setSmartPasteInput("");
    setSmartPasteResult(null);
    setVerifyReport(null);
    setApplyResult(null);
    setShowApplyConfirm(false);
    setPlanInput("");
    setPlannedResult(null);
    setExpandedDiffPath(null);
    setIsSyntaxBannerDismissed(false);
    setIsSmartPasteWarningsDismissed(false);
    setMobilePane("list");
    setSelectedFolder("all");
    setSelectedKind("all");
  }, [rootKey]);

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
      setMobilePane("content"); // jump straight to the detail pane on phones
    },
    [selectedSymbolId],
  );

  const handleGoBack = useCallback(() => {
    if (navHistory.length === 0) return;
    const previous = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setSelectedSymbolId(previous);
  }, [navHistory]);

  // Focus a symbol from the Codebase Map: select it and open the tree view.
  const handleFocusFromMap = useCallback(
    (symId: string) => {
      handleSelectSymbol(symId);
      setSubView("graph");
    },
    [handleSelectSymbol],
  );

  // Filtered symbols for left directory list
  const filteredSymbols = useMemo(() => {
    let list = analysis.symbols;

    if (selectedFolder !== "all") {
      const prefix = selectedFolder.endsWith("/")
        ? selectedFolder
        : `${selectedFolder}/`;
      list = list.filter(
        (s) => s.filePath === selectedFolder || s.filePath.startsWith(prefix),
      );
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

  // Virtualized symbol directory — large codebases have thousands of symbols.
  const {
    ref: symListRef,
    start: symStart,
    end: symEnd,
    padTop: symPadTop,
    padBottom: symPadBottom,
    onScroll: onSymListScroll,
  } = useVirtualRows(filteredSymbols.length, SYM_ROW_H);

  // Reset scroll when the directory filter set changes.
  useEffect(() => {
    symListRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, selectedKind, symbolFilterText]);

  // ------------------------------------------------------------------
  // Keyword Search — debounced + async (was: synchronous useMemo scanning
  // every file's content on each keystroke).
  // ------------------------------------------------------------------
  const debouncedQuery = useDebouncedValue(searchQuery, 150);
  const [searchMatches, setSearchMatches] = useState<CodebaseSearchMatch[]>([]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchMatches([]);
      return;
    }
    let live = true;
    void searchCodebaseAsync(
      files,
      {
        query: debouncedQuery,
        caseSensitive,
        wholeWord,
        isRegex,
        fileFilter: searchPathFilter,
      },
      analysis.fileSymbolsMap,
    ).then((r) => {
      if (live) setSearchMatches(r);
    });
    return () => {
      live = false;
    };
  }, [
    debouncedQuery,
    caseSensitive,
    wholeWord,
    isRegex,
    searchPathFilter,
    files,
    analysis,
  ]);

  // Surgical Prompt Context Bundle — 2b: receives the files so the complete
  // target file (imports included) is embedded in the prompt.
  const surgicalBundle = useMemo(() => {
    if (!activeNode) return null;
    return extractSurgicalContext(activeNode.symbol.id, analysis, files);
  }, [activeNode, analysis, files]);

  // Smart Paste: structured output contract generated FROM the live
  // dependency tree — callers that must keep compiling, callees to reuse,
  // and packages already available to the target.
  const smartPasteInstructions = useMemo(() => {
    if (!activeNode || !smartPasteEnabled) return "";
    return buildSmartPasteInstructions({
      targetName: activeNode.symbol.name,
      targetFilePath: activeNode.symbol.filePath,
      targetSignature: activeNode.symbol.signature,
      callers: activeNode.dependents.map((d) => ({
        name: d.symbol.name,
        filePath: d.symbol.filePath,
        signature: d.symbol.signature,
      })),
      callees: activeNode.dependencies.map((d) => ({
        name: d.symbol.name,
        filePath: d.symbol.filePath,
        signature: d.symbol.signature,
      })),
      externalPackages: activeNode.externalDependencies,
      // 3a/contract v1.1: the exact set of files this change can touch.
      touchedFiles: surgicalBundle
        ? [
            activeNode.symbol.filePath,
            ...activeNode.dependents.map((d) => d.symbol.filePath),
            ...activeNode.dependencies.map((d) => d.symbol.filePath),
          ].filter((p, i, a) => a.indexOf(p) === i)
        : undefined,
      includeMarkers: smartPasteMarkers,
    });
  }, [activeNode, smartPasteEnabled, smartPasteMarkers, surgicalBundle]);

  // Token-efficient evolution handover string
  const evolutionHandoverResult = useMemo(
    () => formatCompactEvolutionHandover(evolutionEntries, evolutionTokenBudget),
    [evolutionEntries, evolutionTokenBudget],
  );

  // Two-step plan mode (2c): step-1 prompt (map + symbol index only), interwoven with user action & handover.
  const planPrompt = useMemo(() => {
    if (!planMode || !activeNode) return "";
    const basePlan = buildPlanPrompt(activeNode.symbol.id, analysis, files) ?? "";
    return interweaveSurgicalPrompt(basePlan, {
      userActionPrompt,
      evolutionHandover: includeEvolutionInPrompt
        ? evolutionHandoverResult.text
        : undefined,
    });
  }, [
    planMode,
    activeNode,
    analysis,
    files,
    userActionPrompt,
    includeEvolutionInPrompt,
    evolutionHandoverResult.text,
  ]);

  const handleParsePlan = useCallback(() => {
    if (!activeNode || !planInput.trim()) return;
    const plan = parsePlanResponse(planInput);
    if (plan.length === 0) return;
    const result = buildPlannedContext(
      activeNode.symbol.id,
      plan,
      analysis,
      files,
    );
    setPlannedResult(result);
  }, [activeNode, planInput, analysis, files]);

  const finalPrompt = useMemo(() => {
    let raw = "";
    if (plannedResult) {
      raw = smartPasteInstructions
        ? `${plannedResult.prompt}\n\n${smartPasteInstructions}`
        : plannedResult.prompt;
    } else if (surgicalBundle) {
      raw = smartPasteInstructions
        ? `${surgicalBundle.formattedPrompt}\n\n${smartPasteInstructions}`
        : surgicalBundle.formattedPrompt;
    } else {
      return "";
    }
    return interweaveSurgicalPrompt(raw, {
      userActionPrompt,
      evolutionHandover: includeEvolutionInPrompt
        ? evolutionHandoverResult.text
        : undefined,
    });
  }, [
    plannedResult,
    surgicalBundle,
    smartPasteInstructions,
    userActionPrompt,
    includeEvolutionInPrompt,
    evolutionHandoverResult.text,
  ]);

  const finalPromptTokens = useMemo(
    () => (finalPrompt ? estimateTokens(finalPrompt) : 0),
    [finalPrompt],
  );

  // Copy helpers
  const handleCopyPrompt = async () => {
    if (!finalPrompt) return;
    const ok = await copyToClipboard(finalPrompt);
    if (ok) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const handleDownloadPrompt = () => {
    if (!surgicalBundle || !finalPrompt) return;
    const blob = new Blob([finalPrompt], {
      type: "text/markdown;charset=utf-8",
    });
    void getPlatform().saveBlob(
      blob,
      `deplenz-surgical-${surgicalBundle.targetSymbol.name}.md`,
    );
  };

  const handleCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyEvolutionHandover = async () => {
    if (!evolutionHandoverResult.text) return;
    const ok = await copyToClipboard(evolutionHandoverResult.text);
    if (ok) {
      setCopiedHandover(true);
      setTimeout(() => setCopiedHandover(false), 2200);
    }
  };

  const handleAddManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLogSummary.trim()) return;
    const parsedPaths = manualLogFiles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const changes =
      parsedPaths.length > 0
        ? parsedPaths.map((p) => ({
            path: p,
            action: "modify" as const,
            addedLines: 4,
            removedLines: 1,
            symbolsChanged: activeNode ? [activeNode.symbol.name] : [],
          }))
        : activeNode
          ? [
              {
                path: activeNode.symbol.filePath,
                action: "modify" as const,
                addedLines: 5,
                removedLines: 1,
                symbolsChanged: [activeNode.symbol.name],
              },
            ]
          : [];
    const entry = createEvolutionEntry({
      source: "manual",
      summary: manualLogSummary.trim(),
      targetSymbol: activeNode?.symbol.name,
      userTaskPrompt: userActionPrompt.trim() || undefined,
      changes,
    });
    const next = appendEvolutionEntry(rootKey, entry);
    setEvolutionEntries(next);
    setManualLogSummary("");
    setManualLogFiles("");
  };

  const handleDeleteEvolutionEntry = (id: string) => {
    const next = evolutionEntries.filter((e) => e.id !== id);
    saveEvolutionLog(rootKey, next);
    setEvolutionEntries(next);
  };

  const handleClearEvolutionLog = () => {
    clearEvolutionLog(rootKey);
    setEvolutionEntries([]);
  };

  // Smart Paste: parse the pasted LLM response into per-file changes, then
  // run the 5-stage verification pipeline BEFORE anything is applied, and
  // record a token-efficient Evolution Log entry.
  const handleParseSmartPaste = useCallback(() => {
    if (!smartPasteInput.trim()) return;
    const result = parseSmartPasteResponse(smartPasteInput, files);
    setSmartPasteResult(result);
    setVerifyReport(
      verifySmartPaste(result, files, analysis, {
        markersExpected: smartPasteMarkers,
      }),
    );
    if (result.changes.length > 0) {
      const evoEntry = buildEvolutionEntryFromSmartPaste({
        changes: result.changes,
        manifest: result.manifest,
        originalFiles: files,
        targetSymbol: activeNode?.symbol.name,
        userTaskPrompt: userActionPrompt.trim() || undefined,
      });
      const next = appendEvolutionEntry(rootKey, evoEntry);
      setEvolutionEntries(next);
    }
  }, [
    smartPasteInput,
    files,
    analysis,
    smartPasteMarkers,
    activeNode,
    userActionPrompt,
    rootKey,
  ]);

  const handleCopySmartChange = useCallback(
    async (change: SmartPasteChange) => {
      const content = smartPasteMarkers
        ? change.content
        : stripSmartPasteMarkers(change.content);
      const ok = await copyToClipboard(content);
      if (ok) {
        setCopiedSmartPath(change.path);
        setTimeout(() => setCopiedSmartPath(null), 2000);
      }
    },
    [smartPasteMarkers],
  );

  const handleSmartPasteZip = useCallback(async () => {
    if (!smartPasteResult || smartPasteResult.changes.length === 0) return;
    setIsZippingSmartPaste(true);
    try {
      const blob = await createSmartPasteZip(smartPasteResult.changes, {
        stripMarkers: !smartPasteMarkers,
      });
      const target = surgicalBundle?.targetSymbol.name ?? "changes";
      await getPlatform().saveBlob(blob, `deplenz-smart-paste-${target}.zip`);
    } catch (err) {
      console.error("Failed to create Smart Paste ZIP:", err);
    } finally {
      setIsZippingSmartPaste(false);
    }
  }, [smartPasteResult, smartPasteMarkers, surgicalBundle]);

  /* ---- Apply-to-disk (Phase 3) ---- */

  const handleApplyToDisk = useCallback(
    async (force: boolean) => {
      if (!smartPasteResult || smartPasteResult.changes.length === 0) return;
      const platform = getPlatform();
      if (!platform.applyChanges) return;
      setIsApplying(true);
      setApplyResult(null);
      setShowApplyConfirm(false);
      try {
        const result = await platform.applyChanges(smartPasteResult.changes, {
          dryRun: applyDryRun,
          stripMarkers: !smartPasteMarkers,
          force,
        });
        setApplyResult(result);
        if (result.ok && !applyDryRun) {
          const evoEntry = buildEvolutionEntryFromSmartPaste({
            changes: smartPasteResult.changes,
            manifest: smartPasteResult.manifest,
            originalFiles: files,
            targetSymbol: activeNode?.symbol.name,
            userTaskPrompt: userActionPrompt.trim() || undefined,
          });
          const next = appendEvolutionEntry(rootKey, evoEntry);
          setEvolutionEntries(next);
        }
      } catch (err) {
        setApplyResult({
          ok: false,
          files: [],
          errors: [err instanceof Error ? err.message : String(err)],
        });
      } finally {
        setIsApplying(false);
      }
    },
    [
      smartPasteResult,
      applyDryRun,
      smartPasteMarkers,
      files,
      activeNode,
      userActionPrompt,
      rootKey,
    ],
  );

  /** Errors block by default; the only way past is the force-confirm dialog. */
  const handleApplyClick = useCallback(() => {
    if ((verifyReport?.errorCount ?? 0) > 0) {
      setShowApplyConfirm(true);
    } else {
      void handleApplyToDisk(false);
    }
  }, [verifyReport, handleApplyToDisk]);

  const handleOpenFileModal = (filePath: string) => {
    const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const match =
      files.find((f) => f.relativePath === normalized) ||
      files.find((f) => normalized.endsWith(`/${f.relativePath}`));
    if (match && onSelectFile) {
      onSelectFile(match);
    }
  };

  const getKindBadgeClass = (kind: SymbolKind) => `kind-badge kind-${kind}`;

  const getImpactBadgeClass = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "high":
        return "bg-danger-soft text-danger border-danger";
      case "medium":
        return "bg-warn-soft text-warn border-warn";
      case "low":
      default:
        return "bg-ok-soft text-ok border-ok";
    }
  };

  // Distinct symbol kinds present in the codebase
  const availableSymbolKinds = useMemo(() => {
    const present = new Set<SymbolKind>();
    for (const s of analysis.symbols) present.add(s.kind);
    const ordered: SymbolKind[] = [
      "function",
      "component",
      "hook",
      "struct",
      "trait",
      "class",
      "method",
    ];
    const filtered = ordered.filter((k) => present.has(k));
    return filtered.length > 0
      ? filtered
      : (["function", "component", "hook"] as SymbolKind[]);
  }, [analysis.symbols]);

  return (
    <div className="flex flex-col h-full surface-card overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top DepLenz Sub-Header & Metrics Banner                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="surface-raised border-b border-chrome px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg icon-chip border flex items-center justify-center shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                DepLenz
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full chip-accent border">
                {analysis.projectStack?.label || "Polyglot Lens"}
              </span>
              {analysis.projectStack?.languages &&
                analysis.projectStack.languages.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">
                    {analysis.projectStack.languages.slice(0, 3).join(" · ")}
                  </span>
                )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multi-language dependency trees, component &amp; struct topology,
              and surgical LLM prompts
            </p>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300">
          {isAnalyzing && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle text-slate-400"
              title="Rebuilding the dependency graph"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px] hidden sm:inline">Analyzing…</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">
              {analysis.totalFunctions}
            </span>
            <span className="text-slate-400 text-[11px]">fn/methods</span>
          </div>
          {analysis.totalComponents > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle">
              <Boxes className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-slate-200">
                {analysis.totalComponents}
              </span>
              <span className="text-slate-400 text-[11px]">components</span>
            </div>
          )}
          {((analysis.totalStructs ?? 0) > 0 ||
            (analysis.totalTraits ?? 0) > 0) && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-200">
                {(analysis.totalStructs ?? 0) + (analysis.totalTraits ?? 0)}
              </span>
              <span className="text-slate-400 text-[11px]">structs/traits</span>
            </div>
          )}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card border border-subtle">
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warn-soft border border-warn text-warn hover:opacity-90 cursor-pointer transition-colors"
              title={`${analysis.totalSyntaxWarnings} syntax issues across ${analysis.filesWithSyntaxErrors.length} files`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-warn" />
              <span className="font-semibold text-warn">
                {analysis.totalSyntaxWarnings}
              </span>
              <span className="text-[11px] text-warn">syntax warnings</span>
            </button>
          )}
        </div>

        {/* Mobile-only: return to the symbol directory */}
        <button
          type="button"
          onClick={() => setMobilePane("list")}
          className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            mobilePane === "list"
              ? "bg-purple-600 text-white border-purple-600"
              : "surface-card text-slate-300 border-chrome"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Symbols</span>
        </button>

        {/* Sub-view switcher */}
        <div className="flex items-center p-0.5 rounded-lg surface-card border border-chrome overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setSubView("graph");
              setMobilePane("content");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer shrink-0 ${
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
            onClick={() => {
              setSubView("map");
              setMobilePane("content");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer shrink-0 ${
              subView === "map"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Codebase Map</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubView("search");
              setMobilePane("content");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer shrink-0 ${
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
            onClick={() => {
              setSubView("surgical");
              setMobilePane("content");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer shrink-0 ${
              subView === "surgical"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Surgical LLM Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubView("evolution");
              setMobilePane("content");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer shrink-0 ${
              subView === "evolution"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Evolution Log</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] surface-raised text-slate-300 font-mono">
              {evolutionEntries.length}
            </span>
          </button>
        </div>
      </div>

      {/* Syntax Error Warning Banner */}
      {analysis.totalSyntaxWarnings > 0 && !isSyntaxBannerDismissed && (
        <div className="bg-warn-soft border-b border-warn px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-warn shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0" />
            <span className="truncate">
              <strong>
                Syntax Warnings Detected ({analysis.totalSyntaxWarnings}):
              </strong>{" "}
              {analysis.filesWithSyntaxErrors.length} file(s) contain unclosed
              delimiters, mismatched brackets, or malformed JSON that may reduce
              dependency accuracy.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDiagnosticsModal(true)}
              className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-warn border border-warn font-semibold cursor-pointer transition-colors shrink-0 whitespace-nowrap"
            >
              Review {analysis.totalSyntaxWarnings} Diagnostics
            </button>
            <button
              type="button"
              onClick={() => setIsSyntaxBannerDismissed(true)}
              aria-label="Close syntax warnings banner"
              data-testid="close-syntax-warning"
              title="Close warning"
              className="p-1 rounded-md text-warn hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main Dual-Pane Layout                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT PANE: Function Directory & Filters — full-width pane on mobile */}
        <aside
          className={`${
            mobilePane === "content" ? "hidden" : "flex"
          } md:flex w-full md:w-80 lg:w-96 border-r border-chrome flex-col surface-card shrink-0`}
        >
          {/* Filters Bar */}
          <div className="p-3 border-b border-subtle space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter functions, structs, traits, components…"
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
            <div className="flex items-center">
              <ThemedDropdown<string>
                value={selectedFolder}
                onChange={setSelectedFolder}
                ariaLabel="Filter symbols by folder"
                menuTitle="Scope Symbols to Folder"
                triggerIcon={<Folder className="w-3.5 h-3.5" />}
                triggerClassName="w-full"
                menuWidthClass="w-72"
                options={[
                  {
                    value: "all",
                    label: "All Folders",
                    badge: String(analysis.symbols.length),
                  },
                  ...availableFolders.map((fld) => ({
                    value: fld,
                    label: fld,
                  })),
                ]}
              />
            </div>

            {/* Symbol Kind Pills (adaptive to Web / Rust / C++ codebases) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(["all", ...availableSymbolKinds] as ("all" | SymbolKind)[]).map(
                (k) => (
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
                    {k === "all"
                      ? "All Types"
                      : k === "class"
                        ? "Classes"
                        : `${k}s`}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Symbol List — virtualized: large codebases have thousands of
              symbols; only the visible window is mounted. */}
          <div
            ref={symListRef}
            onScroll={onSymListScroll}
            className="flex-1 overflow-y-auto"
          >
            {filteredSymbols.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {isAnalyzing
                  ? "Analyzing codebase…"
                  : "No matching functions or components found."}
              </div>
            ) : (
              <>
                {symPadTop > 0 && <div style={{ height: symPadTop }} />}
                {filteredSymbols.slice(symStart, symEnd).map((sym) => {
                  const isSelected = activeNode?.symbol.id === sym.id;
                  const node = analysis.nodesMap.get(sym.id);
                  const impact = node ? node.impactLevel : "low";
                  const totalDeps = node
                    ? node.dependencies.length + node.dependents.length
                    : 0;

                  return (
                    <div
                      key={sym.id}
                      style={{ height: SYM_ROW_H }}
                      className="border-b border-subtle"
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSymbol(sym.id)}
                        className={`w-full h-full overflow-hidden text-left p-3 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-accent-soft border-l-4 border-accent"
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
                    </div>
                  );
                })}
                {symPadBottom > 0 && <div style={{ height: symPadBottom }} />}
              </>
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Interactive Content */}
        <main
          className={`${
            mobilePane === "list" ? "hidden" : "flex"
          } md:flex flex-1 overflow-y-auto flex-col surface-canvas min-w-0`}
        >
          {/* MODE 1: VISUAL DEPENDENCY TREE & CALL GRAPH */}
          {subView === "graph" && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Subsystem & Module Communication Architecture Strip */}
              {analysis.moduleClusters &&
                analysis.moduleClusters.length > 0 && (
                  <div className="rounded-2xl surface-card border border-chrome p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-slate-100">
                          Codebase Subsystems &amp; Component Communication
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full surface-raised border border-subtle text-slate-400">
                          {analysis.moduleClusters.length} modules ·{" "}
                          {analysis.moduleEdges?.length ?? 0} cross-module channels
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowArchitectureBar((v) => !v)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer font-mono"
                      >
                        {showArchitectureBar ? "Hide topology" : "Show topology"}
                      </button>
                    </div>

                    {showArchitectureBar && (
                      <div className="space-y-2.5">
                        {/* Module cluster pills */}
                        <div className="flex flex-wrap gap-2">
                          {analysis.moduleClusters.slice(0, 8).map((mod) => {
                            const isFiltered = selectedFolder === mod.name;
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() =>
                                  setSelectedFolder(
                                    isFiltered ? "all" : mod.name,
                                  )
                                }
                                className={`text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                                  isFiltered
                                    ? "bg-accent-soft border-accent"
                                    : "surface-raised border-subtle hover:border-chrome"
                                }`}
                                title={`Filter symbols to module ${mod.name}`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-bold text-slate-100">
                                      {mod.name}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded chip-accent border font-semibold">
                                      {mod.role}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {mod.symbolIds.length} symbols · {mod.fileCount}{" "}
                                    files · {mod.inboundCalls} in /{" "}
                                    {mod.outboundCalls} out
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Cross-module communication edges */}
                        {analysis.moduleEdges &&
                          analysis.moduleEdges.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-subtle text-[10px] font-mono text-slate-400">
                              <span className="text-slate-500 uppercase tracking-wider font-sans font-semibold mr-1">
                                Active Flows:
                              </span>
                              {analysis.moduleEdges.slice(0, 6).map((edge) => (
                                <span
                                  key={edge.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md surface-inset border border-subtle text-slate-300"
                                  title={`Examples: ${(edge.examples || []).join(", ")}`}
                                >
                                  <span>{edge.sourceModule}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                                  <span>{edge.targetModule}</span>
                                  <span className="text-accent">
                                    ({edge.callCount})
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

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
                  <span className="text-xs font-semibold text-accent font-mono">
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
                        <ArrowRight className="w-3.5 h-3.5 text-warn rotate-180" />
                        <span>Callers & Dependents</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full surface-raised text-warn border border-warn">
                        {activeNode.dependents.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Functions/components/methods that invoke or reference this
                      symbol. Changing its return value or signature may affect
                      these.
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
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-warn transition-colors" />
                            </div>
                            <div className="text-xs font-semibold text-slate-200 group-hover:text-warn mt-1 truncate">
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
                            {activeNode.directCallers} callers ·{" "}
                            {activeNode.directCallees} callees · blast{" "}
                            {activeNode.blastRadius}
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

                      {/* Signature (Syntax Colored) */}
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Signature
                        </div>
                        <div className="p-2.5 rounded-lg code-well border border-subtle font-mono code-scaled break-all">
                          <HighlightedLine line={activeNode.symbol.signature} />
                        </div>
                      </div>

                      {/* Implementation Preview (Syntax Colored with Line Numbers) */}
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
                              <Check className="w-3 h-3 text-ok" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedCode ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <div className="py-2 rounded-xl code-well border border-subtle max-h-72 overflow-y-auto">
                          <CodeSyntaxHighlighter
                            code={activeNode.symbol.body}
                            filePath={activeNode.symbol.filePath}
                            startLine={activeNode.symbol.lineStart}
                            showLineNumbers={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Callees / Dependencies (What does this call?) */}
                  <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <ArrowRight className="w-3.5 h-3.5 text-info" />
                        <span>Dependencies & Callees</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full surface-raised text-info border border-info">
                        {activeNode.dependencies.length +
                          activeNode.externalDependencies.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Functions, structs, traits, or components called by this
                      symbol, plus external packages/crates/headers required.
                    </p>

                    <div className="space-y-2">
                      {activeNode.dependencies.length === 0 &&
                      activeNode.externalDependencies.length === 0 ? (
                        <div className="p-4 rounded-xl surface-card border border-subtle text-center text-xs text-slate-500">
                          Leaf node (no internal or external dependencies
                          called)
                        </div>
                      ) : (
                        <>
                          {/* Internal Symbol Dependencies */}
                          {activeNode.dependencies.map((dep, idx) => (
                            <div
                              key={`dep-${idx}`}
                              onClick={() => handleSelectSymbol(dep.symbol.id)}
                              className="p-3 rounded-xl surface-card border border-subtle hover:border-info hover:bg-[var(--surface-hover)] cursor-pointer transition-all group"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getKindBadgeClass(
                                    dep.symbol.kind,
                                  )}`}
                                >
                                  {dep.symbol.kind}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-info transition-colors" />
                              </div>
                              <div className="text-xs font-semibold text-slate-200 group-hover:text-info mt-1 truncate">
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

                          {/* External packages / crates / system headers */}
                          {activeNode.externalDependencies.map((pkg, idx) => (
                            <div
                              key={`pkg-${idx}`}
                              className="p-2.5 rounded-xl surface-raised border border-subtle flex items-center gap-2"
                            >
                              <Boxes className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-slate-300 block truncate font-mono">
                                  {pkg}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  external dependency / header
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
                  {isAnalyzing
                    ? "Analyzing codebase…"
                    : "Select a function, struct, or component from the directory on the left to view its dependency tree."}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: WHOLE-CODEBASE VISUAL MAP */}
          {subView === "map" && (
            <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col">
              <DepLenzGraphCanvas
                analysis={analysis}
                selectedId={activeNode?.symbol.id ?? null}
                onFocusSymbol={handleFocusFromMap}
              />
            </div>
          )}

          {/* MODE 3: CODEBASE KEYWORD & REGEX SEARCH */}
          {subView === "search" && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Search Control Card */}
              <div className="p-4 rounded-2xl surface-card border border-chrome space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search codebase for keywords, structs, traits, C++ classes, API routes, or patterns…"
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
                      placeholder="Filter path (.rs, .cpp, .tsx)…"
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
                        <strong className="text-accent">
                          {searchMatches.length}
                        </strong>{" "}
                        matches across codebase files
                      </span>
                    ) : (
                      <span>
                        Enter a keyword, function/struct name, or regex pattern
                        to locate occurrences and enclosing symbols.
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports Web (.ts, .tsx, .js), Rust (.rs, .toml), C/C++
                    (.cpp, .hpp, .c, .h)
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
                            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md surface-raised border border-subtle text-[11px] text-accent hover:border-purple-500 cursor-pointer transition-colors"
                            title="Jump to Function Dependency Tree"
                          >
                            <Target className="w-3 h-3 text-purple-400" />
                            <span>Inside: {match.enclosingSymbol.name}</span>
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

                      {/* Syntax-colored code line with match */}
                      <pre className="p-2.5 rounded-lg code-well border border-subtle font-mono code-scaled text-slate-300 overflow-x-auto">
                        <span className="text-slate-500 mr-3 select-none">
                          {match.lineNumber}
                        </span>
                        <HighlightedLine line={match.lineText} />
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MODE 4: SURGICAL LLM PROMPT SURGEON */}
          {subView === "surgical" && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Value Proposition Header */}
              <div className="p-5 rounded-2xl surface-raised border border-chrome border-l-2 border-l-purple-500">
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
                      <strong>only the target symbol</strong>, its{" "}
                      <strong>direct callers</strong> (so return types &amp;
                      contracts don't break), and its{" "}
                      <strong>dependencies</strong> with exact line references.
                    </p>
                  </div>
                </div>

                {surgicalBundle && (
                  <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-mono font-semibold">
                        ~{finalPromptTokens.toLocaleString()} tokens
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
                          <Check className="w-3.5 h-3.5 text-ok" />
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

              {/* USER ACTION PROMPT — Automatically interwoven into generated prompt output */}
              <div className="p-4 sm:p-5 rounded-2xl surface-card border border-chrome space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg icon-chip border flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100">
                          User Action Prompt
                        </h4>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full chip-accent border">
                          Auto-Interwoven
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Specify the exact task or modification for{" "}
                        <code className="text-slate-200">
                          {activeNode?.symbol.name || "target"}
                        </code>
                        . Automatically woven into the Surgical Prompt &amp;
                        Plan output below.
                      </p>
                    </div>
                  </div>

                  {/* Include Evolution Log Handover toggle */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-300">
                    <label
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                      title="Include token-efficient Project Evolution Log handover context in the prompt"
                    >
                      <input
                        type="checkbox"
                        checked={includeEvolutionInPrompt}
                        onChange={(e) =>
                          setIncludeEvolutionInPrompt(e.target.checked)
                        }
                        className="rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
                      />
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Include Evolution Handover (~
                        {evolutionHandoverResult.estimatedTokens} tok)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Quick-action preset chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">
                    Quick Actions:
                  </span>
                  {USER_ACTION_PRESETS.map((preset) => {
                    const isActive = userActionPrompt === preset.prompt;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setUserActionPrompt(isActive ? "" : preset.prompt)
                        }
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isActive
                            ? "chip-accent font-semibold"
                            : "surface-raised border-subtle text-slate-300 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  {userActionPrompt && (
                    <button
                      type="button"
                      onClick={() => setUserActionPrompt("")}
                      className="text-[11px] px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  value={userActionPrompt}
                  onChange={(e) => setUserActionPrompt(e.target.value)}
                  placeholder={`Describe what the LLM should do to ${
                    activeNode?.symbol.name || "this symbol"
                  } (e.g. "Add retry backoff on network timeout and propagate structured errors to callers")…`}
                  rows={2}
                  className="w-full p-3 rounded-xl code-well border border-subtle text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-y"
                />
              </div>

              {/* SMART PASTE: structured output settings */}
              <div className="p-4 rounded-2xl surface-card border border-chrome flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl icon-chip border flex items-center justify-center shrink-0">
                    <ClipboardPaste className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-100">
                        Smart Paste
                      </h4>
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-ok-soft text-ok border border-ok">
                        Paste-back ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Appends a structured output contract: the LLM returns
                      complete files in parseable blocks mapped to this
                      dependency tree — ready for the Smart Paste Inbox below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-300 shrink-0">
                  <label
                    className="flex items-center gap-1.5 cursor-pointer"
                    title="Append the Smart Paste output contract to the prompt"
                  >
                    <input
                      type="checkbox"
                      checked={smartPasteEnabled}
                      onChange={(e) => setSmartPasteEnabled(e.target.checked)}
                      className="rounded border-slate-700 bg-transparent text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Enable Smart Paste</span>
                  </label>
                  <label
                    className={`flex items-center gap-1.5 ${
                      smartPasteEnabled
                        ? "cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                    title="Ask the LLM to mark every added/modified block with a [SMART-PASTE] comment"
                  >
                    <input
                      type="checkbox"
                      checked={smartPasteMarkers}
                      disabled={!smartPasteEnabled}
                      onChange={(e) => setSmartPasteMarkers(e.target.checked)}
                      className="rounded border-slate-700 bg-transparent text-emerald-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>Marker comments</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanMode((p) => !p);
                      setPlannedResult(null);
                      setPlanInput("");
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                      planMode
                        ? "chip-accent"
                        : "surface-raised border-chrome text-slate-300 hover:text-white"
                    }`}
                    title="Two-step mode: first ask the model which files it will touch, then get a right-sized context for exactly those"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Two-step plan</span>
                  </button>
                </div>
              </div>

              {/* TWO-STEP PLAN MODE (2c) */}
              {planMode && activeNode && (
                <div className="p-4 rounded-2xl surface-card border border-chrome space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      Step 1 — send the map, get back a plan
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(planPrompt);
                        if (ok) {
                          setCopiedPlan(true);
                          setTimeout(() => setCopiedPlan(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer"
                    >
                      {copiedPlan ? (
                        <Check className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedPlan ? "Copied!" : "Copy plan prompt"}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl code-well border border-subtle font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed select-all">
                    {planPrompt}
                  </pre>
                  <textarea
                    value={planInput}
                    onChange={(e) => {
                      setPlanInput(e.target.value);
                      setPlannedResult(null);
                    }}
                    placeholder={
                      "Paste the model's plan here — expecting <<<DEPLENZ_PLAN>>> … <<<END_DEPLENZ_PLAN>>>"
                    }
                    spellCheck={false}
                    className="w-full h-24 p-3 rounded-xl code-well border border-subtle font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-y"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleParsePlan}
                      disabled={!planInput.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Build step-2 context</span>
                    </button>
                  </div>
                  {plannedResult && (
                    <p className="text-[11px] text-ok">
                      Step-2 context ready: {plannedResult.plannedFiles.length}{" "}
                      planned file(s) included complete · ~
                      {plannedResult.estimatedTokens.toLocaleString()} tokens —
                      use Copy for LLM below.
                    </p>
                  )}
                </div>
              )}

              {/* Prompt Preview Codeblock */}
              {surgicalBundle ? (
                <div className="p-4 rounded-2xl surface-card border border-chrome">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Generated Prompt Output
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {finalPrompt.length.toLocaleString()} chars · ~
                      {finalPromptTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="py-3 rounded-xl code-well border border-subtle max-h-[500px] overflow-y-auto">
                    <CodeSyntaxHighlighter
                      code={finalPrompt}
                      filePath={surgicalBundle.targetSymbol.filePath}
                      showLineNumbers={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  Select a function from the directory on the left to generate
                  its surgical context bundle.
                </div>
              )}

              {/* SMART PASTE INBOX: paste the LLM response back, parse the
                  changed files, copy each file or export them all as a ZIP */}
              <div className="p-4 sm:p-5 rounded-2xl surface-card border border-chrome space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Smart Paste Inbox — Re-integrate the LLM response
                    </span>
                    {smartPasteResult && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full surface-raised text-ok border border-ok font-mono">
                        {smartPasteResult.changes.length} changed file
                        {smartPasteResult.changes.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {smartPasteResult && smartPasteResult.changes.length > 0 && (
                    <div className="flex items-center gap-2">
                      {canApplyToDisk && (
                        <>
                          <label
                            className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none"
                            title="Plan only — list what would be written without touching the disk"
                          >
                            <input
                              type="checkbox"
                              checked={applyDryRun}
                              onChange={(e) => setApplyDryRun(e.target.checked)}
                              className="rounded border-slate-700 bg-transparent text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <span>Dry run</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleApplyClick}
                            disabled={isApplying}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer shadow-sm transition-colors disabled:opacity-50 ${
                              (verifyReport?.errorCount ?? 0) > 0
                                ? "bg-rose-600 hover:bg-rose-500"
                                : "bg-emerald-600 hover:bg-emerald-500"
                            }`}
                            title={
                              (verifyReport?.errorCount ?? 0) > 0
                                ? "Verification errors exist — applying requires explicit confirmation"
                                : "Write these changes to the real files (backups created first)"
                            }
                          >
                            {isApplying ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <HardDrive className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {isApplying
                                ? "Applying…"
                                : applyDryRun
                                  ? "Preview apply"
                                  : (verifyReport?.errorCount ?? 0) > 0
                                    ? "Apply anyway…"
                                    : "Apply to disk"}
                            </span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleSmartPasteZip}
                        disabled={isZippingSmartPaste}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shadow-sm transition-colors disabled:opacity-50"
                        title="Download all changed files as a ZIP preserving folder structure"
                      >
                        {isZippingSmartPaste ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileArchive className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isZippingSmartPaste ? "Bundling…" : "Export ZIP"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Paste the model's full response below. DepLenz extracts every{" "}
                  <code className="text-slate-300">
                    {SMART_PASTE_FILE_OPEN} …&gt;&gt;&gt;
                  </code>{" "}
                  block, maps it onto the loaded project, records a compact
                  Evolution Log entry, and lets you copy each modified file or
                  download them all as a ZIP.
                  {!smartPasteMarkers &&
                    " Marker comments are disabled — any [SMART-PASTE] comments the model still emitted will be stripped from exports."}
                </p>

                <textarea
                  value={smartPasteInput}
                  onChange={(e) => {
                    setSmartPasteInput(e.target.value);
                    if (smartPasteResult) setSmartPasteResult(null);
                    if (verifyReport) setVerifyReport(null);
                    if (applyResult) setApplyResult(null);
                    setExpandedDiffPath(null);
                  }}
                  placeholder={`Paste the LLM response here — expecting ${SMART_PASTE_FILE_OPEN} path="..." action="modify">>> blocks…`}
                  spellCheck={false}
                  className="w-full h-36 p-3 rounded-xl code-well border border-subtle font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-y"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {smartPasteInput.length.toLocaleString()} chars pasted
                  </span>
                  <div className="flex items-center gap-2">
                    {smartPasteResult && (
                      <button
                        type="button"
                        onClick={() => {
                          setSmartPasteResult(null);
                          setVerifyReport(null);
                          setApplyResult(null);
                          setSmartPasteInput("");
                        }}
                        className="px-3 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-white text-xs cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleParseSmartPaste}
                      disabled={!smartPasteInput.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Parse &amp; Verify</span>
                    </button>
                  </div>
                </div>

                {/* Parse warnings */}
                {smartPasteResult &&
                  smartPasteResult.warnings.length > 0 &&
                  !isSmartPasteWarningsDismissed && (
                    <div className="p-3 rounded-xl bg-warn-soft border border-warn text-[11px] text-warn flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        {smartPasteResult.warnings.map((w, i) => (
                          <p key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{w}</span>
                          </p>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSmartPasteWarningsDismissed(true)}
                        aria-label="Close parse warnings"
                        title="Close warning"
                        className="p-1 rounded-md text-warn hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                {/* Verification report — Stages 1-5, runs before anything is applied */}
                {verifyReport && smartPasteResult && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 text-[11px] ${
                      verifyReport.errorCount > 0
                        ? "bg-danger-soft border-danger"
                        : verifyReport.warningCount > 0
                          ? "bg-warn-soft border-warn"
                          : "bg-ok-soft border-ok"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            verifyReport.errorCount > 0
                              ? "text-danger"
                              : verifyReport.warningCount > 0
                                ? "text-warn"
                                : "text-ok"
                          }`}
                        />
                        Verification — 5-stage paste-back check
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {verifyReport.errorCount} errors ·{" "}
                        {verifyReport.warningCount} warnings ·{" "}
                        {verifyReport.preservedCount} symbols preserved
                      </span>
                    </div>

                    {verifyReport.mustUpdate.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-danger-soft border border-danger">
                        <p className="font-semibold text-danger mb-1">
                          Must change but NOT in this paste (
                          {verifyReport.mustUpdate.length}):
                        </p>
                        <ul className="space-y-0.5 font-mono text-[10px] text-slate-200">
                          {verifyReport.mustUpdate.map((m) => (
                            <li key={`${m.file}:${m.symbol}`}>
                              • {m.file} — {m.symbol}(): {m.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {verifyReport.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span
                            className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                              f.severity === "error"
                                ? "bg-rose-400"
                                : f.severity === "warning"
                                  ? "bg-amber-400"
                                  : "bg-sky-400"
                            }`}
                          />
                          <span className="text-slate-300">
                            <span className="text-slate-500 font-mono">
                              [S{f.stage}]
                            </span>{" "}
                            {f.path && (
                              <span className="font-mono text-slate-400">
                                {f.path}:{" "}
                              </span>
                            )}
                            {f.message}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-[10px] text-slate-500">
                      {verifyReport.summary}
                    </p>
                  </div>
                )}

                {/* Apply-to-disk result — dry-run plan or write report */}
                {applyResult && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 text-[11px] ${
                      applyResult.ok
                        ? "bg-ok-soft border-ok"
                        : "bg-danger-soft border-danger"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4" />
                        {applyDryRun
                          ? "Dry run — nothing was written to disk"
                          : applyResult.ok
                            ? "Applied to disk"
                            : "Apply finished with errors"}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {applyResult.files.length} file
                        {applyResult.files.length !== 1 ? "s" : ""} ·{" "}
                        {applyResult.errors.length} errors
                      </span>
                    </div>

                    {applyResult.backupDir && (
                      <p className="text-slate-300">
                        Originals backed up to:{" "}
                        <span className="font-mono text-slate-200 break-all">
                          {applyResult.backupDir}
                        </span>
                      </p>
                    )}

                    <ul className="space-y-0.5 font-mono text-[10px] max-h-40 overflow-y-auto pr-1">
                      {applyResult.files.map((f) => (
                        <li key={f.path} className="flex items-start gap-1.5">
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded border uppercase font-bold text-[9px] ${
                              f.action === "created"
                                ? "bg-ok-soft text-ok border-ok"
                                : f.action === "deleted"
                                  ? "bg-danger-soft text-danger border-danger"
                                  : f.action === "modified"
                                    ? "bg-info-soft text-info border-info"
                                    : "surface-raised text-slate-400 border-subtle"
                            }`}
                          >
                            {applyDryRun && f.action !== "skipped"
                              ? `would ${f.action === "modified" ? "modify" : f.action}`
                              : f.action}
                          </span>
                          <span className="text-slate-300 break-all">
                            {f.path}
                            {f.reason && (
                              <span className="text-slate-500">
                                {" "}
                                — {f.reason}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {applyResult.errors.length > 0 && (
                      <ul className="space-y-0.5 text-[10px] text-danger">
                        {applyResult.errors.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    )}

                    {!applyDryRun && applyResult.ok && (
                      <p className="text-[10px] text-slate-500">
                        Live watch detected the writes — all views refreshed
                        automatically.
                      </p>
                    )}
                  </div>
                )}

                {/* Changed files list — per-file copy, plus single-file download */}
                {smartPasteResult && smartPasteResult.changes.length > 0 && (
                  <div className="space-y-2">
                    {smartPasteResult.changes.map((change) => {
                      const ActionIcon =
                        change.action === "create"
                          ? FilePlus2
                          : change.action === "delete"
                            ? FileX2
                            : FilePenLine;
                      const actionCls =
                        change.action === "create"
                          ? "bg-ok-soft text-ok border-ok"
                          : change.action === "delete"
                            ? "bg-danger-soft text-danger border-danger"
                            : "bg-info-soft text-info border-info";
                      const isCopied = copiedSmartPath === change.path;

                      return (
                        <div key={change.path} className="space-y-2">
                          <div className="flex items-center gap-2.5 p-2.5 rounded-xl surface-inset border border-subtle">
                            <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                              <ActionIcon className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                                  {change.path}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${actionCls}`}
                                >
                                  {change.action}
                                </span>
                                {change.markerCount > 0 && (
                                  <span
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-ok border border-ok"
                                    title="Inline [SMART-PASTE] marker comments in this file"
                                  >
                                    {change.markerCount} marker
                                    {change.markerCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {!change.existsInProject &&
                                  change.action === "modify" && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-warn-soft text-warn border border-warn">
                                      not in loaded project
                                    </span>
                                  )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {change.action === "delete"
                                  ? "File will be removed (recorded in ZIP manifest only)"
                                  : `${change.content
                                      .split("\n")
                                      .length.toLocaleString()} lines • ${change.content.length.toLocaleString()} chars`}
                              </p>
                            </div>

                            {/* Diff preview toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDiffPath((p) =>
                                  p === change.path ? null : change.path,
                                )
                              }
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors shrink-0 ${
                                expandedDiffPath === change.path
                                  ? "chip-accent"
                                  : "surface-raised border-chrome text-slate-300 hover:text-white"
                              }`}
                              title="Preview how this paste rewrites the file"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Diff</span>
                            </button>

                            {change.action !== "delete" && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopySmartChange(change)
                                  }
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-white text-[11px] cursor-pointer transition-colors"
                                  title="Copy this file's full contents"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-ok" />
                                      <span className="text-ok">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy file</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const content = smartPasteMarkers
                                      ? change.content
                                      : stripSmartPasteMarkers(change.content);
                                    const fileName =
                                      change.path.split("/").pop() ??
                                      change.path;
                                    void getPlatform().saveBlob(
                                      new Blob([content], {
                                        type: "text/plain;charset=utf-8",
                                      }),
                                      fileName,
                                    );
                                  }}
                                  className="p-1.5 rounded-lg surface-raised border border-chrome text-slate-400 hover:text-emerald-300 cursor-pointer transition-colors"
                                  title="Download just this file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Expandable inline diff — green added / red removed */}
                          {expandedDiffPath === change.path && (
                            <SmartPasteDiffPreview
                              path={change.path}
                              action={change.action}
                              content={change.content}
                              originalContent={
                                files.find(
                                  (f) => f.relativePath === change.path,
                                )?.textContent ?? undefined
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Model manifest — the one-line reasons behind each change */}
                {smartPasteResult && smartPasteResult.manifest.length > 0 && (
                  <details className="rounded-xl surface-inset border border-subtle px-3 py-2">
                    <summary className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                      Model manifest — {smartPasteResult.manifest.length}{" "}
                      {smartPasteResult.manifest.length !== 1
                        ? "entries"
                        : "entry"}
                    </summary>
                    <ul className="mt-2 space-y-1 text-[10px] font-mono text-slate-400">
                      {smartPasteResult.manifest.map((line, i) => (
                        <li key={i} className="break-all">
                          • {line}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* MODE 5: PROJECT & CODE EVOLUTION LOG (Token-Efficient LLM Handover) */}
          {subView === "evolution" && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Header & Compact LLM Handover Card */}
              <div className="p-5 rounded-2xl surface-raised border border-chrome border-l-2 border-l-purple-500 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-100">
                          Project &amp; Code Evolution Logs
                        </h3>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full chip-accent border">
                          ~{evolutionHandoverResult.estimatedTokens} tokens total
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                        Tracks changes across your codebase in a compressed
                        symbol-delta format (~15–25 tokens per change) so
                        downstream LLMs immediately understand recent edits,
                        touched files, and architectural decisions during
                        handovers without bloating your context window.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ThemedDropdown<number>
                      value={evolutionTokenBudget}
                      onChange={(val) => setEvolutionTokenBudget(Number(val))}
                      ariaLabel="Evolution handover token budget"
                      menuTitle="Handover Token Budget"
                      align="right"
                      menuWidthClass="w-56"
                      options={[
                        {
                          value: 120,
                          label: "Budget: 120 tok",
                          description: "Ultra-compact (~5 recent entries)",
                        },
                        {
                          value: 220,
                          label: "Budget: 220 tok",
                          description: "Balanced (~10 recent entries)",
                        },
                        {
                          value: 400,
                          label: "Budget: 400 tok",
                          description: "Extended (~18 recent entries)",
                        },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={handleCopyEvolutionHandover}
                      disabled={evolutionEntries.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer shadow-sm transition-colors disabled:opacity-50"
                    >
                      {copiedHandover ? (
                        <Check className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedHandover
                          ? "Copied Handover!"
                          : "Copy LLM Handover"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Live Compact Handover Block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">
                      Token-Efficient Handover Payload (
                      {evolutionHandoverResult.includedCount} of{" "}
                      {evolutionEntries.length} entries within budget)
                    </span>
                    <span className="font-mono text-accent">
                      Auto-included in Surgical Prompt:{" "}
                      {includeEvolutionInPrompt ? "ON" : "OFF"}
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-xl code-well border border-subtle font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-all">
                    {evolutionHandoverResult.text ||
                      "# No evolution entries recorded yet."}
                  </pre>
                </div>
              </div>

              {/* Record Manual Milestone / Handover Note */}
              <form
                onSubmit={handleAddManualLog}
                className="p-4 rounded-2xl surface-card border border-chrome space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-purple-400" />
                    Record Code Evolution / Handover Milestone
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Target: {activeNode?.symbol.name || "workspace"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={manualLogSummary}
                    onChange={(e) => setManualLogSummary(e.target.value)}
                    placeholder="Concise change note (e.g. 'Switched WAL checksum to CRC32 and tightened MemTable lock scope')…"
                    className="md:col-span-7 px-3 py-2 text-xs rounded-xl surface-raised border border-subtle text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={manualLogFiles}
                    onChange={(e) => setManualLogFiles(e.target.value)}
                    placeholder={
                      activeNode
                        ? `Files (default: ${activeNode.symbol.filePath})`
                        : "Touched files (comma-separated)…"
                    }
                    className="md:col-span-3 px-3 py-2 text-xs rounded-xl surface-raised border border-subtle text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualLogSummary.trim()}
                    className="md:col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Change</span>
                  </button>
                </div>
              </form>

              {/* Chronological Evolution Entries List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Recorded Evolution Timeline ({evolutionEntries.length})
                  </span>
                  {evolutionEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearEvolutionLog}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-danger cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Log</span>
                    </button>
                  )}
                </div>

                {evolutionEntries.length === 0 ? (
                  <div className="p-10 rounded-2xl surface-card border border-subtle text-center text-xs text-slate-500">
                    No evolution entries logged yet. Parse a Smart Paste
                    response or record a milestone above.
                  </div>
                ) : (
                  evolutionEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-xl surface-card border border-subtle hover:border-chrome transition-colors space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded chip-accent border">
                            {entry.source}
                          </span>
                          {entry.targetSymbol && (
                            <span className="text-xs font-mono font-semibold text-slate-200">
                              target: {entry.targetSymbol}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded surface-raised border border-subtle text-ok">
                            ~{entry.estimatedTokens} tokens
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvolutionEntry(entry.id)}
                            className="p-1 rounded text-slate-500 hover:text-danger cursor-pointer"
                            title="Remove this log entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 font-medium">
                        {entry.summary}
                      </p>

                      <div className="p-2 rounded-lg code-well border border-subtle font-mono text-[11px] text-slate-300 overflow-x-auto">
                        {entry.compactDelta}
                      </div>

                      {entry.changes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {entry.changes.map((c, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded surface-raised border border-subtle text-slate-300"
                            >
                              <span>{c.path}</span>
                              <span className="text-ok">+{c.addedLines}</span>
                              <span className="text-danger">
                                -{c.removedLines}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Force-apply confirmation — the ONLY way past verification errors */}
      {showApplyConfirm && verifyReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card border border-danger rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Apply despite {verifyReport.errorCount} verification error
                  {verifyReport.errorCount !== 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  The 5-stage verifier found breaking issues (truncation,
                  dropped exports, unresolved imports, or callers that were not
                  updated). Writing these files may break compilation. Every
                  overwritten file is backed up first.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApplyConfirm(false)}
                className="px-4 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleApplyToDisk(true)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                Force apply anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Syntax Diagnostics Review Modal */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card border border-chrome rounded-2xl max-w-2xl w-full max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warn" />
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Syntax Diagnostics &amp; Warnings (
                    {analysis.diagnostics.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Detected across {analysis.filesWithSyntaxErrors.length}{" "}
                    file(s)
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
              <div className="p-3 rounded-xl bg-warn-soft border border-warn text-xs text-warn leading-relaxed">
                <strong>Why this matters:</strong> Syntax errors such as
                unclosed braces, mismatched brackets, or malformed JSON disrupt
                accurate function block delimiting and can cause downstream
                callers or callees to be misattributed.
              </div>

              {analysis.diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  className="p-3.5 rounded-xl surface-raised border border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-semibold text-accent text-xs">
                      <FileCode2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        {diag.filePath}:{diag.line}:{diag.column}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        diag.severity === "error"
                          ? "bg-rose-500/15 text-danger border-rose-500/30"
                          : "bg-warn-soft text-warn border-warn"
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
                      <span className="text-slate-500 mr-2 select-none">
                        {diag.line} |
                      </span>
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
                      className="text-[11px] text-accent hover:opacity-80 flex items-center gap-1 cursor-pointer font-medium"
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
