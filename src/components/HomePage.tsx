import React from 'react';
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
  CheckCircle2,
  Lock,
  Zap,
  Download,
  Copy,
  ChevronRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { FolderScanResult } from '../types';
import { FolderDropzone } from './FolderDropzone';

interface HomePageProps {
  onScanResult: (result: FolderScanResult) => void;
  onLoadSample: () => void;
  onLoadSampleWithHeavyFolders: () => void;
  onOpenFolderPicker: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onScanResult,
  onLoadSample,
  onLoadSampleWithHeavyFolders,
  onOpenFolderPicker,
}) => {
  return (
    <div className="min-h-screen bg-[#0c0b14] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0c0b14]/90 backdrop-blur-md border-b border-[#221c3b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                MyProject Analyzer
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-mono font-medium">
                v1.0
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-purple-300 transition-colors">
              Features
            </a>
            <a href="#codefile-analyzer" className="hover:text-purple-300 transition-colors">
              CodeFile Analyzer
            </a>
            <a href="#auto-shield" className="hover:text-purple-300 transition-colors">
              Auto-Shield
            </a>
            <a href="#how-it-works" className="hover:text-purple-300 transition-colors">
              How It Works
            </a>
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onLoadSample}
              className="hidden sm:flex items-center space-x-1.5 text-xs px-3.5 py-2 rounded-xl bg-[#191433] hover:bg-[#231c46] text-purple-200 border border-[#362b5d] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore Demo</span>
            </button>

            <button
              type="button"
              onClick={onOpenFolderPicker}
              className="flex items-center space-x-2 text-xs sm:text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-95 cursor-pointer"
            >
              <FolderUp className="w-4 h-4" />
              <span>Open Project Folder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        {/* Glow backdrop spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-700/20 via-violet-600/15 to-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Hero pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#1b1538]/90 border border-purple-500/30 text-purple-300 text-xs font-medium mb-6 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Web Edition • 100% In-Browser Privacy • Zero Server Uploads</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15] mb-6">
            Analyze, Flatten & Export <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              Any Project Codebase
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed mb-10">
            Strip away nested subdirectories into pure flat files, generate publication-grade hierarchy
            PDFs & high-res images without encoding glitches, and bundle codefiles with precise path and
            type metadata.
          </p>

          {/* Embedded Dropzone inside Hero */}
          <div className="max-w-3xl mx-auto mb-12">
            <FolderDropzone
              onScanResult={onScanResult}
              onLoadSample={onLoadSample}
              onLoadSampleWithHeavyFolders={onLoadSampleWithHeavyFolders}
            />
          </div>

          {/* Metric highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-[#141029]/80 border border-[#2b2252] backdrop-blur-sm">
              <span className="block text-2xl font-bold text-white font-mono">0ms</span>
              <span className="text-xs text-slate-400 mt-1 block">
                Server latency • Pure client-side memory
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141029]/80 border border-[#2b2252] backdrop-blur-sm">
              <span className="block text-2xl font-bold text-amber-300 font-mono">Auto-Shield</span>
              <span className="text-xs text-slate-400 mt-1 block">
                Bypasses <code className="text-amber-200">node_modules</code> & warns
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141029]/80 border border-[#2b2252] backdrop-blur-sm">
              <span className="block text-2xl font-bold text-emerald-400 font-mono">100% Crisp</span>
              <span className="text-xs text-slate-400 mt-1 block">
                ASCII PDF & 2x high-DPI image export
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141029]/80 border border-[#2b2252] backdrop-blur-sm">
              <span className="block text-2xl font-bold text-cyan-300 font-mono">35+ Formats</span>
              <span className="text-xs text-slate-400 mt-1 block">
                HTML, TSX, TS, JS, PY, SQL, JSON & more
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-16 bg-[#0a0912] border-t border-[#1f1a36]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">
              All-In-One Toolkit
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything you need to inspect, flatten & export
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Flat File Stripper */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileArchive className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Flat File Stripper</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Recursively extracts all files from nested inner directories into a clean, flat
                  root namespace. Automatically resolves duplicate filename collisions with three
                  strategies: Auto-number, Prefix-path, or Overwrite.
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-purple-300">
                <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800">
                  Export Flat ZIP
                </span>
                <span>• Single-file download</span>
              </div>
            </div>

            {/* 2. Directory Tree Visualizer */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FolderTree className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Interactive Hierarchy Tree</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Explore folder depth, item tallies, and cumulative byte sizing across all branches.
                  Collapsible folders with search highlight filtering and quick copy of ascii tree text.
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-indigo-300">
                <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">
                  Real-time size rollups
                </span>
              </div>
            </div>

            {/* 3. Structure PDF & Image Architect */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Structure PDF & High-Res Image</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Generates vector PDFs using WinAnsi-safe ASCII tree connectors (<code className="text-emerald-300 font-mono">|-- </code>)
                  that never show gibberish or <code className="text-emerald-300 font-mono">% % %</code> characters. Also provides
                  one-click 2x high-DPI PNG/JPEG image export!
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-emerald-300">
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                  Clean ASCII Vector PDF
                </span>
                <span>• PNG Image</span>
              </div>
            </div>

            {/* 4. CodeFile Analyzer */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">CodeFile Analyzer</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Identifies relative file location from the project root and detects language type. Wraps
                  code into a strict 3-part structured format (Metadata, Code, End Marker) and bundles
                  multiple files with Table of Contents and token counts.
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-cyan-300">
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                  3-Part Metadata Format
                </span>
              </div>
            </div>

            {/* 5. Auto-Shield Exclusion */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Auto-Shield Exclusion</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Automatically detects heavy folders (<code className="text-amber-200">node_modules</code>, <code className="text-amber-200">.git</code>, <code className="text-amber-200">dist</code>)
                  and intercepts them with an interactive pre-import warning modal. Protects against browser freezes.
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-amber-300">
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
                  Pre-Import Warning
                </span>
              </div>
            </div>

            {/* 6. Deep Analytics & Collision Audit */}
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f] hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Analytics & Collision Audit</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Audit extension distributions, find heaviest assets, and review every duplicate
                  filename across nested directories with full original path tracking.
                </p>
              </div>
              <div className="pt-3 border-t border-[#221b44] flex items-center space-x-2 text-[11px] font-mono text-violet-300">
                <span className="px-2 py-0.5 rounded bg-violet-950 border border-violet-800">
                  Visual Distribution Meters
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CodeFile Analyzer Deep Dive Section */}
      <section id="codefile-analyzer" className="py-16 bg-[#0c0b14] border-t border-[#1f1a36]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left text */}
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-medium mb-4">
                <Code2 className="w-3.5 h-3.5" />
                <span>Feature Spotlight: CodeFile Analyzer</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Structured Code Bundles for LLMs, Audits & Reviews
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Need to feed an entire codebase or selected modules into an AI model, code audit, or
                documentation report? CodeFile Analyzer automatically identifies root relative paths and
                formats each file with the strict 3-part layout:
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#141029] border border-[#292050]">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Metadata on Top</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      File location from project root, original name, detected type, line count, and byte size.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#141029] border border-[#292050]">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Actual Code Content</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pristine, unmodified source code with optional line numbers and syntax formatting.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#141029] border border-[#292050]">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">End of File Indicator</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clear delimiter indicating file boundary: <code className="text-emerald-300 font-mono">END OF FILE: &lt;path&gt;</code>.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLoadSample}
                className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/30"
              >
                <span>Try CodeFile Analyzer in Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right preview box */}
            <div className="rounded-2xl bg-[#0f0c22] border border-[#2d2454] shadow-2xl overflow-hidden font-mono text-xs">
              <div className="px-4 py-2.5 bg-[#171233] border-b border-[#2d2454] flex items-center justify-between text-slate-400">
                <span className="text-[11px] text-purple-300">combined_analysis.txt</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300">
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
                  &nbsp;&nbsp;return &lt;header className="p-4"&gt;Acme SaaS&lt;/header&gt;;
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
      <section id="auto-shield" className="py-16 bg-[#0a0912] border-t border-[#1f1a36]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-[#181333] to-[#140f2e] border border-amber-500/30 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Performance Guard</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Never Let <code className="text-amber-300">node_modules</code> Crash Your Browser
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Dragging full projects with tens of thousands of dependency and cache files usually
                  chokes web browsers. MyProject Analyzer intercepts heavy directories before traversal,
                  warns you with item counts, and lets you confirm clean import in one click.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onLoadSampleWithHeavyFolders}
                  className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer"
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
      <section id="how-it-works" className="py-16 bg-[#0c0b14] border-t border-[#1f1a36]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">
            Seamless Workflow
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight mb-12">
            3 Simple Steps from Folder to Export
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f]">
              <span className="text-3xl font-extrabold text-purple-400 font-mono mb-3 block">01</span>
              <h4 className="text-base font-bold text-white mb-2">Drop or Select Folder</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingest any local folder via native HTML5 drag-and-drop or directory picker. Read 100%
                locally with zero cloud uploads.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f]">
              <span className="text-3xl font-extrabold text-cyan-400 font-mono mb-3 block">02</span>
              <h4 className="text-base font-bold text-white mb-2">Auto-Shield & Strip</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Heavy folders are automatically identified and excluded. Inner folders are stripped to
                place every file in a flat directory.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#130f28] border border-[#271f4f]">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono mb-3 block">03</span>
              <h4 className="text-base font-bold text-white mb-2">Export Anywhere</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download a flat ZIP, save a crisp ASCII vector PDF or 2x high-DPI image, or export
                bundled codefiles for AI prompts and audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 bg-[#08070e] border-t border-[#1a152e] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white">
              <FolderTree className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-300">MyProject Analyzer</span>
            <span>• Free & Open Source under MIT License</span>
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
            <span className="text-slate-500 font-mono">Keyboard: 1-5 tabs • Cmd+O Open</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
