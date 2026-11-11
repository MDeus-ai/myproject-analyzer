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
Memory management becomes possible (evict + re-read) for live sessions.
