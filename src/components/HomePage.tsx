import React from "react";
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
} from "lucide-react";
import { FolderScanResult } from "../types";
import { FolderDropzone } from "./FolderDropzone";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ScanProgress } from "../utils/folderReader";

interface HomePageProps {
  onScanResult: (result: FolderScanResult) => void;
  onLoadSample: () => void;
  onLoadSampleWithHeavyFolders: () => void;
  onOpenFolderPicker: () => void;
  onScanProgress?: (progress: ScanProgress | null) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onScanResult,
  onLoadSample,
  onLoadSampleWithHeavyFolders,
  onOpenFolderPicker,
  onScanProgress,
}) => {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navbar
          Deliberately sparse: brand + actions only, nav links appear at xl
          where there is guaranteed room. Theme/palette controls live in one
          consolidated ThemeSwitcher (same control as the workspace header). */}
      <header className="sticky top-0 z-40 glass-header border-b border-chrome">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Left cluster: brand + nav (nav only when space allows) */}
          <div className="flex items-center gap-8 min-w-0">
            {/* Brand */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
                <FolderTree className="w-5 h-5" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-100 whitespace-nowrap">
                  MyProject Analyzer
                </span>
                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full surface-raised text-purple-400 border border-chrome font-mono font-medium">
                  v1.0
                </span>
              </div>
            </div>

            {/* Nav Links - single line each, only at xl+ where they fit comfortably */}
            <nav className="hidden xl:flex items-center space-x-6 text-sm text-slate-300 shrink-0">
              <a
                href="#features"
                className="whitespace-nowrap hover:text-purple-300 transition-colors"
              >
                Features
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
          </div>

          {/* Right cluster: theme control + actions */}
          <div className="flex items-center space-x-3 shrink-0">
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
            metadata.
          </p>

          {/* Embedded Dropzone inside Hero */}
          <div className="max-w-3xl mx-auto mb-12">
            <FolderDropzone
              onScanResult={onScanResult}
              onLoadSample={onLoadSample}
              onLoadSampleWithHeavyFolders={onLoadSampleWithHeavyFolders}
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
              <span className="block text-2xl font-bold text-amber-400 font-mono">
                Auto-Shield
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Bypasses <code className="text-amber-400">node_modules</code>{" "}
                &amp; warns
              </span>
            </div>
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-emerald-400 font-mono">
                100% Crisp
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                ASCII PDF &amp; 2x high-DPI image export
              </span>
            </div>
            <div className="p-4 rounded-2xl surface-card border border-chrome">
              <span className="block text-2xl font-bold text-cyan-400 font-mono">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">
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
                  Recursively extracts all files from nested inner directories
                  into a clean, flat root namespace. Automatically resolves
                  duplicate filename collisions with three strategies:
                  Auto-number, Prefix-path, or Overwrite.
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
                  Explore folder depth, item tallies, and cumulative byte sizing
                  across all branches. Collapsible folders with search highlight
                  filtering and quick copy of ascii tree text.
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
                  Generates vector PDFs using WinAnsi-safe ASCII tree connectors
                  (<code className="text-emerald-400 font-mono">|-- </code>)
                  that never show gibberish or{" "}
                  <code className="text-emerald-400 font-mono">% % %</code>{" "}
                  characters. Also provides one-click 2x high-DPI PNG/JPEG image
                  export!
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
                  Identifies relative file location from the project root and
                  detects language type. Wraps code into a strict 3-part
                  structured format (Metadata, Code, End Marker) and bundles
                  multiple files with Table of Contents and token counts.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  3-Part Metadata Format
                </span>
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
                  Automatically detects heavy folders (
                  <code className="text-amber-400">node_modules</code>,{" "}
                  <code className="text-amber-400">.git</code>,{" "}
                  <code className="text-amber-400">dist</code>) and intercepts
                  them with an interactive pre-import warning modal. Protects
                  against browser freezes.
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
                  Audit extension distributions, find heaviest assets, and
                  review every duplicate filename across nested directories with
                  full original path tracking.
                </p>
              </div>
              <div className="pt-3 border-t border-subtle flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded surface-raised border border-subtle">
                  Visual Distribution Meters
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
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4">
                <Code2 className="w-3.5 h-3.5" />
                <span>Feature Spotlight: CodeFile Analyzer</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-4">
                Structured Code Bundles for LLMs, Audits &amp; Reviews
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Need to feed an entire codebase or selected modules into an AI
                model, code audit, or documentation report? CodeFile Analyzer
                automatically identifies root relative paths and formats each
                file with the strict 3-part layout:
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start space-x-3 p-3 rounded-xl surface-card border border-chrome">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
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
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
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
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono">
                      End of File Indicator
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clear delimiter indicating file boundary:{" "}
                      <code className="text-emerald-400 font-mono">
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

            {/* Right preview box */}
            <div className="rounded-2xl surface-card border border-chrome shadow-xl overflow-hidden font-mono text-xs">
              <div className="px-4 py-2.5 surface-raised border-b border-chrome flex items-center justify-between text-slate-400">
                <span className="text-[11px] text-purple-400">
                  combined_analysis.txt
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Strict 3-Part Output
                </span>
              </div>
              <div className="p-4 sm:p-5 text-slate-300 space-y-3 leading-relaxed overflow-x-auto text-[11px]">
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
                <div className="text-emerald-400 font-bold">
                  ================================================================================
                  <br />
                  END OF FILE: src/components/Header.tsx
                  <br />
                  ================================================================================
                </div>
              </div>
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
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Performance Guard</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                  Never Let <code className="text-amber-400">node_modules</code>{" "}
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">
            Seamless Workflow
          </h2>
          <p className="text-3xl font-extrabold text-slate-50 tracking-tight mb-12">
            3 Simple Steps from Folder to Export
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl surface-card border border-chrome">
              <span className="text-3xl font-extrabold text-purple-400 font-mono mb-3 block">
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
              <span className="text-3xl font-extrabold text-cyan-400 font-mono mb-3 block">
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
              <span className="text-3xl font-extrabold text-emerald-400 font-mono mb-3 block">
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
              Keyboard: 1-5 tabs • Cmd+O Open
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
