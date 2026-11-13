import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  ArrowLeft,
  Sparkles,
  Code2,
  Users,
  Cpu,
  Terminal,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Hash,
  X,
  FolderOpen,
  Copy,
  Check,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  DOCUMENTATION_CHAPTERS,
  DOCUMENTATION_QUICK_KEYWORDS,
  searchDocumentation,
  type DocAudience,
  type DocChapter,
  type DocSection,
  type DocTable,
  type DocCodeBlock,
} from "@myproject/core/documentationData";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { CodeSyntaxHighlighter } from "./CodeSyntaxHighlighter";

export interface DocumentationViewProps {
  onBack: () => void;
  backLabel?: string;
  initialQuery?: string;
  initialAudience?: "all" | DocAudience;
  initialChapterId?: string;
  onOpenFolder?: () => void;
  onLoadSample?: () => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return text;
  const tokens = trimmed
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length === 0) return text;

  const regex = new RegExp(`(${tokens.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    regex.test(part) ? (
      <mark
        key={idx}
        className="bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded font-semibold border border-purple-500/40"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  onBack,
  backLabel = "Back",
  initialQuery = "",
  initialAudience = "all",
  initialChapterId,
  onOpenFolder,
  onLoadSample,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [audienceFilter, setAudienceFilter] = useState<"all" | DocAudience>(
    initialAudience,
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || DOCUMENTATION_CHAPTERS[0].id,
  );
  const [readAllMode, setReadAllMode] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery) setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialAudience) setAudienceFilter(initialAudience);
  }, [initialAudience]);

  useEffect(() => {
    if (initialChapterId) setSelectedChapterId(initialChapterId);
  }, [initialChapterId]);

  // Keyboard shortcut "/" or Cmd/Ctrl+K to focus documentation search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (
        (e.key === "/" && !inInput) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        if (searchQuery) {
          setSearchQuery("");
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const searchResults = useMemo(
    () => searchDocumentation(searchQuery, audienceFilter),
    [searchQuery, audienceFilter],
  );

  // Ensure selected chapter stays valid within filtered results
  const activeResult = useMemo(() => {
    const exact = searchResults.find((r) => r.chapter.id === selectedChapterId);
    if (exact) return exact;
    return searchResults[0] ?? null;
  }, [searchResults, selectedChapterId]);

  const activeChapter: DocChapter | null = activeResult
    ? activeResult.chapter
    : null;

  const userChapters = useMemo(
    () => searchResults.filter((r) => r.chapter.audience === "user"),
    [searchResults],
  );

  const devChapters = useMemo(
    () => searchResults.filter((r) => r.chapter.audience === "developer"),
    [searchResults],
  );

  const totalSectionMatches = useMemo(
    () =>
      searchResults.reduce((acc, r) => acc + r.matchedSectionIds.length, 0),
    [searchResults],
  );

  const handleSelectChapter = (chapterId: string, sectionId?: string) => {
    setSelectedChapterId(chapterId);
    requestAnimationFrame(() => {
      if (sectionId) {
        const el = document.getElementById(`doc-section-${sectionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      if (readAllMode) {
        const chEl = document.getElementById(`doc-chapter-${chapterId}`);
        if (chEl) {
          chEl.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const renderCallout = (
    callout: NonNullable<DocSection["callout"]>,
    query: string,
  ) => {
    const styles: Record<
      NonNullable<DocSection["callout"]>["kind"],
      {
        border: string;
        bg: string;
        badge: string;
        Icon: React.ComponentType<{ className?: string }>;
      }
    > = {
      info: {
        border: "border-sky-500/35",
        bg: "bg-sky-500/10",
        badge: "text-sky-300",
        Icon: Info,
      },
      tip: {
        border: "border-emerald-500/35",
        bg: "bg-emerald-500/10",
        badge: "text-emerald-300",
        Icon: Lightbulb,
      },
      warning: {
        border: "border-amber-500/35",
        bg: "bg-amber-500/10",
        badge: "text-amber-300",
        Icon: AlertTriangle,
      },
      architecture: {
        border: "border-purple-500/40",
        bg: "bg-purple-500/10",
        badge: "text-purple-300",
        Icon: Cpu,
      },
    };

    const st = styles[callout.kind];
    const IconComp = st.Icon;

    return (
      <div className={`my-4 rounded-xl border ${st.border} ${st.bg} p-4`}>
        <div className="flex items-center gap-2 mb-1.5">
          <IconComp className={`w-4 h-4 ${st.badge} shrink-0`} />
          <span
            className={`text-xs font-bold uppercase tracking-wider ${st.badge}`}
          >
            {highlightMatch(callout.title, query)}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {highlightMatch(callout.body, query)}
        </p>
      </div>
    );
  };

  const renderTable = (tbl: DocTable, query: string) => (
    <div className="mt-5 overflow-x-auto rounded-xl border border-chrome surface-inset">
      {tbl.title && (
        <div className="px-4 py-2 surface-card border-b border-chrome text-xs font-bold text-slate-100">
          {highlightMatch(tbl.title, query)}
        </div>
      )}
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-chrome surface-card">
            {tbl.headers.map((header, hIdx) => (
              <th
                key={hIdx}
                className="py-2.5 px-3.5 font-bold text-slate-200 uppercase tracking-wider text-[11px]"
              >
                {highlightMatch(header, query)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {tbl.rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="hover:bg-[var(--surface-hover)] transition-colors"
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={`py-2.5 px-3.5 align-top leading-relaxed ${
                    cIdx === 0
                      ? "font-mono font-semibold text-purple-300 whitespace-nowrap"
                      : "text-slate-200"
                  }`}
                >
                  {highlightMatch(cell, query)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCodeBlock = (cb: DocCodeBlock, copyKey: string) => (
    <div className="mt-5 rounded-xl overflow-hidden border border-chrome surface-inset">
      <div className="px-4 py-2 surface-card border-b border-chrome flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="text-xs font-mono font-semibold text-slate-200 truncate">
            {cb.title || cb.caption || cb.filePath}
          </span>
          {cb.filePath && cb.title && (
            <span className="hidden sm:inline text-[11px] font-mono text-slate-400 truncate">
              — {cb.filePath}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleCopyCode(cb.code, copyKey)}
          className="flex items-center gap-1 px-2 py-1 rounded-md surface-inset hover:bg-[var(--surface-hover)] border border-chrome text-[11px] font-semibold text-slate-300 hover:text-slate-50 cursor-pointer shrink-0"
        >
          {copiedCodeId === copyKey ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-2 overflow-x-auto">
        <CodeSyntaxHighlighter
          code={cb.code}
          filePath={
            cb.filePath ||
            (cb.language === "rust"
              ? "example.rs"
              : cb.language === "cpp"
                ? "example.cpp"
                : "example.ts")
          }
          maxHeightClass="max-h-96"
        />
      </div>
    </div>
  );

  const renderChapterArticle = (
    chapter: DocChapter,
    matchedSectionIds: string[],
  ) => {
    const visibleSections = chapter.sections.filter(
      (sec) =>
        !searchQuery.trim() ||
        !matchedSectionIds.length ||
        matchedSectionIds.includes(sec.id),
    );

    return (
      <article
        key={chapter.id}
        id={`doc-chapter-${chapter.id}`}
        className="max-w-4xl mx-auto space-y-6 pb-12"
      >
        {/* Chapter Hero Header */}
        <div className="rounded-2xl surface-card border border-chrome p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                chapter.audience === "user"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              }`}
            >
              {chapter.audience === "user" ? (
                <Users className="w-3.5 h-3.5" />
              ) : (
                <Terminal className="w-3.5 h-3.5" />
              )}
              <span>
                {chapter.number} · {chapter.category} ({chapter.readTimeMinutes}{" "}
                min read)
              </span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {chapter.keywords.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className="px-2 py-0.5 rounded-md surface-inset border border-chrome text-[11px] font-mono text-slate-300 hover:text-slate-50 hover:border-purple-500/40 cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight mb-2">
            {highlightMatch(chapter.title, searchQuery)}
          </h1>
          <p className="text-sm sm:text-base text-purple-300 font-medium mb-4">
            {highlightMatch(chapter.subtitle, searchQuery)}
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-chrome pt-4">
            {highlightMatch(chapter.summary, searchQuery)}
          </p>
        </div>

        {/* Chapter Sections */}
        <div className="space-y-6">
          {visibleSections.map((section, idx) => (
            <section
              key={section.id}
              id={`doc-section-${section.id}`}
              className="rounded-2xl surface-card border border-chrome p-6 sm:p-7 scroll-mt-6"
            >
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-chrome">
                <span className="w-6 h-6 rounded-lg bg-purple-600/15 border border-purple-500/40 flex items-center justify-center text-xs font-mono font-bold text-purple-300 shrink-0">
                  {idx + 1}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-50 tracking-tight">
                  {highlightMatch(section.title, searchQuery)}
                </h2>
              </div>

              {/* Paragraphs */}
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {section.paragraphs.map((para, pIdx) => (
                  <p key={pIdx}>{highlightMatch(para, searchQuery)}</p>
                ))}
              </div>

              {/* Step-by-Step Pipeline / Workflow Cards */}
              {section.steps && section.steps.length > 0 && (
                <div className="mt-5 space-y-2.5">
                  {section.steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-4 rounded-xl surface-inset border border-chrome flex flex-col sm:flex-row sm:items-start gap-3"
                    >
                      <span className="px-2.5 py-1 rounded-lg bg-purple-600/15 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold shrink-0 self-start">
                        {highlightMatch(st.step, searchQuery)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100 mb-1">
                          {highlightMatch(st.title, searchQuery)}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {highlightMatch(st.detail, searchQuery)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deep-Dive Technical Anatomy Notes */}
              {section.deepDiveNotes && section.deepDiveNotes.length > 0 && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.deepDiveNotes.map((dn, dnIdx) => (
                    <div
                      key={dnIdx}
                      className="p-4 rounded-xl surface-inset border border-chrome"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 mb-1.5">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>{highlightMatch(dn.label, searchQuery)}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {highlightMatch(dn.explanation, searchQuery)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bullet List */}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-2.5 surface-inset rounded-xl p-4 border border-chrome">
                  {section.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <span>{highlightMatch(bullet, searchQuery)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Callout Box */}
              {section.callout && renderCallout(section.callout, searchQuery)}

              {/* Primary Structured Reference Table */}
              {section.table && renderTable(section.table, searchQuery)}

              {/* Secondary Structured Reference Table */}
              {section.secondaryTable &&
                renderTable(section.secondaryTable, searchQuery)}

              {/* Primary Code Block */}
              {section.codeBlock &&
                renderCodeBlock(section.codeBlock, `${section.id}-code-1`)}

              {/* Secondary Code Block */}
              {section.secondaryCodeBlock &&
                renderCodeBlock(
                  section.secondaryCodeBlock,
                  `${section.id}-code-2`,
                )}
            </section>
          ))}
        </div>
      </article>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden bg-transparent text-slate-100 select-text">
      {/* Top Command Header */}
      <header className="shrink-0 surface-panel border-b border-chrome px-4 py-2.5 flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-card hover:bg-[var(--surface-hover)] border border-chrome text-slate-200 hover:text-slate-50 text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>{backLabel}</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-subtle)] hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600/15 border border-purple-500/40 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-purple-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-50 tracking-tight truncate">
                  MyProject Analyzer Documentation
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold chip-accent">
                  12 Chapters · Complete Manual &amp; Architecture Spec
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Part I: High-Level User Guide (01–06) · Part II: Technical
                Developer Deep Dive (07–12)
              </p>
            </div>
          </div>
        </div>

        {/* Audience Filter Switcher + Reader Mode + Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center p-0.5 rounded-xl surface-inset border border-chrome">
            <button
              type="button"
              onClick={() => setAudienceFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                audienceFilter === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              All ({DOCUMENTATION_CHAPTERS.length})
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("user")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                audienceFilter === "user"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Guide (6)</span>
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("developer")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                audienceFilter === "developer"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer Deep Dive (6)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setReadAllMode((v) => !v)}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              readAllMode
                ? "chip-accent"
                : "surface-card border-chrome text-slate-300 hover:text-slate-50"
            }`}
            title="Toggle between single-chapter view and continuous full-manual scroll"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{readAllMode ? "Full Manual Mode" : "Chapter Mode"}</span>
          </button>

          {onOpenFolder && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open Folder</span>
            </button>
          )}

          <ThemeSwitcher />
        </div>
      </header>

      {/* Search & Filter Subbar */}
      <div className="shrink-0 surface-card border-b border-chrome px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5">
          {/* Keyword Search Input */}
          <div className="relative flex-1 min-w-[320px] xl:min-w-[460px]">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 12 chapters & 45 sections by keyword (e.g., DepLenz, Rust, C++20, Header Bridging, Smart Paste, Evolution Log)..."
              aria-label="Search documentation keywords"
              className="w-full pl-10 pr-24 py-2 rounded-xl surface-inset border border-chrome text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md surface-card hover:bg-[var(--surface-hover)] text-slate-300 text-[11px] font-medium cursor-pointer border border-chrome"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded surface-card border border-chrome text-[10px] font-mono text-slate-400">
                  Press /
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Keyword Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 xl:max-w-[54%]">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
              Quick keywords:
            </span>
            {DOCUMENTATION_QUICK_KEYWORDS.map((kw) => {
              const active = searchQuery.toLowerCase() === kw.toLowerCase();
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setSearchQuery(active ? "" : kw)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer border ${
                    active
                      ? "chip-accent"
                      : "surface-inset border-chrome text-slate-300 hover:text-slate-50 hover:border-purple-500/40"
                  }`}
                >
                  {kw}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Audience Switcher */}
        <div className="flex lg:hidden items-center gap-1.5 mt-2.5">
          <button
            type="button"
            onClick={() => setAudienceFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              audienceFilter === "all"
                ? "bg-purple-600 text-white"
                : "surface-inset text-slate-400"
            }`}
          >
            All Docs (12)
          </button>
          <button
            type="button"
            onClick={() => setAudienceFilter("user")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              audienceFilter === "user"
                ? "bg-purple-600 text-white"
                : "surface-inset text-slate-400"
            }`}
          >
            User Guide (6)
          </button>
          <button
            type="button"
            onClick={() => setAudienceFilter("developer")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              audienceFilter === "developer"
                ? "bg-purple-600 text-white"
                : "surface-inset text-slate-400"
            }`}
          >
            Developer Deep Dive (6)
          </button>
        </div>
      </div>

      {/* Main 3-Column Documentation Workbench */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar with Expandable Subsections */}
        <aside className="w-76 xl:w-84 shrink-0 surface-panel border-r border-chrome flex flex-col min-h-0 hidden md:flex">
          <div className="px-4 py-3 border-b border-chrome flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Documentation Chapters
            </span>
            <span className="text-[11px] font-semibold text-purple-300">
              {searchResults.length} chapters · {totalSectionMatches} sections
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Part I: User Guide */}
            {userChapters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Part I · High-Level User Guide
                  </span>
                </div>
                <div className="space-y-1.5">
                  {userChapters.map(({ chapter, matchedSectionIds }) => {
                    const isSelected = activeChapter?.id === chapter.id;
                    return (
                      <div key={chapter.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSelectChapter(chapter.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                            isSelected
                              ? "chip-accent shadow-sm"
                              : "border-transparent text-slate-300 hover:bg-[var(--surface-hover)] hover:text-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold leading-snug text-slate-100">
                              <span className="font-mono text-emerald-400 mr-1.5">
                                {chapter.number}.
                              </span>
                              {highlightMatch(chapter.title, searchQuery)}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded surface-inset text-slate-400 shrink-0">
                              {matchedSectionIds.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {chapter.subtitle}
                          </p>
                        </button>

                        {/* Nested subsections when chapter is selected */}
                        {isSelected && (
                          <div className="pl-3 ml-2.5 border-l border-chrome space-y-0.5 py-0.5">
                            {chapter.sections.map((sec) => (
                              <button
                                key={sec.id}
                                type="button"
                                onClick={() =>
                                  handleSelectChapter(chapter.id, sec.id)
                                }
                                className="w-full text-left px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] flex items-center gap-1.5 cursor-pointer truncate"
                              >
                                <ChevronRight className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate">{sec.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Part II: Developer Deep Dive */}
            {devChapters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                    Part II · Technical Deep Dive
                  </span>
                </div>
                <div className="space-y-1.5">
                  {devChapters.map(({ chapter, matchedSectionIds }) => {
                    const isSelected = activeChapter?.id === chapter.id;
                    return (
                      <div key={chapter.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSelectChapter(chapter.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                            isSelected
                              ? "chip-accent shadow-sm"
                              : "border-transparent text-slate-300 hover:bg-[var(--surface-hover)] hover:text-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold leading-snug text-slate-100">
                              <span className="font-mono text-purple-400 mr-1.5">
                                {chapter.number}.
                              </span>
                              {highlightMatch(chapter.title, searchQuery)}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded surface-inset text-slate-400 shrink-0">
                              {matchedSectionIds.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {chapter.subtitle}
                          </p>
                        </button>

                        {/* Nested subsections when chapter is selected */}
                        {isSelected && (
                          <div className="pl-3 ml-2.5 border-l border-chrome space-y-0.5 py-0.5">
                            {chapter.sections.map((sec) => (
                              <button
                                key={sec.id}
                                type="button"
                                onClick={() =>
                                  handleSelectChapter(chapter.id, sec.id)
                                }
                                className="w-full text-left px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-100 hover:bg-[var(--surface-hover)] flex items-center gap-1.5 cursor-pointer truncate"
                              >
                                <ChevronRight className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate">{sec.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Repository Markdown Docs Notice */}
          <div className="p-3 border-t border-chrome surface-inset">
            <div className="flex items-start gap-2.5">
              <FileCode2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-200 block">
                  Shipped in Repo &amp; App
                </span>
                Mirrored in{" "}
                <code className="text-purple-300 font-mono">/docs/*.md</code>{" "}
                and{" "}
                <code className="text-purple-300 font-mono">
                  /docs/adr/*.md
                </code>{" "}
                for offline reading.
              </div>
            </div>
          </div>
        </aside>

        {/* Center Reader Area */}
        <main
          ref={contentScrollRef}
          className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-6"
        >
          {/* Mobile chapter selector strip */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-chrome">
            {searchResults.map(({ chapter }) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleSelectChapter(chapter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer border ${
                  activeChapter?.id === chapter.id
                    ? "chip-accent"
                    : "surface-card border-chrome text-slate-300"
                }`}
              >
                {chapter.number}. {chapter.title}
              </button>
            ))}
          </div>

          {/* When a keyword search is active, show Instant Search Hits Overview Banner */}
          {searchQuery.trim().length > 0 && (
            <div className="max-w-4xl mx-auto mb-6 rounded-2xl surface-card border border-purple-500/40 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-400" />
                  <h2 className="text-xs sm:text-sm font-bold text-slate-50">
                    Keyword Search Results for{" "}
                    <span className="text-purple-300">
                      &ldquo;{searchQuery}&rdquo;
                    </span>
                  </h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md chip-accent">
                  {searchResults.length} chapters · {totalSectionMatches}{" "}
                  matching sections
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-200 font-semibold mb-1">
                    No documentation sections matched &ldquo;{searchQuery}
                    &rdquo;
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    Try searching for broader architectural or workflow terms
                    such as DepLenz, Rust, C++20, Header Bridging, Collision,
                    Smart Paste, Light Mode, or Security.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setAudienceFilter("all");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.map(
                    ({ chapter, matchedSectionIds, snippet }) => {
                      const isSelected = activeChapter?.id === chapter.id;
                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() =>
                            handleSelectChapter(
                              chapter.id,
                              matchedSectionIds[0],
                            )
                          }
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "surface-inset border-purple-500/60"
                              : "surface-inset border-chrome hover:border-purple-500/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-100 truncate">
                              {chapter.number}.{" "}
                              {highlightMatch(chapter.title, searchQuery)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                chapter.audience === "user"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {chapter.audience === "user"
                                ? "User Guide"
                                : "Deep Dive"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {highlightMatch(snippet, searchQuery)}
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}

          {/* Render either all matching chapters (Full Manual Mode) or the active chapter */}
          {readAllMode ? (
            <div className="space-y-12">
              {searchResults.map(({ chapter, matchedSectionIds }) =>
                renderChapterArticle(chapter, matchedSectionIds),
              )}
            </div>
          ) : (
            activeChapter && (
              <>
                {renderChapterArticle(
                  activeChapter,
                  activeResult?.matchedSectionIds ?? [],
                )}

                {/* Chapter Footer Next / Prev Navigation */}
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-16 border-t border-chrome">
                  {(() => {
                    const idx = DOCUMENTATION_CHAPTERS.findIndex(
                      (c) => c.id === activeChapter.id,
                    );
                    const prev =
                      idx > 0 ? DOCUMENTATION_CHAPTERS[idx - 1] : null;
                    const next =
                      idx >= 0 && idx < DOCUMENTATION_CHAPTERS.length - 1
                        ? DOCUMENTATION_CHAPTERS[idx + 1]
                        : null;

                    return (
                      <>
                        {prev ? (
                          <button
                            type="button"
                            onClick={() => handleSelectChapter(prev.id)}
                            className="flex-1 text-left p-4 rounded-xl surface-card hover:bg-[var(--surface-hover)] border border-chrome transition-all cursor-pointer"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              ← Previous Chapter ({prev.number})
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-100">
                              {prev.title}
                            </span>
                          </button>
                        ) : (
                          <div className="flex-1" />
                        )}

                        {next ? (
                          <button
                            type="button"
                            onClick={() => handleSelectChapter(next.id)}
                            className="flex-1 text-right p-4 rounded-xl surface-card hover:bg-[var(--surface-hover)] border border-chrome transition-all cursor-pointer"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-1">
                              Next Chapter ({next.number}) →
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-100">
                              {next.title}
                            </span>
                          </button>
                        ) : (
                          <div className="flex-1" />
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )
          )}
        </main>

        {/* Right Table of Contents ("On This Page") Sidebar */}
        {activeChapter && (
          <aside className="w-64 shrink-0 surface-panel border-l border-chrome p-4 hidden xl:flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Hash className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  On This Page
                </span>
              </div>

              <nav className="space-y-1.5">
                {activeChapter.sections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() =>
                      handleSelectChapter(activeChapter.id, sec.id)
                    }
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-slate-50 hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <span className="text-[10px] font-mono text-purple-400 mt-0.5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="leading-snug">{sec.title}</span>
                  </button>
                ))}
              </nav>
            </div>

            {onLoadSample && (
              <div className="rounded-xl surface-card border border-chrome p-3.5 mt-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Try It Live</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                  Load the built-in sample project to test DepLenz, Surgical
                  Prompts, and Collision Resolution right now.
                </p>
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Launch Sample Project
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
