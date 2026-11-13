# MyProject Analyzer 🗂️⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React: 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Polyglot AST](https://img.shields.io/badge/Polyglot_AST-Web_%7C_Rust_%7C_C%2FC%2B%2B20-f97316.svg)](#-polyglot-static-analysis-engine-web-rust--cc20)
[![Native Engine](https://img.shields.io/badge/Native_Engine-Electron_%2B_Rust_N--API-10b981.svg)](#-monorepo-architecture--native-rust-acceleration)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25_Local_Zero_Uploads-emerald.svg)](#-privacy--security-invariants)

**MyProject Analyzer** is a privacy-first, polyglot codebase analysis, directory flattening, dependency mapping, and surgical AI prompt engineering workstation built for both the **Web Browser** and **Native Desktop (Electron + Rust N-API)**.

It ingests any local repository—across **Web stacks** (`.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.svelte`), **Rust Cargo crates** (`.rs`, `Cargo.toml`), and **C/C++20 translation units** (`.c`, `.cpp`, `.cc`, `.h`, `.hpp`, `CMakeLists.txt`)—and projects a single in-memory source of truth across six synchronized workspace lenses:

1. **Flat File Stripper (`Files`)** — Strips nested subdirectories into a flat namespace with three deterministic collision strategies (`Auto-number`, `Prefix-path`, `Overwrite`) and 1-click Flat ZIP export.
2. **Interactive Hierarchy Tree (`Tree`)** — Collapsible directory tree with recursive byte/file rollups, domain category filters, and Unicode/ASCII clipboard export.
3. **Structure PDF & Retina Image Architect (`PDF & Image`)** — Multi-page vector PDFs built with a **WinAnsi-Safe ASCII Connector Engine** (zero `% % %` glyph corruption) plus 2× high-DPI PNG/JPEG exports.
4. **Codebase Analytics & Collision Audit (`Stats`)** — Extension distribution meters, heaviest file rankings, and full path provenance logs for every flattened collision.
5. **CodeFile Analyzer (`Analyzer`)** — Strict 3-part metadata bundler exporting selected modules across **6 LLM-ready formats** (`Standard`, `Compact`, `Markdown`, `XML`, `JSONL`, `JSON`) with live token budgets.
6. **DepLenz (`DepLenz`)** — Polyglot static AST analyzer, **60fps Direct-DOM SVG Dependency Map** with module cluster bounding boxes, **Surgical AI Prompt Extractor** with interwoven `<user_action_request>` directives, **Token-Efficient Project Evolution Handover Logs** (`<project_evolution_handover>`), and **Smart Paste 5-Stage Verifier & Re-Integrator**.

---

## 🧭 Table of Contents

1. [📚 Built-In & Repository Documentation Encyclopedia](#-built-in--repository-documentation-encyclopedia)
2. [🖥️ Web Edition vs. Native Desktop Edition](#️-web-edition-vs-native-desktop-edition)
3. [🔬 Core Capabilities & The Six Workspace Lenses](#-core-capabilities--the-six-workspace-lenses)
   - [1. Flat File Stripper & Collision Resolution Engine](#1-flat-file-stripper--collision-resolution-engine)
   - [2. Interactive Hierarchy Tree Visualizer](#2-interactive-hierarchy-tree-visualizer)
   - [3. Structure PDF Architect & 2× Retina Image Exporter](#3-structure-pdf-architect--2-retina-image-exporter)
   - [4. Codebase Analytics & Collision Provenance Audit](#4-codebase-analytics--collision-provenance-audit)
   - [5. CodeFile Analyzer & 6-Format LLM Bundler](#5-codefile-analyzer--6-format-llm-bundler)
   - [6. DepLenz: 60fps Polyglot Call Graph & Subsystem Analyzer](#6-deplenz-60fps-polyglot-call-graph--subsystem-analyzer)
4. [🦀 Polyglot Static Analysis Engine (Web, Rust & C/C++20)](#-polyglot-static-analysis-engine-web-rust--cc20)
5. [🤖 AI Engineering Workflow: User Action Directives, Evolution Logs & Smart Paste](#-ai-engineering-workflow-user-action-directives-evolution-logs--smart-paste)
   - [Surgical Prompt Extractor & Two-Step Plan Mode](#surgical-prompt-extractor--two-step-plan-mode)
   - [Interwoven User Action Prompts (`<user_action_request>`)](#interwoven-user-action-prompts-user_action_request)
   - [Token-Efficient Project Evolution & Handover Logs (`<project_evolution_handover>`)](#token-efficient-project-evolution--handover-logs-project_evolution_handover)
   - [Smart Paste 5-Stage Verifier & Disk/ZIP Re-Integration](#smart-paste-5-stage-verifier--diskzip-re-integration)
6. [🛡️ Multi-Layer Auto-Shield, Hierarchical `.gitignore` & Dismissible Warnings](#️-multi-layer-auto-shield-hierarchical-gitignore--dismissible-warnings)
7. [🎨 Design System: WCAG AA Light/Dark Modes, 6 Palettes & Typography](#-design-system-wcag-aa-lightdark-modes-6-palettes--typography)
8. [🏛️ Monorepo Architecture & Native Rust Acceleration](#️-monorepo-architecture--native-rust-acceleration)
   - [Workspace Topology](#workspace-topology)
   - [End-to-End Processing Pipeline](#end-to-end-processing-pipeline)
   - [File-by-File Module Reference](#file-by-file-module-reference)
9. [🔒 Privacy & Security Invariants](#-privacy--security-invariants)
10. [🚀 Quickstart, Testing & Production Builds](#-quickstart-testing--production-builds)
11. [⌨️ Global Keyboard Shortcuts & URL Flags](#️-global-keyboard-shortcuts--url-flags)
12. [📄 License](#-license)

---

## 📚 Built-In & Repository Documentation Encyclopedia

MyProject Analyzer ships with a **12-Chapter, 45-Section Dual-Audience Documentation Encyclopedia** both **built directly into the software** (click **Documentation** in the top navigation bar or press `/`) and mirrored inside the repository under [`/docs/`](./docs/README.md):

| Guide / ADR | Audience | Summary |
|---|---|---|
| **[`docs/README.md`](./docs/README.md)** | Everyone & Developers | Master documentation index, 12-chapter table of contents, and architecture map |
| **[`docs/01-high-level-user-guide.md`](./docs/01-high-level-user-guide.md)** | High-Level Users | Chapters 01–04: Ingestion workflows, Web vs. Desktop Lobby, Auto-Shield, Dismissible Warnings, Files, Tree, Vector PDF, Stats & CodeFile Analyzer |
| **[`docs/02-deplenz-smart-paste-and-evolution.md`](./docs/02-deplenz-smart-paste-and-evolution.md)** | Users & AI Engineers | Chapters 05–06: DepLenz 60fps map, polyglot symbols, Surgical Prompts, `<user_action_request>`, `<project_evolution_handover>`, and Smart Paste |
| **[`docs/03-monorepo-architecture-and-platform-bridge.md`](./docs/03-monorepo-architecture-and-platform-bridge.md)** | Technical Developers | Chapters 07–08: Monorepo package graph, `PlatformBridge` contract, Electron security model, and file-by-file codebase reference |
| **[`docs/04-polyglot-ast-and-rust-engine.md`](./docs/04-polyglot-ast-and-rust-engine.md)** | Systems Engineers | Chapters 09–10: Polyglot AST extraction, C/C++20 Header-to-Source Bridging (`.hpp ↔ .cpp`), and `@myproject/native-rust` N-API Rayon + `tree-sitter` engine |
| **[`docs/05-ui-design-system-and-performance.md`](./docs/05-ui-design-system-and-performance.md)** | Frontend Engineers | Chapters 11–12: WCAG AA Light/Dark token system, custom dropdown portal architecture, 60fps direct-DOM SVG drag math, and complexity guarantees |
| **[`docs/adr/0001-monorepo-layout.md`](./docs/adr/0001-monorepo-layout.md)** | Architects | ADR 0001: npm workspaces monorepo (`@myproject/core`, `@myproject/ui`, `@myproject/platform`, `@myproject/native-rust`) |
| **[`docs/adr/0002-platform-bridge.md`](./docs/adr/0002-platform-bridge.md)** | Architects | ADR 0002: Platform capability contract between browser sandbox and Electron IPC |
| **[`docs/adr/0003-electron-security-baseline.md`](./docs/adr/0003-electron-security-baseline.md)** | Security Engineers | ADR 0003: Context isolation, sandboxed renderer, path-jail validation, and atomic disk writes |

---

## 🖥️ Web Edition vs. Native Desktop Edition

Both editions are built from the same TypeScript/React monorepo and automatically adapt their entry shell and capabilities through `@myproject/platform`:

| Capability | 🌐 Web Edition (`apps/web`) | 🖥️ Native Desktop Edition (`apps/desktop`) |
|---|---|---|
| **Initial Entry Experience** | **Web Landing Page (`HomePage.tsx`)**: Hero dropzone, 1-click polyglot demos (`Web Stack`, `Rust Crate`, `C++20`), interactive feature spotlights, and `Features` dropdown | **Full-Window Native Workbench Lobby (`DesktopLobby.tsx`)**: Zero-margin IDE welcome screen with Recent Projects history, Quick Launch polyglot templates, and live Studio Settings |
| **Folder Ingestion** | HTML5 `showDirectoryPicker` / recursive `webkitGetAsEntry` drag-and-drop with lazy `Blob` text hydration | Native OS directory dialog + multi-threaded filesystem walker (`fs-walk.ts` / Rust `ignore` crate) |
| **AST & Search Engine** | In-browser polyglot TypeScript scanner (`depLenz.ts`) | Native Rust N-API addon (`@myproject/native-rust`: `tree-sitter` + `rayon` + SIMD search) with automatic TS fallback |
| **Live File Watching** | Snapshot-based (`watchSupported: false`) | Real-time OS file watcher (`chokidar`) with 150ms debounced incremental graph updates & automatic Evolution Log entries |
| **Smart Paste Re-Integration** | Per-file clipboard copy, single-file download, or structured `*_smart_paste.zip` archive | Direct **Apply to Disk** (`applyChanges` via temp-file + atomic `fs.rename` + `.bak` backups) plus ZIP export |

---

## 🔬 Core Capabilities & The Six Workspace Lenses

### 1. Flat File Stripper & Collision Resolution Engine
Strips deeply nested subdirectories into a flat root-level file list for flat cloud buckets, archival pipelines, or legacy tooling:
- **Three Live Collision Strategies**:
  - `Auto-number (enumerate)` — Appends sequential suffixes before the extension (`index.ts`, `index (1).ts`, `index (2).ts`).
  - `Prefix-path (prefix-path)` — Encodes full directory provenance into the filename (`src_auth_index.ts`, `src_billing_index.ts`).
  - `Overwrite (overwrite)` — Retains only the last traversed instance while logging replaced duplicates.
- **Windowed Virtual Table**: Renders 250 rows per page (`ROW_RENDER_BATCH = 250`) to maintain 60fps scrolling even on repositories with 50,000+ files.
- **1-Click Flat ZIP Export**: Streams flattened files into `<folder>_flat.zip` via `JSZip` with zero nested folders.

### 2. Interactive Hierarchy Tree Visualizer
- **Recursive Bottom-Up Rollups**: Computes cumulative byte sizes, file counts, and maximum nesting depth for every directory node in $O(N)$.
- **Domain Category Filter Pills**: Filter by `All`, `Code`, `Docs`, `Images`, `Data`, or `Config` while preserving ancestor branch context.
- **Unicode & ASCII Tree Copy**: Copy the rendered hierarchy as standard Unicode (`├──`, `└──`) or WinAnsi-safe ASCII (`|--`, `\--`).

### 3. Structure PDF Architect & 2× Retina Image Exporter
Standard PDF viewers (Acrobat, Preview, Chrome PDF) use Type-1 WinAnsi fonts (`Courier`, `Helvetica`, `Times`) that lack Unicode box-drawing glyphs—causing traditional tools to output garbled `% % %` or tofu boxes.
- **WinAnsi-Safe ASCII Connector Engine**: Renders crisp vector connectors (`|-- `, `\-- `, `|   `) guaranteed to display on every PDF viewer and printer worldwide.
- **4-Section Publication Layout**: Executive KPI summary cards, vector ASCII hierarchy tree, paginated item inventory table (`jspdf-autotable`), and page headers/footers.
- **2× Retina PNG/JPEG Export**: Isolated white document sheet rendered at `pixelRatio: 2` via SVG `foreignObject`.

### 4. Codebase Analytics & Collision Provenance Audit
- **Extension Distribution Meters**: Visual breakdown of file extensions by item count and disk byte share.
- **Largest Assets Audit**: Surfaces the heaviest files in the repository to catch accidental binary commits or oversized bundles.
- **Collision Provenance Table**: Maps every renamed flat filename back to its exact original nested relative path.

### 5. CodeFile Analyzer & 6-Format LLM Bundler
Packages selected files or entire subsystems into a strict 3-part structure (Top Metadata Banner → Source Code → `END OF FILE` Delimiter) across **six formats**:

| Format | Ext | Key Advantage | Ideal Target |
|---|---|---|---|
| **Standard** | `.txt` | Double-bar ASCII metadata headers + Table of Contents | Human code audits & archival reviews |
| **Compact** | `.txt` | Single-line `# ---- path ----` header (**~80% fewer metadata tokens**) | Tight LLM context windows |
| **Markdown** | `.md` | Fenced syntax-highlighted blocks (` ```tsx `, ` ```rust `, ` ```cpp `) | GitHub issues, PRs, Notion & docs |
| **XML** | `.xml` | `<file>` nodes wrapped in `<![CDATA[...]]>` (immune to JSX/C++ `<T>` corruption) | Claude & structured XML prompting |
| **JSONL** | `.jsonl` | One valid JSON object per line (`metadata` header + `file` records) | RAG pipelines, LangChain & vector DBs |
| **JSON** | `.json` | Single pretty-printed JSON document with project summary & file array | Automated scripts & REST APIs |

### 6. DepLenz: 60fps Polyglot Call Graph & Subsystem Analyzer
Turns your codebase into an interactive architectural map (`DepLenzView.tsx`):
- **60fps Direct-DOM SVG Graph Canvas**: During node dragging, pointer move events mutate the dragged `<g>` transform and incident `<path d="...">` attributes directly via `requestAnimationFrame` without triggering React state re-renders—eliminating drag lag and duplicate ghost boxes on large graphs.
- **Module Cluster Bounding Boxes**: Groups symbols by top-level directory (`src/components`, `src/engine`, `include/physics`) with translucent bounding boxes and inter-cluster communication badges.
- **Bi-Directional Blast Radius**: Click any symbol to inspect its **Upstream Callers** (what breaks if you change this signature) and **Downstream Callees** (internal helpers + external packages/crates/headers).
- **Vector PDF & 2× PNG Graph Export**: Export the full dependency graph + symbol catalog table for architecture reviews.

---

## 🦀 Polyglot Static Analysis Engine (Web, Rust & C/C++20)

MyProject Analyzer natively analyzes and syntax-highlights three major engineering ecosystems:

| Ecosystem | Supported Extensions & Manifests | Extracted Symbols & Architectural Contracts |
|---|---|---|
| **Web Dev Stacks** | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`, `package.json` | Functions, arrow assignments, React functional components (`PascalCase` + JSX return), `React.memo` / `forwardRef` wrappers, custom `use*` hooks, ES6 classes, and TypeScript `interface` / `type` contracts. |
| **Rust Crates** | `.rs`, `Cargo.toml` | `pub`/`async`/`const`/`unsafe fn`, `struct`, `enum`, `trait`, and `impl Trait for Type` method blocks (`Type::method`). Resolves `use crate::...`, `super::...`, `self::...`, and `mod` declarations. |
| **C / C++20 Projects** | `.c`, `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hh`, `.hxx`, `CMakeLists.txt`, `Makefile` | `class`, `struct`, `enum class`, `namespace`, free functions, and out-of-line `ClassName::methodName` implementations. Features **Automatic Header-to-Source Bridging** linking `#include "foo.hpp"` callers directly to `foo.cpp` definitions. |

---

## 🤖 AI Engineering Workflow: User Action Directives, Evolution Logs & Smart Paste

### Surgical Prompt Extractor & Two-Step Plan Mode
Instead of pasting a 20,000-token repository into an LLM when editing a single function, DepLenz slices only:
1. The **Target Symbol's full implementation** (exact file & line span),
2. **Upstream Caller Signature Contracts** (signatures that must remain unbroken),
3. **Downstream Callee Contracts** (helpers available to reuse),
4. **Two-Step Plan Mode** (optional toggle instructing the LLM to propose a verification plan before emitting code).

### Interwoven User Action Prompts (`<user_action_request>`)
Inside the Surgical Prompt panel, type your specific task objective—or click a 1-click preset chip (`Refactor for clarity`, `Fix edge-case bugs`, `Optimize performance`, `Add unit tests`, `Modernize types & safety`). DepLenz automatically weaves a structured `<user_action_request priority="primary">` block directly between the symbol context and the Smart Paste output contract:

```xml
<user_action_request priority="primary">
Task: Add sub-stepping stability clamp when dt > 0.016s without altering upstream PhysicsWorld::stepSimulation caller signatures.
Constraints: Preserve all 3 upstream callers & return complete files via Smart Paste markers.
</user_action_request>
```

### Token-Efficient Project Evolution & Handover Logs (`<project_evolution_handover>`)
When handing a codebase over to a new LLM session, raw git diffs waste thousands of tokens. DepLenz maintains a per-project ring buffer (`evolutionLog.ts`, up to 80 entries persisted in `localStorage`) that records every Smart Paste application, live desktop file-watcher batch, or manual architectural note, and serializes it into a strict token-budgeted block (~15–25 tokens per entry):

```xml
<project_evolution_handover entries="2" budget_tokens="220">
# Compact chronological log of recent codebase changes (newest first):
- [14:22 paste sym:stepSimulation] M:src/world.cpp(+14/-3) @stepSimulation,resolveCollisions
- [14:09 manual sym:put_batch] M:src/engine.rs(+9/-2) @put_batch — Added WAL fsync guard
</project_evolution_handover>
```

### Smart Paste 5-Stage Verifier & Disk/ZIP Re-Integration
Every Surgical Prompt appends a dependency-aware output contract instructing the LLM to return complete files inside `<<<SMART_PASTE_FILE path="..." action="modify|create|delete">>>` blocks. When you paste the LLM's response into the **Smart Paste Inbox**, DepLenz runs a **5-stage verification pipeline**:
1. **Protocol & Fence Check** — Extracts blocks and flags truncated snippets or `// ... rest unchanged` placeholders.
2. **Path Safety & Resolution** — Rejects path traversal (`..`), absolute paths, and null bytes.
3. **Syntax & Brace Balance Audit** — Runs `scanCodeSyntaxIssues` on the proposed file content before applying.
4. **Upstream Caller Contract Verification** — Re-parses the new file's AST symbols to verify exported signatures required by upstream callers were not accidentally deleted.
5. **Line Delta & Marker Tally** — Computes exact `+added / -removed` line deltas and `[SMART-PASTE]` marker counts, ready for **1-Click Apply to Disk** (Desktop) or **Smart Paste ZIP Export** (Web & Desktop).

---

## 🛡️ Multi-Layer Auto-Shield, Hierarchical `.gitignore` & Dismissible Warnings

1. **16+ Heavy Directory Interception**: Automatically detects `node_modules`, `.git`, `target`, `dist`, `build`, `.next`, `__pycache__`, `.venv`, `vendor`, and CMake build folders before memory saturation.
2. **Hierarchical `.gitignore` Evaluation**: Parses root and nested `.gitignore` files (supporting `*`, `**`, `/anchor`, directory slashes, and `!negation`).
3. **Secrets & Credential Scanner**: Flags `.env*`, `*.pem`, `*.key`, `id_rsa`, `*.pfx`, and `credentials.json` files before export.
4. **Dismissible Post-Import Warning Banners**: Every post-import warning banner across the workspace—including the **Auto-Excluded Heavy Folders & `.gitignore` Banner**, **Possible Secrets Detected Banner**, **CodeFile Analyzer Secrets Warning**, and **DepLenz Syntax / Smart Paste Warning Banners**—includes an explicit **Close (`X`) button** so you can dismiss notifications cleanly once reviewed, with automatic reset on the next folder import.

---

## 🎨 Design System: WCAG AA Light/Dark Modes, 6 Palettes & Typography

- **Refined Dual Appearance (`Dark` & `Light` Modes)**: Engineered with semantic CSS custom properties (`--surface-bg`, `--surface-panel`, `--surface-card`, `--border-chrome`) and dedicated WCAG AA high-contrast Light Mode palette overrides (`#0f172a` primary ink, `#334155` secondary text, `#475569` muted labels, crisp `#cbd5e1` borders).
- **6 Curated Accent Palettes**: `Electric Indigo`, `Obsidian`, `Emerald Forest`, `Sunset Amber`, `Rose Quartz`, and `Cyberpunk Cyan`.
- **Custom Theme-Aware Dropdowns**: Every selector across the application uses the unified `DropdownSelect` / `surface-popover` architecture—never unstyled native OS `<select>` menus—plus an automatic responsive `More (N)` overflow dropdown in the workspace toolbar.

---

## 🏛️ Monorepo Architecture & Native Rust Acceleration

### Workspace Topology

```text
myproject-analyzer/
├── README.md                          # Comprehensive root documentation
├── package.json                       # npm workspaces root & unified build/test scripts
├── docs/                              # Full 5-guide documentation encyclopedia + ADRs
│   ├── README.md                      # Documentation hub & 12-chapter index
│   ├── 01-high-level-user-guide.md
│   ├── 02-deplenz-smart-paste-and-evolution.md
│   ├── 03-monorepo-architecture-and-platform-bridge.md
│   ├── 04-polyglot-ast-and-rust-engine.md
│   ├── 05-ui-design-system-and-performance.md
│   └── adr/                           # Architectural Decision Records (0001–0003)
│
├── apps/
│   ├── web/                           # Vite + React 19 Web Application (Port 3000)
│   │   └── src/
│   │       ├── main.tsx               # Web entry point & browser PlatformBridge installer
│   │       ├── App.tsx                # Root workspace coordinator, router & banner manager
│   │       └── index.css              # Tailwind CSS v4 + WCAG AA Light/Dark theme tokens
│   │
│   └── desktop/                       # Electron Native Desktop Application
│       ├── electron-builder.yml       # Cross-platform installer config (NSIS, DMG, AppImage)
│       └── src/
│           ├── main.ts                # Hardened Electron BrowserWindow & CSP setup
│           ├── preload.ts             # Context-isolated window.myprojectDesktop bridge
│           └── main/                  # IPC handlers, fs-walk, chokidar watcher, disk apply
│
└── packages/
    ├── core/                          # Pure TypeScript domain engines (zero React/DOM deps)
    │   └── src/
    │       ├── depLenz.ts             # Polyglot AST & dependency graph engine (Web/Rust/C++)
    │       ├── evolutionLog.ts        # Token-efficient Project Evolution & Handover logger
    │       ├── documentationData.ts   # 12-chapter, 45-section searchable documentation data
    │       ├── codeAnalyzer.ts        # 3-part code bundler & 6 LLM export formatters
    │       ├── pdfGenerator.ts        # WinAnsi-safe ASCII vector PDF architect
    │       ├── treeBuilder.ts         # O(N) hierarchy tree & byte rollup engine
    │       ├── collisionResolver.ts   # Deterministic flat namespace collision resolver
    │       ├── folderReader.ts        # Lazy Blob hydration & hierarchical .gitignore reader
    │       ├── folderExclusions.ts    # 16+ heavy directory heuristics
    │       ├── secretsDetector.ts     # Credential & private key filename scanner
    │       └── sampleProject.ts       # Built-in Web, Rust Crate & C++20 reference projects
    │
    ├── ui/                            # Shared React 19 UI components
    │   └── src/
    │       ├── HomePage.tsx           # Web landing page with Features dropdown & spotlights
    │       ├── DesktopLobby.tsx       # Full-window native desktop workbench lobby
    │       ├── DesktopHeader.tsx      # Responsive toolbar with More (N) overflow dropdown
    │       ├── DepLenzView.tsx        # 60fps direct-DOM SVG graph, Surgical AI & Smart Paste
    │       ├── DocumentationView.tsx  # Dual-audience documentation reader & keyword search
    │       ├── CodeSyntaxHighlighter.tsx # Polyglot tokenizer (TS/JS, Rust, C/C++20, JSON)
    │       └── DropdownSelect.tsx     # Portal-backed custom dropdown component
    │
    ├── platform/                      # Runtime abstraction layer (Browser vs. Electron)
    │   └── src/
    │       ├── types.ts               # PlatformBridge interface & IPC channel contracts
    │       └── browser-bridge.ts      # HTML5 File System Access & Blob download bridge
    │
    └── native-rust/                   # Optional Rust N-API native accelerator (napi-rs)
        ├── Cargo.toml                 # tree-sitter (TS/Rust/C/C++), rayon, regex, ignore
        ├── src/lib.rs                 # Parallel AST parser, SIMD search & Smart Paste verifier
        └── index.js                   # Automatic native loader with graceful JS fallback
```

### End-to-End Processing Pipeline

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. INGESTION LAYER                                                           │
│    Web: HTML5 showDirectoryPicker / Drag-and-Drop -> Lazy File Blob handles  │
│    Desktop: Native OS Dialog -> Multi-threaded fs-walk + Chokidar Watcher    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. AUTO-SHIELD & SECURITY GATE                                               │
│    • Intercepts 16+ heavy folders (node_modules, target, build, .git, dist)  │
│    • Evaluates hierarchical .gitignore rules (wildcards, anchors, !negation) │
│    • Flags sensitive secrets (.env, *.pem, id_rsa) with dismissible banners  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. UNIFIED WORKSPACE PROJECTION (6 SYNCHRONIZED LENSES)                      │
│    ├── [1] Files      -> O(N) Collision Resolution + Windowed Table + ZIP    │
│    ├── [2] Tree       -> O(N) Bottom-Up Rollups + Category Filters           │
│    ├── [3] PDF/Image  -> WinAnsi-Safe ASCII Vector PDF + 2x Retina PNG/JPEG  │
│    ├── [4] Stats      -> Extension Distribution + Collision Provenance Audit │
│    ├── [5] Analyzer   -> 3-Part Metadata Wrapper + 6 LLM Formats + Tokens    │
│    └── [6] DepLenz    -> Polyglot AST (Web/Rust/C++20) + 60fps SVG Map       │
│                          + <user_action_request> + <project_evolution_log>   │
│                          + Smart Paste 5-Stage Verifier & Disk/ZIP Apply     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### File-by-File Module Reference

| Package / File | Responsibility |
|---|---|
| `packages/core/src/depLenz.ts` | Polyglot symbol extraction (`ts`/`tsx`/`js`/`vue`/`svelte`, `.rs`, `.c`/`.cpp`/`.h`/`.hpp`), C/C++ Header-to-Source bridging, dependency graph construction, Surgical Prompt builder, and Smart Paste parser. |
| `packages/core/src/evolutionLog.ts` | Per-project ring buffer (`MAX_ENTRIES = 80`) and token-budgeted `<project_evolution_handover>` serializer (~15–25 tokens/entry). |
| `packages/core/src/documentationData.ts` | 12-chapter, 45-section structured encyclopedia dataset and weighted multi-term search engine (`searchDocumentation`). |
| `packages/ui/src/DepLenzView.tsx` | 60fps direct-DOM SVG graph canvas, module cluster bounding boxes, Surgical Prompt composer, Evolution Log manager, and Smart Paste Inbox. |
| `packages/ui/src/DocumentationView.tsx` | Interactive documentation reader with audience filter (`All` / `User Guide` / `Developer Deep Dive`), `Chapter` vs. `Full Manual` mode, and live keyword highlighting. |
| `packages/native-rust/src/lib.rs` | Native Rust N-API (`napi-rs`) accelerator providing parallel `rayon` + `tree-sitter` AST extraction, SIMD regex search, and 5-stage Smart Paste verification. |

---

## 🔒 Privacy & Security Invariants

- **100% Local Processing**: Zero source code, file paths, or telemetry ever leave your machine.
- **Hardened Electron Baseline (`ADR 0003`)**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict Content Security Policy, and navigation blocking.
- **Canonical Path-Jail Verification (`safe-path.ts`)**: All desktop IPC file reads and Smart Paste writes resolve `fs.realpath` and verify containment inside the active `watchRoot`—blocking symlink escapes and `../` traversal.
- **Atomic Disk Writes with `.bak` Backups (`apply-changes.ts`)**: Desktop Smart Paste writes to a sibling temporary file, flushes, atomically renames over the target, and creates timestamped backups under `.myproject-backup/<timestamp>/`.

---

## 🚀 Quickstart, Testing & Production Builds

### Prerequisites
- **Node.js** `>= 20.0.0` (Node 22 LTS recommended)
- **npm** `>= 10.0.0`
- *(Optional, for rebuilding the native Rust addon)* **Rust Toolchain** (`cargo`, `rustc >= 1.78`)

### Installation & Local Development

```bash
# 1. Install all monorepo workspace dependencies
npm install

# 2. Start the Web development server on http://localhost:3000
npm run dev

# 3. (Optional) Launch the Native Desktop Electron app in development mode
npm run desktop:dev
```

### Running the Unit Test Suite

All core algorithms—including Polyglot AST extraction (Web, Rust, C++20 Header Bridging), Token-Efficient Evolution Logs, Documentation Search, Collision Resolution, `.gitignore` parsing, and CodeFile Analyzer formats—are covered by fast unit tests using Node's native test runner:

```bash
# Run core polyglot AST, Evolution Log, and Documentation Encyclopedia tests
npx tsx --test packages/core/src/depLenz.test.ts packages/core/src/evolutionLog.test.ts packages/core/src/documentationData.test.ts

# Or run the full workspace test suite
npm test
```

### Type-Checking & Production Build

```bash
# Type-check all workspaces (zero emit)
npm run lint

# Build the production Web bundle into dist/
npm run build

# Package the Native Desktop installer (NSIS / DMG / AppImage)
npm run desktop:dist
```

---

## ⌨️ Global Keyboard Shortcuts & URL Flags

| Shortcut / URL Parameter | Context | Action |
|---|---|---|
| <kbd>1</kbd> – <kbd>6</kbd> | Workspace | Switch between `Files`, `Tree`, `PDF & Image`, `Stats`, `Analyzer`, and `DepLenz` |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>O</kbd> | Global | Open native project folder picker |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Workspace | Trigger primary export action for the active tab |
| <kbd>/</kbd> | Documentation | Focus the real-time documentation keyword search bar |
| <kbd>?</kbd> | Workspace | Open the Keyboard Shortcuts & Quick Help modal |
| <kbd>Escape</kbd> | Global | Close active modal, dropdown popover, or preview |
| `?view=docs` | URL Query | Launch directly into the 12-Chapter Documentation Encyclopedia |
| `?desktop=1` | URL Query | Preview the Full-Window Native Desktop Workbench Lobby in the browser |

---

## 📄 License

Distributed under the **[MIT License](https://opensource.org/licenses/MIT)**.
