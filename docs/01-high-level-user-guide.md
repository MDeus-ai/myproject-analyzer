# Part I · High-Level User Manual (Chapters 01–04)

> **Audience**: Everyday users, product managers, technical writers, students, and developers looking for a practical, comprehensive manual of every feature in **MyProject Analyzer**.

---

## Chapter 01 · Product Manual, Core Mental Model & Ingestion Workflows

### 1.1 The Six-Lens Workspace Model
Modern software projects contain hundreds or thousands of files buried inside deep directory hierarchies. **MyProject Analyzer** ingests your folder once into a 100% local, in-memory pipeline and projects that single source of truth across six synchronized workspace lenses:

| Tab / Shortcut | Lens Name | Primary Problem Solved | Primary Output / Artifact |
| :--- | :--- | :--- | :--- |
| **`1` · Files** | Flat File Stripper | Strips subfolder nesting & resolves duplicate filenames deterministically. | Flat `.zip` archive or single-file downloads + instant code/image preview. |
| **`2` · Tree** | Directory Hierarchy Explorer | Visualizes exact folder nesting with recursive byte sizes and file counts. | Interactive collapsible tree + 1-click UTF-8 ASCII tree copy (`├──`, `└──`). |
| **`3` · PDF & Image** | Structure Blueprint Architect | Generates publication-grade reports without browser print-to-PDF font glitches. | Multi-page vector `.pdf` + `1x`/`2x`/`3x` high-DPI `.png` or `.jpeg` sheets. |
| **`4` · Stats** | Composition & Collision Telemetry | Audits codebase distribution by extension, category, largest files, and collisions. | Visual distribution meters, deepest-path audit, and full collision mapping table. |
| **`5` · Analyzer** | CodeFile Multi-Format Bundler | Packages multiple source files with root paths, line counts, and live token math. | Unified `.txt` (Standard/Compact), `.md`, `.xml` (CDATA), `.jsonl`, or `.json` bundle. |
| **`6` · DepLenz** | Polyglot Call Graph & Surgical AI | Maps how Web, Rust, and C/C++20 symbols communicate and extracts minimal AI prompts. | 60fps 2D Codebase Map, ~250-token Surgical Prompts, Smart Paste verifier & Evolution Log. |

---

### 1.2 Step-by-Step: The Four Ways to Load a Codebase

1. **Method A — Drag-and-Drop Folder Ingestion (Web & Desktop)**:
   Drag any project folder from macOS Finder, Windows Explorer, or Linux file managers onto the dropzone. The reader recursively traverses all `FileSystemDirectoryEntry` branches, intercepts heavy directories (`node_modules`, `target`, `build`) before reading their contents, and opens the workspace.
2. **Method B — Browser Directory Picker (`Cmd/Ctrl + O` on Web)**:
   Click **Open Project Folder** or press `Cmd/Ctrl + O` to select a local folder using the browser's directory picker (`webkitdirectory`).
3. **Method C — Native OS Dialog + Direct Disk Walk (Desktop Edition)**:
   On Electron Desktop, clicking **Open Folder** invokes the native OS dialog and records `rootAbsolutePath`, unlocking **Live Disk Watching** and **Atomic Apply-to-Disk**.
4. **Method D — Built-In Polyglot Reference Scenarios**:
   Click **Web Stack Demo** (`acme-saas-platform`), **Rust Crate Demo** (`orbit-kv-engine`), **C++20 Demo** (`chrono-physics-engine`), or **Test node_modules Warning** to test every feature immediately.

---

### 1.3 Web Edition Landing Page vs. Native Desktop Workbench Lobby

- **Web Edition (`getPlatform().id === "web"`)**: Opens to the interactive **Product Landing Page** (`HomePage.tsx`), featuring the live **Polyglot AST Showcase** (`Web TSX`, `Rust .rs`, `C++20 .cpp`), interactive 6-format CodeFile Analyzer preview, embedded folder dropzone, and direct documentation search chips.
- **Desktop Edition (`getPlatform().id === "electron"` or `?desktop=1`)**: Replaces the web marketing page with an edge-to-edge (`w-full h-full`, zero side margins) **Native Desktop Workbench Lobby** (`DesktopLobby.tsx`) organized into a 3-pane IDE layout:
  - **Left Dock — Persistent Project History**: Stores up to 18 recently loaded projects with pinning, search, and stack filters (`All`, `Web`, `Rust`, `C/C++`).
  - **Center Pane — Launchpad & Live Syntax Inspector**: Native disk browser, drag-and-drop zone, 4 polyglot reference templates, workspace lens shortcuts, and live syntax-highlighted preview.
  - **Right Dock — Studio Appearance & Typography Inspector**: Switch between **Dark Studio** and **Light Paper**, pick from **7 color palettes**, choose **UI & Editor font pairings**, and scale base font size (`12px–17px`) and line spacing.

---

### 1.4 Dismissible Post-Import Warning Banners (`X` Close Controls)

When you import a repository containing excluded heavy directories, `.gitignore` rules, credential files, or syntax anomalies, the software displays a contextual banner at the top of the relevant view. **Every post-import warning banner includes an explicit Close (`X`) button** so you can dismiss it once acknowledged (banners automatically reset when you import a new project):

| Warning Banner | Where It Appears | Trigger Condition | Action & Dismiss Controls |
| :--- | :--- | :--- | :--- |
| **Auto-Excluded Heavy Folders & `.gitignore`** | Workspace top bar | Heavy folders (`node_modules`, `target`, `build`, `.git`) or `.gitignore` matches found. | Click **Review Exclusions** to re-include items, or click **`X`** (`close-exclusion-warning`) to dismiss. |
| **Possible Secrets Detected** | Workspace top bar | `.env*`, `*.pem`, `*.key`, `id_rsa`, or `credentials.json` files detected. | Review flagged filenames before exporting, or click **`X`** (`close-secrets-warning`) to dismiss. |
| **Analyzer Selection Secrets Warning** | `Analyzer` tab top bar | Secret files are currently checked in the CodeFile Analyzer selection. | Click **Deselect Secrets** to uncheck all sensitive files at once, or click **`X`** (`close-analyzer-secrets-warning`). |
| **DepLenz Syntax Warnings Banner** | `DepLenz` tab top bar | Source files contain unclosed strings/comments, mismatched brackets, or invalid JSON. | Click **Review N Diagnostics** for `file:line:col` details, or click **`X`** (`close-syntax-warning`). |
| **Smart Paste Protocol Warnings** | `DepLenz → Smart Paste` | Pasted LLM output contained protocol warnings. | Inspect warnings or click **`X`** to dismiss. |

---

### 1.5 Keyboard Shortcuts & URL Query Parameters

| Shortcut / Flag | Scope | Behavior |
| :--- | :--- | :--- |
| `Cmd/Ctrl + O` | Global | Open Folder Picker |
| `Cmd/Ctrl + S` | Workspace | Download Flattened `.zip` Archive |
| `Cmd/Ctrl + P` | Workspace | Generate & Save Vector Structure `.pdf` |
| `1` – `6` | Workspace | Switch to `Files` (1), `Tree` (2), `PDF & Image` (3), `Stats` (4), `Analyzer` (5), `DepLenz` (6) |
| `?` | Global | Open Keyboard Shortcuts & Help Modal |
| `/` or `Cmd/Ctrl + K` | Documentation | Focus Keyword Search Bar |
| `Escape` | Global | Close active modal, popover, or clear search |
| `?desktop=1` | URL Query | Preview the full-window Native Desktop Workbench Lobby in a browser |
| `?autostart=1` | URL Query | Auto-load the clean sample project straight into the Workspace |
| `?view=docs` | URL Query | Boot straight into the built-in Documentation Encyclopedia |

---

## Chapter 02 · Auto-Shield Exclusions, Hierarchical `.gitignore` & Secrets Guard

### 2.1 Default Auto-Shield Heavy Directory Catalog
Before hydrating file contents into memory, Auto-Shield intercepts the following 17+ heavy directories:
- **JavaScript / TypeScript / Web**: `node_modules`, `.next`, `.nuxt`, `.svelte-kit`, `.output`, `.turbo`, `.vercel`, `.cache`, `.parcel-cache`, `dist`, `coverage`, `.nyc_output`
- **Rust (Cargo)**: `target`
- **C / C++ (CMake / Ninja / CLion)**: `build`, `out`, `CMakeFiles`, `cmake-build-debug`, `cmake-build-release`
- **Python / Go / Mobile / Git**: `.git`, `__pycache__`, `.venv`, `venv`, `.pytest_cache`, `vendor`, `Pods`, `DerivedData`

### 2.2 Hierarchical `.gitignore` Parsing
Reads root and nested `.gitignore` files in declaration order, supporting `*`, `**`, directory-only `/`, and `!` negation rules (e.g., ignoring `*.env` while keeping `!.env.example`).

---

## Chapter 03 · Files Flattener, Directory Tree, Vector PDF Architect & Stats

### 3.1 Deterministic Collision Strategies (`collisionResolver.ts`)
- **`enumerate` (Auto-number duplicates)**: `index.ts`, `index_1.ts`, `index_2.ts`
- **`prefix-path` (Prefix folder path)**: `src_index.ts`, `src_api_index.ts`, `src_ui_index.ts`
- **`overwrite` (Overwrite duplicates)**: Retains the last sorted path per colliding filename.

### 3.2 Vector PDF & High-DPI Image Architect
Draws geometric vector tree connectors (`jsPDF`) instead of relying on WinAnsiEncoding font glyphs (eliminating the `% % %` corruption seen in standard PDF generators) and exports `1x`, `2x`, or `3x` high-DPI PNG/JPEG blueprints.

---

## Chapter 04 · CodeFile Analyzer & 6-Format LLM Bundling

Supports **6 real-time export formats** with live per-format token estimation and automatic lockfile deselection (`package-lock.json`, `Cargo.lock`, `pnpm-lock.yaml`, `yarn.lock`):
1. **Standard (`.txt`)**: 80-column `===` metadata banners + source + `END OF FILE` marker.
2. **Compact (`.txt`)**: Minimal `# ---- path ----` header saving up to 80% of header tokens.
3. **Markdown (`.md`)**: Headings, bullet metadata, and fenced code blocks with language tags.
4. **XML (`.xml`)**: `<file path="..." type="..." lines="..."><![CDATA[ ... ]]></file>` (CDATA-safe for raw JSX/HTML/C++ templates).
5. **JSONL (`.jsonl`)**: One self-contained JSON record per line for RAG & vector DB ingestion.
6. **JSON (`.json`)**: Single pretty-printed JSON payload with project summary and file array.
