# Part II · Monorepo Architecture, Complete File-by-File Codebase Map & Data Pipeline (Chapter 07)

> **Audience**: Software engineers, open-source contributors, and systems architects inspecting the internal engineering of **MyProject Analyzer**.

---

## 1. Unidirectional Workspace Topology (ADR-001)

MyProject Analyzer is structured as a multi-package TypeScript + Rust monorepo (`package.json` workspaces: `packages/*`, `apps/*`). Domain logic has zero DOM or Electron dependencies so every algorithm can be unit-tested in pure Node.js (`tsx --test`):

| Workspace Package | Directory | Allowed Workspace Dependencies | Runtime Environment |
| :--- | :--- | :--- | :--- |
| `@myproject/core` | `/packages/core` | None (leaf domain package; uses `jspdf`, `jszip`) | Isomorphic (Node, Browser, Electron) |
| `@myproject/platform` | `/packages/platform` | `@myproject/core` (types only) | Isomorphic contract singleton |
| `@myproject/rust-engine` | `/packages/rust-engine` | Native Rust (`napi`, `rayon`, `regex`, `ignore`, `serde`) | Node.js / Electron Main Process (N-API) |
| `@myproject/platform-web` | `/packages/platform-web` | `@myproject/core`, `@myproject/platform` | Browser DOM (`File`, `Blob`, `URL.createObjectURL`) |
| `@myproject/platform-electron` | `/packages/platform-electron` | `@myproject/core`, `@myproject/platform` | Electron Renderer (`window.myprojectDesktop`) |
| `@myproject/ui` | `/packages/ui` | `@myproject/core`, `@myproject/platform` | React 19 + Tailwind CSS v4 + Lucide |
| `@myproject/web` | `/apps/web` | `@myproject/core`, `@myproject/platform*`, `@myproject/ui` | Vite SPA / Electron Renderer Payload |
| `@myproject/desktop` | `/apps/desktop` | `@myproject/core`, `@myproject/platform`, `@myproject/rust-engine`, `@myproject/web` | Electron 35 Main + Hardened Preload |

---

## 2. Complete File-by-File Codebase Inventory & Reference

### 2.1 `@myproject/core` (`/packages/core/src/*`) — Pure Domain Engines

| File Path | Key Exports | Technical Responsibility |
| :--- | :--- | :--- |
| `types.ts` | `ProcessedFile`, `FileContentSource`, `FolderNode`, `FolderStats`, `FolderScanResult`, `WorkspaceTab` | Canonical TypeScript interfaces shared across all packages and IPC boundaries. |
| `folderReader.ts` | `processFileList`, `readDroppedEntries`, `hydrateFilesWithConcurrency`, `shouldReadText` | Browser `FileList` & HTML5 `DataTransfer` recursive directory walker with Auto-Shield interception and 16-way concurrent text hydration. |
| `content.ts` & `contentReader.ts` | `MAX_TEXT_BYTES` (`2MB`), `BINARY_SNIFF_BYTES` (`8KB`), `looksBinary`, `readBlobTextGated` | NUL-byte binary sniffer and 2MB text size gate shared identically between Web and Desktop scanners. |
| `folderExclusions.ts` | `DEFAULT_EXCLUSION_RULES`, `checkPathExclusion` | 17+ default heavy directory patterns (`node_modules`, `target`, `build`, `CMakeFiles`, `.git`, etc.) and path segment matcher. |
| `gitignoreParser.ts` | `parseGitignore`, `applyGitignoreFilter`, `matchesGitignoreRule` | Hierarchical `.gitignore` compiler supporting `*`, `**`, directory markers, and `!` negation rules. |
| `secretsDetector.ts` | `isSecretFile`, `detectSecretsInFiles`, `getSecretWarning` | Regex & filename matcher flagging `.env*`, private keys (`*.pem`, `id_rsa`), and cloud credential files. |
| `collisionResolver.ts` | `resolveCollisions(files, strategy)` | Deterministic `O(N log N)` filename collision resolver (`enumerate`, `prefix-path`, `overwrite`). |
| `treeBuilder.ts` | `buildFolderTree`, `generateAsciiTree` | Single-pass trie builder computing recursive folder sizes, depth, extension histograms, and UTF-8 ASCII trees. |
| `codeAnalyzer.ts` | `identifyCodeFileType`, `combineMultipleCodeFiles`, `estimateTokens`, `estimateCombinedTokensByStyle`, `isLockfile` | 35+ language detector, 6-format LLM bundle serializer, lockfile detector, and `O(N)` token estimator. |
| `depLenz.ts` | `buildCodebaseDependencyGraph`, `buildCodebaseDependencyGraphAsync`, `extractSurgicalContext`, `searchCodebase`, `interweaveSurgicalPrompt` | Polyglot static AST analyzer (Web TS/JS/React/Vue/Svelte, Rust, C/C++20), call graph builder, blast-radius BFS, and surgical prompt engine. |
| `engineBridge.ts` | `analyzeProjectGraph`, `searchProjectCodebase`, `isNativeRustEngineAvailable` | Dual-runtime bridge routing CPU-heavy DepLenz calls to the Rust N-API addon on Desktop or async TS chunks on Web. |
| `smartPaste.ts` | `parseSmartPasteResponse`, `stripSmartPasteMarkers`, `buildSmartPasteInstructions`, `createSmartPasteZip` | Parser and ZIP packager for `<<<SMART_PASTE_FILE>>>` LLM response blocks and `[SMART-PASTE]` markers. |
| `smartPasteVerify.ts` | `verifySmartPaste(parsed, analysis, files)` | 5-stage pre-apply static verification pipeline checking delimiters, exports, parameter arity, and caller contracts. |
| `codeDiff.ts` | `computeLineDiff(oldText, newText, contextLines)` | LCS/Myers-style line-level diff engine producing unified hunks and `+added/-removed` counts. |
| `evolutionLog.ts` | `createEvolutionEntry`, `appendEvolutionEntry`, `formatEvolutionForHandover` | Token-efficient ring-buffer changelog (`~15–25` tokens/entry) for multi-LLM session continuity. |
| `pdfGenerator.ts` & `imageExporter.ts` | `generateFolderPdf`, `exportElementAsImage`, `renderBlueprintToCanvas` | Vector `jsPDF` multi-page blueprint generator and high-DPI (`1x`–`3x`) HTML5 Canvas rasterizer. |
| `themes.ts` | `APP_THEMES`, `applyAppTheme`, `syncThemeVariables`, `recordProjectInHistory` | 7-palette dual-theme contrast engine (`Dark Studio` / `Light Paper`), typography scaler, and project history store. |
| `sampleProject.ts` | `getScenarioProject`, `SAMPLE_SCENARIOS` | Generates realistic multi-file `File` fixtures for Web (`clean`), Rust (`rust`), C++20 (`cpp`), `heavy`, and QA scenarios. |
| `documentationData.ts` | `DOCUMENTATION_CHAPTERS`, `searchDocumentation` | 12-chapter dual-audience documentation encyclopedia and weighted full-text keyword search engine. |

### 2.2 `@myproject/ui` (`/packages/ui/src/*`) & `/apps/desktop/src/*` — UI Views & Native Shell

| File Path | Component / Module | Technical Responsibility |
| :--- | :--- | :--- |
| `packages/ui/src/DesktopHeader.tsx` | `DesktopHeader`, `ViewsOverflowDropdown` | Strictly single-row (`h-12`) responsive workspace toolbar with `ResizeObserver` tab overflow. |
| `packages/ui/src/DesktopLobby.tsx` | `DesktopLobby` | Full-bleed (`w-full h-full`) 3-pane native desktop IDE workbench (History Dock, Launchpad, Studio Appearance Inspector). |
| `packages/ui/src/HomePage.tsx` | `HomePage` | Web edition product landing page with live Polyglot AST preview, format tabs, and dropzone. |
| `packages/ui/src/DocumentationView.tsx` | `DocumentationView` | Interactive 3-column documentation reader with audience filter, `/` keyword search, and Full Manual mode. |
| `packages/ui/src/DepLenzView.tsx` | `DepLenzView` | Main DepLenz workbench orchestrating Dependency Tree, 2D Map, Keyword Search, Surgical Prompts, Smart Paste, and Evolution Log. |
| `packages/ui/src/DepLenzGraphCanvas.tsx` | `DepLenzGraphCanvas` | 60fps direct-DOM SVG graph engine with Sugiyama layout, module clusters, and cursor-anchored zoom. |
| `packages/ui/src/CodeSyntaxHighlighter.tsx` | `CodeSyntaxHighlighter`, `tokenizeCodeLine` | Single-pass polyglot syntax tokenizer for TS/JS/JSX, Rust, C/C++20, JSON, HTML/CSS, CMake, and TOML. |
| `packages/ui/src/ThemedDropdown.tsx` | `ThemedDropdown` | Bespoke theme-aware popover dropdown replacing all native `<select>` elements across the app. |
| `apps/desktop/src/main.ts` & `preload.ts` | Electron Main & Preload | Hardened `BrowserWindow` lifecycle, IPC handlers, native dialogs, and narrow `contextBridge` surface. |
| `apps/desktop/src/fs-walk.ts` | `walkDirectory` | Native Node `fs.promises` directory scanner with symlink loop protection and binary/size gating. |
| `apps/desktop/src/watch-batcher.ts` & `watch-filter.ts` | Live Disk Watcher | Chokidar event filter and 150ms debounced batch coalescer. |
| `apps/desktop/src/apply-plan.ts` | `executeApplyPlan` | Path-traversal-proof atomic disk writer with `.bak` backup generation for Smart Paste. |

---

## 3. Lazy Content Hydration & 200ms Settled Reactive Pipeline (ADR-002)

1. **Binary Sniffing & 2MB Size Gate (`content.ts`)**:
   Files exceeding `MAX_TEXT_BYTES` (`2 MB`) or containing a NUL byte (`0x00`) within their first `BINARY_SNIFF_BYTES` (`8 KB`) are indexed as metadata shells without allocating `textContent`.
2. **16-Way Sliding Concurrency Pool (`hydrateFilesWithConcurrency`)**:
   Hydrates text files with 16 concurrent readers so browser and OS file descriptors are never exhausted.
3. **Debounced Settled Pipeline (`useDebouncedValue(rawFiles, 200)`)**:
   Collapses rapid 150ms live-watch batches into a single downstream recomputation of `resolveCollisions` and `buildFolderTree`, while flushing immediately (`0ms`) when loading or clearing a project.
