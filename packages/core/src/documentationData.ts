/**
 * Comprehensive Dual-Audience Documentation Encyclopedia & Search Engine
 * for MyProject Analyzer (Web & Desktop Platforms).
 *
 * Structured into two exhaustive parts:
 * - PART I (Chapters 01–06): High-Level User Manual & Feature Reference
 *   Explains every screen, workflow, setting, export format, warning banner,
 *   collision strategy, and AI prompting pattern in clear, practical depth.
 * - PART II (Chapters 07–12): Deep Technical & Systems Engineering Reference
 *   Documents the entire monorepo file-by-file, data pipelines, lazy content
 *   hydration, polyglot AST extraction algorithms (Web, Rust, C/C++20 header
 *   bridging), native Rust N-API Rayon addon, 60fps direct-DOM SVG graph engine,
 *   5-stage Smart Paste static verifier, Myers line diff, token-efficient
 *   evolution ring-buffer, WCAG AA+ dual-theme contrast mathematics, and
 *   Electron security invariants.
 */

export type DocAudience = "user" | "developer";

export interface DocCodeBlock {
  title: string;
  filePath: string;
  language: string;
  code: string;
  caption?: string;
}

export interface DocTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface DocCallout {
  kind: "info" | "tip" | "warning" | "architecture";
  title: string;
  body: string;
}

export interface DocStepItem {
  step: string;
  title: string;
  detail: string;
  code?: string;
}

export interface DocDeepDiveNote {
  label: string;
  explanation: string;
}

export interface DocSubSection {
  id: string;
  title: string;
  paragraphs: string[];
  steps?: DocStepItem[];
  bullets?: string[];
  deepDiveNotes?: DocDeepDiveNote[];
  table?: DocTable;
  secondaryTable?: DocTable;
  codeBlock?: DocCodeBlock;
  secondaryCodeBlock?: DocCodeBlock;
  callout?: DocCallout;
}

export type DocSection = DocSubSection;

export interface DocChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  audience: DocAudience;
  category: string;
  readTimeMinutes: number;
  keywords: string[];
  summary: string;
  sections: DocSubSection[];
}

export interface DocSearchHit {
  chapter: DocChapter;
  matchedSectionIds: string[];
  matchCount: number;
  matchedKeywords: string[];
  snippet: string;
}

export const DOCUMENTATION_QUICK_KEYWORDS: string[] = [
  "DepLenz",
  "Rust",
  "C++20",
  "Header Bridging",
  "Collision",
  "Smart Paste",
  "Evolution Log",
  "User Action Prompt",
  "Light Mode",
  "Auto-Shield",
  "60fps Graph",
  "Security",
];

export const DOCUMENTATION_CHAPTERS: DocChapter[] = [
  /* ======================================================================== */
  /* PART I: HIGH-LEVEL USER MANUAL & COMPLETE FEATURE REFERENCE (01 - 06)    */
  /* ======================================================================== */
  {
    id: "user-getting-started",
    number: "01",
    title: "Product Manual, Core Mental Model & Ingestion Workflows",
    subtitle:
      "How MyProject Analyzer works end-to-end, how Web and Desktop editions differ, how to import any folder, and how to navigate every workspace control.",
    audience: "user",
    category: "User Manual · Fundamentals & Navigation",
    readTimeMinutes: 10,
    keywords: [
      "getting started",
      "overview",
      "open folder",
      "drag and drop",
      "sample project",
      "web",
      "desktop",
      "lobby",
      "landing page",
      "warnings",
      "close button",
      "keyboard shortcuts",
      "query flags",
    ],
    summary:
      "An end-to-end guide to MyProject Analyzer's six-lens workspace model, the four ways to load a codebase, the exact differences between the Web Landing Page and the Native Desktop Workbench Lobby, dismissible post-import warning banners, and all global keyboard shortcuts.",
    sections: [
      {
        id: "what-is-myproject-analyzer",
        title: "1. Core Philosophy & The Six-Lens Workspace Architecture",
        paragraphs: [
          "Modern software repositories are deeply nested trees containing hundreds or thousands of source files, configuration manifests, assets, and generated build artifacts. Whether you are auditing an unfamiliar repository, preparing an architectural handover PDF, flattening nested assets into a single archive, or collaborating with Large Language Models (LLMs), working directly with raw operating-system folders creates constant friction.",
          "MyProject Analyzer solves this by ingesting your project folder once into a 100% local, in-memory workspace pipeline and projecting that single source of truth through six specialized, synchronized lenses (`Files`, `Tree`, `PDF & Image`, `Stats`, `Analyzer`, and `DepLenz`). Every filter, exclusion choice, or collision strategy you select updates downstream views immediately without touching or mutating your original files on disk.",
          "Crucially, the software is engineered around strict local privacy: on the Web edition, files are read directly inside your browser's memory via HTML5 File/Blob handles; on the Desktop edition, files are scanned directly from your local filesystem via native OS threads. Zero source code, file names, or telemetry ever leave your machine.",
        ],
        table: {
          title: "The Six Integrated Workspace Lenses at a Glance",
          headers: ["Tab / Shortcut", "Lens Name", "Primary Problem Solved", "Primary Output / Artifact"],
          rows: [
            [
              "1 · Files",
              "Flat File Stripper",
              "Eliminates deep subfolder nesting & resolves duplicate filenames deterministically.",
              "Single flat `.zip` archive or individual file downloads + instant code/image preview.",
            ],
            [
              "2 · Tree",
              "Directory Hierarchy Explorer",
              "Visualizes exact folder nesting with rolled-up byte sizes and file counts per directory.",
              "Interactive collapsible tree + 1-click UTF-8 ASCII tree copy (`├──`, `└──`).",
            ],
            [
              "3 · PDF & Image",
              "Structure Blueprint Architect",
              "Generates publication-grade documentation without browser print-to-PDF font glitches.",
              "Multi-page vector `.pdf` report + `1x`/`2x`/`3x` high-DPI `.png` or `.jpeg` sheets.",
            ],
            [
              "4 · Stats",
              "Composition & Collision Telemetry",
              "Audits codebase distribution by extension, language category, largest files, and collisions.",
              "Visual distribution meters, deepest-path audit, and full collision mapping table.",
            ],
            [
              "5 · Analyzer",
              "CodeFile Multi-Format Bundler",
              "Packages multiple source files with root paths, line counts, and live token estimates.",
              "Unified `.txt` (Standard/Compact), `.md`, `.xml` (CDATA), `.jsonl`, or `.json` bundle.",
            ],
            [
              "6 · DepLenz",
              "Polyglot Call Graph & Surgical AI",
              "Maps how Web, Rust, and C/C++20 symbols communicate and extracts minimal AI prompts.",
              "60fps 2D Codebase Map, ~250-token Surgical Prompts, Smart Paste verifier & Evolution Log.",
            ],
          ],
        },
        callout: {
          kind: "tip",
          title: "Instant Polyglot Reference Workspaces",
          body: "You can test every lens without selecting a local folder: click 'Web Stack Demo' (acme-saas-platform), 'Rust Crate Demo' (orbit-kv-engine), 'C++20 Demo' (chrono-physics-engine), or 'Test node_modules Warning' on the home screen.",
        },
      },
      {
        id: "four-ingestion-methods",
        title: "2. Step-by-Step: The Four Ways to Load a Codebase",
        paragraphs: [
          "MyProject Analyzer supports four distinct ingestion pathways depending on whether you are using a web browser, dragging a folder from your OS file manager, running the native desktop app, or testing built-in reference repositories.",
        ],
        steps: [
          {
            step: "Method A",
            title: "Drag-and-Drop Folder Ingestion (Web & Desktop)",
            detail:
              "Drag any project folder from macOS Finder, Windows Explorer, or Linux file managers onto the dropzone. The reader recursively traverses all FileSystemDirectoryEntry branches in parallel, intercepts heavy directories (like node_modules or target) before reading their contents, and opens the workspace.",
          },
          {
            step: "Method B",
            title: "Browser Directory Picker (Web Edition Cmd/Ctrl+O)",
            detail:
              "Click 'Open Project Folder' or press Cmd/Ctrl+O. The browser invokes its native directory chooser (webkitdirectory), enumerates all files with relative paths, and feeds them through the Auto-Shield & .gitignore filter.",
          },
          {
            step: "Method C",
            title: "Native OS Dialog + Direct Disk Walk (Desktop Edition)",
            detail:
              "On Electron Desktop, clicking 'Open Folder' invokes the native OS folder dialog and runs a multi-threaded disk scan that records the folder's rootAbsolutePath. This unlocks Live Disk Watching (auto-refreshing views when you save in VS Code/CLion/RustRover) and Direct Apply-to-Disk.",
          },
          {
            step: "Method D",
            title: "Built-In Polyglot Reference Scenarios",
            detail:
              "Launch realistic, multi-file sample repositories—Acme SaaS Platform (TypeScript/React), Orbit KV Engine (Rust Cargo crate), Chrono Physics Engine (C++20 headers & implementation units), or the Heavy Exclusion Scenario—through the exact same production file reader.",
          },
        ],
      },
      {
        id: "web-vs-desktop-experience",
        title: "3. Web Landing Page vs. Full-Window Native Desktop Workbench Lobby",
        paragraphs: [
          "While both platforms share 100% of the six workspace lenses, their home experience is purpose-built for the medium:",
          "On the Web (`getPlatform().id === 'web'`), the application opens to the interactive Product Landing Page (`HomePage.tsx`). It showcases interactive format previews, a live Polyglot AST switcher (Web TSX, Rust `.rs`, and C++20 `.cpp`), an embedded drag-and-drop zone, and direct deep-links into this documentation.",
          "On the Desktop (`getPlatform().id === 'electron'` or `?desktop=1`), the web marketing page is completely replaced by the full-bleed Native Desktop Workbench Lobby (`DesktopLobby.tsx`). It utilizes 100% of the desktop window edge-to-edge (`w-full h-full` with zero side margins) and is structured like a professional native IDE:",
        ],
        deepDiveNotes: [
          {
            label: "Left Dock — Persistent Project History",
            explanation:
              "Stores up to 18 recently opened projects in localStorage (`myproject_project_history_v2`). Supports pinning favorites to the top, searching by project name or extension, filtering by language stack (`All`, `Web`, `Rust`, `C/C++`), and 1-click instant reload for cached workspaces.",
          },
          {
            label: "Center Pane — Launchpad & Live Syntax Inspector",
            explanation:
              "Provides native disk browsing, drag-and-drop ingestion, 4 one-click polyglot templates, direct workspace lens shortcuts, and a live syntax-highlighted code inspector so you can preview your active theme and font settings on real TypeScript, Rust, and C++20 code.",
          },
          {
            label: "Right Dock — Studio Appearance & Typography Inspector",
            explanation:
              "Gives instant control over Dark Studio vs. Light Paper appearance, all 7 color palettes, 4 curated font pairings (Modern System, Developer Mono, Technical Grotesk, Editorial Serif), base font scaling (12px–17px), and editor line height.",
          },
          {
            label: "Bottom Bar — Native Telemetry Status Bar",
            explanation:
              "Displays runtime engine status (Polyglot AST + Rust N-API readiness), active theme/appearance readout, and keyboard shortcut hints.",
          },
        ],
        table: {
          title: "Web vs. Desktop Feature & Runtime Matrix",
          headers: ["Capability", "Web Application (Browser)", "Desktop Application (Electron + Rust)"],
          rows: [
            ["Initial Home Screen", "Interactive Product Landing Page", "Edge-to-Edge 3-Pane Desktop Workbench Lobby"],
            ["File Reading Strategy", "Lazy `Blob.text()` hydration (16-way concurrency)", "Direct IPC disk reads with binary & 2MB size gates"],
            ["Live File System Watcher", "Manual re-import via dropzone or picker", "Automatic Chokidar watcher (150ms debounced batches)"],
            ["Smart Paste Re-Integration", "Per-file clipboard copy or full `.zip` download", "Atomic Apply-to-Disk with `.bak` backup creation"],
            ["Static Analysis Execution", "Chunked non-blocking async TypeScript parser", "Multi-threaded Rust N-API (`rayon`) + async TS fallback"],
            ["Project History Re-Open", "Session-based + inline cache for projects <= 240KB", "Persistent history dock + native path re-scanning"],
          ],
        },
      },
      {
        id: "post-import-warnings-and-banners",
        title: "4. Understanding & Dismissing Post-Import Warning Banners",
        paragraphs: [
          "When you import certain real-world codebases, MyProject Analyzer automatically audits the incoming files for performance hazards, sensitive credentials, and syntax anomalies. Instead of failing silently, it surfaces color-coded, dismissible warning banners at the top of the relevant view.",
          "Every post-import warning banner includes both an action button (to inspect or resolve the issue) and an explicit Close (`X`) button on the right so you can dismiss the banner and reclaim vertical screen space once you have acknowledged it. Dismissed banners automatically reset when you import a new project folder.",
        ],
        table: {
          title: "Post-Import Warning Banners & Controls Reference",
          headers: ["Warning Banner", "Where It Appears", "Trigger Condition", "Available Actions"],
          rows: [
            [
              "Auto-Excluded Heavy Folders & .gitignore",
              "Workspace top bar (below header)",
              "Project contained heavy directories (`node_modules`, `target`, `build`, `.git`) or `.gitignore`-matched files.",
              "Click 'Review Exclusions' to re-include any folder/file, or click `X` to close the banner.",
            ],
            [
              "Possible Secrets Detected",
              "Workspace top bar (below header)",
              "Project contains `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.json`, or certificate files.",
              "Review flagged filenames before sharing exports with AI, or click `X` to dismiss.",
            ],
            [
              "Analyzer Selection Secrets Warning",
              "CodeFile Analyzer tab (top bar)",
              "One or more secret files are currently checked for inclusion in the combined LLM bundle.",
              "Click 'Deselect Secrets' to uncheck all sensitive files in one click, or click `X` to close.",
            ],
            [
              "DepLenz Syntax Warnings Banner",
              "DepLenz tab (below sub-navigation)",
              "One or more source files have unclosed strings/comments, mismatched brackets, or invalid JSON.",
              "Click 'Review N Diagnostics' to inspect exact `file:line:col` errors, or click `X` to close.",
            ],
            [
              "Smart Paste Protocol Warnings",
              "DepLenz → Smart Paste panel",
              "Pasted LLM output contained unrecognized attributes, duplicate file blocks, or empty paths.",
              "Review protocol warnings alongside the 5-stage verification report, or click `X` to dismiss.",
            ],
          ],
        },
      },
      {
        id: "keyboard-shortcuts-and-url-flags",
        title: "5. Complete Keyboard Shortcuts & URL Query Parameters",
        paragraphs: [
          "Every major navigation action, modal, and export trigger can be operated entirely from the keyboard. In addition, special URL query parameters allow developers and QA engineers to boot directly into specific views or platform modes.",
        ],
        table: {
          title: "Global Keyboard Shortcuts",
          headers: ["Shortcut", "Scope", "Action Performed"],
          rows: [
            ["Cmd/Ctrl + O", "Global", "Opens the folder picker (native OS dialog on Desktop, directory chooser on Web)."],
            ["Cmd/Ctrl + S", "Workspace", "Compresses and downloads all flattened files as a `.zip` archive."],
            ["Cmd/Ctrl + P", "Workspace", "Generates and saves the vector directory structure `.pdf` report directly."],
            ["1 / 2 / 3 / 4 / 5 / 6", "Workspace", "Switches directly to Files (1), Tree (2), PDF & Image (3), Stats (4), Analyzer (5), or DepLenz (6)."],
            ["? (Shift + /)", "Global", "Toggles the Help & Keyboard Shortcuts reference modal."],
            ["/ or Cmd/Ctrl + K", "Documentation View", "Focuses and selects the Documentation keyword search bar."],
            ["Escape", "Global / Modals", "Closes any open modal, dropdown popover, file preview, or clears active search input."],
          ],
        },
        secondaryTable: {
          title: "Supported URL Query Parameters",
          headers: ["Query Parameter", "Example URL", "Behavior"],
          rows: [
            ["`?desktop=1`", "`http://localhost:3000/?desktop=1`", "Forces the full-window Native Desktop Workbench Lobby in a standard web browser."],
            ["`?autostart=1`", "`http://localhost:3000/?autostart=1`", "Automatically loads the default sample project and boots straight into the Workspace."],
            ["`?view=docs`", "`http://localhost:3000/?view=docs`", "Boots the application directly into the interactive Documentation Encyclopedia."],
            ["`?dev=1`", "`http://localhost:3000/?dev=1`", "Enables the QA Test Scenarios panel inside the dropzone for end-to-end verification."],
          ],
        },
      },
    ],
  },

  {
    id: "user-auto-shield-and-safety",
    number: "02",
    title: "Auto-Shield Exclusions, Hierarchical .gitignore & Secrets Guard",
    subtitle:
      "Deep dive into how heavy build directories are intercepted before hydration, how nested .gitignore rules are evaluated, and how sensitive credentials are protected.",
    audience: "user",
    category: "User Manual · Safety, Privacy & Filtering",
    readTimeMinutes: 9,
    keywords: [
      "auto-shield",
      "exclusions",
      "gitignore",
      "node_modules",
      "target",
      "build",
      "cmakefiles",
      "secrets",
      "env",
      "api keys",
      "pem",
      "security",
      "privacy",
    ],
    summary:
      "Learn the exact rules behind Auto-Shield's pre-import directory interception, how root and nested .gitignore files interact (including negation ! rules), how to selectively re-include any excluded folder or file, and how the Secrets Detector flags credential files.",
    sections: [
      {
        id: "auto-shield-heavy-folders",
        title: "1. Auto-Shield: Why & How Heavy Folders Are Intercepted Early",
        paragraphs: [
          "A typical modern repository contains 20 to 500 hand-written source files, alongside 30,000 to 120,000 generated or third-party files inside directories such as `node_modules/` (JavaScript/TypeScript), `target/` (Rust Cargo), `build/` or `cmake-build-debug/` (C/C++), `.git/objects/`, or `.next/`. If a browser or desktop tool attempts to read the text content of 80,000 dependency files during import, memory usage spikes past several gigabytes and the UI freezes.",
          "Auto-Shield prevents this by operating as a two-tier gate during directory scanning. Before a file's text content is ever hydrated into memory, its path segments are tested against the Auto-Shield Exclusion Catalog. Matched files are held back in a lightweight metadata bucket (`baseFiles`) and grouped by their triggering directory so you can review them in the Exclusion Warning Modal.",
        ],
        table: {
          title: "Complete Catalog of Default Auto-Shield Excluded Directories",
          headers: ["Directory Pattern", "Ecosystem / Tooling", "Why It Is Auto-Excluded by Default"],
          rows: [
            ["`node_modules`", "Node.js / npm / pnpm / yarn / bun", "Contains tens of thousands of third-party JS/TS packages and `.d.ts` files."],
            ["`.git`", "Git Version Control", "Contains binary packfiles, loose objects, logs, and internal refs."],
            ["`target`", "Rust (Cargo)", "Contains gigabytes of compiled `.rlib`, `.rmeta`, incremental build caches, and debug binaries."],
            ["`build`, `out`, `dist`", "C/C++ CMake, Vite, Webpack, Rollup", "Contains compiled object files (`.o`, `.obj`), bundled minified JS, and sourcemaps."],
            ["`CMakeFiles`, `cmake-build-*`", "CMake / CLion (C/C++)", "Contains compiler feature-detection probes, generated Makefiles, and Ninja dependency logs."],
            ["`.next`, `.nuxt`, `.svelte-kit`, `.output`", "Next.js, Nuxt, SvelteKit", "Contains generated server/client chunks, route manifests, and build caches."],
            ["`.turbo`, `.vercel`, `.cache`, `.parcel-cache`", "Monorepo & Bundler Caches", "Contains content-addressable build caches and local deployment artifacts."],
            ["`coverage`, `.nyc_output`", "Vitest, Jest, Istanbul, lcov", "Contains generated HTML/JSON test coverage reports."],
            ["`__pycache__`, `.venv`, `venv`, `.pytest_cache`", "Python", "Contains compiled `.pyc` bytecode and virtual environment site-packages."],
            ["`vendor`, `Pods`, `DerivedData`", "Go, PHP Composer, iOS CocoaPods/Xcode", "Contains vendored third-party libraries and Xcode intermediate build products."],
          ],
        },
      },
      {
        id: "hierarchical-gitignore-matching",
        title: "2. Hierarchical .gitignore Parsing & Rule Precedence",
        paragraphs: [
          "In addition to the built-in heavy folder catalog, MyProject Analyzer automatically reads every `.gitignore` file present in your imported folder—both at the repository root and inside nested subdirectories (for example, `packages/web/.gitignore`).",
          "Rules are evaluated in top-to-bottom declaration order, and nested `.gitignore` files are scoped strictly to their own subtree. This ensures that monorepos with package-specific ignore rules behave identically to `git status`.",
        ],
        bullets: [
          "Wildcard & Glob Support: Supports single-segment wildcards (`*.log`, `temp_?.txt`), leading/trailing path anchors (`/dist`, `build/`), and multi-directory globstars (`**/generated/*.ts`).",
          "Negation Rules (`!pattern`): If `.gitignore` ignores `*.env` on line 3 but specifies `!.env.example` on line 4, the parser un-ignores `.env.example` so template files are preserved in your workspace.",
          "Transparent Accounting: Files filtered by `.gitignore` are tracked separately from heavy directories so both the Exclusion Review Modal and the workspace warning banner report the exact count of `.gitignore`-excluded files.",
        ],
      },
      {
        id: "interactive-exclusion-review-modal",
        title: "3. Using the Exclusion Review Modal to Re-Include Anything",
        paragraphs: [
          "Nothing in MyProject Analyzer is ever discarded behind your back. Whenever Auto-Shield or `.gitignore` filters out at least one item during import, the **Exclusion Review Modal** opens automatically before the workspace loads.",
        ],
        steps: [
          {
            step: "Step 1",
            title: "Inspect Excluded Groups & File Counts",
            detail:
              "The modal lists each intercepted heavy directory (e.g., node_modules/ with 42 files, dist/ with 12 files) alongside a dedicated card for files matched by .gitignore rules, showing cumulative byte sizes and item counts.",
          },
          {
            step: "Step 2",
            title: "Expand Any Group to Audit Individual Files",
            detail:
              "Click any excluded folder or .gitignore rule group to expand its full file list and verify whether a needed file was caught by a broad pattern.",
          },
          {
            step: "Step 3",
            title: "Toggle Checkboxes to Re-Include Specific Groups or Files",
            detail:
              "Uncheck the exclusion (or check 'Include anyway') on any group you wish to bring into the workspace. When you confirm, the reader hydrates the text content of any newly re-included files on the fly.",
          },
          {
            step: "Step 4",
            title: "Re-Open Anytime from the Workspace Header",
            detail:
              "Even after confirming import, you can click 'Review Exclusions' in the top warning banner or click the 'Excluded (N)' badge in the toolbar to modify your exclusion choices without re-picking the folder from disk.",
          },
        ],
      },
      {
        id: "secrets-detector-deep-dive",
        title: "4. Secrets & Credential Detection Engine",
        paragraphs: [
          "Accidentally pasting `.env` files, private SSH keys, or cloud service account JSON files into an external LLM chat window is one of the most common security incidents in modern software teams.",
          "MyProject Analyzer runs every imported filename through `secretsDetector.ts` (`isSecretFile` and `getSecretWarning`). Flagged files trigger both a workspace-level danger banner and a selection-aware warning inside the CodeFile Analyzer.",
        ],
        table: {
          title: "Built-In Secret & Credential Detection Patterns",
          headers: ["Category", "Matched File Patterns", "Risk Level & Recommendation"],
          rows: [
            [
              "Environment Secrets",
              "`.env`, `.env.local`, `.env.development`, `.env.production`, `.env.staging`, `.env.test` (excludes `.env.example`, `.env.sample`, `.env.template`)",
              "Critical — Contains database URLs, JWT secrets, and third-party API keys. Use 'Deselect Secrets' in Analyzer.",
            ],
            [
              "Cryptographic Private Keys",
              "`*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.keystore`, `*.jks`, `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`",
              "Critical — Grants direct SSH, TLS, or code-signing authority. Never include in AI bundles.",
            ],
            [
              "Cloud & Service Credentials",
              "`credentials.json`, `client_secret*.json`, `service-account*.json`, `gcloud-service-key.json`, `.aws/credentials`",
              "Critical — Contains OAuth client secrets or IAM service account private keys.",
            ],
            [
              "Package Manager & Registry Tokens",
              "`.npmrc`, `.pypirc`, `.netrc`, `.htpasswd`, `.dockercfg`",
              "High — Often embeds publish tokens (`_authToken=...`) for npm, PyPI, or private registries.",
            ],
          ],
        },
        callout: {
          kind: "warning",
          title: "One-Click 'Deselect Secrets' in CodeFile Analyzer",
          body: "If secret files are selected in the CodeFile Analyzer tab, a red warning banner appears with a 'Deselect Secrets' button that immediately removes all flagged credential files from your LLM bundle while keeping your source code selected.",
        },
      },
    ],
  },

  {
    id: "user-files-tree-pdf-analytics",
    number: "03",
    title: "Files Flattener, Directory Tree, Vector PDF Architect & Stats",
    subtitle:
      "Complete reference for stripping subdirectories, resolving duplicate filenames, navigating the folder hierarchy, printing vector blueprints, and auditing metrics.",
    audience: "user",
    category: "User Manual · Core Inspection & Export Views",
    readTimeMinutes: 12,
    keywords: [
      "flat files",
      "collision strategy",
      "enumerate",
      "prefix path",
      "overwrite",
      "zip export",
      "directory tree",
      "ascii tree",
      "pdf architect",
      "png export",
      "jpeg",
      "stats",
      "analytics",
      "preview modal",
    ],
    summary:
      "Master the first four workspace lenses: how the Flat File Stripper resolves naming collisions across nested folders, how the Directory Tree computes recursive rollups, how the PDF & Image Architect avoids font corruption, and how the Stats view audits your repository.",
    sections: [
      {
        id: "flat-files-and-collisions",
        title: "1. Files View — Subfolder Stripping & Deterministic Collision Resolution",
        paragraphs: [
          "When uploading context files to AI knowledge bases, static analysis portals, or archival systems that only accept a flat list of files, manually copying files out of `src/`, `packages/`, and `include/` is slow and immediately runs into duplicate filename collisions (for example, five different `index.ts`, `mod.rs`, or `CMakeLists.txt` files across subdirectories).",
          "The **Files** view (`FlatFilesView.tsx`) flattens your entire repository into a single virtual root directory and runs the deterministic **Collision Resolver** (`collisionResolver.ts`). Files are first sorted lexicographically by their original relative path so collision numbering is 100% repeatable across runs. You can switch between three collision strategies at any time using the theme-styled dropdown in the toolbar:",
        ],
        table: {
          title: "Detailed Comparison of Filename Collision Strategies",
          headers: [
            "Strategy ID & Label",
            "Resolution Algorithm",
            "Input Paths Example",
            "Resulting Flattened Filenames",
            "When to Use",
          ],
          rows: [
            [
              "`enumerate` — Auto-number duplicates",
              "First file keeps its base name; subsequent collisions insert `_1`, `_2`, `_N` immediately before the file extension.",
              "`src/index.ts`, `src/api/index.ts`, `src/ui/index.ts`",
              "`index.ts`, `index_1.ts`, `index_2.ts`",
              "Best default when you want short, clean filenames and zero data loss.",
            ],
            [
              "`prefix-path` — Prefix folder path",
              "Whenever 2+ files share a base name, all colliding instances prepend their relative subfolder segments joined by `_`.",
              "`src/index.ts`, `src/api/index.ts`, `src/ui/index.ts`",
              "`src_index.ts`, `src_api_index.ts`, `src_ui_index.ts`",
              "Best when uploading flat files to an LLM or RAG store so the filename itself preserves directory context.",
            ],
            [
              "`overwrite` — Overwrite duplicates",
              "Retains only the last sorted file for each colliding base name and drops earlier duplicates.",
              "`src/index.ts`, `src/api/index.ts`",
              "`index.ts` (contains `src/ui/index.ts`)",
              "Use only when intentionally deduplicating identical boilerplate files across subfolders.",
            ],
          ],
        },
        deepDiveNotes: [
          {
            label: "Virtualized Table Performance (`useVirtualRows`)",
            explanation:
              "Even if your project contains 15,000 files, the Files table renders only the ~20 rows currently visible in the scroll viewport (`ROW_H = 56px`), maintaining 60fps scrolling and instant search filtering.",
          },
          {
            label: "Category Chips & Multi-Column Sorting",
            explanation:
              "Filter the flattened inventory by category (`All`, `Code`, `Docs`, `Config`, `Images`, `Style`, `Data`) or click column headers to sort ascending/descending by Flattened Name, Original Path, Extension, or Byte Size.",
          },
          {
            label: "Interactive File Preview Modal",
            explanation:
              "Click any row (or the eye icon) to open `FilePreviewModal.tsx`, featuring syntax-highlighted source code with line numbers, copy-to-clipboard, single-file download, and metadata inspection.",
          },
        ],
      },
      {
        id: "directory-tree-view",
        title: "2. Tree View — Interactive Hierarchy & UTF-8 ASCII Blueprint Copy",
        paragraphs: [
          "The **Tree** view (`DirectoryTreeView.tsx`) reconstructs your exact on-disk folder hierarchy from `ProcessedFile.pathSegments` using `buildFolderTree` (`treeBuilder.ts`). Every directory node automatically computes its recursive file count, subfolder count, and cumulative byte size (`totalSize`) bottom-up.",
          "Directories are sorted alphabetically before files at each depth level (`localeCompare` with numeric sensitivity so `step2.ts` precedes `step10.ts`).",
        ],
        bullets: [
          "Expand All / Collapse All / Depth Control: Quickly collapse deep subtrees to focus on top-level architecture or expand every nested branch.",
          "Live Tree Search Filter: Typing a query filters the hierarchy in real time while keeping ancestor folder branches open so matched files remain in their structural context.",
          "One-Click ASCII Tree Copy: Generates a publication-ready UTF-8 box-drawing tree (`├──`, `└──`, `│   `) with optional per-file byte sizes and copies it straight to your clipboard for pasting into `README.md` or GitHub Pull Requests.",
        ],
        codeBlock: {
          title: "Example Copied UTF-8 ASCII Tree Output",
          filePath: "chrono-physics-engine (ASCII Tree Export)",
          language: "txt",
          code: `chrono-physics-engine/ (8 files, 18.4 KB)
├── CMakeLists.txt (1.1 KB)
├── README.md (1.4 KB)
├── include/ (3 files, 6.2 KB)
│   ├── body.hpp (1.9 KB)
│   ├── integrator.hpp (1.8 KB)
│   └── world.hpp (2.5 KB)
└── src/ (3 files, 9.7 KB)
    ├── integrator.cpp (2.8 KB)
    ├── main.cpp (2.4 KB)
    └── world.cpp (4.5 KB)`,
        },
      },
      {
        id: "pdf-and-image-architect",
        title: "3. PDF & Image View — Vector Blueprints & Why Standard PDFs Corrupt Trees",
        paragraphs: [
          "Most tools that export directory trees to PDF simply render Unicode box-drawing characters (`├──`, `└──`, `│`) into a standard PDF font like Helvetica or Courier. Because standard PDF Type1 fonts only support WinAnsiEncoding (Latin-1), Unicode box characters outside that range are either replaced with garbage `% % %` glyphs or missing boxes.",
          "MyProject Analyzer's **PDF & Image Architect** (`PdfArchitectView.tsx`, `pdfGenerator.ts`, and `imageExporter.ts`) solves this permanently: in PDF exports, tree connectors are drawn as crisp geometric vector lines (`doc.line(...)`) and ASCII connectors alongside clean typography, guaranteeing 100% glitch-free rendering in every PDF viewer on macOS, Windows, Linux, and mobile.",
        ],
        table: {
          title: "PDF & High-DPI Image Architect Configuration Options",
          headers: ["Setting Group", "Available Options", "Effect on Generated Output"],
          rows: [
            [
              "Report Sections",
              "KPI Summary Cards, Directory Hierarchy Tree, Full File Inventory Table",
              "Toggle each section independently; multi-page pagination and running headers/footers adjust automatically.",
            ],
            [
              "Tree Connector Style",
              "`Standard` (`|--`, `` `-- ``), `Minimal` (indented guides), `ASCII Classic` (`+---`)",
              "Controls visual connector styling in both the live blueprint preview and vector PDF.",
            ],
            [
              "Color Theme & Accent",
              "`Ocean Blue`, `Royal Purple`, `Emerald`, `Slate Minimal`, `Crimson`, `Amber`",
              "Themes the cover banner, KPI cards, folder icons, and table header fills.",
            ],
            [
              "Typography & Density",
              "Font family (`Sans`, `Mono`, `Serif`) + Font Size (`8pt` to `12pt`)",
              "Adjusts how many tree rows fit per page for compact 1,000-file audits vs. presentation handouts.",
            ],
            [
              "High-DPI Raster Export",
              "Format (`PNG` lossless / `JPEG`) + Scale (`1x Standard`, `2x Retina`, `3x Ultra-HD`)",
              "Renders the entire blueprint onto an offscreen HTML5 Canvas (`imageExporter.ts`) at up to 3x pixel density.",
            ],
          ],
        },
      },
      {
        id: "stats-analytics-view",
        title: "4. Stats View — Codebase Composition, Depth & Collision Audit",
        paragraphs: [
          "The **Stats** view (`AnalyticsView.tsx`) provides a quantitative executive summary of your loaded repository. It calculates metrics across four dimensions:",
        ],
        bullets: [
          "Top-Line KPIs: Total files, total directories, cumulative byte size, maximum directory nesting depth (`maxDepth`), average file size, and total filename collisions.",
          "Extension Breakdown Meters: Ranks every file extension (e.g., `.tsx`, `.rs`, `.cpp`, `.hpp`, `.json`) by both file count percentage and byte volume.",
          "Heaviest Files & Deepest Paths: Surfaces the top 10 largest files by byte weight (ideal for spotting bloated assets or bundled fixtures) and the most deeply nested directory paths.",
          "Complete Collision Audit Table: Lists every filename that collided during flattening, showing its original relative path alongside the resolved flattened name under your active collision strategy.",
        ],
      },
    ],
  },

  {
    id: "user-codefile-analyzer",
    number: "04",
    title: "CodeFile Analyzer: 6-Format LLM Bundling & Token Budgeting",
    subtitle:
      "How to package entire repositories or selected modules into Standard, Compact, Markdown, CDATA XML, JSONL, or JSON bundles with live token estimates.",
    audience: "user",
    category: "User Manual · Multi-File AI Bundling",
    readTimeMinutes: 9,
    keywords: [
      "codefile analyzer",
      "analyzer",
      "token estimation",
      "xml",
      "cdata",
      "markdown",
      "jsonl",
      "json",
      "compact",
      "standard",
      "lockfiles",
      "line numbers",
      "table of contents",
    ],
    summary:
      "Complete guide to the CodeFile Analyzer: the 3-part metadata layout, choosing among the 6 export formats (including CDATA-safe XML for Claude and JSONL for RAG/vector databases), lockfile auto-exclusion, and real-time token budgeting.",
    sections: [
      {
        id: "three-part-metadata-layout",
        title: "1. The 3-Part CodeFile Layout & Why Structure Matters to LLMs",
        paragraphs: [
          "When you paste multiple source files into an LLM without clear boundaries, models frequently confuse where one file ends and the next begins, or hallucinate import paths because they only see the filename (`Button.tsx`) instead of its path from the project root (`packages/ui/src/components/Button.tsx`).",
          "The **CodeFile Analyzer** (`CodeAnalyzerView.tsx` & `codeAnalyzer.ts`) solves this by wrapping every selected file in a deterministic 3-part structure: (1) Top Metadata Header containing the exact root-relative path, filename, detected language family (35+ languages), byte size, and line count; (2) Pristine Source Content (with optional 1-indexed line numbers); and (3) An explicit End-of-File boundary marker (`END OF FILE: <path>`).",
        ],
      },
      {
        id: "six-export-formats-reference",
        title: "2. Exhaustive Reference: All 6 Export Formats",
        paragraphs: [
          "Different AI models and downstream data pipelines expect different serialization formats. You can switch between all six formats at the top of the Analyzer preview and compare their live token counts side by side:",
        ],
        table: {
          title: "CodeFile Analyzer 6 Export Formats Specification",
          headers: ["Format", "Extension", "Token Overhead", "Exact Structural Grammar", "Ideal Use Case"],
          rows: [
            [
              "Standard",
              "`.txt`",
              "Baseline (100%)",
              "80-col `===` banners + `FILE LOCATION / NAME / TYPE / SIZE / LINES` + code + `END OF FILE` banner.",
              "Archival snapshots, human code reviews, compliance audits, and general LLM prompts.",
            ],
            [
              "Compact",
              "`.txt`",
              "Lowest (-15% to -80% header overhead)",
              "Single-line `# ---- path/to/file.ts ----` header followed immediately by raw code.",
              "Tight LLM context windows where every token counts.",
            ],
            [
              "Markdown",
              "`.md`",
              "Low",
              "`### File: name` + blockquote metadata + fenced ```` ```lang ```` block + `<!-- END OF FILE -->`.",
              "GitHub issues, Notion docs, ChatGPT / Gemini web chat windows, and technical documentation.",
            ],
            [
              "XML (CDATA)",
              "`.xml`",
              "Low-Medium",
              "`<project><file path=\"...\" type=\"...\" lines=\"...\"><![CDATA[ ...code... ]]></file></project>`.",
              "Anthropic Claude system prompts; `CDATA` wrapping guarantees raw `<div className=...>` or C++ `std::vector<T>` tags never break XML parsing.",
            ],
            [
              "JSONL",
              "`.jsonl`",
              "Medium (JSON-escaped)",
              "Line 1: `{\"recordType\":\"metadata\",...}`; Lines 2..N: one self-contained `{\"recordType\":\"file\",...}` JSON object per line.",
              "RAG ingestion pipelines, LangChain/LlamaIndex loaders, and vector database indexing.",
            ],
            [
              "JSON",
              "`.json`",
              "Medium (Pretty-printed)",
              "Single valid JSON document `{ rootFolder, generatedAt, fileCount, totalLines, files: [...] }`.",
              "Custom Node/Python automation scripts, REST API payloads, and schema validators.",
            ],
          ],
        },
      },
      {
        id: "smart-selection-lockfiles-and-tokens",
        title: "3. Smart Defaults: Lockfile Auto-Skip, Token Math & Secret Deselection",
        paragraphs: [
          "When you open the CodeFile Analyzer, it automatically selects all text-based code and configuration files while leaving out two categories of noise:",
        ],
        bullets: [
          "Automatic Lockfile Deselection (`isLockfile`): Files such as `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `Cargo.lock`, `Gemfile.lock`, `poetry.lock`, and `composer.lock` often span 10,000+ lines (~150,000 tokens) while carrying near-zero architectural value. They are badged as `LOCKFILE` in the left file list and unchecked by default (you can still check them manually if auditing dependency versions).",
          "Heavy File Token Highlighting (`> 10,000 tokens`): Any individual file whose estimated token footprint exceeds 10,000 tokens is highlighted in amber in the file list so you can spot context hogs immediately.",
          "O(N) Multi-Format Token Estimator (`estimateCombinedTokensByStyle`): Computes live token estimates across all 6 format tabs simultaneously without allocating 5 unused multi-megabyte strings in memory.",
          "One-Click 'Deselect Secrets' Guard: If `.env` or key files are checked, the red warning banner lets you strip all secret files from the selection in one click or dismiss the banner via its `X` close button.",
        ],
      },
    ],
  },

  {
    id: "user-deplenz-and-surgical-prompts",
    number: "05",
    title: "DepLenz Complete Guide: Polyglot Call Graphs, 2D Map & Subsystems",
    subtitle:
      "How to explore Web, Rust, and C/C++20 dependency trees, read the Subsystem Communication Matrix, and interact with the 60fps 2D Codebase Map.",
    audience: "user",
    category: "User Manual · DepLenz Visual Architecture",
    readTimeMinutes: 12,
    keywords: [
      "deplenz",
      "dependency graph",
      "codebase map",
      "clusters",
      "subsystems",
      "blast radius",
      "callers",
      "callees",
      "rust",
      "c++",
      "cpp",
      "search",
      "syntax warnings",
    ],
    summary:
      "A comprehensive guide to DepLenz's visual inspection tools: understanding polyglot symbol badges, filtering by architectural subsystem, reading upstream callers and transitive blast radius, operating the 60fps 2D Codebase Map, and running enclosing-symbol keyword searches.",
    sections: [
      {
        id: "polyglot-stack-detection-and-symbols",
        title: "1. Polyglot Stack Detection & Symbol Kind Taxonomy",
        paragraphs: [
          "When you switch to the **DepLenz** tab (`DepLenzView.tsx`), the static analyzer inspects your project's files and displays a stack badge in the top bar (`Web Dev (TS/JS/React)`, `Rust Crate`, `C/C++ Native`, or `Polyglot Stack`).",
          "Every extracted code construct is categorized into one of seven color-coded symbol kinds so you can distinguish UI components, hooks, pure functions, classes, Rust structs/traits, and C++ methods at a glance:",
        ],
        table: {
          title: "DepLenz Symbol Taxonomy & Visual Badges",
          headers: ["Badge", "Symbol Kind", "Color Theme", "Constructs Represented Across Languages"],
          rows: [
            ["`UI`", "`component`", "Purple", "React PascalCase function components, `React.memo(...)`, `React.forwardRef(...)`, `.vue` & `.svelte` components."],
            ["`use`", "`hook`", "Emerald", "React custom hooks (`useAuth`, `useDebouncedValue`, `useVirtualRows`)."],
            ["`fn`", "`function`", "Sky Blue", "TS/JS functions, Rust `pub fn` / `async fn` / `unsafe fn`, C/C++ free & template functions."],
            ["`cls`", "`class`", "Amber", "ES6/TypeScript `class` declarations and C++ `class` declarations."],
            ["`m()`", "`method`", "Teal", "Class methods, Rust `impl` methods, and C++ out-of-line `ClassName::methodName(...)` implementations."],
            ["`st`", "`struct`", "Orange", "Rust `pub struct` / `enum` types and C/C++ `struct` definitions."],
            ["`tr`", "`trait`", "Pink / Rose", "Rust `pub trait` interface definitions and contract declarations."],
          ],
        },
      },
      {
        id: "subsystem-communication-bar",
        title: "2. Subsystem & Component Communication Matrix",
        paragraphs: [
          "At the top of the **Dependency Tree** sub-tab, DepLenz renders the **Codebase Subsystems & Component Communication** bar. It automatically groups your repository's files into logical architectural subsystems based on their directory structure (for example, `packages/core`, `packages/ui`, `src/engine`, `include`, `src`).",
          "Each subsystem chip displays:",
        ],
        bullets: [
          "Symbol & File Count: How many extracted functions/components/structs live inside that module.",
          "Inbound Calls (`in: N` — Afferent Coupling): How many times symbols in other subsystems call into this module. High inbound counts indicate core foundational libraries.",
          "Outbound Calls (`out: M` — Efferent Coupling): How many times symbols in this module call out to other subsystems. High outbound counts indicate orchestrator or controller layers.",
          "One-Click Subsystem Filtering: Clicking any subsystem chip filters the left symbol directory to show only symbols belonging to that module.",
        ],
      },
      {
        id: "bidirectional-dependency-tree-and-blast-radius",
        title: "3. Bi-Directional Dependency Tree & Transitive Blast Radius",
        paragraphs: [
          "Selecting any symbol in the left sidebar opens its three-tier **Bi-Directional Dependency Tree**:",
        ],
        steps: [
          {
            step: "Tier 1 (Top)",
            title: "Upstream Callers ('Who Calls This') & Transitive Blast Radius",
            detail:
              "Lists every symbol in the project that directly invokes the selected symbol. In the header, DepLenz computes the Transitive Blast Radius—the total number of unique upstream functions/components across all hops that could break if you alter this symbol's signature or return type—and assigns a risk badge: Low (0 callers), Medium (1–3), High (4–8), or Critical (9+).",
          },
          {
            step: "Tier 2 (Center)",
            title: "Focused Target Symbol Card & Syntax-Colored Source Body",
            detail:
              "Displays the symbol's full signature, file path, exact 1-indexed line span (e.g., lines 42–89), export status, external npm/crate/system-header imports, and a collapsible syntax-colored source code viewer. Clicking 'Open File' opens the full file preview.",
          },
          {
            step: "Tier 3 (Bottom)",
            title: "Downstream Callees ('What This Calls')",
            detail:
              "Lists every internal project symbol invoked inside the focused symbol's body. Clicking any upstream caller or downstream callee card pivots the focus onto that symbol and records your trail in the breadcrumb history bar (`Back` button).",
          },
        ],
      },
      {
        id: "interactive-2d-codebase-map",
        title: "4. Operating the 60fps 2D Interactive Codebase Map",
        paragraphs: [
          "Click the **Codebase Map** sub-tab to launch the interactive 2D SVG graph canvas (`DepLenzGraphCanvas.tsx`). Unlike static diagrams, this is a live, physics-free layered architecture canvas engineered for 60fps interaction even on large repositories:",
        ],
        bullets: [
          "Left-to-Right Call Flow & Animated Dots: Entry points (0 callers) sit in the leftmost column, and downstream callees flow rightward by call depth. Animated dashes flow along cubic-bezier edges from caller to callee, terminating in a circular port on the target node.",
          "Dashed Module Cluster Bounding Boxes: Toggle the 'Clusters' button in the canvas toolbar to draw labeled, color-tinted bounding boxes around symbols that belong to the same directory/subsystem.",
          "Zero-Lag Direct-DOM Node Dragging: Click and drag any node box to rearrange the diagram. The canvas mutates SVG coordinates directly on the DOM via `requestAnimationFrame` so dragging is instantaneous and never duplicates or detaches node boxes.",
          "Scope Modes (`Full Codebase` vs. `Focused Neighborhood`): Switch to 'Focused (1-hop)' to isolate only the currently selected symbol, its direct callers, its direct callees, and its optional external package nodes.",
          "Export Diagram as SVG, 2x PNG, or JSON: Use the export controls in the canvas toolbar to save vector `.svg` diagrams, high-DPI `.png` screenshots, or the raw graph `.json` topology.",
        ],
      },
      {
        id: "keyword-search-and-syntax-diagnostics",
        title: "5. Enclosing-Function Keyword Search & Syntax Diagnostics",
        paragraphs: [
          "The **Keyword Search** sub-tab in DepLenz goes beyond a basic text search: when you search for a string or regular expression (with Case-Sensitive and Regex toggles), DepLenz cross-references every matching line number against all extracted symbol spans (`lineStart <= matchLine <= lineEnd`).",
          "Each search result tells you not only the file and line where the keyword appears, but the exact **enclosing function, component, struct, or method** that owns that line—allowing you to pivot directly from a log message or variable name into a Surgical LLM Prompt for its enclosing function.",
        ],
      },
    ],
  },

  {
    id: "user-surgical-ai-smart-paste-evolution",
    number: "06",
    title: "Surgical AI Prompts, User Action Directives, Smart Paste & Evolution Logs",
    subtitle:
      "The complete round-trip AI engineering workflow: extracting minimal prompts, weaving User Action Requests, Two-Step Plan Mode, 5-stage Smart Paste verification, and Evolution Handover logs.",
    audience: "user",
    category: "User Manual · AI Engineering & Handover Workflows",
    readTimeMinutes: 13,
    keywords: [
      "surgical prompt",
      "user action prompt",
      "user_action_request",
      "two-step plan mode",
      "smart paste",
      "verification",
      "apply to disk",
      "diff",
      "evolution log",
      "project_evolution_handover",
      "handover",
      "token savings",
    ],
    summary:
      "Step-by-step mastery of DepLenz's AI workflow: cutting prompt sizes by 85–98%, automatically interweaving User Action Directives and Evolution Handover logs, running Two-Step Plan Mode for multi-file features, verifying LLM responses with Smart Paste, and maintaining Project Evolution history.",
    sections: [
      {
        id: "surgical-prompt-anatomy",
        title: "1. How Surgical LLM Prompt Extraction Saves 85–98% of Tokens",
        paragraphs: [
          "Dumping an entire repository into an LLM when fixing a bug or refactoring a component wastes context tokens, increases latency, and degrades model reasoning with irrelevant files. Conversely, pasting only a single function causes the LLM to hallucinate helper signatures, break upstream callers, or invent non-existent types.",
          "DepLenz's **Surgical LLM Prompt** tab (`extractSurgicalContext`) computes the minimal, mathematically complete slice of your codebase required to edit the selected symbol safely:",
        ],
        table: {
          title: "What Goes Into a Surgical Prompt Bundle",
          headers: ["Context Layer", "Included Content", "Why the LLM Needs It"],
          rows: [
            [
              "1. Target Symbol Body",
              "Exact source lines (`lineStart..lineEnd`) of the focused function, component, or method.",
              "The primary code unit being refactored, debugged, or extended.",
            ],
            [
              "2. Full Target File (Toggleable)",
              "Complete contents of the file containing the target symbol.",
              "Enables the LLM to return a complete, drop-in replacement file for Smart Paste.",
            ],
            [
              "3. Referenced Type Contracts",
              "Every `interface`, `type`, `enum`, Rust `struct`/`trait`, or C++ `class`/`struct` referenced in the symbol's signature or body.",
              "Prevents the model from guessing property names or breaking type checking.",
            ],
            [
              "4. Upstream Caller Contracts",
              "Signatures (or full bodies) of all functions/components that call the target symbol.",
              "Guarantees the LLM preserves call-site parameter order and return-value contracts.",
            ],
            [
              "5. Downstream Callees & Imports",
              "Signatures (or full bodies) of internal helpers called by the target, plus external package imports.",
              "Shows the LLM which existing utilities to reuse instead of reinventing them.",
            ],
          ],
        },
      },
      {
        id: "interwoven-user-action-prompt",
        title: "2. Interwoven User Action Prompt (<user_action_request>)",
        paragraphs: [
          "Inside the **Surgical LLM Prompt** tab, the **User Action Prompt** card lets you write your specific engineering instruction—or select a 1-click preset (`Refactor for clarity`, `Fix edge-case bugs`, `Optimize performance`, `Add unit tests`, `Convert to async/error-safe`, `Add TypeScript/Rust/C++ types`).",
          "Instead of forcing you to manually paste your instruction at the bottom of a copied prompt, `interweaveSurgicalPrompt` automatically weaves your task into a dedicated `<user_action_request>` block positioned right between the codebase context and the Smart Paste output contract, instructing the LLM to fulfill your exact goal while honoring all upstream/downstream dependency constraints.",
        ],
        codeBlock: {
          title: "Automatically Interwoven Prompt Structure",
          filePath: "deplenz-surgical-stepSimulation.md",
          language: "xml",
          code: `<project_evolution_handover entries="2" budget_tokens="220">
# Compact chronological log of recent codebase changes (newest first):
- [14:20 paste sym:integrateVerlet] M:src/integrator.cpp(+8/-2) @integrateVerlet — Added velocity damping
</project_evolution_handover>

# DepLenz Surgical Context: PhysicsWorld::stepSimulation (src/world.cpp)
... [Target File + Referenced Contracts + Upstream Callers + Downstream Callees] ...

<user_action_request priority="primary">
Task: Clamp maximum delta-time step dt to 0.016s and sub-step when frame time spikes.
Execution Rules:
1. Fulfill the task above while preserving all upstream caller contracts.
2. Reuse listed downstream helpers and type contracts without inventing phantom imports.
</user_action_request>

# Smart Paste Output Contract (<<<SMART_PASTE_FILE>>>)`,
        },
      },
      {
        id: "two-step-plan-mode",
        title: "3. Two-Step Plan Mode for Cross-Cutting Multi-File Features",
        paragraphs: [
          "What if your feature requires creating new files or editing several modules across the repository, and you aren't sure which single symbol to pick? Toggle **Two-Step Plan Mode** inside the Surgical Prompt tab:",
        ],
        steps: [
          {
            step: "Step 1 — Copy Compact Codebase Map Prompt",
            title: "Send an Ultra-Light (~1–2k Token) Architectural Index to the LLM",
            detail:
              "DepLenz generates a compact index listing every file path in the project along with its exported symbols and signatures (no bulky function bodies), plus your User Action Prompt. Ask the LLM to reply with a small JSON array planning which files need full contents, signatures-only, or creation.",
          },
          {
            step: "Step 2 — Paste LLM's File Plan JSON",
            title: "Auto-Assemble the Exact Custom Context Bundle",
            detail:
              "Paste the LLM's JSON plan into Step 2 and click 'Parse & Build Context'. DepLenz reads the requested file paths and detail levels (`full`, `signatures`, `create`) and builds a custom prompt containing those exact files plus Smart Paste output instructions.",
          },
        ],
      },
      {
        id: "smart-paste-verification-and-apply",
        title: "4. Smart Paste Inbox, 5-Stage Verification & Apply-to-Disk",
        paragraphs: [
          "When `Smart Paste Output Contract` is enabled on your Surgical Prompt, the LLM returns modified and newly created files wrapped in `<<<SMART_PASTE_FILE path=\"...\" action=\"modify|create|delete\">>>` blocks.",
          "Paste the LLM's raw response into the **Smart Paste** sub-tab and click **Parse & Verify**. Before you copy or write a single byte, DepLenz runs a **5-Stage Static Verification Pipeline** (`smartPasteVerify.ts`):",
        ],
        bullets: [
          "Stage 1 — Syntax & Delimiter Balance: Verifies that every returned file has balanced `{ }`, `( )`, `[ ]`, and closed strings/comments.",
          "Stage 2 — Exported Symbol Preservation: Checks whether any previously exported function, component, struct, or class in a modified file was accidentally deleted by the LLM.",
          "Stage 3 — Signature & Arity Compatibility: Compares parameter counts on modified functions against their original definitions.",
          "Stage 4 — Upstream Caller Impact (`mustUpdate` Detection): If a symbol's required parameter arity changed, checks whether all upstream caller files were also included in the Smart Paste response—and flags any missing caller file in red!",
          "Stage 5 — Import Resolution Audit: Verifies that relative `import` / `use` / `#include` paths in the new code resolve to real files in the project or files created in the same paste.",
        ],
        callout: {
          kind: "info",
          title: "Interactive Diff Viewer, Marker Stripping & Desktop Apply-to-Disk",
          body: "Click 'Diff' on any parsed file to inspect line-by-line additions/removals (`codeDiff.ts`). Uncheck 'Keep [SMART-PASTE] markers' to strip AI review comments cleanly on export. On Desktop, click 'Apply to Disk' (with optional Dry-Run preview) to write changes atomically to your workspace with automatic timestamped backups.",
        },
      },
      {
        id: "evolution-logs-handover",
        title: "5. Project & Code Evolution Logs (Token-Efficient Multi-LLM Handover)",
        paragraphs: [
          "When you work across multiple LLM sessions (for example, planning architecture in Claude, implementing a Rust module in GPT, and debugging a C++ header in Gemini), each new model starts blind to what previous models just changed.",
          "The **Evolution Log** sub-tab (`evolutionLog.ts`) maintains a chronological ring buffer of project mutations (auto-recorded whenever you apply a Smart Paste, receive a Desktop live-watch disk update, or add a manual milestone note). Each entry records the timestamp, source (`smart-paste`, `live-watch`, `manual`, `snapshot`), target symbol, file action (`A:` create, `M:` modify, `D:` delete), `+added/-removed` line deltas, and touched symbol names (`@fnA,fnB`).",
          "When **Include Evolution Handover** is checked in the Surgical Prompt tab, the most recent entries are formatted within a strict token budget (default 220 tokens, ~15–25 tokens per entry) inside `<project_evolution_handover>` so every subsequent LLM has complete continuity at near-zero token cost.",
        ],
      },
    ],
  },

  /* ======================================================================== */
  /* PART II: DEEP TECHNICAL & SYSTEMS ENGINEERING REFERENCE (07 - 12)        */
  /* ======================================================================== */
  {
    id: "dev-monorepo-and-platform-bridge",
    number: "07",
    title: "Monorepo Architecture, File-by-File Codebase Map & Data Pipeline",
    subtitle:
      "Exhaustive architectural specification of all workspace packages, every source file in the repository, lazy content hydration, and the debounced reactive state pipeline.",
    audience: "developer",
    category: "Developer Deep Dive · System Architecture & Codebase Map",
    readTimeMinutes: 15,
    keywords: [
      "monorepo",
      "architecture",
      "codebase",
      "files",
      "packages",
      "platform bridge",
      "electron",
      "ipc",
      "lazy hydration",
      "processedfile",
      "debounce",
      "settledfiles",
      "adr",
    ],
    summary:
      "Complete engineering reference for the MyProject Analyzer monorepo: unidirectional package dependency rules, a file-by-file manifest of every module in packages/* and apps/*, the PlatformBridge abstraction, lazy Blob/Path content hydration, and the settled-file reactive pipeline.",
    sections: [
      {
        id: "monorepo-topology",
        title: "1. Unidirectional Workspace Topology & Dependency Rules (ADR-001)",
        paragraphs: [
          "MyProject Analyzer is architected as a multi-package TypeScript + Rust monorepo managed via workspaces (`package.json` workspaces: `packages/*`, `apps/*`). The dependency graph is strictly acyclic and layered so domain algorithms can be unit-tested in pure Node.js (`tsx --test`) without a DOM or Electron runtime:",
          "Layer 0 (`@myproject/core`, `@myproject/platform`, `@myproject/rust-engine`) contains pure domain types, static analysis compilers, and bridge contracts. Layer 1 (`@myproject/platform-web`, `@myproject/platform-electron`, `@myproject/ui`) implements platform adapters and shared React 19 views. Layer 2 (`@myproject/web`, `@myproject/desktop`) wires the composition root and native Electron shell.",
        ],
        table: {
          title: "Workspace Packages & Architectural Boundaries",
          headers: ["Workspace Package", "Directory", "Allowed Workspace Dependencies", "Runtime Environment"],
          rows: [
            ["`@myproject/core`", "`/packages/core`", "None (leaf domain package; uses `jspdf`, `jszip`)", "Isomorphic (Node, Browser, Electron)"],
            ["`@myproject/platform`", "`/packages/platform`", "`@myproject/core` (types only)", "Isomorphic contract singleton"],
            ["`@myproject/rust-engine`", "`/packages/rust-engine`", "Native Rust (`napi`, `rayon`, `regex`, `ignore`, `serde`)", "Node.js / Electron Main Process (N-API)"],
            ["`@myproject/platform-web`", "`/packages/platform-web`", "`@myproject/core`, `@myproject/platform`", "Browser DOM (`File`, `Blob`, `URL.createObjectURL`)"],
            ["`@myproject/platform-electron`", "`/packages/platform-electron`", "`@myproject/core`, `@myproject/platform`", "Electron Renderer (`window.myprojectDesktop`)"],
            ["`@myproject/ui`", "`/packages/ui`", "`@myproject/core`, `@myproject/platform`", "React 19 + Tailwind CSS v4 + Lucide"],
            ["`@myproject/web`", "`/apps/web`", "`@myproject/core`, `@myproject/platform`, `@myproject/platform-web`, `@myproject/platform-electron`, `@myproject/ui`", "Vite SPA / Electron Renderer Payload"],
            ["`@myproject/desktop`", "`/apps/desktop`", "`@myproject/core`, `@myproject/platform`, `@myproject/rust-engine`, `@myproject/web`", "Electron 35 Main + Hardened Preload"],
          ],
        },
      },
      {
        id: "complete-file-by-file-codebase-reference",
        title: "2. Complete File-by-File Codebase Inventory & Module Reference",
        paragraphs: [
          "Every source file in the repository has a single, well-defined responsibility and a companion unit test suite (`*.test.ts`) where pure domain or security invariants are enforced. Below is the complete file-by-file reference across `/packages/core`, `/packages/ui`, `/packages/rust-engine`, `/apps/web`, and `/apps/desktop`:",
        ],
        table: {
          title: "@myproject/core (`/packages/core/src/*`) — Domain Engines & Compilers",
          headers: ["File Path", "Key Exported Functions / Types", "Technical Responsibility"],
          rows: [
            ["`types.ts`", "`ProcessedFile`, `FileContentSource`, `FolderNode`, `FolderStats`, `FolderScanResult`, `WorkspaceTab`", "Canonical TypeScript data structures shared across all packages and IPC boundaries."],
            ["`folderReader.ts`", "`processFileList`, `readDroppedEntries`, `hydrateFilesWithConcurrency`, `shouldReadText`", "Browser FileList & HTML5 DataTransfer directory walker with Auto-Shield interception and 16-way concurrent hydration."],
            ["`content.ts` & `contentReader.ts`", "`MAX_TEXT_BYTES` (2MB), `BINARY_SNIFF_BYTES` (8KB), `looksBinary`, `readBlobTextGated`", "Shared NUL-byte binary sniffer and 2MB text size gate used identically by Web and Desktop scanners."],
            ["`folderExclusions.ts`", "`DEFAULT_EXCLUSION_RULES`, `checkPathExclusion`", "17+ default heavy directory patterns (`node_modules`, `target`, `build`, `.git`, etc.) and path segment matcher."],
            ["`gitignoreParser.ts`", "`parseGitignore`, `applyGitignoreFilter`, `matchesGitignoreRule`", "Hierarchical `.gitignore` compiler supporting `*`, `**`, directory markers, and `!` negation rules."],
            ["`secretsDetector.ts`", "`isSecretFile`, `detectSecretsInFiles`, `getSecretWarning`", "Regex & filename matcher flagging `.env*`, private keys (`*.pem`, `id_rsa`), and cloud credential files."],
            ["`collisionResolver.ts`", "`resolveCollisions(files, strategy)`", "Deterministic O(N log N) filename collision resolver (`enumerate`, `prefix-path`, `overwrite`)."],
            ["`treeBuilder.ts`", "`buildFolderTree`, `generateAsciiTree`", "Single-pass trie builder computing recursive folder sizes, depth, extension histograms, and UTF-8 ASCII trees."],
            ["`codeAnalyzer.ts`", "`identifyCodeFileType`, `combineMultipleCodeFiles`, `estimateTokens`, `estimateCombinedTokensByStyle`, `isLockfile`", "35+ language detector, 6-format LLM bundle serializer, lockfile detector, and O(N) token estimator."],
            ["`depLenz.ts`", "`buildCodebaseDependencyGraph`, `buildCodebaseDependencyGraphAsync`, `extractSurgicalContext`, `searchCodebase`, `interweaveSurgicalPrompt`", "Polyglot static AST analyzer (Web TS/JS/React/Vue/Svelte, Rust, C/C++20), call graph builder, blast-radius BFS, and surgical prompt engine."],
            ["`engineBridge.ts`", "`analyzeProjectGraph`, `searchProjectCodebase`, `isNativeRustEngineAvailable`", "Dual-runtime bridge routing CPU-heavy DepLenz calls to the Rust N-API addon on Desktop or async TS chunks on Web."],
            ["`smartPaste.ts`", "`parseSmartPasteResponse`, `stripSmartPasteMarkers`, `buildSmartPasteInstructions`, `createSmartPasteZip`", "Parser and ZIP packager for `<<<SMART_PASTE_FILE>>>` LLM response blocks and `[SMART-PASTE]` markers."],
            ["`smartPasteVerify.ts`", "`verifySmartPaste(parsed, analysis, files)`", "5-stage pre-apply static verification pipeline checking delimiters, exports, parameter arity, and caller contracts."],
            ["`codeDiff.ts`", "`computeLineDiff(oldText, newText, contextLines)`", "LCS/Myers-style line-level diff engine producing unified hunks and `+added/-removed` counts."],
            ["`evolutionLog.ts`", "`createEvolutionEntry`, `appendEvolutionEntry`, `formatEvolutionForHandover`", "Token-efficient ring-buffer changelog (`~15–25` tokens/entry) for multi-LLM session continuity."],
            ["`pdfGenerator.ts` & `imageExporter.ts`", "`generateFolderPdf`, `exportElementAsImage`, `renderBlueprintToCanvas`", "Vector `jsPDF` multi-page blueprint generator and high-DPI (`1x`–`3x`) HTML5 Canvas rasterizer."],
            ["`themes.ts`", "`APP_THEMES`, `applyAppTheme`, `syncThemeVariables`, `recordProjectInHistory`", "7-palette dual-theme contrast engine (`Dark Studio` / `Light Paper`), typography scaler, and project history store."],
            ["`sampleProject.ts`", "`getScenarioProject`, `SAMPLE_SCENARIOS`", "Generates realistic multi-file `File` fixtures for Web (`clean`), Rust (`rust`), C++20 (`cpp`), `heavy`, and QA scenarios."],
            ["`documentationData.ts`", "`DOCUMENTATION_CHAPTERS`, `searchDocumentation`", "This 12-chapter dual-audience documentation encyclopedia and weighted full-text keyword search engine."],
          ],
        },
        secondaryTable: {
          title: "@myproject/ui (`/packages/ui/src/*`) & `/apps/desktop/src/*` — UI Views & Native Shell",
          headers: ["File Path", "Component / Module", "Technical Responsibility"],
          rows: [
            ["`packages/ui/src/DesktopHeader.tsx`", "`DesktopHeader`, `ViewsOverflowDropdown`", "Strictly single-row (`h-12`) responsive workspace toolbar with `ResizeObserver` tab overflow."],
            ["`packages/ui/src/DesktopLobby.tsx`", "`DesktopLobby`", "Full-bleed (`w-full h-full`) 3-pane native desktop IDE workbench (History Dock, Launchpad, Studio Appearance Inspector)."],
            ["`packages/ui/src/HomePage.tsx`", "`HomePage`", "Web edition product landing page with live Polyglot AST preview, format tabs, and dropzone."],
            ["`packages/ui/src/DocumentationView.tsx`", "`DocumentationView`", "Interactive 3-column documentation reader with audience filter, `/` keyword search, and highlighted snippets."],
            ["`packages/ui/src/DepLenzView.tsx`", "`DepLenzView`", "Main DepLenz workbench orchestrating Dependency Tree, 2D Map, Keyword Search, Surgical Prompts, Smart Paste, and Evolution Log."],
            ["`packages/ui/src/DepLenzGraphCanvas.tsx`", "`DepLenzGraphCanvas`", "60fps direct-DOM SVG graph engine with Sugiyama layout, module clusters, and cursor-anchored zoom."],
            ["`packages/ui/src/CodeSyntaxHighlighter.tsx`", "`CodeSyntaxHighlighter`, `tokenizeCodeLine`", "Single-pass polyglot syntax tokenizer for TS/JS/JSX, Rust, C/C++20, JSON, HTML/CSS, CMake, and TOML."],
            ["`packages/ui/src/ThemedDropdown.tsx`", "`ThemedDropdown`", "Bespoke theme-aware popover dropdown replacing all native `<select>` elements across the app."],
            ["`apps/desktop/src/main.ts` & `preload.ts`", "Electron Main & Preload", "Hardened BrowserWindow lifecycle, IPC handlers, native dialogs, and narrow `contextBridge` surface."],
            ["`apps/desktop/src/fs-walk.ts`", "`walkDirectory`", "Native Node `fs.promises` directory scanner with symlink loop protection and binary/size gating."],
            ["`apps/desktop/src/watch-batcher.ts` & `watch-filter.ts`", "Live Disk Watcher", "Chokidar event filter and 150ms debounced batch coalescer."],
            ["`apps/desktop/src/apply-plan.ts`", "`executeApplyPlan`", "Path-traversal-proof atomic disk writer with `.bak` backup generation for Smart Paste."],
          ],
        },
      },
      {
        id: "lazy-content-hydration-and-settled-pipeline",
        title: "3. Lazy Content Hydration & The 200ms Settled Reactive Pipeline (ADR-002)",
        paragraphs: [
          "To prevent Out-Of-Memory (OOM) crashes on massive repositories, `ProcessedFile` decouples file metadata from UTF-8 text payloads via `FileContentSource` (`{ kind: 'blob', blob: Blob }` on Web, `{ kind: 'path', absolutePath: string }` on Desktop).",
          "During initial scan (`folderReader.ts` on Web or `fs-walk.ts` on Desktop), every file is first inspected by `shouldReadText(name, size)` and `looksBinary(headBytes)` (`content.ts`). Files larger than `MAX_TEXT_BYTES` (2 MB) or containing NUL (`0x00`) bytes within their first `BINARY_SNIFF_BYTES` (8 KB) are still indexed in the file inventory and directory tree, but their `textContent` is left `undefined` so binary images, fonts, and compiled `.wasm`/`.o` blobs never pollute memory or UTF-8 decoders.",
          "Eligible text files are hydrated via `hydrateFilesWithConcurrency(files, 16, readFn)`—a 16-worker sliding concurrency pool that saturates disk/blob I/O without exhausting browser file-descriptor limits.",
        ],
        codeBlock: {
          title: "Binary Sniffing, 2MB Gate & Settled Debounce Pipeline",
          filePath: "packages/core/src/content.ts & apps/web/src/App.tsx",
          language: "ts",
          code: `// packages/core/src/content.ts
export const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2 MB cap per text file
export const BINARY_SNIFF_BYTES = 8192;        // Inspect first 8 KB for NUL byte

export function looksBinary(bytes: Uint8Array): boolean {
  const len = Math.min(bytes.length, BINARY_SNIFF_BYTES);
  for (let i = 0; i < len; i++) {
    if (bytes[i] === 0) return true; // NUL byte -> binary payload
  }
  return false;
}

// apps/web/src/App.tsx — Debounces 150ms live-watch bursts into 1 tree/collision pass
// while flushing immediately (0ms delay) on initial project load or clear.
const settledFiles = useDebouncedValue(
  rawFiles,
  200,
  (prev, next) => prev.length === 0 || next.length === 0,
);`,
        },
      },
    ],
  },

  {
    id: "dev-polyglot-ast-and-rust-engine",
    number: "08",
    title: "Polyglot Static Analysis Engine (depLenz.ts): Scanners, Bridging & Blast Radius",
    subtitle:
      "Inside the comment-preserving sanitizer, balanced-delimiter AST scanner, C/C++ header-to-source translation unit bridge, Rust impl/trait resolver, and BFS blast-radius algorithm.",
    audience: "developer",
    category: "Developer Deep Dive · Compilers & Static Analysis",
    readTimeMinutes: 16,
    keywords: [
      "ast",
      "parser",
      "depLenz.ts",
      "stripCommentsKeepLines",
      "extractBlockBody",
      "rust",
      "c++",
      "cpp",
      "header bridging",
      "include",
      "cargo",
      "struct",
      "trait",
      "impl",
      "blast radius",
      "bfs",
    ],
    summary:
      "Deep algorithmic walkthrough of depLenz.ts: how source files are sanitized without shifting line numbers, how balanced-brace block extraction isolates declarations, how C/C++ headers (.h/.hpp) are bridged to .cpp implementation units, how Rust impl blocks are parsed, and how call edges are resolved.",
    sections: [
      {
        id: "comment-sanitization-and-balanced-scanner",
        title: "1. Line-Preserving Sanitization & Balanced-Delimiter Block Scanner",
        paragraphs: [
          "Static analysis across arbitrary user repositories must be resilient to commented-out code, regex literals, template strings containing `{` or `}`, and incomplete syntax. If a preprocessor strips comments by deleting characters, every subsequent character offset shifts, corrupting `lineStart` and `lineEnd` coordinates.",
          "`depLenz.ts` solves this in `stripCommentsKeepLines(source)`: it walks the source character-by-character with a lexical state machine (tracking `'...'`, `\"...\"`, `` `...` ``, `//...`, and `/*...*/`) and replaces every comment character with a space `' '` while preserving all `\\n` newline characters at their exact byte indices. Consequently, any character index `idx` in the sanitized buffer maps to the exact same 1-indexed line number in the original source via binary search over `buildLineStarts(source)`.",
          "Once a declaration header is matched, `extractBlockBody(cleanSource, openBraceIdx)` scans forward while tracking nesting depth and string literals to locate the matching closing `}`, returning the exact `{ startOffset, endOffset, lineStart, lineEnd }` span.",
        ],
        codeBlock: {
          title: "Line-Preserving Comment Sanitizer & Binary-Search Line Lookup",
          filePath: "packages/core/src/depLenz.ts",
          language: "ts",
          code: `export function buildLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \\n */) starts.push(i + 1);
  }
  return starts;
}

export function offsetToLine(lineStarts: number[], offset: number): number {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lineStarts[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1; // 1-indexed line number in O(log L)
}`,
        },
      },
      {
        id: "web-rust-cpp-extraction-grammars",
        title: "2. Language-Specific Extraction Pipelines (Web, Rust, C/C++20)",
        paragraphs: [
          "`detectFileLanguageFamily(filePath)` routes each code file to its specialized extractor before merging symbols into the unified graph:",
        ],
        table: {
          title: "Polyglot Extractor Pipeline Specification",
          headers: ["Extractor Function", "Target Extensions", "Constructs & Edge Cases Handled"],
          rows: [
            [
              "`extractFunctionsFromFile` + `extractTypesFromFile`",
              "`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`",
              "Extracts `function foo()`, `const Foo = () => {}`, `React.memo(function Foo...)`, `forwardRef(...)`, `use*` hooks (classified automatically when name matches `/^use[A-Z0-9]/`), ES6 `class` & methods (filtering control keywords `if`, `for`, `while`, `switch`, `catch`), plus `interface`, `type`, and `enum` contracts. For `.vue` and `.svelte`, extracts `<script>` blocks while preserving outer file line offsets.",
            ],
            [
              "`extractRustFunctionsFromFile` + `extractRustTypesFromFile`",
              "`.rs`",
              "Matches `[pub[(crate|super)]] [async] [const] [unsafe] fn <name>`, `struct <Name>`, `enum <Name>`, and `trait <Name>`. Performs a dedicated two-level scan over `impl [<T>] [Trait for] Type { ... }` blocks so methods inside `impl` blocks are linked to their parent struct/trait and distinguished from semicolon-terminated trait method declarations.",
            ],
            [
              "`extractCppFunctionsFromFile` + `extractCppTypesFromFile`",
              "`.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, `.hxx`, `.ino`",
              "Matches `struct`/`class` blocks, free & `template<...>` functions, and out-of-line `ClassName::methodName(...)` definitions. For `ClassName::methodName`, records both the short symbol name (`methodName`) and qualified signature (`ClassName::methodName`) so callers invoking `world.stepSimulation()` resolve accurately.",
            ],
          ],
        },
      },
      {
        id: "cpp-header-to-source-bridging",
        title: "3. C/C++ Header-to-Source Translation Unit Bridging Algorithm",
        paragraphs: [
          "In C and C++ architectures, `src/main.cpp` includes `include/world.hpp` (`#include \"../include/world.hpp\"`), while the actual implementation of `PhysicsWorld::stepSimulation` resides in `src/world.cpp`. Because `main.cpp` never `#include`s `world.cpp`, a standard module-import graph would fail to connect `main()` in `src/main.cpp` to `stepSimulation()` in `src/world.cpp`.",
          "DepLenz resolves this in **Step 1b** of `buildCodebaseDependencyGraph`: during the file indexing pass, it buckets all C/C++ header files (`.h`, `.hh`, `.hpp`, `.hxx`) and implementation files (`.c`, `.cc`, `.cpp`, `.cxx`) by their lowercase filename stem (e.g. `world`). For every matching `(headerPath, implPath)` pair, it injects a bidirectional synthetic `*` wildcard import bridge, and propagates that bridge transitively to any file that `#include`s `headerPath`.",
          "Furthermore, if a symbol is both declared in `world.hpp` and defined with a concrete body in `world.cpp`, the scope resolver prioritizes the concrete `.cpp` definition so clicking the symbol in DepLenz shows the real implementation body rather than a 1-line header prototype.",
        ],
        codeBlock: {
          title: "C/C++ Header-to-Translation-Unit Bridge & Concrete Body Priority",
          filePath: "packages/core/src/depLenz.ts",
          language: "ts",
          code: `// Step 1b: Bridge C/C++ headers (.h/.hpp) with implementation units (.c/.cpp)
for (const [stem, hdrPaths] of headerFilesByStem.entries()) {
  const implPaths = implFilesByStem.get(stem);
  if (!implPaths) continue;
  for (const hPath of hdrPaths) {
    for (const cPath of implPaths) {
      pushBridgeImport(hPath, cPath);
      pushBridgeImport(cPath, hPath);
      // Propagate: any file that #includes hPath also brings cPath definitions into scope
      for (const [importerPath, specs] of fileImportsMap.entries()) {
        if (specs.some((sp) => resolveImportPath(importerPath, sp.sourcePath, fileSet) === hPath)) {
          pushBridgeImport(importerPath, cPath);
        }
      }
    }
  }
}`,
        },
      },
      {
        id: "call-resolution-dedup-and-blast-radius",
        title: "4. Per-File Symbol Deduplication, Call Resolution & Blast Radius BFS",
        paragraphs: [
          "In C++ (overloaded functions or header/inline definitions) and TypeScript (function overloads), a single file can contain multiple declarations with the same name. To prevent duplicate node IDs (`${filePath}::${symbolName}`) from corrupting the graph or duplicating SVG boxes, Step 1 deduplicates `fileSymbols` per file by `sym.id`, merging `.calls` arrays and keeping the longest concrete body.",
          "In Step 2, for each symbol `caller`, every identifier in `caller.calls` is resolved against: (1) local symbols in the same file, (2) explicitly named imports (`import { foo } from './bar'`, `use crate::bar::foo`), (3) wildcard/header imports (`#include \"world.hpp\"`, `use crate::bar::*`, `export * from`), and (4) unique global symbols across the codebase.",
          "Finally, `computeBlastRadius(symbolId, nodesMap)` runs a Breadth-First Search (BFS) upward along `calledBy` edges using a `visited` set (preventing infinite loops on mutually recursive functions) to count all transitive upstream dependents.",
        ],
      },
    ],
  },

  {
    id: "dev-native-rust-napi-engine",
    number: "09",
    title: "Native Rust N-API Addon (@myproject/rust-engine) & Async Bridge",
    subtitle:
      "Architecture of the Rust N-API native addon (Rayon parallel AST parser, SIMD regex search, ignore walker) and the non-blocking browser fallback.",
    audience: "developer",
    category: "Developer Deep Dive · Rust Systems & Concurrency",
    readTimeMinutes: 12,
    keywords: [
      "rust-engine",
      "napi",
      "n-api",
      "rayon",
      "par_iter",
      "simd",
      "regex",
      "ignore",
      "engineBridge.ts",
      "concurrency",
      "benchmarks",
      "complexity",
    ],
    summary:
      "Inside /packages/rust-engine: why CPU-bound AST extraction and regex search are written in Rust with napi-rs and Rayon, how the Electron IPC bridge invokes the native binary, and how the browser engine yields every 20 files to keep the UI at 60fps.",
    sections: [
      {
        id: "where-rust-pays-off",
        title: "1. Engineering Rationale: Where Native Rust Pays Off",
        paragraphs: [
          "Most operations in a project analyzer are either I/O-bound (reading disk blocks) or UI-bound (React layout and SVG rendering), where FFI marshalling across V8/N-API would add complexity for negligible gain. However, three specific hot paths are 100% CPU-bound string and graph algorithms over every file in the repository:",
        ],
        bullets: [
          "Hot Path 1 — Full-Codebase AST & Call-Graph Construction (`analyze_codebase` in `packages/rust-engine/src/analyzer.rs`): Scanning every source file for comments, balanced braces, symbols, imports, and call tokens.",
          "Hot Path 2 — Codebase-Wide Regex & Substring Search (`search_codebase` in `packages/rust-engine/src/search.rs`): Matching patterns across tens of megabytes of source text and resolving enclosing symbol spans.",
          "Hot Path 3 — Native Directory Walking & `.gitignore` Filtering (`scan_directory` in `packages/rust-engine/src/scanner.rs`): Walking deep file trees using the same `ignore` crate that powers `ripgrep`.",
        ],
      },
      {
        id: "inside-rust-engine-crate",
        title: "2. Inside /packages/rust-engine/src/ (lib.rs, analyzer.rs, search.rs, scanner.rs)",
        paragraphs: [
          "The `@myproject/rust-engine` crate is compiled to a native `.node` shared library via `napi-rs` (`#[napi]` procedural macros). In `analyzer.rs`, the input `Vec<JsFileInput>` is processed in parallel across all CPU cores using Rayon's work-stealing `par_iter()`, extracting symbols, types, syntax diagnostics, and import specifiers per file without lock contention before reducing them into the unified call graph.",
        ],
        codeBlock: {
          title: "Rayon Work-Stealing Parallel File Analysis in Rust",
          filePath: "packages/rust-engine/src/analyzer.rs",
          language: "rust",
          code: `use napi_derive::napi;
use rayon::prelude::*;

#[napi]
pub fn analyze_codebase(files: Vec<JsFileInput>) -> napi::Result<JsAnalysisOutput> {
    // Parse every source file concurrently across all CPU cores via Rayon
    let per_file_results: Vec<FileParseOutcome> = files
        .par_iter()
        .filter(|f| is_supported_code_file(&f.path))
        .map(|f| parse_single_file_ast(&f.path, &f.content))
        .collect();

    Ok(link_call_graph_and_blast_radius(per_file_results))
}`,
        },
        table: {
          title: "Algorithmic Time & Space Complexity Matrix",
          headers: ["Engine Operation", "Time Complexity", "Space Complexity", "Execution Strategy"],
          rows: [
            ["`resolveCollisions`", "`O(N log N)` for path sort + `O(N)` map pass", "`O(N)` file shells", "Memoized on `settledFiles` + `collisionStrategy`"],
            ["`buildFolderTree`", "`O(N * D)` where `D` is average path depth", "`O(V_dirs + N)` tree nodes", "Single-pass trie insertion + post-order size rollup"],
            ["`buildCodebaseDependencyGraph`", "`O(Bytes / Cores)` parse + `O(S * C)` call link", "`O(S + E)` symbols & edges", "Rayon `par_iter` on Desktop; 20-file async chunks on Web"],
            ["`computeBlastRadius`", "`O(V_sym + E_call)` worst-case BFS", "`O(V_sym)` visited set", "On-demand per symbol with cycle guard"],
            ["`searchCodebase`", "`O(Bytes / Cores)` SIMD regex + `O(log S)` span", "`O(Matches)` capped at 500", "Rust `regex` DFA + binary search over symbol line ranges"],
          ],
        },
      },
      {
        id: "dual-runtime-engine-bridge",
        title: "3. Dual-Runtime Engine Bridge & Cooperative Browser Chunking",
        paragraphs: [
          "`packages/core/src/engineBridge.ts` exposes a single unified async API (`analyzeProjectGraph`, `searchProjectCodebase`) to the UI. At runtime, it checks whether the Electron bridge (`window.myprojectDesktop?.rustEngine`) or Node N-API binary is loaded. If present, it dispatches the workload to the native Rust engine; otherwise, it falls back to `buildCodebaseDependencyGraphAsync`, which yields control back to the browser's main thread every `YIELD_EVERY = 20` files via `setTimeout(..., 0)` so CSS animations and user input remain completely responsive.",
        ],
      },
    ],
  },

  {
    id: "dev-graph-canvas-and-surgical-evolution",
    number: "10",
    title: "60fps Direct-DOM SVG Graph Engine & Layout Mathematics",
    subtitle:
      "How DepLenzGraphCanvas computes Sugiyama layered layouts, why naive React SVG graphs lag or duplicate nodes, and how direct DOM ref mutation achieves 60fps.",
    audience: "developer",
    category: "Developer Deep Dive · Graphics & Interactive Performance",
    readTimeMinutes: 13,
    keywords: [
      "graph canvas",
      "DepLenzGraphCanvas.tsx",
      "svg",
      "performance",
      "60fps",
      "dragging",
      "duplicate node bug",
      "sugiyama",
      "barycenter",
      "applyDirectNodeTransform",
      "pointermove",
      "zoom",
    ],
    summary:
      "Deep technical post-mortem and architecture of DepLenzGraphCanvas.tsx: the Sugiyama-lite layered layout algorithm, barycenter edge-crossing minimization, why React state updates during pointermove cause frame drops and duplicate boxes, and how direct SVG DOM attribute mutation solves both.",
    sections: [
      {
        id: "sugiyama-layout-and-barycenter-math",
        title: "1. Sugiyama-Lite Layered Layout & Barycenter Crossing Reduction",
        paragraphs: [
          "Unlike force-directed spring graphs that jitter unpredictably and scatter related functions randomly across the screen, `computeInitialLayout` in `DepLenzGraphCanvas.tsx` implements a deterministic Sugiyama-lite layered directed graph layout:",
        ],
        steps: [
          {
            step: "Pass 1 — Longest-Path Depth Assignment",
            title: "Assign Each Symbol to a Call-Depth Column (Col 0..K)",
            detail:
              "Entry points with zero internal callers (`inDeg === 0`) are seeded at column 0. A bounded relaxation loop (up to 12 iterations to handle cycles safely) assigns each downstream callee to `max(callerCol + 1)`. External package/header nodes are placed one column to the right of their deepest caller.",
          },
          {
            step: "Pass 2 — Barycenter Heuristic",
            title: "Minimize Edge Crossings Between Adjacent Columns",
            detail:
              "Within each column, nodes are initially sorted by file path and line number. Then, a 2-pass barycenter sweep computes the average vertical position (`avgY`) of each node's connected neighbors in the adjacent column and re-orders the column so connected nodes align horizontally.",
          },
          {
            step: "Pass 3 — Module Cluster Bounding Boxes",
            title: "Compute Dynamic Group Envelopes",
            detail:
              "`computeModuleClusters` groups laid-out nodes by their module directory (`src/engine`, `packages/core`, etc.) and computes padded bounding rectangles (`minX - 18`, `minY - 28`, `maxX + 18`, `maxY + 14`) rendered in the background SVG layer.",
          },
        ],
      },
      {
        id: "root-cause-of-svg-lag-and-duplicate-nodes",
        title: "2. Why Standard React SVG Graphs Lag & Duplicate Nodes Under Fast Drag",
        paragraphs: [
          "In a standard React SVG graph with 220 nodes and 400 cubic-bezier edges, two subtle anti-patterns cause severe lag and visual node duplication when a user clicks and rapidly drags a node:",
          "First, calling `setPositions(...)` inside `onPointerMove` triggers 60–120 full React re-renders per second. On each tick, React diffs 220 `<GraphNode>` subtrees, 400 `<GraphEdge>` paths (800 `<path>` elements), and recomputes all cluster bounding boxes.",
          "Second, a common trick to bring the dragged node to the front of the SVG z-order is to reorder the `nodes` array when `dragNodeId` is set (`[...rest, draggedNode]`). When React reconciles a reordered SVG child list while a `<g>` element holds active pointer capture (`setPointerCapture`), the browser detaches and re-inserts the DOM `<g>` node mid-drag—dropping pointer capture or leaving a phantom/duplicate box at the old coordinate!",
        ],
      },
      {
        id: "zero-rerender-direct-dom-architecture",
        title: "3. Zero-Re-Render Direct SVG DOM Mutation (`applyDirectNodeTransform`)",
        paragraphs: [
          "`DepLenzGraphCanvas.tsx` eliminates both defects through four architectural guarantees:",
        ],
        bullets: [
          "1. Immutable DOM Child Order: `effNodes` never reorders array elements when `dragNodeId` changes, so `<g>` elements are never unmounted or recreated mid-drag.",
          "2. Direct Element Ref Registries (`nodeElsRef` & `edgeElsRef`): Every `<GraphNode>` registers its `<g>` element and every `<GraphEdge>` registers its `{ base, flow, port }` SVG elements in O(1) `Map` refs, paired with an adjacency list `edgesByNode: Map<string, LayoutEdge[]>`.",
          "3. Zero-React-Render `pointermove` Loop: During `window` `pointermove`, `requestAnimationFrame` invokes `applyDirectNodeTransform(nodeId, nx, ny)`, which updates `transform=\"translate(nx, ny)\"` directly on the single `<g>` node and recomputes the cubic-bezier `d` attribute ONLY for its 1–5 incident edges. React state (`setPositions`) is committed once on `pointerup`.",
          "4. GPU Compositor Animation Pause (`.dlc-interacting`): While dragging or panning, the root container adds `.dlc-interacting`, pausing infinite `stroke-dashoffset` animations (`animation-play-state: paused`) so the compositor devotes 100% of frame budget to smooth 60fps pointer tracking.",
        ],
        codeBlock: {
          title: "O(degree) Direct SVG DOM Mutation During Fast Drag",
          filePath: "packages/ui/src/DepLenzGraphCanvas.tsx",
          language: "ts",
          code: `const applyDirectNodeTransform = (nodeId: string, nx: number, ny: number) => {
  livePosRef.current.set(nodeId, { x: nx, y: ny });
  const gEl = nodeElsRef.current.get(nodeId);
  if (gEl) gEl.setAttribute("transform", \`translate(\${nx}, \${ny})\`);

  // Recompute cubic-bezier path ONLY for the 1..K edges attached to nodeId
  const connected = layoutRef.current.edgesByNode.get(nodeId);
  if (!connected) return;
  for (let i = 0; i < connected.length; i++) {
    const edge = connected[i];
    const handles = edgeElsRef.current.get(edge.id);
    const sPos = livePosRef.current.get(edge.sourceId);
    const tPos = livePosRef.current.get(edge.targetId);
    if (!handles || !sPos || !tPos) continue;
    const { d, x2, y2 } = computeEdgeGeometry(sPos.x, sPos.y, tPos.x, tPos.y);
    handles.base?.setAttribute("d", d);
    handles.flow?.setAttribute("d", d);
    handles.port?.setAttribute("cx", String(x2));
    handles.port?.setAttribute("cy", String(y2));
  }
};`,
        },
      },
    ],
  },

  {
    id: "dev-smart-paste-diff-and-evolution",
    number: "11",
    title: "Smart Paste 5-Stage Verifier, Myers Line Diff & Evolution Ring-Buffer",
    subtitle:
      "Protocol specifications and algorithms for smartPaste.ts, smartPasteVerify.ts, codeDiff.ts, and evolutionLog.ts.",
    audience: "developer",
    category: "Developer Deep Dive · Verification & Diff Algorithms",
    readTimeMinutes: 12,
    keywords: [
      "smartPaste.ts",
      "smartPasteVerify.ts",
      "codeDiff.ts",
      "evolutionLog.ts",
      "verification",
      "diff",
      "lcs",
      "protocol",
      "markers",
      "ring buffer",
      "token budget",
    ],
    summary:
      "Engineering specification of the <<<SMART_PASTE_FILE>>> parser, comment-aware marker stripping, the 5-stage static verification state machine, the LCS line diff algorithm, and the compact evolution handover serializer.",
    sections: [
      {
        id: "smart-paste-wire-protocol-and-parser",
        title: "1. The <<<SMART_PASTE_FILE>>> Wire Protocol & Marker Stripper",
        paragraphs: [
          "Standard Markdown code fences (` ```tsx `) are fragile for multi-file LLM responses because models vary how they label file paths (sometimes in a heading above, sometimes in a comment inside, sometimes omitting the path) and fail when a file itself contains triple backticks (such as documentation or template literals).",
          "`smartPaste.ts` defines a deterministic, fence-free wire protocol using `<<<SMART_PASTE_FILE path=\"...\" action=\"modify|create|delete\">>>` and `<<<END_SMART_PASTE_FILE>>>` sentinels. If an LLM accidentally wraps the block inside a ` ``` ` fence anyway, `parseSmartPasteResponse` strips outer markdown fences automatically while preserving inner code untouched.",
          "When `stripSmartPasteMarkers(content)` is called, it removes standalone `// [SMART-PASTE] ...`, `# [SMART-PASTE] ...`, `/* [SMART-PASTE] ... */`, and `<!-- [SMART-PASTE] ... -->` annotation lines and strips trailing inline markers without disturbing indentation.",
        ],
      },
      {
        id: "five-stage-static-verifier-internals",
        title: "2. Inside the 5-Stage Pre-Apply Static Verification Pipeline (`smartPasteVerify.ts`)",
        paragraphs: [
          "`verifySmartPaste(parsed, analysis, currentFiles)` simulates applying the pasted file blocks onto `currentFiles`, re-runs the static symbol and syntax extractors on every modified/created file, and executes five verification stages:",
        ],
        table: {
          title: "5-Stage Smart Paste Verification State Machine",
          headers: ["Stage", "Check Performed", "Severity", "Failure Trigger Condition"],
          rows: [
            [
              "Stage 1: Syntax & Delimiters",
              "`detectFileSyntaxErrors(file)` on new content",
              "`error`",
              "Unclosed string/template literal, unclosed block comment, mismatched `{ }`, `( )`, `[ ]`, or truncated file.",
            ],
            [
              "Stage 2: Export Preservation",
              "Diffs `oldSymbols.filter(s => s.isExported)` vs `newSymbols`",
              "`warning` / `error`",
              "An exported function, component, struct, or trait that upstream files depend on was removed.",
            ],
            [
              "Stage 3: Signature & Arity",
              "`countRequiredParams(oldSig)` vs `countRequiredParams(newSig)`",
              "`warning`",
              "A symbol's required parameter count changed (ignoring optional `a?: T` or default `a = 1` params).",
            ],
            [
              "Stage 4: Caller Contract Audit",
              "Cross-checks upstream callers of arity-changed symbols against `pastedPaths`",
              "`error` (`mustUpdate`)",
              "Symbol `foo()` changed its required parameters, `bar.ts` calls `foo()`, and `bar.ts` was NOT included in the paste.",
            ],
            [
              "Stage 5: Import Resolution",
              "Tests every `extractFileImports(newContent)` specifier against virtual file set",
              "`warning`",
              "Modified file imports a relative path (`./missingHelper`) that neither exists in the repo nor is created in the paste.",
            ],
          ],
        },
      },
      {
        id: "line-diff-and-evolution-encoding",
        title: "3. LCS Line Diff (`codeDiff.ts`) & Compact Evolution Wire Encoding (`evolutionLog.ts`)",
        paragraphs: [
          "`computeLineDiff(oldText, newText, contextLines = 3)` computes a dynamic-programming Longest Common Subsequence (LCS) matrix over lines (with a fast head/tail common-prefix/suffix trimmer so unchanged top and bottom regions cost O(1) memory) and groups contiguous edits into unified diff hunks (`@@ -oldStart,oldLines +newStart,newLines @@`).",
          "When changes are committed, `evolutionLog.ts` persists an `EvolutionEntry` into `localStorage` under `myproject_evolution_log_v1::<projectKey>` (capped at `MAX_ENTRIES = 60` per project). `formatEvolutionForHandover(entries, maxTokens = 220)` serializes entries newest-first using single-letter action codes (`A:`, `M:`, `D:`), compact `+added/-removed` counts, and `@symbol` tags, halting as soon as adding the next line would exceed `maxTokens`.",
        ],
      },
    ],
  },

  {
    id: "dev-ui-design-system-and-security",
    number: "12",
    title: "UI Design System, WCAG AA+ Light/Dark Theme Engine & Electron Security",
    subtitle:
      "How syncThemeVariables and index.css invert dark pastels into high-contrast Light Paper tokens, how the single-row toolbar works, and how Electron is hardened (ADR-004).",
    audience: "developer",
    category: "Developer Deep Dive · Design System & Security Hardening",
    readTimeMinutes: 13,
    keywords: [
      "design system",
      "light mode",
      "dark mode",
      "themes.ts",
      "index.css",
      "syncThemeVariables",
      "palettes",
      "contrast",
      "wcag",
      "themeddropdown",
      "toolbar",
      "resizeobserver",
      "security",
      "electron",
      "sandbox",
      "apply-plan.ts",
    ],
    summary:
      "Complete reference for the dual-theme color architecture (why naive light modes fail and how semantic scale inversion fixes every badge and syntax token), the 7 brand palettes, the ResizeObserver single-row toolbar, ThemedDropdown, and ADR-004 Electron security invariants.",
    sections: [
      {
        id: "dual-theme-contrast-mathematics",
        title: "1. Dual-Theme Contrast Engine: Why Naive Light Modes Fail & How We Solved It",
        paragraphs: [
          "In dark-first applications, UI components frequently use utility classes like `text-purple-300`, `text-sky-300`, `text-emerald-300`, `text-amber-300`, `bg-purple-500/10`, and `text-slate-100`. If a light mode simply flips `--app-bg` to `#f8fafc` while leaving `--color-purple-300` as `#d8b4fe` (a pale lavender) and `--color-amber-300` as `#fcd34d` (a pale yellow), text contrast drops to `1.4:1`—making badges, code keywords, and active tabs nearly invisible on white cards.",
          "MyProject Analyzer solves this structurally in two coordinated layers (`packages/core/src/themes.ts` and `apps/web/src/index.css`) so every component across the entire codebase achieves WCAG AA+ (`>= 4.5:1` to `12:1`) contrast in both Dark Studio and Light Paper modes:",
        ],
        bullets: [
          "1. Dynamic Accent Scale Inversion (`syncThemeVariables(theme, isLight)` in `themes.ts`): When `isLight` is true, `--color-purple-200/300/400` and `--color-violet-200/300/400` are dynamically remapped to the palette's deep `800/700/600` ink shades, while `--color-purple-900/950` map to soft `100/50` surface tints.",
          "2. Contrast-Verified CTA Fills (`lightSolid600`): Palettes with bright primary hues (such as Sunset Amber `#f59e0b` or Cyber Cyan `#06b6d4`) automatically step their `--color-purple-600` solid button fill to `#d97706` / `#0891b2` in Light Mode so white button text (`text-white`) remains crisp.",
          "3. Semantic Hue Scale Remapping (`:root[data-appearance='light']` in `index.css`): Remaps `--color-slate-50..950` to deep slate inks (`#020617`..`#f8fafc`) and inverts the `200`, `300`, `400`, `500` steps of `sky`, `blue`, `indigo`, `emerald`, `green`, `teal`, `cyan`, `amber`, `orange`, `rose`, `pink`, and `red` to deep `600`–`800` shades.",
        ],
        table: {
          title: "The 7 Curated Studio Palettes (`APP_THEMES`)",
          headers: ["Palette ID", "Label", "Dark Studio Accent (`400`)", "Light Paper Ink (`300/400` → `700`)", "Light Solid CTA (`600`)"],
          rows: [
            ["`violet`", "Royal Violet", "`#c084fc`", "`#6d28d9`", "`#7c3aed`"],
            ["`ocean`", "Ocean Blue", "`#60a5fa`", "`#1d4ed8`", "`#2563eb`"],
            ["`emerald`", "Emerald Forest", "`#34d399`", "`#047857`", "`#059669`"],
            ["`amber`", "Sunset Amber", "`#fbbf24`", "`#b45309`", "`#d97706`"],
            ["`rose`", "Crimson Rose", "`#fb7185`", "`#be123c`", "`#e11d48`"],
            ["`cyan`", "Cyber Cyan", "`#22d3ee`", "`#0e7490`", "`#0891b2`"],
            ["`slate`", "Monochrome Graphite", "`#94a3b8`", "`#334155`", "`#334155`"],
          ],
        },
      },
      {
        id: "single-row-toolbar-and-themed-dropdowns",
        title: "2. Single-Row Responsive Toolbar (`DesktopHeader.tsx`) & `ThemedDropdown.tsx`",
        paragraphs: [
          "To maximize vertical workspace canvas height, `DesktopHeader.tsx` is locked to a single `48px` (`h-12`) row. A `ResizeObserver` continuously monitors the header's width and dynamically partitions the 6 workspace tabs (`Files`, `Tree`, `PDF & Image`, `Stats`, `Analyzer`, `DepLenz`) between inline tab buttons and the `ViewsOverflowDropdown` (`More (N)`):",
        ],
        table: {
          title: "DesktopHeader Single-Row Responsive Breakpoint Cascade",
          headers: ["Header Width (`headerWidth`)", "Inline Workspace Tabs Rendered", "Overflow Dropdown Behavior"],
          rows: [
            ["`>= 1560px` (Ultra-Wide)", "All 6 tabs inline (`Files`..`DepLenz`)", "No overflow button needed (`overflowTabs.length === 0`)."],
            ["`1320px – 1559px` (Standard Desktop)", "First 4 tabs inline (`Files`, `Tree`, `PDF & Image`, `Stats`)", "`More (2)` dropdown houses `Analyzer` & `DepLenz` (shows active tab name if selected)."],
            ["`1100px – 1319px` (Compact Desktop)", "First 3 tabs inline (`Files`, `Tree`, `PDF & Image`)", "`More (3)` dropdown houses `Stats`, `Analyzer`, & `DepLenz`."],
            ["`860px – 1099px` (Split Window)", "First 2 tabs inline (`Files`, `Tree`)", "`More (4)` dropdown houses remaining 4 views."],
            ["`< 860px` (Narrow / Tablet)", "0 inline tabs", "Single compact `Views` dropdown houses all 6 workspace views + Excluded folders action."],
          ],
        },
      },
      {
        id: "desktop-security-invariants-adr004",
        title: "3. Electron Security Hardening & Atomic Disk Apply (ADR-004)",
        paragraphs: [
          "Because MyProject Analyzer is frequently used to inspect untrusted third-party repositories, the Electron desktop application enforces strict defence-in-depth boundaries verified by `apps/desktop/src/security-invariants.test.ts` and `apps/desktop/src/apply-plan.test.ts`:",
        ],
        bullets: [
          "Process Sandbox & Isolation: Every `BrowserWindow` is created with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, and `webSecurity: true`.",
          "Typed ContextBridge Preload (`preload.ts`): Exposes only narrow, validated IPC invocations on `window.myprojectDesktop`—never exposing raw `ipcRenderer` or Node `fs`/`child_process` objects.",
          "Navigation & External Link Lockdown (`external-url.ts`): Blocks all renderer `will-navigate` events and validates `shell.openExternal` URLs so only `https:` / `http:` origins can open in the system browser (blocking `file:`, `javascript:`, and custom protocol RCE vectors).",
          "Path-Traversal-Proof Atomic Disk Writer (`apply-plan.ts`): Before writing any Smart Paste file to disk, resolves the target path against `rootAbsolutePath`, verifies that `path.relative(root, target)` does not begin with `..` or traverse symlinks outside the workspace root, and writes timestamped `.bak` backups before atomic replacement.",
        ],
      },
    ],
  },
];

/**
 * Lookup a chapter by its unique ID.
 */
export function getChapterById(id: string): DocChapter | undefined {
  return DOCUMENTATION_CHAPTERS.find((c) => c.id === id);
}

/**
 * Weighted full-text keyword search across all documentation chapters and sections.
 * Searches titles, subtitles, categories, keywords, summaries, paragraphs,
 * step-by-step traces, deep-dive notes, bullets, primary/secondary tables,
 * primary/secondary code blocks, and callouts.
 */
export function searchDocumentation(
  query: string,
  audienceFilter: "all" | DocAudience = "all",
): DocSearchHit[] {
  const baseChapters =
    audienceFilter === "all"
      ? DOCUMENTATION_CHAPTERS
      : DOCUMENTATION_CHAPTERS.filter((c) => c.audience === audienceFilter);

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return baseChapters.map((chapter) => ({
      chapter,
      matchedSectionIds: chapter.sections.map((s) => s.id),
      matchCount: 0,
      matchedKeywords: [],
      snippet: chapter.summary,
    }));
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);
  const hits: DocSearchHit[] = [];

  for (const chapter of baseChapters) {
    let totalMatches = 0;
    const matchedSectionIds: string[] = [];
    const matchedKeywords = new Set<string>();
    let bestSnippet = chapter.summary;

    const titleLower = `${chapter.title} ${chapter.subtitle} ${chapter.category}`.toLowerCase();
    for (const term of terms) {
      if (titleLower.includes(term)) {
        totalMatches += 5;
      }
      for (const kw of chapter.keywords) {
        if (kw.toLowerCase().includes(term)) {
          totalMatches += 4;
          matchedKeywords.add(kw);
        }
      }
      if (chapter.summary.toLowerCase().includes(term)) {
        totalMatches += 3;
      }
    }

    const extractSnippetFromText = (text: string, term: string) => {
      if (bestSnippet !== chapter.summary) return;
      const idx = text.toLowerCase().indexOf(term);
      if (idx === -1) return;
      const start = Math.max(0, idx - 45);
      const end = Math.min(text.length, idx + 145);
      bestSnippet = `${start > 0 ? "…" : ""}${text.slice(start, end)}${
        end < text.length ? "…" : ""
      }`;
    };

    for (const sec of chapter.sections) {
      let secMatches = 0;
      const secTitleLower = sec.title.toLowerCase();
      for (const term of terms) {
        if (secTitleLower.includes(term)) secMatches += 4;
      }

      for (const p of sec.paragraphs) {
        const pLower = p.toLowerCase();
        for (const term of terms) {
          if (pLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(p, term);
          }
        }
      }

      for (const st of sec.steps ?? []) {
        const stText = `${st.step} ${st.title} ${st.detail} ${st.code ?? ""}`;
        const stLower = stText.toLowerCase();
        for (const term of terms) {
          if (stLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(`${st.title}: ${st.detail}`, term);
          }
        }
      }

      for (const dn of sec.deepDiveNotes ?? []) {
        const dnText = `${dn.label} ${dn.explanation}`;
        const dnLower = dnText.toLowerCase();
        for (const term of terms) {
          if (dnLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(`${dn.label}: ${dn.explanation}`, term);
          }
        }
      }

      for (const b of sec.bullets ?? []) {
        const bLower = b.toLowerCase();
        for (const term of terms) {
          if (bLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(b, term);
          }
        }
      }

      for (const tbl of [sec.table, sec.secondaryTable]) {
        if (!tbl) continue;
        const tableText = [
          tbl.title ?? "",
          ...tbl.headers,
          ...tbl.rows.flat(),
        ].join(" ");
        const tableLower = tableText.toLowerCase();
        for (const term of terms) {
          if (tableLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(tableText, term);
          }
        }
      }

      for (const cb of [sec.codeBlock, sec.secondaryCodeBlock]) {
        if (!cb) continue;
        const codeText = `${cb.title} ${cb.filePath} ${cb.code}`;
        const codeLower = codeText.toLowerCase();
        for (const term of terms) {
          if (codeLower.includes(term)) secMatches += 2;
        }
      }

      if (sec.callout) {
        const calloutText = `${sec.callout.title} ${sec.callout.body}`;
        const calloutLower = calloutText.toLowerCase();
        for (const term of terms) {
          if (calloutLower.includes(term)) {
            secMatches += 2;
            extractSnippetFromText(calloutText, term);
          }
        }
      }

      if (secMatches > 0) {
        matchedSectionIds.push(sec.id);
        totalMatches += secMatches;
      }
    }

    // Require every search term to appear somewhere in the chapter
    const fullChapterText = [
      titleLower,
      chapter.summary.toLowerCase(),
      chapter.keywords.join(" ").toLowerCase(),
      ...chapter.sections.map((s) =>
        [
          s.title,
          ...s.paragraphs,
          ...(s.steps ?? []).map((st) => `${st.step} ${st.title} ${st.detail}`),
          ...(s.deepDiveNotes ?? []).map((dn) => `${dn.label} ${dn.explanation}`),
          ...(s.bullets ?? []),
          s.table ? `${s.table.title ?? ""} ${s.table.headers.join(" ")} ${s.table.rows.flat().join(" ")}` : "",
          s.secondaryTable
            ? `${s.secondaryTable.title ?? ""} ${s.secondaryTable.headers.join(" ")} ${s.secondaryTable.rows.flat().join(" ")}`
            : "",
          s.codeBlock ? `${s.codeBlock.title} ${s.codeBlock.filePath} ${s.codeBlock.code}` : "",
          s.secondaryCodeBlock
            ? `${s.secondaryCodeBlock.title} ${s.secondaryCodeBlock.filePath} ${s.secondaryCodeBlock.code}`
            : "",
          s.callout ? `${s.callout.title} ${s.callout.body}` : "",
        ]
          .join(" ")
          .toLowerCase(),
      ),
    ].join(" ");

    const allTermsPresent = terms.every((t) => fullChapterText.includes(t));
    if (allTermsPresent && totalMatches > 0) {
      hits.push({
        chapter,
        matchedSectionIds:
          matchedSectionIds.length > 0
            ? matchedSectionIds
            : chapter.sections.map((s) => s.id),
        matchCount: totalMatches,
        matchedKeywords: [...matchedKeywords],
        snippet: bestSnippet,
      });
    }
  }

  return hits.sort((a, b) => b.matchCount - a.matchCount);
}
