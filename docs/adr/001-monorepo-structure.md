ADR 001: npm-workspaces monorepo with source-level package sharing
Status
Accepted (Phase 0)

Context
The app must ship as both a web app and an Electron desktop app sharing all logic and UI. The original single-app layout (src/utils, src/components) had no way to express "shared core vs. host-specific shell."

Decision
Adopt an npm-workspaces monorepo:

packages/core — pure logic modules + domain types. No platform imports.
packages/platform — the PlatformBridge contract + registry (types only).
packages/platform-web — browser implementation of the bridge.
packages/ui — shared React components, exported through a barrel.
apps/web — the Vite web app; the composition root.
Packages are consumed as TypeScript source (exports point at ./src/\*.ts), not pre-built artifacts. The app's bundler (Vite today, the desktop bundler in Phase 1) compiles workspace packages directly. Core's Node test runner imports them via tsx with moduleResolution: bundler.

Internal workspace dependencies use "\*" ranges (npm-compatible).

Consequences
Zero build orchestration: no per-package build step, no watch tasks.
Desktop app joins later as apps/desktop + packages/platform-electron without touching core/ui.
Trade-off: packages are not publishable to npm as-is (they're private).
Trade-off: editors must resolve through workspace symlinks (restart TS server after installs). 3. docs/adr/002-content-hydration.md — NEW

ADR 002: Content hydration seam (lazy file text)
Status
Accepted (Phase 0)

Context
Today the scanner eagerly reads every text file into file.textContent at import time. A live desktop session (Phase 2) cannot do this: files change on disk after import, and holding a 50k-file tree's content in memory is wasteful. We needed a seam where "read the file's text" is an operation, not an assumption — without changing web behavior now.

Decision
ProcessedFile gains optional source: FileContentSource ({ kind: "blob" | "path" }), contentHash, and externallyModified.
New module packages/core/src/content.ts provides:
getTextContent(file) — hydrates on first access, caches back onto file.textContent, applies the SAME readability gates as the scanner (allowlist, binary-MIME exit, NUL sniff, size cap).
peekTextContent(file) — sync read for render paths.
evictTextContent(file) / hydrateFilesForExport(files, onProgress).
Path-backed reads go through a PathTextReader registered at app boot (contentReader.ts). Web registers nothing (blob-only); desktop will register an IPC-backed reader; tests may register an fs-based one.
zipExporter is hydration-aware; progress mapping is unchanged when the pending set is empty (always true for current web imports).
Consequences
Web behavior is byte-identical; the hydration path is exercised only by new tests until Phase 2.
Every future consumer of file text must go through content.ts — direct file.textContent assumptions are now a lint-level smell.
Memory management becomes possible (evict + re-read) for live sessions. 4. docs/adr/003-platform-bridge.md — NEW

ADR 003: PlatformBridge host abstraction
Status
Accepted (Phase 0)

Context
Desktop-only capabilities (folder watching, native dialogs, writing to disk) must reach the shared UI without if (isElectron) scattered through components, and without Electron APIs leaking into code that also runs in a browser.

Decision
A single PlatformBridge interface in packages/platform, with one implementation per host:

WebPlatformBridge — today's exact browser code paths (webkitdirectory input, drag-and-drop, blob URLs, browser downloads).
ElectronPlatformBridge — Phase 1, IPC-backed.
The composition root lives in each app: apps/web/src/platform.ts calls setPlatform(new WebPlatformBridge()) at boot. Desktop will do the same with its bridge. The registry (getPlatform) throws if unset, surfacing boot-order bugs immediately.

Capabilities the web physically lacks (watch, applyToDisk, saveToPath, nativeDialogs) are optional methods + boolean capability flags, so shared UI degrades explicitly (capabilities.watch ? ... : ...) instead of sniffing user agents.

Consequences
Adding a desktop feature = extend the interface + implement in the Electron bridge; web simply never sets the capability flag.
isElectronRuntime() exists for the rare genuinely-runtime check (e.g. title bar chrome), kept to a single helper.
Tests can register a mock bridge to exercise platform-aware UI.
