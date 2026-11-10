import React, { useState } from "react";
import {
  FolderUp,
  FolderTree,
  FileArchive,
  FileText,
  Sparkles,
  ShieldAlert,
  Code2,
  Layers,
  ArrowRight,
  Zap,
  Braces,
  BookOpen,
  FileCode2,
  FileJson,
  Github,
  Network,
  ClipboardPaste,
  Copy,
  FilePenLine,
  FilePlus2,
  FileX2,
} from "lucide-react";
import { FolderScanResult } from "../types";
import { FolderDropzone } from "./FolderDropzone";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ScanProgress } from "../utils/folderReader";
import { SampleScenarioId } from "../utils/sampleProject";

/** Public repository — shown in the page footer. */
const GITHUB_REPO_URL = "https://github.com/MDeus-ai/myproject-analyzer";

interface HomePageProps {
  onScanResult: (result: FolderScanResult) => void;
  onLoadSample: () => void;
  onLoadSampleWithHeavyFolders: () => void;
  onLoadScenario?: (id: SampleScenarioId) => void;
  onOpenFolderPicker: () => void;
  onScanProgress?: (progress: ScanProgress | null) => void;
  showScenarios?: boolean;
}

/* ------------------------------------------------------------------ */
/* CodeFile Analyzer spotlight: interactive format preview samples     */
/* ------------------------------------------------------------------ */

type AnalyzerPreviewId =
  | "standard"
  | "compact"
  | "markdown"
  | "xml"
  | "jsonl"
  | "json";

interface AnalyzerPreview {
  id: AnalyzerPreviewId;
  label: string;
  ext: string;
  badge: string;
  content: React.ReactNode;
}

const ANALYZER_FORMAT_PREVIEWS: AnalyzerPreview[] = [
  {
    id: "standard",
    label: "Standard",
    ext: "txt",
    badge: "Strict 3-Part Output",
    content: (
      <>
        <div className="text-purple-400 font-bold">
          ================================================================================
          <br />
          FILE LOCATION: src/components/Header.tsx
          <br />
          FILE NAME: Header.tsx
          <br />
          FILE TYPE: tsx (TypeScript React Component)
          <br />
          FILE SIZE: 82 Bytes | LINES: 4
          <br />
          ================================================================================
        </div>
        <div className="text-slate-100 pl-2 border-l border-purple-500/40">
          export function Header() &#123;
          <br />
          &nbsp;&nbsp;return &lt;header className="p-4"&gt;Acme
          SaaS&lt;/header&gt;;
          <br />
          &#125;
        </div>
        <div className="text-ok font-bold">
          ================================================================================
          <br />
          END OF FILE: src/components/Header.tsx
          <br />
          ================================================================================
        </div>
      </>
    ),
  },
  {
    id: "compact",
    label: "Compact",
    ext: "txt",
    badge: "Token-Efficient",
    content: (
      <>
        <div>
          <span className="text-slate-600"># ---- </span>
          <span className="text-info">src/components/Header.tsx</span>
          <span className="text-slate-600"> ----</span>
        </div>
        <div className="text-slate-100">
          export function Header() &#123;
          <br />
          &nbsp;&nbsp;return &lt;header className="p-4"&gt;Acme
          SaaS&lt;/header&gt;;
          <br />
          &#125;
        </div>
        <div className="pt-2">
          <span className="text-slate-600"># ---- </span>
          <span className="text-info">src/config/auth.ts</span>
          <span className="text-slate-600"> ----</span>
        </div>
        <div className="text-slate-100">
          export const jwtOptions = &#123; expiresIn: "24h" &#125;;
        </div>
        <div className="text-slate-500 pt-2 text-[10px]">
          No banners. No metadata blocks. Up to ~80% fewer tokens — the Analyzer
          shows live per-format token estimates so you can see the savings.
        </div>
      </>
    ),
  },
  {
    id: "markdown",
    label: "Markdown",
    ext: "md",
    badge: "Docs-Ready",
    content: (
      <>
        <div>
          <span className="text-info font-bold">### File: </span>
          <span className="text-info">Header.tsx</span>
        </div>
        <div>
          <span className="text-purple-400 font-semibold">
            &gt; **Location**:{" "}
          </span>
          <span className="text-slate-200">`src/components/Header.tsx`</span>
        </div>
        <div>
          <span className="text-purple-400 font-semibold">&gt; **Type**: </span>
          <span className="text-slate-200">`tsx` (TypeScript React)</span>
        </div>
        <div className="text-slate-600">```tsx</div>
        <div className="text-slate-100">
          export function Header() &#123;
          <br />
          &nbsp;&nbsp;return &lt;header className="p-4"&gt;Acme
          SaaS&lt;/header&gt;;
          <br />
          &#125;
        </div>
        <div className="text-slate-600">```</div>
        <div className="text-ok">
          &lt;!-- END OF FILE: src/components/Header.tsx --&gt;
        </div>
      </>
    ),
  },
  {
    id: "xml",
    label: "XML",
    ext: "xml",
    badge: "CDATA-Safe",
    content: (
      <>
        <div className="text-purple-400">
          &lt;file path="src/components/Header.tsx" type="tsx" lines="4"&gt;
        </div>
        <div className="text-slate-600">&lt;![CDATA[</div>
        <div className="text-slate-100 pl-2 border-l border-purple-500/40">
          export function Header() &#123;
          <br />
          &nbsp;&nbsp;return &lt;header className="p-4"&gt;Acme
          SaaS&lt;/header&gt;;
          <br />
          &#125;
        </div>
        <div className="text-slate-600">]]&gt;</div>
        <div className="text-ok">&lt;/file&gt;</div>
        <div className="text-slate-500 pt-1 text-[10px]">
          CDATA wrapping means raw &lt;tags&gt; inside TSX/HTML files can never
          corrupt the document. Ideal for Claude-style structured prompts.
        </div>
      </>
    ),
  },
  {
    id: "jsonl",
    label: "JSONL",
    ext: "jsonl",
    badge: "Machine-Readable",
    content: (
      <>
        <div className="text-slate-300 break-all">
          &#123;<span className="text-info">"recordType":</span>
          <span className="text-slate-200">"metadata"</span>,
          <span className="text-info">"rootFolder":</span>
          <span className="text-slate-200">"acme-saas-platform"</span>,
          <span className="text-info">"fileCount":</span>
          <span className="text-warn">24</span>&#125;
        </div>
        <div className="text-slate-300 break-all">
          &#123;<span className="text-accent">"recordType":</span>
          <span className="text-slate-200">"file"</span>,
          <span className="text-accent">"path":</span>
          <span className="text-slate-200">"src/components/Header.tsx"</span>,
          <span className="text-accent">"fileType":</span>
          <span className="text-slate-200">"tsx"</span>,
          <span className="text-accent">"lines":</span>
          <span className="text-warn">4</span>,
          <span className="text-accent">"content":</span>
          <span className="text-slate-200">
            "export function Header() &#123; ... &#125;"
          </span>
          &#125;
        </div>
        <div className="text-slate-500 pt-1 text-[10px]">
          Every line is an independently parseable JSON object — paste any
          single line into a JSON validator and it passes. Built for LangChain,
          LlamaIndex &amp; vector DB ingestion.
        </div>
      </>
    ),
  },
  {
    id: "json",
    label: "JSON",
    ext: "json",
    badge: "Single Document",
    content: (
      <>
        <div className="text-slate-300 break-all">
          &#123;
          <br />
          &nbsp;&nbsp;<span className="text-info">"rootFolder":</span>{" "}
          <span className="text-slate-200">"acme-saas-platform"</span>,
          <br />
          &nbsp;&nbsp;<span className="text-info">"fileCount":</span>{" "}
          <span className="text-warn">24</span>,
          <br />
          &nbsp;&nbsp;<span className="text-info">"files":</span> [
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&#123;{" "}
          <span className="text-accent">"path":</span>{" "}
          <span className="text-slate-200">"src/components/Header.tsx"</span>,{" "}
          <span className="text-accent">"fileType":</span>{" "}
          <span className="text-slate-200">"tsx"</span>,{" "}
          <span className="text-accent">"lines":</span>{" "}
          <span className="text-warn">4</span>,{" "}
          <span className="text-accent">"content":</span>{" "}
          <span className="text-slate-200">"export function Header() ..."</span>{" "}
          &#125;
          <br />
          &nbsp;&nbsp;]
          <br />
          &#125;
        </div>
        <div className="text-slate-500 pt-1 text-[10px]">
          One valid, pretty-printed JSON document — passes JSON.parse and any
          schema validator out of the box. Use it when your pipeline expects a
          single payload instead of line-delimited records.
        </div>
      </>
    ),
  },
];

interface AnalyzerFormatCard {
  id: string;
  name: string;
  ext: string;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  blurb: string;
  bestFor: string;
}

const ANALYZER_FORMAT_CARDS: AnalyzerFormatCard[] = [
  {
    id: "standard",
    name: "Standard",
    ext: ".txt",
    icon: FileText,
    iconCls: "bg-purple-500/10 border-purple-500/25 text-purple-400",
    blurb: "Full metadata banners, Table of Contents and END OF FILE markers.",
    bestFor: "archival, audits & reviews",
  },
  {
    id: "compact",
    name: "Compact",
    ext: ".txt",
    icon: Zap,
    iconCls: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    blurb: "Just a path header plus pristine code — up to ~80% fewer tokens.",
    bestFor: "tight context windows",
  },
  {
    id: "markdown",
    name: "Markdown",
    ext: ".md",
    icon: BookOpen,
    iconCls: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
    blurb:
      "Headings, bullet metadata and fenced code blocks with language tags.",
    bestFor: "GitHub, Notion & docs",
  },
  {
    id: "xml",
    name: "XML",
    ext: ".xml",
    icon: FileCode2,
    iconCls: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    blurb: "CDATA-wrapped tags that raw TSX/HTML content can never corrupt.",
    bestFor: "Claude-style prompts",
  },
  {
    id: "jsonl",
    name: "JSONL",
    ext: ".jsonl",
    icon: Braces,
    iconCls: "bg-blue-500/10 border-blue-500/25 text-blue-400",
    blurb: "One self-contained JSON record per line, content machine-pristine.",
    bestFor: "RAG & vector DB ingestion",
  },
  {
    id: "json",
    name: "JSON",
    ext: ".json",
    icon: FileJson,
    iconCls: "bg-violet-500/10 border-violet-500/25 text-violet-400",
    blurb:
      "One valid, pretty-printed JSON document with per-file metadata and content.",
    bestFor: "scripts, tooling & APIs",
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onScanResult,
  onLoadSample,
  onLoadSampleWithHeavyFolders,
  onLoadScenario,
  onOpenFolderPicker,
  onScanProgress,
}) => {
  const [analyzerPreviewId, setAnalyzerPreviewId] =
    useState<AnalyzerPreviewId>("standard");
  const activePreview =
    ANALYZER_FORMAT_PREVIEWS.find((p) => p.id === analyzerPreviewId) ??
    ANALYZER_FORMAT_PREVIEWS[0];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navbar
          Row 1: brand + inline nav (xl+) + actions. The nav is flex-1 +
          min-w-0 + overflow-x-auto: it occupies only the space actually
          left between the brand and the action cluster, and SCROLLS
          internally if the links exceed it — overlap is impossible by
          construction, at any viewport width.
          Row 2 (below xl): scrollable chip strip with the same links. */}
      <header className="sticky top-0 z-40 glass-header border-b border-chrome">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-100 whitespace-nowrap">
                MyProject Analyzer
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full surface-raised text-accent border border-chrome font-mono font-medium">
                v1.0
              </span>
            </div>
          </div>

          {/* Inline nav (xl+) — constrained by flexbox itself */}
          <nav
            className="hidden xl:flex items-center space-x-6 text-sm text-slate-300 flex-1 min-w-0 overflow-x-auto scrollbar-none whitespace-nowrap"
            aria-label="Sections"
          >
            <a
              href="#features"
              className="whitespace-nowrap hover:text-purple-300 transition-colors"
            >
              Features
            </a>
            <a
              href="#deplenz"
              className="whitespace-nowrap hover:text-purple-300 transition-colors font-medium text-purple-400"
            >
              DepLenz
            </a>
            <a
              href="#smart-paste"
              className="whitespace-nowrap hover:text-emerald-300 transition-colors font-medium text-emerald-400"
            >
              Smart Paste
            </a>
            <a
              href="#codefile-analyzer"
              className="whitespace-nowrap hover:text-purple-300 transition-colors"
            >
              CodeFile Analyzer
            </a>
            <a
              href="#auto-shield"
              className="whitespace-nowrap hover:text-purple-300 transition-colors"
            >
              Auto-Shield
            </a>
            <a
              href="#how-it-works"
              className="whitespace-nowrap hover:text-purple-300 transition-colors"
            >
              How It Works
            </a>
          </nav>

          {/* Right cluster: theme + actions (never shrinks) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 ml-auto">
            <ThemeSwitcher />

            <button
              type="button"
              onClick={onLoadSample}
              className="hidden lg:flex items-center space-x-1.5 text-xs px-3.5 py-2 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore Demo</span>
            </button>

            <button
              type="button"
              onClick={onOpenFolderPicker}
              className="flex items-center space-x-2 text-xs sm:text-sm px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <FolderUp className="w-4 h-4" />
              <span className="hidden sm:inline whitespace-nowrap">
                Open Project Folder
              </span>
              <span className="sm:hidden">Open</span>
            </button>
          </div>
        </div>

        {/* Section nav chip strip — below xl */}
        <div className="xl:hidden border-t border-subtle">
          <nav
            className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2"
            aria-label="Sections"
          >
            {[
              { href: "#features", label: "Features", hot: false },
              { href: "#deplenz", label: "DepLenz", hot: true },
              { href: "#smart-paste", label: "Smart Paste", hot: true },
              {
                href: "#codefile-analyzer",
                label: "CodeFile Analyzer",
                hot: false,
              },
              { href: "#auto-shield", label: "Auto-Shield", hot: false },
              { href: "#how-it-works", label: "How It Works", hot: false },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border ${
                  link.hot
                    ? "bg-emerald-600/15 text-emerald-300 border-emerald-500/30"
                    : "surface-raised text-slate-400 hover:text-slate-200 border-subtle"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        {/* Soft accent glow (heavily muted in light mode via CSS) */}
        <div className="hero-glow absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/25 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Hero pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full surface-raised border border-chrome text-slate-300 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Web Edition • 100% In-Browser Privacy • Zero Server Uploads
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-50 max-w-4xl mx-auto leading-[1.15] mb-6">
            Analyze, Flatten &amp; Export <br className="hidden sm:inline" />
            <span className="hero-title-gradient">Any Project Codebase</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Strip away nested subdirectories into pure flat files, generate
            publication-grade hierarchy PDFs &amp; high-res images without
            encoding glitches, and bundle codefiles with precise path and type
            metadata — in six LLM-ready formats.
          </p>

          {/* Embedded Dropzone inside Hero */}
          <div className="max-w-3xl mx-auto mb-12">
            <FolderDropzone
              onScanResult={onScanResult}
              onLoadSample={onLoadSample}
              onLoadSampleWithHeavyFolders={onLoadSampleWithHeavyFolders}
              onLoadScenario={onLoadScenario}
              onScanProgress={onScanProgress}
            />
          </div>

          {/* Metric highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-slate-100 font-mono">
                0ms
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Server latency • Pure client-side memory
              </span>
            </div>
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-warn font-mono">
                Auto-Shield
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Bypasses <code className="text-warn">node_modules</code> &amp;
                warns
              </span>
            </div>
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-ok font-mono">
                100% Crisp
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                ASCII PDF &amp; 2x high-DPI image export
              </span>
            </div>
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-info font-mono">
                35+ Formats
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                HTML, TSX, TS, JS, PY, SQL, JSON &amp; more
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section
        id="features"
        className="py-16 surface-section border-t border-chrome"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
              All-In-One Toolkit
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight">
              Everything you need to inspect, flatten &amp; export
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Flat File Stripper */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileArchive className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Flat File Stripper
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Recursively pulls every file out of nested subdirectories into
                  one clean, flat namespace. Duplicate names are resolved
                  automatically with your choice of Auto-number, Prefix-path or
                  Overwrite — then download everything as a single flat ZIP.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Export Flat ZIP
                </span>
                <span>• Single-file download</span>
              </div>
            </div>

            {/* 2. Directory Tree Visualizer */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FolderTree className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Interactive Hierarchy Tree
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Explore your project exactly as it exists on disk: collapsible
                  branches, per-folder file counts and cumulative byte sizes,
                  search highlighting, and one-click copy of the tree as plain
                  text.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Real-time size rollups
                </span>
              </div>
            </div>

            {/* 3. Structure PDF & Image Architect */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Structure PDF &amp; High-Res Image
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Design publication-grade structure reports: KPI summary cards,
                  a vector ASCII tree with selectable fonts and row density (no{" "}
                  <code className="text-ok font-mono">% % %</code> font
                  corruption), and a complete inventory table. Export as a
                  multi-page PDF or a 2x high-DPI PNG/JPEG.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Clean ASCII Vector PDF
                </span>
                <span>• PNG Image</span>
              </div>
            </div>

            {/* 4. CodeFile Analyzer */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  CodeFile Analyzer
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Pinpoints each file's location from the project root, detects
                  35+ languages, and bundles selections with a Table of
                  Contents, live per-format token estimates, lockfile auto-skip
                  and secrets warnings — exported in six LLM-ready formats.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  3-Part Metadata Format
                </span>
                <span>• 6 Export Formats</span>
              </div>
            </div>

            {/* 5. Auto-Shield Exclusion */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Auto-Shield Exclusion
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Heavy directories (
                  <code className="text-warn">node_modules</code>,{" "}
                  <code className="text-warn">.git</code>,{" "}
                  <code className="text-warn">dist</code>) and your own{" "}
                  <code className="text-warn">.gitignore</code> rules are
                  intercepted before import. Review every excluded group — file
                  by file — and re-include anything with one click.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Pre-Import Warning
                </span>
              </div>
            </div>

            {/* 6. Deep Analytics & Collision Audit */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Analytics &amp; Collision Audit
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Audit extension distribution with visual meters, surface the
                  heaviest assets, and review every filename collision with its
                  original nested path — so flattened exports never lose data.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Visual Distribution Meters
                </span>
              </div>
            </div>

            {/* 7. DepLenz Codebase Lens & Dependency Graph */}
            <div className="p-6 rounded-2xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col justify-between group md:col-span-2 lg:col-span-3">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Network className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full surface-raised text-accent border border-chrome">
                    Web Dev Tech Stacks
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  DepLenz: Codebase Lens &amp; Interactive Dependency Map
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Understand how every component, hook and function in your
                  codebase relates at a glance. DepLenz renders a free-form
                  interactive map of your entire project — drag nodes to
                  rearrange, pan &amp; zoom, click to trace callers and callees
                  with animated flow edges — then pivot into bi-directional
                  dependency trees and surgical LLM prompt bundles so you never
                  paste a whole repo into an AI again. And with{" "}
                  <strong className="text-slate-300">Smart Paste</strong>, the
                  AI's answer comes back as complete, parseable files — copy
                  them individually or export a ZIP that drops cleanly into your
                  project.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl surface-raised border border-subtle">
                    <span className="font-semibold text-purple-300 block mb-1">
                      Interactive Codebase Map
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Free-form SVG graph — drag nodes anywhere, cursor-anchored
                      zoom, neighbor tracing with animated directional edges.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl surface-raised border border-subtle">
                    <span className="font-semibold text-purple-300 block mb-1">
                      Dependency Tree &amp; Search
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Upstream callers, downstream callees, blast radius — plus
                      keyword search with enclosing-function detection.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl surface-raised border border-subtle">
                    <span className="font-semibold text-purple-300 block mb-1">
                      Surgical Context &amp; Syntax Guard
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Extracts minimal LLM prompts (~85% token savings), catches
                      syntax errors early, and ships answers back via Smart
                      Paste.
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-4 border-t border-subtle flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  AST Static Analyzer
                </span>
                <span className="text-purple-400">
                  Free-Form Canvas • Zero Server Uploads
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Spotlight: DepLenz */}
      <section
        id="deplenz"
        className="py-16 border-t border-chrome surface-section scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left text column */}
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-medium mb-4">
                <Network className="w-3.5 h-3.5" />
                <span>Feature Spotlight: DepLenz</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-4">
                See How Your Whole Codebase Connects — Then Operate Surgically
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                DepLenz runs in-browser static analysis on web stacks (
                <code className="text-purple-400">.ts</code>,{" "}
                <code className="text-purple-400">.tsx</code>,{" "}
                <code className="text-purple-400">.js</code>,{" "}
                <code className="text-purple-400">.jsx</code>,{" "}
                <code className="text-purple-400">.vue</code>,{" "}
                <code className="text-purple-400">.svelte</code>) and turns your
                project into a living map: every function, component, hook and
                npm package as a node, every call as an edge. Explore freely,
                then zoom into any symbol for surgical edits — and let Smart
                Paste turn the model's answer back into complete, parseable
                files ready to drop into the project.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Interactive Codebase Map
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      A free-form graph canvas: drag any node to rearrange the
                      layout, pan and cursor-anchored zoom, kind-colored boxes
                      (component / function / hook / class / package), and
                      click-to-trace neighbor highlighting with animated
                      directional flow edges.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Codebase Keyword Search
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Locates any keyword or regex pattern and automatically
                      identifies its enclosing function or component so you know
                      exactly where logic lives.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Bi-Directional Dependency Tree
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Maps upstream callers (who breaks if you change this) and
                      downstream dependencies (what it calls + npm imports) with
                      blast-radius risk ratings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Surgical LLM Prompt Extractor
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Extracts only the target function, direct caller
                      contracts, and dependencies into a minimal prompt bundle
                      (~250 tokens), saving 80–95% tokens.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    5
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Syntax Error Detection &amp; Early Warning
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Detects unclosed delimiters, mismatched brackets, and
                      malformed JSON before analysis, warning you with exact
                      coordinates so broken syntax never skews the graph.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    6
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Smart Paste — Structured Output &amp; Re-Integration
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Appends a dependency-aware output contract to the surgical
                      prompt, so the LLM returns complete files in parseable
                      blocks. Paste the answer into the Smart Paste Inbox to
                      copy each changed file or export them all as a ZIP — with
                      optional{" "}
                      <code className="text-teal-400">[SMART-PASTE]</code>{" "}
                      marker comments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right visual mockup column */}
            <div className="p-6 rounded-2xl surface-card border border-chrome shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-subtle mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    DepLenz Codebase Map
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Free-Form Canvas
                </span>
              </div>

              {/* Mini interactive-map mock — same flow/port grammar as the real canvas.
                  Edge endpoints land exactly on box-edge midpoints, so the port
                  dots plug into the border instead of floating at corners. */}
              <div className="rounded-xl surface-inset border border-subtle p-2 mb-4">
                <svg
                  viewBox="0 0 380 172"
                  className="w-full h-auto select-none"
                  aria-hidden="true"
                >
                  {/* handleScan() → TreeView() */}
                  <path
                    d="M 120 43 C 148 43, 148 78, 176 78"
                    fill="none"
                    stroke="var(--color-slate-600)"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M 120 43 C 148 43, 148 78, 176 78"
                    fill="none"
                    className="dlc-edge-flow-soft"
                  />
                  <circle cx="176" cy="78" r="2.5" className="dlc-edge-port" />

                  {/* useFiles() → TreeView() */}
                  <path
                    d="M 120 129 C 148 129, 148 90, 176 90"
                    fill="none"
                    stroke="var(--color-slate-600)"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M 120 129 C 148 129, 148 90, 176 90"
                    fill="none"
                    className="dlc-edge-flow-soft"
                  />
                  <circle cx="176" cy="90" r="2.5" className="dlc-edge-port" />

                  {/* TreeView() → Row (highlighted: strong flow) */}
                  <path
                    d="M 292 78 C 316 78, 318 49, 340 49"
                    fill="none"
                    stroke="var(--color-purple-400)"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M 292 78 C 316 78, 318 49, 340 49"
                    fill="none"
                    className="dlc-edge-flow"
                  />
                  <circle
                    cx="340"
                    cy="49"
                    r="3.2"
                    className="dlc-edge-port dlc-edge-port-hot"
                  />

                  {/* react (pkg) → TreeView() — dependency edge, dotted */}
                  <path
                    d="M 340 123 C 316 123, 316 92, 292 92"
                    fill="none"
                    stroke="var(--color-slate-600)"
                    strokeWidth="1.3"
                    strokeDasharray="2 5"
                  />
                  <path
                    d="M 340 123 C 316 123, 316 92, 292 92"
                    fill="none"
                    className="dlc-edge-flow-soft"
                  />
                  <circle cx="292" cy="92" r="2.5" className="dlc-edge-port" />

                  {/* caller node: function */}
                  <g>
                    <rect
                      x="8"
                      y="24"
                      width="112"
                      height="38"
                      rx="10"
                      fill="var(--surface-raised)"
                      stroke="var(--border-chrome)"
                    />
                    <rect
                      x="16"
                      y="32"
                      width="22"
                      height="22"
                      rx="6"
                      fill="rgba(56,189,248,0.16)"
                      stroke="rgba(56,189,248,0.45)"
                    />
                    <text
                      x="27"
                      y="47"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#38bdf8"
                      fontFamily="monospace"
                    >
                      fn
                    </text>
                    <text
                      x="44"
                      y="39"
                      fontSize="10"
                      fontWeight="600"
                      fill="var(--color-slate-200)"
                      fontFamily="monospace"
                    >
                      handleScan()
                    </text>
                    <text
                      x="44"
                      y="52"
                      fontSize="7.5"
                      fill="var(--color-slate-500)"
                      fontFamily="monospace"
                    >
                      App.tsx · ln 148
                    </text>
                  </g>

                  {/* caller node: hook */}
                  <g>
                    <rect
                      x="8"
                      y="110"
                      width="112"
                      height="38"
                      rx="10"
                      fill="var(--surface-raised)"
                      stroke="var(--border-chrome)"
                    />
                    <rect
                      x="16"
                      y="118"
                      width="22"
                      height="22"
                      rx="6"
                      fill="rgba(52,211,153,0.16)"
                      stroke="rgba(52,211,153,0.45)"
                    />
                    <text
                      x="27"
                      y="133"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#34d399"
                      fontFamily="monospace"
                    >
                      use
                    </text>
                    <text
                      x="44"
                      y="125"
                      fontSize="10"
                      fontWeight="600"
                      fill="var(--color-slate-200)"
                      fontFamily="monospace"
                    >
                      useFiles()
                    </text>
                    <text
                      x="44"
                      y="138"
                      fontSize="7.5"
                      fill="var(--color-slate-500)"
                      fontFamily="monospace"
                    >
                      hooks.ts · ln 12
                    </text>
                  </g>

                  {/* focused component node (selected, aligned glow) */}
                  <g>
                    <rect
                      x="172"
                      y="58"
                      width="124"
                      height="52"
                      rx="15"
                      fill="none"
                      stroke="var(--color-purple-400)"
                      strokeWidth="2.5"
                      opacity="0.3"
                    />
                    <rect
                      x="176"
                      y="62"
                      width="116"
                      height="44"
                      rx="12"
                      fill="var(--surface-card)"
                      stroke="var(--color-purple-400)"
                      strokeWidth="1.8"
                    />
                    <rect
                      x="186"
                      y="73"
                      width="22"
                      height="22"
                      rx="6"
                      fill="rgba(192,132,252,0.16)"
                      stroke="rgba(192,132,252,0.45)"
                    />
                    <text
                      x="197"
                      y="88"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#c084fc"
                      fontFamily="monospace"
                    >
                      UI
                    </text>
                    <text
                      x="214"
                      y="80"
                      fontSize="10"
                      fontWeight="700"
                      fill="var(--color-slate-100)"
                      fontFamily="monospace"
                    >
                      TreeView()
                    </text>
                    <text
                      x="214"
                      y="94"
                      fontSize="7.5"
                      fill="var(--color-slate-500)"
                      fontFamily="monospace"
                    >
                      Tree.tsx · ln 34
                    </text>
                  </g>

                  {/* callee: component */}
                  <g>
                    <rect
                      x="340"
                      y="30"
                      width="36"
                      height="38"
                      rx="10"
                      fill="var(--surface-raised)"
                      stroke="var(--border-chrome)"
                    />
                    <text
                      x="358"
                      y="47"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#c084fc"
                      fontFamily="monospace"
                    >
                      Row
                    </text>
                    <text
                      x="358"
                      y="61"
                      textAnchor="middle"
                      fontSize="7"
                      fill="var(--color-slate-500)"
                      fontFamily="monospace"
                    >
                      UI
                    </text>
                  </g>

                  {/* callee: package (edge flows react → TreeView) */}
                  <g>
                    <rect
                      x="340"
                      y="104"
                      width="36"
                      height="38"
                      rx="10"
                      fill="var(--surface-raised)"
                      stroke="var(--border-chrome)"
                    />
                    <text
                      x="358"
                      y="121"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#818cf8"
                      fontFamily="monospace"
                    >
                      react
                    </text>
                    <text
                      x="358"
                      y="135"
                      textAnchor="middle"
                      fontSize="7"
                      fill="var(--color-slate-500)"
                      fontFamily="monospace"
                    >
                      pkg
                    </text>
                  </g>
                </svg>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono mb-4 px-1">
                <span>• dots flow caller → callee</span>
                <span>• drag nodes anywhere</span>
                <span>• click to trace</span>
                <span>• double-click to focus</span>
              </div>

              {/* Call flow summary */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl surface-raised border border-subtle">
                  <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-1">
                    ▲ Upstream Callers (2 dependents)
                  </div>
                  <div className="text-slate-200">
                    <span className="text-purple-400">fn</span> handleScan() •{" "}
                    <span className="text-emerald-400">use</span> useFiles()
                  </div>
                </div>

                <div className="text-center text-slate-500 text-xs">
                  ▼ invokes
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                  <div className="text-ok">
                    <strong>Surgical Prompt Size:</strong> ~280 tokens
                  </div>
                  <div className="text-slate-400 line-through">
                    Whole Repo: ~15,200
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-ok font-bold">
                    -98% Tokens
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Spotlight: Smart Paste */}
      <section
        id="smart-paste"
        className="py-16 border-t border-chrome scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Explanation column (first on mobile, right on desktop) */}
            <div className="lg:order-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium mb-4">
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Feature Spotlight: Smart Paste</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-4">
                AI Answers That Paste Straight Back Into Your Codebase
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Smart Paste turns every surgical prompt into a two-way street.
                It appends a strict output contract — generated from the live
                dependency tree — so the model returns{" "}
                <strong className="text-slate-200">
                  complete files in parseable blocks
                </strong>
                , never diffs or truncated snippets. Paste the raw response into
                the Smart Paste Inbox and DepLenz maps every block onto your
                loaded project, ready to copy or export without breaking a
                single caller.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Dependency-Aware Output Contract
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      The contract is built from the live dependency tree: it
                      lists the target's upstream callers (contracts that must
                      keep compiling), the downstream helpers to reuse, and the
                      npm packages already available — so edits respect the real
                      structure of your codebase.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Machine-Parseable File Blocks
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Every changed file comes back wrapped in{" "}
                      <code className="text-emerald-400">
                        {"<<<SMART_PASTE_FILE>>>"}
                      </code>{" "}
                      markers with a{" "}
                      <code className="text-emerald-400">modify</code>,{" "}
                      <code className="text-emerald-400">create</code> or{" "}
                      <code className="text-emerald-400">delete</code> action —
                      complete file contents only, no markdown fences, no "rest
                      unchanged" placeholders.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Smart Paste Inbox
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paste the raw LLM response back into DepLenz: every block
                      is extracted, badged by action, checked against the loaded
                      project, and surfaced with per-file line counts, marker
                      tallies and protocol warnings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Toggleable Marker Comments
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Added or changed regions are tagged with{" "}
                      <code className="text-emerald-400">[SMART-PASTE]</code>{" "}
                      comments so reviewers can spot AI edits at a glance.
                      Disable the option and markers are automatically stripped
                      from every export — copy, download and ZIP.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    5
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Per-File Copy or ZIP Export
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Copy any changed file to the clipboard, download it on its
                      own, or bundle everything into a ZIP that preserves your
                      folder structure — with a human-readable manifest of every
                      change, including deletions.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLoadSample}
                className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
              >
                <span>Try Smart Paste in Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Inbox mockup column (left on desktop) */}
            <div className="p-6 rounded-2xl surface-card border border-chrome shadow-2xl lg:order-1">
              {/* Window chrome */}
              <div className="flex items-center justify-between pb-4 border-b border-subtle mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    Smart Paste Inbox
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  3 changed files
                </span>
              </div>

              {/* Round-trip flow */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[10px] font-mono">
                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/25">
                  Prompt + contract
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="px-2 py-1 rounded-md surface-raised text-slate-300 border border-subtle">
                  LLM
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Paste back &amp; parse
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="px-2 py-1 rounded-md surface-raised text-slate-300 border border-subtle">
                  Copy / ZIP
                </span>
              </div>

              {/* Protocol block preview */}
              <div className="rounded-xl surface-inset border border-subtle p-3 mb-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
                <div className="text-emerald-400 whitespace-nowrap">
                  {
                    '<<<SMART_PASTE_FILE path="src/components/TreeView.tsx" action="modify">>>'
                  }
                </div>
                <div className="text-slate-500 whitespace-nowrap">
                  {"  // [SMART-PASTE] lazy-load expanded branches"}
                </div>
                <div className="text-slate-200 whitespace-nowrap">
                  {"  export function TreeView(props: Props) {"}
                </div>
                <div className="text-slate-600 whitespace-nowrap">
                  {"    …full file returned — never a diff…"}
                </div>
                <div className="text-emerald-400 whitespace-nowrap">
                  {"<<<END_SMART_PASTE_FILE>>>"}
                </div>
              </div>

              {/* Parsed file rows */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl surface-inset border border-subtle">
                  <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                    <FilePenLine className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        src/components/TreeView.tsx
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-sky-500/15 text-sky-400 border-sky-500/30">
                        modify
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        2 markers
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      412 lines • 14.2 KB
                    </p>
                  </div>
                  <span className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 text-[11px] shrink-0">
                    <Copy className="w-3 h-3" />
                    <span>Copy file</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl surface-inset border border-subtle">
                  <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                    <FilePlus2 className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        src/utils/lazyBranch.ts
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-ok-soft text-ok border-ok">
                        create
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      86 lines • 2.1 KB • new file
                    </p>
                  </div>
                  <span className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg surface-raised border border-chrome text-slate-300 text-[11px] shrink-0">
                    <Copy className="w-3 h-3" />
                    <span>Copy file</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl surface-inset border border-subtle opacity-80">
                  <div className="p-1.5 rounded-lg surface-raised border border-subtle shrink-0">
                    <FileX2 className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        src/legacy/oldTree.ts
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-500/15 text-danger border-rose-500/30">
                        delete
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Recorded in the ZIP manifest
                    </p>
                  </div>
                </div>
              </div>

              {/* Export bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-subtle">
                <span className="text-[10px] text-slate-500 font-mono">
                  Preserves folder structure • SMART_PASTE_MANIFEST.txt included
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-sm">
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Export ZIP</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CodeFile Analyzer Deep Dive Section */}
      <section id="codefile-analyzer" className="py-16 border-t border-chrome">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left text */}
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-info text-xs font-mono font-medium mb-4">
                <Code2 className="w-3.5 h-3.5" />
                <span>Feature Spotlight: CodeFile Analyzer</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-4">
                Structured Code Bundles for LLMs, Audits &amp; Reviews
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Need to feed an entire codebase or selected modules into an AI
                model, code audit, or documentation report? CodeFile Analyzer
                automatically identifies root relative paths, detects language
                types, and wraps each file in a strict 3-part layout — then
                exports the bundle in any of{" "}
                <strong className="text-slate-200">
                  six LLM-friendly formats
                </strong>
                , from token-slim Compact to machine-readable JSONL and JSON,
                with live token estimates for each.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start space-x-3 p-3 rounded-xl surface-card border border-chrome">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-info flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      Metadata on Top
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      File location from project root, original name, detected
                      type, line count, and byte size.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl surface-card border border-chrome">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-accent flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      Actual Code Content
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pristine, unmodified source code with optional line
                      numbers and syntax formatting.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl surface-card border border-chrome">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-ok flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      End of File Indicator
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clear delimiter indicating file boundary:{" "}
                      <code className="text-ok font-mono">
                        END OF FILE: &lt;path&gt;
                      </code>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLoadSample}
                className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
              >
                <span>Try CodeFile Analyzer in Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: interactive tabbed format preview */}
            <div className="rounded-2xl surface-card border border-chrome shadow-xl overflow-hidden font-mono text-xs">
              <div className="px-4 py-2.5 surface-raised border-b border-chrome flex items-center justify-between gap-2 text-slate-400">
                <span className="text-[11px] text-accent truncate">
                  combined_analysis.{activePreview.ext}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-accent border border-purple-500/30 whitespace-nowrap">
                  {activePreview.badge}
                </span>
              </div>

              {/* Format tab bar */}
              <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto border-b border-subtle">
                {ANALYZER_FORMAT_PREVIEWS.map((preview) => (
                  <button
                    key={preview.id}
                    type="button"
                    onClick={() => setAnalyzerPreviewId(preview.id)}
                    aria-pressed={analyzerPreviewId === preview.id}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      analyzerPreviewId === preview.id
                        ? "surface-raised text-info shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {preview.label}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5 text-slate-300 space-y-2 leading-relaxed overflow-x-auto text-[11px] min-h-[300px]">
                {activePreview.content}
              </div>
            </div>
          </div>

          {/* Six export formats explainer row */}
          <div className="mt-10 pt-8 border-t border-subtle">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Six Export Formats, One Bundle
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Switch formats instantly — live token estimates per format
                  help you pick what fits your context window.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-lg surface-raised border border-subtle text-slate-400">
                .txt • .md • .xml • .jsonl • .json
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ANALYZER_FORMAT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl surface-card border border-chrome hover:border-purple-500/40 transition-all flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div
                        className={`p-1.5 rounded-lg border ${card.iconCls}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded surface-raised border border-subtle text-slate-400">
                        {card.ext}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100">
                      {card.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1 flex-1">
                      {card.blurb}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-subtle">
                      Best for:{" "}
                      <span className="text-slate-300">{card.bestFor}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Auto-Shield & Exclusion Section */}
      <section
        id="auto-shield"
        className="py-16 surface-section border-t border-chrome"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl surface-card border border-amber-500/30 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-warn-soft border border-warn text-warn text-xs font-mono font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-warn" />
                  <span>Performance Guard</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                  Never Let <code className="text-warn">node_modules</code>{" "}
                  Crash Your Browser
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Dragging full projects with tens of thousands of dependency
                  and cache files usually chokes web browsers. MyProject
                  Analyzer intercepts heavy directories before traversal, warns
                  you with item counts, and lets you confirm clean import in one
                  click.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onLoadSampleWithHeavyFolders}
                  className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Test Warning Modal Live</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works 3 Steps */}
      <section id="how-it-works" className="py-16 border-t border-chrome">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
            Seamless Workflow
          </h2>
          <p className="text-3xl font-extrabold text-slate-50 tracking-tight mb-12">
            3 Simple Steps from Folder to Export
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl surface-card border border-chrome">
              <span className="text-3xl font-extrabold text-accent font-mono mb-3 block">
                01
              </span>
              <h4 className="text-base font-bold text-slate-100 mb-2">
                Drop or Select Folder
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingest any local folder via native HTML5 drag-and-drop or
                directory picker. Read 100% locally with zero cloud uploads.
              </p>
            </div>

            <div className="p-6 rounded-2xl surface-card border border-chrome">
              <span className="text-3xl font-extrabold text-info font-mono mb-3 block">
                02
              </span>
              <h4 className="text-base font-bold text-slate-100 mb-2">
                Auto-Shield &amp; Strip
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Heavy folders are automatically identified and excluded. Inner
                folders are stripped to place every file in a flat directory.
              </p>
            </div>

            <div className="p-6 rounded-2xl surface-card border border-chrome">
              <span className="text-3xl font-extrabold text-ok font-mono mb-3 block">
                03
              </span>
              <h4 className="text-base font-bold text-slate-100 mb-2">
                Export Anywhere
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download a flat ZIP, save a crisp ASCII vector PDF or 2x
                high-DPI image, or export bundled codefiles for AI prompts and
                audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 surface-section border-t border-chrome text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white">
              <FolderTree className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-300">MyProject Analyzer</span>
            <span>• Free &amp; Open Source under MIT License</span>
          </div>

          <div className="flex items-center space-x-6 text-slate-400">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 hover:text-purple-300 transition-colors"
              title="View the source code on GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <button
              type="button"
              onClick={onLoadSample}
              className="hover:text-purple-300 transition-colors"
            >
              Demo Project
            </button>
            <button
              type="button"
              onClick={onOpenFolderPicker}
              className="hover:text-purple-300 transition-colors"
            >
              Open Folder
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500 font-mono">
              Keyboard: 1-6 tabs • Cmd+O Open
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
