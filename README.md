# MyProject Analyzer 🗂️⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React: 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-MDeus--ai%2Fmyproject--analyzer-181717.svg?logo=github)](https://github.com/MDeus-ai/myproject-analyzer)
[![Privacy: 100% In-Browser](https://img.shields.io/badge/Privacy-100%25_In--Browser_Zero_Uploads-emerald.svg)](#-privacy--zero-server-guarantee)

A desktop-grade, privacy-first codebase analysis, directory flattening, and asset export workstation built with **React 19**, **TypeScript**, and **Tailwind CSS v4**.

**MyProject Analyzer** solves the recurring friction developers face when inspecting, documenting, archiving, or sharing nested folder structures. It flattens deeply nested subdirectories into root-level files with intelligent collision handling, generates publication-grade hierarchy structure PDFs with **zero Unicode font corruption**, exports 2x retina images, bundles multi-file codebases for LLM prompts across five structured formats, and protects browser memory with automatic dependency and secrets shielding.

Everything runs **100% locally in your browser** via the HTML5 File System Access API and Web Workers. No files, code, or metadata are ever uploaded to any server.

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
  - [1. 🗂️ Flat File Stripper & Directory Flattening](#1-️-flat-file-stripper--directory-flattening)
  - [2. 🌲 Interactive Directory Tree Visualizer](#2--interactive-directory-tree-visualizer)
  - [3. 📄 Structure PDF Architect (WinAnsi-Safe ASCII Engine)](#3--structure-pdf-architect-winansi-safe-ascii-engine)
  - [4. 🖼️ High-Res Retina Image Exporter (PNG & JPEG)](#4-️-high-res-retina-image-exporter-png--jpeg)
  - [5. 💻 CodeFile Analyzer & LLM Prompt Bundler](#5--codefile-analyzer--llm-prompt-bundler)
  - [6. 🛡️ Multi-Layer Auto-Shield & Secrets Detection](#6-️-multi-layer-auto-shield--secrets-detection)
  - [7. 📊 Deep Analytics & Extension Auditing](#7--deep-analytics--extension-auditing)
  - [8. 🎨 Dual Appearance & Six Curated Themes](#8--dual-appearance--six-curated-themes)
- [🔒 Privacy & Zero-Server Guarantee](#-privacy--zero-server-guarantee)
- [🔄 How It Works (Processing Pipeline)](#-how-it-works-processing-pipeline)
- [🏛️ Software Architecture & Project Structure](#️-software-architecture--project-structure)
  - [Directory Tree Breakdown](#directory-tree-breakdown)
  - [Core Modules & Responsibilities](#core-modules--responsibilities)
- [🚀 Quickstart & Development](#-quickstart--development)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)
  - [Running Unit Tests](#running-unit-tests)
  - [Linting & Type Checking](#linting--type-checking)
  - [Production Build](#production-build)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [🤝 Contributing & GitHub Repository](#-contributing--github-repository)
- [📄 License](#-license)

---

## ✨ Key Features

### 1. 🗂️ Flat File Stripper & Directory Flattening

When uploading datasets to flat cloud buckets (Amazon S3, Google Cloud Storage), running batch analysis scripts, or feeding legacy tools, nested subfolders create operational friction. The Flat File Stripper extracts every file across all inner directories and places them into a single, flat root namespace.

- **Recursive Traversal**: Ingests folders via native browser directory picker (`showDirectoryPicker`) or HTML5 drag-and-drop (`webkitdirectory` / `webkitGetAsEntry`).
- **Three Intelligent Collision Resolution Strategies**:
  - `Auto-number (enumerate)`: Preserves clean base names and appends sequential numbering before the extension (e.g., `Button.tsx`, `Button (1).tsx`, `Button (2).tsx`).
  - `Prefix-path (prefix-path)`: Replaces directory slashes with underscores, encoding directory provenance directly into the filename (e.g., `src_components_Button.tsx`, `src_icons_Button.tsx`).
  - `Overwrite (overwrite)`: Retains only the most recently traversed file instance, discarding duplicates while tracking replacement tallies.
- **One-Click Flat ZIP Download**: Generates a flat `.zip` archive entirely in browser memory via JSZip (`<folder-name>_flat.zip`), containing zero subdirectories.
- **Path Provenance Audit**: Retains original relative paths in memory so you can inspect where each flattened file originated.

---

### 2. 🌲 Interactive Directory Tree Visualizer

An interactive hierarchy explorer designed for instant codebase comprehension, architectural documentation, and structural navigation.

- **Recursive Rollup Calculations**: Automatically aggregates child item counts and cumulative byte sizes for every branch, rolling up from leaf files to the root folder.
- **Depth Analysis**: Calculates maximum nesting depth across the entire project.
- **Search & Filter with Branch Highlighting**: Filter through thousands of files in real time with branch highlighting.
- **Category Filter Pills**: Toggle visibility for specific file domains:
  - `Code` (`.ts`, `.tsx`, `.js`, `.py`, `.go`, `.rs`, `.java`, etc.)
  - `Docs` (`.md`, `.txt`, `.pdf`, `.docx`, etc.)
  - `Images` (`.png`, `.jpg`, `.svg`, `.webp`, etc.)
  - `Data` (`.json`, `.csv`, `.sql`, `.xml`, etc.)
  - `Config` (`.yaml`, `.toml`, `.env`, `.ini`, etc.)
- **One-Click ASCII & Unicode Copy**: Copy clean tree text formatted with standard Unicode box characters (`├──`, `└──`) or PDF-safe ASCII connectors directly to your clipboard.

---

### 3. 📄 Structure PDF Architect (WinAnsi-Safe ASCII Engine)

Traditional PDF generators fail when rendering directory trees because standard PDF viewers (Apple Preview, Adobe Acrobat, Chrome PDF) embed standard Type 1 / WinAnsi fonts (`Courier`, `Helvetica`, `Times`) that do not contain Unicode box-drawing glyphs (`├──`, `└──`, `│`). In standard tools, this produces garbled `% % %`, `???`, or blank tofu squares.

**MyProject Analyzer** solves this at the architectural level:

- **WinAnsi-Safe ASCII Connector Engine**: Generates tree branches using `|-- `, `\-- `, and `|   ` characters guaranteed to render crisp vector lines on any PDF viewer, mobile device, or physical printer without font substitution errors.
- **Four-Section Document Structure**:
  1. **Executive Metrics Cards**: Total file count, subfolder tally, aggregate disk footprint, and maximum nesting depth.
  2. **ASCII Hierarchy Tree**: Clean, typography-tuned tree branch layout with customizable fonts (`mono`, `sans`, `serif`) and point sizes.
  3. **Complete Item Inventory Table**: Auto-paginated table built with `jspdf-autotable`, sorting files by relative path with extensions, human-readable byte sizes, and modification timestamps.
  4. **Dynamic Header & Footer**: Page numbers (`Page X of Y`), project metadata, generation timestamp, and configurable margins.
- **Four Accent Themes**: Customize PDF branding with Blue, Indigo, Emerald, or Amber palettes.
- **Interactive Live Preview**: Preview the exact multi-page document layout in real time before triggering the vector download.

---

### 4. 🖼️ High-Res Retina Image Exporter (PNG & JPEG)

Export high-DPI raster images of your project architecture for GitHub READMEs, architecture review documents, Slack channels, or presentations.

- **SVG ForeignObject Rendering**: Renders modern Tailwind CSS v4 `oklch()` color spaces accurately without color clipping.
- **2x Retina Resolution**: Generates 2x pixel-density PNG and JPEG images for crystal-clear readability on high-resolution displays.
- **Clean Document Isolation**: Renders an isolated, pure white document canvas even when the application is running in Dark Mode.

---

### 5. 💻 CodeFile Analyzer & LLM Prompt Bundler

Preparing codefiles for Large Language Model (LLM) prompts, code reviews, security audits, or documentation requires rigorous metadata and unambiguous delimiters. CodeFile Analyzer automates this workflow:

- **Root Relative Location Detection**: Identifies exact paths from the project root (e.g., `src/utils/treeBuilder.ts`).
- **35+ Language & Format Identifiers**: Recognizes HTML, TSX, TS, JS, JSX, Python, Rust, Go, Java, Kotlin, Swift, C, C++, C#, PHP, Ruby, SQL, Shell/Bash, Dockerfile, YAML, JSON, Markdown, and more.
- **Strict 3-Part Structured Output**:
  1. **Top Metadata Banner**: File location, filename, language type, line count, and byte size.
  2. **Code Body**: Pristine, unmodified source code (with optional line numbering).
  3. **End Marker**: Explicit delimiter indicating file completion (`END OF FILE: <relative_path>`).
- **Five Specialized Export Formats**:
  | Format | Extension | Key Characteristics | Best Used For |
  |---|---|---|---|
  | **Standard** | `.txt` | Double-bar ASCII banners, Table of Contents, line counts | Archival, human audits & reviews |
  | **Compact** | `.txt` | Minimalist `# ---- path ----` headers; up to **~80% fewer tokens** | Tight LLM context windows |
  | **Markdown** | `.md` | Headings, blockquote metadata, syntax-tagged code fences | GitHub discussions, Notion, documentation |
  | **XML** | `.xml` | `<file>` tags wrapped in `<![CDATA[...]]>` to prevent JSX/HTML corruption | Claude & structured prompt engineering |
  | **JSONL** | `.jsonl` | One parseable JSON object per line (metadata record + file records) | LangChain, LlamaIndex & vector ingestion |
- **Real-Time Token Estimator**: Heuristic tokenizer (~4 characters per token) calculates live token counts for each format so you can choose what fits your model's context window.
- **Multi-File Combiner Presets**: Select files individually or apply presets (`All Code`, `Frontend Only`, `Backend Only`, `Config & Data`, `Docs & Markdown`).

---

### 6. 🛡️ Multi-Layer Auto-Shield & Secrets Detection

Opening modern web projects often means ingesting `node_modules`, `.git`, or build caches containing tens of thousands of files, which easily freezes browser tabs. Auto-Shield safeguards performance and security:

1. **Heavy Directory Traversal Bypass**:
   Detects 16+ heavy directory types before memory saturation:
   - Dependencies: `node_modules`, `vendor`
   - Version Control: `.git`, `.svn`, `.hg`
   - Build Outputs: `dist`, `build`, `out`, `target`, `.next`, `.nuxt`
   - Caches & Virtual Envs: `__pycache__`, `.venv`, `env`, `.cache`, `.turbo`, `.idea`, `.vscode`
2. **Pre-Import Warning Modal**:
   Presents an interactive checklist showing file counts, paths, and reasons *before* files are loaded into memory. Users can selectively toggle folders or choose "Include Everything".
3. **Comprehensive `.gitignore` Parser**:
   Evaluates project `.gitignore` files, supporting wildcards (`*`, `**`), directory trailing slashes (`temp/`), root path anchors (`/build`), and negation overrides (`!important.log`). Removed files are grouped by rule pattern for selective re-inclusion.
4. **Sensitive Secrets Detector**:
   Scans filenames and extensions for sensitive credential files:
   - `.env`, `.env.local`, `.env.production`
   - Private keys: `id_rsa`, `*.pem`, `*.key`
   - Certificates: `*.crt`, `*.pfx`, `*.keystore`
   - API tokens & credentials: `credentials.json`, `serviceAccountKey.json`
   Flags detected files with warning badges in the desktop header before export.

---

### 7. 📊 Deep Analytics & Extension Auditing

Audits your codebase footprint with visual charts and actionable statistics:

- **Extension Distribution**: Interactive visual meters showing the top file extensions ranked by total file count and aggregate byte volume.
- **Largest Assets Explorer**: Highlights the heaviest files in the project to identify unoptimized assets, bundled binaries, or oversized logs.
- **Collision Audit Log**: Detailed breakdown of every filename collision, showing the resulting renamed filename alongside its original nested directory path.

---

### 8. 🎨 Dual Appearance & Six Curated Themes

Designed with a native desktop workstation aesthetic:

- **Light & Dark Mode**: Seamlessly toggled via `<html data-appearance="light">`, with full CSS variable color inversion and document sheet protection.
- **Six Accent Palettes**:
  - `Obsidian`: Professional monochrome zinc/slate chrome
  - `Electric Indigo`: Vibrant violet and indigo accents
  - `Emerald Forest`: Clean, deep emerald and teal tones
  - `Sunset Amber`: Warm amber, orange, and bronze hues
  - `Rose Quartz`: Elegant rose and crimson styling
  - `Cyberpunk Cyan`: High-tech neon cyan and electric blue
- **Zero Flash of Unstyled Content (FOUC)**: Preferences are stored in `localStorage` and restored before the first DOM paint.

---

## 🔒 Privacy & Zero-Server Guarantee

Unlike online file convertors or cloud tree analyzers:

- **Zero Server Uploads**: Every byte is parsed locally using the browser's native `FileReader`, `Blob`, and `DataTransferItemList` APIs.
- **Zero Network Telemetry**: No analytics trackers, external trackers, or remote telemetry libraries are installed.
- **Offline Capable**: Once the static web assets are loaded, the entire application functions without an internet connection.
- **Ephemeral State**: Files exist only in volatile browser memory and are discarded when you close or reload the tab.

---

## 🔄 How It Works (Processing Pipeline)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. INGESTION & DISCOVERY                        │
│    Native File System Access API (showDirectoryPicker) OR HTML5 DnD     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. AUTO-SHIELD TRAVERSAL                        │
│  - Heuristic check against 16+ heavy directories (node_modules, .git)  │
│  - Parse root .gitignore (wildcards, negation, directory anchors)      │
│  - Scan filenames for sensitive secrets (.env, id_rsa, *.pem)          │
│  - Pre-Import Warning Modal triggered if exclusions are detected       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    3. IN-MEMORY NORMALIZATION                          │
│  - Transform raw files into ProcessedFile[] collection                 │
│  - Extract relative paths, extensions, MIME types, byte sizes          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               4. HIERARCHY TREE & STATS ROLLUP ENGINE                  │
│  - Recursively build FolderNode tree structure                         │
│  - Aggregate cumulative subfolder sizes, item tallies, max depth       │
│  - Generate WinAnsi-safe ASCII tree connectors                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    5. COLLISION RESOLUTION ENGINE                      │
│  - Strip nested directory paths to evaluate root namespace collisions  │
│  - Apply chosen strategy: enumerate, prefix-path, or overwrite         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       6. MULTI-TARGET EXPORT                           │
│  ├── In-Memory Flat ZIP: JSZip bundles root files into archive         │
│  ├── Structure PDF: jsPDF + AutoTable renders multi-page vector doc    │
│  ├── High-Res Image: html-to-image renders 2x retina PNG/JPEG          │
│  └── CodeFile Analyzer: Bundles 3-part code across 5 LLM formats       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Software Architecture & Project Structure

### Directory Tree Breakdown

```text
myproject-analyzer/
├── index.html                   # HTML5 entry point with responsive meta & fonts
├── package.json                 # Project dependencies, scripts & engine specs
├── tsconfig.json                # Strict TypeScript configuration
├── vite.config.ts               # Vite configuration with Tailwind CSS v4 plugin
├── README.md                    # Comprehensive software documentation
│
└── src/
    ├── main.tsx                 # React DOM mount point & theme initializer
    ├── App.tsx                  # Root state manager, view router & modal coordinator
    ├── index.css                # Global Tailwind CSS imports & theme CSS variables
    │
    ├── types/
    │   └── index.ts             # Domain interfaces (ProcessedFile, FolderNode, etc.)
    │
    ├── utils/                   # Pure logic & algorithmic modules
    │   ├── folderReader.ts      # Directory traversal (File System Access & Drag-and-Drop)
    │   ├── folderExclusions.ts  # 16+ heavy directory heuristics & pattern matchers
    │   ├── gitignoreParser.ts   # .gitignore specification parser (wildcards, negation)
    │   ├── secretsDetector.ts   # Sensitive credential & secret file scanner
    │   ├── collisionResolver.ts # 3 namespace flattening collision strategies
    │   ├── treeBuilder.ts       # Recursive hierarchy builder & ASCII tree generator
    │   ├── pdfGenerator.ts      # Multi-page vector PDF architect (WinAnsi connectors)
    │   ├── imageExporter.ts     # 2x high-DPI PNG/JPEG image renderer via SVG filter
    │   ├── codeAnalyzer.ts      # 3-part code wrapper & 5-format LLM bundler
    │   ├── zipExporter.ts       # In-memory flat ZIP archive builder (JSZip)
    │   ├── fileHelpers.ts       # Byte sizing, formatting & category helpers
    │   ├── themes.ts            # Appearance modes & 6 accent color palettes
    │   └── sampleProject.ts     # Instant demo fixture project
    │
    └── components/              # Modular UI components
        ├── HomePage.tsx         # Landing page with interactive feature spotlights
        ├── DesktopHeader.tsx    # macOS-style desktop toolbar, navigation & export menu
        ├── FolderDropzone.tsx   # Interactive file & directory dropzone
        ├── FlatFilesView.tsx    # Flattened file viewer with collision controls
        ├── DirectoryTreeView.tsx# Collapsible hierarchy tree explorer with search
        ├── PdfArchitectView.tsx # PDF & Image generator preview with options panel
        ├── PdfCanvasViewer.tsx  # Document canvas preview renderer
        ├── CodeAnalyzerView.tsx # Multi-file code bundler with live token counts
        ├── AnalyzerTextPreview.tsx # Formatted code output preview with copy/download
        ├── AnalyticsView.tsx    # Extension distribution charts & collision audit
        ├── ExclusionWarningModal.tsx # Pre-import checklist for heavy folders & gitignore
        ├── FilePreviewModal.tsx # File content & code inspector modal
        ├── HelpShortcutsModal.tsx    # Keyboard shortcuts & quick documentation modal
        ├── ImportProgressOverlay.tsx # Traversal progress indicator overlay
        └── ThemeSwitcher.tsx    # Light/Dark mode & accent palette selector
```

### Core Modules & Responsibilities

| Module | Core Responsibility |
|---|---|
| `App.tsx` | Central state hub managing loaded files, active view, modal visibility, and scan results. |
| `folderReader.ts` | Handles non-blocking asynchronous file ingestion via `showDirectoryPicker` or `webkitGetAsEntry`, dispatching progress events. |
| `collisionResolver.ts` | Resolves duplicate filenames when stripping directory paths, applying `enumerate`, `prefix-path`, or `overwrite`. |
| `treeBuilder.ts` | Builds nested `FolderNode` trees, computes recursive size rollups, and formats ASCII branch lines. |
| `pdfGenerator.ts` | Generates vector PDFs using `jspdf` and `jspdf-autotable` with WinAnsi-safe ASCII tree connectors. |
| `imageExporter.ts` | Converts preview DOM elements into 2x retina PNG/JPEG images via `html-to-image`. |
| `codeAnalyzer.ts` | Formats files into strict 3-part layouts and generates Standard, Compact, Markdown, XML, and JSONL bundles. |
| `folderExclusions.ts` | Identifies heavy dependency and build directories to prevent browser thread lockup. |
| `gitignoreParser.ts` | Evaluates `.gitignore` rules with support for wildcards, path anchors, and negation patterns. |
| `secretsDetector.ts` | Scans filenames for sensitive credentials (`.env`, private keys, API certificates). |
| `zipExporter.ts` | Streams flattened files into a root-level ZIP archive via `JSZip` without subfolders. |

---

## 🚀 Quickstart & Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher recommended, Node 22 supported)
- [npm](https://www.npmjs.com/) (v9 or higher)

### Installation

Clone the repository from GitHub:

```bash
git clone https://github.com/MDeus-ai/myproject-analyzer.git
cd myproject-analyzer
npm install
```

### Running the Development Server

Start the local Vite development server:

```bash
npm run dev
```

Navigate to `http://localhost:3000` in your web browser.

### Running Unit Tests

The codebase includes comprehensive unit tests verifying pure logic modules (`codeAnalyzer`, `collisionResolver`, `folderExclusions`, `treeBuilder`) using Node's built-in test runner and `tsx`:

```bash
npx --yes tsx --test src/utils/codeAnalyzer.test.ts src/utils/collisionResolver.test.ts src/utils/folderExclusions.test.ts src/utils/treeBuilder.test.ts
```

All 23 test suites execute in milliseconds.

### Linting & Type Checking

Verify TypeScript compilation and lint rules with zero emit:

```bash
npm run lint
```

### Production Build

Generate an optimized static production build in `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|---|---|---|
| <kbd>1</kbd> | Flat Files View | Switch to stripped flat files workspace |
| <kbd>2</kbd> | Tree Explorer | Switch to interactive hierarchy tree |
| <kbd>3</kbd> | PDF & Image | Switch to PDF & Image Architect |
| <kbd>4</kbd> | Analytics | Switch to codebase statistics & collision audit |
| <kbd>5</kbd> | Code Analyzer | Switch to CodeFile Analyzer & LLM bundler |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>O</kbd> | Open Folder | Trigger native directory picker dialog |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Export | Open quick export menu |
| <kbd>?</kbd> | Help | Open keyboard shortcuts and documentation modal |
| <kbd>Escape</kbd> | Close Modal | Dismiss open modals or overlays |

---

## 🤝 Contributing & GitHub Repository

Contributions, issue reports, and feature requests are welcome!

- **GitHub Repository**: [https://github.com/MDeus-ai/myproject-analyzer](https://github.com/MDeus-ai/myproject-analyzer)
- **Issue Tracker**: [https://github.com/MDeus-ai/myproject-analyzer/issues](https://github.com/MDeus-ai/myproject-analyzer/issues)

To contribute:
1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m "Add amazing feature"`.
4. Run tests and linting: `npx tsx --test src/utils/*.test.ts && npm run lint`.
5. Push to your branch: `git push origin feature/amazing-feature`.
6. Open a Pull Request on GitHub.

---

## 📄 License

This project is open-source software licensed under the **[MIT License](https://opensource.org/licenses/MIT)**. Feel free to use it for personal, academic, or commercial applications.
