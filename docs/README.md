# MyProject Analyzer — Complete Documentation Encyclopedia

Welcome to the official documentation suite for **MyProject Analyzer** (Web Application & Native Electron + Rust Desktop Application).

This documentation is organized for **two distinct audiences** and is shipped both in this `/docs` folder and **built directly into the software** as a dedicated, interactive **Documentation Page** (`DocumentationView.tsx`) with real-time keyword search (`/` or `Cmd/Ctrl + K`), audience filtering, and continuous **Full Manual Mode**.

---

## Part I · High-Level User Manual (Chapters 01–06 — For Everyone)

Plain-English, step-by-step manuals explaining what every feature does, why it exists, and how to use it effectively:

1. **[01 · High-Level User Guide (`01-high-level-user-guide.md`)](./01-high-level-user-guide.md)**
   - **Chapter 01 — Product Manual, Core Mental Model & Ingestion Workflows**: Six-Lens Workspace model, 4 folder ingestion pathways, Web Landing Page vs. Native Desktop Workbench Lobby (`?desktop=1`), dismissible post-import warning banners (with `X` close controls), global keyboard shortcuts, and URL query parameters.
   - **Chapter 02 — Auto-Shield Exclusions, Hierarchical `.gitignore` & Secrets Guard**: Complete catalog of 17+ heavy directories (`node_modules`, `target`, `build`, `CMakeFiles`, `.git`, `.next`), hierarchical `.gitignore` parsing (including `!` negation rules), interactive Exclusion Review Modal, and Secrets & Credential detection patterns (`.env*`, `*.pem`, `id_rsa`, `credentials.json`).
   - **Chapter 03 — Files Flattener, Directory Tree, Vector PDF Architect & Stats**: Subfolder stripping, deterministic collision resolution (`enumerate`, `prefix-path`, `overwrite`), virtualized table scrolling, UTF-8 ASCII tree copy, glitch-free vector PDF & `1x/2x/3x` PNG/JPEG blueprints, and codebase telemetry.
   - **Chapter 04 — CodeFile Analyzer & 6-Format LLM Bundling**: The 3-part metadata layout, exhaustive reference for all 6 export formats (`Standard .txt`, `Compact .txt`, `Markdown .md`, `CDATA XML .xml`, `JSONL .jsonl`, `JSON .json`), lockfile auto-skip, and live per-format token math.

2. **[02 · DepLenz, Surgical Prompts, Smart Paste & Evolution Logs (`02-deplenz-smart-paste-and-evolution.md`)](./02-deplenz-smart-paste-and-evolution.md)**
   - **Chapter 05 — DepLenz Visual Architecture**: Polyglot stack detection (`Web`, `Rust`, `C/C++20`), symbol kind taxonomy (`UI`, `use`, `fn`, `cls`, `m()`, `st`, `tr`), Subsystem & Component Communication Matrix (inbound/outbound coupling), Bi-Directional Dependency Tree, Transitive Blast Radius risk ratings, 60fps 2D Codebase Map, and Enclosing-Function Keyword Search.
   - **Chapter 06 — Surgical AI Prompts, User Action Directives, Smart Paste & Evolution Logs**: Saving 85–98% of context tokens, Interwoven User Action Prompts (`<user_action_request>`), Two-Step Plan Mode, the `<<<SMART_PASTE_FILE>>>` wire protocol, 5-stage pre-apply verification, interactive diff viewer, atomic Desktop Apply-to-Disk, and Token-Efficient Evolution Handover Logs (`<project_evolution_handover>`, ~15–25 tokens/entry).

---

## Part II · Deep Technical & Systems Engineering Reference (Chapters 07–12 — For Developers)

Exhaustive architectural, algorithmic, and file-by-file codebase documentation:

3. **[03 · Monorepo Architecture, Complete File-by-File Map & Platform Bridge (`03-monorepo-architecture-and-platform-bridge.md`)](./03-monorepo-architecture-and-platform-bridge.md)**
   - **Chapter 07**: Unidirectional workspace topology (`@myproject/core`, `@myproject/platform`, `@myproject/platform-web`, `@myproject/platform-electron`, `@myproject/rust-engine`, `@myproject/ui`, `@myproject/web`, `@myproject/desktop`), **complete file-by-file codebase reference table**, `FileContentSource` lazy hydration, 8KB NUL-byte binary sniffing, 2MB text size gate, 16-way concurrent hydration, and the 200ms debounced `settledFiles` reactive pipeline.

4. **[04 · Polyglot Static Analyzer (Web, Rust, C/C++20) & Native Rust Engine (`04-polyglot-ast-and-rust-engine.md`)](./04-polyglot-ast-and-rust-engine.md)**
   - **Chapter 08 — Polyglot AST Engine (`depLenz.ts`)**: Line-preserving comment sanitization (`stripCommentsKeepLines`), `O(log L)` binary-search line lookup, balanced-brace scanner (`extractBlockBody`), Web/Rust/C++20 extraction grammars, **C/C++ Header-to-Source Translation Unit Bridging (`#include "world.hpp"` ↔ `src/world.cpp`)**, per-file symbol deduplication, and BFS blast-radius calculation.
   - **Chapter 09 — Native Rust N-API Addon (`@myproject/rust-engine`)**: `napi-rs` bindings, Rayon work-stealing parallel AST extraction (`par_iter`), SIMD regex search, `ignore` directory walking, algorithmic complexity matrix, and cooperative 20-file browser chunking (`engineBridge.ts`).

5. **[05 · 60fps SVG Graph Math, 5-Stage Verifier, Dual-Theme Engine & Security (`05-ui-design-system-and-performance.md`)](./05-ui-design-system-and-performance.md)**
   - **Chapter 10 — 60fps Direct-DOM SVG Graph Engine (`DepLenzGraphCanvas.tsx`)**: Sugiyama-lite longest-path layering, 2-pass barycenter crossing reduction, root-cause analysis of React SVG lag & duplicate nodes, and `O(degree)` direct DOM mutation (`applyDirectNodeTransform`).
   - **Chapter 11 — Smart Paste 5-Stage Verifier (`smartPasteVerify.ts`), LCS Diff (`codeDiff.ts`) & Evolution Compression (`evolutionLog.ts`)**.
   - **Chapter 12 — UI Design System, WCAG AA+ Light/Dark Theme Engine (`syncThemeVariables`) & Electron Security Invariants (`ADR-004`)**.

---

## Architecture Decision Records (`/docs/adr`)

- **[ADR-001: Monorepo Structure](./adr/001-monorepo-structure.md)**
- **[ADR-002: Lazy Content Hydration](./adr/002-content-hydration.md)**
- **[ADR-003: Platform Bridge Contract](./adr/003-platform-bridge.md)**
- **[ADR-004: Desktop Security Invariants](./adr/004-desktop-security.md)**
- **[ADR-005: Desktop Packaging & Distribution](./adr/005-packaging.md)**
