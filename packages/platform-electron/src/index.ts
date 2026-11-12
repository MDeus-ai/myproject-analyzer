/**
 * ElectronPlatformBridge — native capabilities via window.myprojectDesktop
 * (the preload host bridge). Zero Electron imports: this module runs in the
 * RENDERER and talks only to the injected global, so it stays unit-testable
 * in plain Node and bundle-safe for the web app.
 *
 * Scan parity with web is deliberate: relativePaths carry the root segment
 * (mirroring webkitRelativePath), heavy-folder files are walked but their
 * text is NOT read (re-inclusion hydrates later via the PathTextReader),
 * and applyScanFilters() runs the exact exclusion/.gitignore/secrets
 * pipeline the web app uses.
 *
 * Phase 2: live folder watching (startWatch/stopWatch/onWatchEvent).
 * Phase 3: Smart Paste apply-to-disk. The bridge remembers the root of the
 * last NATIVE scan; web-style imports (scenarios, drag-drop) clear it, so
 * changes can never be written to a stale folder.
 */

import type {
  ApplyOptions,
  ApplyResult,
  DesktopHostBridge,
  PlatformBridge,
  PlatformCapabilities,
  WatchEventBatch,
  WatchOptions,
} from "@myproject/platform";
import type { FolderScanResult, ProcessedFile } from "@myproject/core/types";
import type { SmartPasteChange } from "@myproject/core/smartPaste";
import {
  applyScanFilters,
  processFileList,
  readDroppedEntries,
  readTextIfReadable,
  type ScanProgress,
} from "@myproject/core/folderReader";
import { getFileExtension } from "@myproject/core/fileHelpers";
import {
  isTextReadableFile,
  MAX_TEXT_READ_SIZE,
  type AnalyzerStyle,
} from "@myproject/core/codeAnalyzer";
import {
  DEFAULT_EXCLUSION_RULES,
  matchExcludedSegment,
} from "@myproject/core/folderExclusions";
import {
  deserializeDepLenzResult,
  toRustFileInputs,
  type DepLenzEngine,
  type SerializedDepLenzAnalysisResult,
} from "@myproject/core/engineBridge";
import type {
  CodebaseSearchMatch,
  CodebaseSearchOptions,
  DepLenzAnalysisResult,
  DepLenzSymbol,
} from "@myproject/core/depLenz";

const HEAVY_EXCLUSIONS = new Set(
  DEFAULT_EXCLUSION_RULES.filter((r) => r.isDefault).map((r) =>
    r.pattern.toLowerCase(),
  ),
);

/** Paths per readFilesText IPC call — keeps structured-clone payloads sane. */
const READ_BATCH = 150;

export class ElectronPlatformBridge implements PlatformBridge {
  readonly id = "electron" as const;

  readonly capabilities: PlatformCapabilities = {
    watch: true, // Phase 2 ✅
    nativeDialogs: true,
    applyToDisk: true, // Phase 3 ✅
    saveToPath: true,
  };

  /** Root of the last native scan — the only legal apply-to-disk target. */
  private lastNativeRoot: string | null = null;

  constructor(private readonly host: DesktopHostBridge) {}

  /**
   * Native flow: dialog -> walk -> gated text hydration -> shared filters.
   * Returns null when the user cancels the dialog (web parity: the web
   * bridge returns null because the UI owns picking there).
   */
  async pickFolder(): Promise<FolderScanResult | null> {
    const picked = await this.host.pickFolder();
    if (picked.canceled || !picked.path) return null;

    const rootPath = picked.path;
    const rootName =
      rootPath
        .replace(/[\\/]+$/, "")
        .split(/[\\/]/)
        .pop() || "folder";

    const walked = await this.host.walkFolder(rootPath);
    if (!walked.ok) {
      throw new Error(walked.error ?? "Native folder scan failed");
    }

    const files: ProcessedFile[] = walked.entries.map((entry, i) => {
      const relativePath = `${rootName}/${entry.relPath}`;
      const parts = relativePath.split("/");
      return {
        id: `file-${i}-${Date.now()}`,
        name: entry.name,
        originalName: entry.name,
        flattenedName: entry.name,
        relativePath,
        pathSegments: parts,
        directoryPath: parts.length > 2 ? parts.slice(1, -1).join("/") : "",
        size: entry.size,
        type: "",
        extension: getFileExtension(entry.name),
        lastModified: entry.mtimeMs || Date.now(),
        source: { kind: "path", absolutePath: entry.absPath },
      };
    });

    // Eager text hydration with web semantics: skip heavy-excluded files,
    // empty files and anything over the read cap; gate by extension/name.
    const readable = files.filter(
      (f) =>
        f.size > 0 &&
        f.size <= MAX_TEXT_READ_SIZE &&
        !matchExcludedSegment(f.pathSegments, HEAVY_EXCLUSIONS) &&
        isTextReadableFile(f.name, ""),
    );

    for (let i = 0; i < readable.length; i += READ_BATCH) {
      const batch = readable.slice(i, i + READ_BATCH);
      const texts = await this.host.readFilesText(
        batch.map((f) => f.source!.absolutePath!),
      );
      batch.forEach((f, j) => {
        const text = texts[j];
        if (text != null) f.textContent = text;
      });
      if (i + READ_BATCH < readable.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const result = applyScanFilters(files, rootName);
    // Renderer needs the absolute root to start a live watch session, and
    // this bridge needs it as the apply-to-disk target.
    result.rootAbsolutePath = rootPath;
    this.lastNativeRoot = rootPath;
    return result;
  }

  /** Scenario loads / webkit input still work on desktop — same pipeline.
   *  A web-style import replaces the project, so the disk target is gone. */
  scanFileObjects(
    files: File[] | FileList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
    this.lastNativeRoot = null;
    return processFileList(files, { onProgress });
  }

  /** Drag-and-drop: v1 keeps the browser traversal (works fine in Electron).
   *  Also a web-style import — clears the apply target. */
  scanDroppedItems(
    items: DataTransferItemList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
    this.lastNativeRoot = null;
    return readDroppedEntries(items, { onProgress });
  }

  async readText(file: ProcessedFile): Promise<string | undefined> {
    if (file.source?.kind === "path" && file.source.absolutePath) {
      return (
        (await this.host.readFileText(file.source.absolutePath)) ?? undefined
      );
    }
    const blob = file.source?.blob ?? file.blob;
    if (!blob) return undefined;
    return readTextIfReadable(blob, file.name, file.type);
  }

  /** Native save dialog + disk write (capabilities.saveToPath = true). */
  async saveBlob(blob: Blob, suggestedName: string): Promise<void> {
    const data = await blob.arrayBuffer();
    await this.host.saveFile(suggestedName, data);
  }

  /**
   * Resolves a preview URL for an image file on desktop:
   * - Existing previewUrl (scenario/web import) is returned directly.
   * - Path-backed desktop files use the gated `myproject-asset://` custom protocol.
   * - Blob-backed files fall back to an object URL.
   */
  createPreviewUrl(file: ProcessedFile): string | undefined {
    if (file.previewUrl) return file.previewUrl;
    if (file.source?.kind === "path" && file.source.absolutePath) {
      return `myproject-asset://local?path=${encodeURIComponent(file.source.absolutePath)}`;
    }
    const blob = file.source?.blob ?? file.blob;
    return blob ? URL.createObjectURL(blob) : undefined;
  }

  revokePreviewUrl(url: string): void {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  /* ---- Live watch (Phase 2) ---- */

  async startWatch(rootPath: string, opts: WatchOptions): Promise<string> {
    const res = await this.host.startWatch(rootPath, {
      excludedPatterns: opts.excludedPatterns,
      respectGitignore: opts.respectGitignore,
    });
    if (!res.ok || !res.sessionId) {
      throw new Error(res.error ?? "Failed to start folder watcher");
    }
    return res.sessionId;
  }

  async stopWatch(sessionId: string): Promise<void> {
    await this.host.stopWatch(sessionId);
  }

  onWatchEvent(cb: (batch: WatchEventBatch) => void): () => void {
    return this.host.onWatchEvent(cb);
  }

  /* ---- Smart Paste apply-to-disk (Phase 3) ---- */

  async applyChanges(
    changes: SmartPasteChange[],
    opts: ApplyOptions,
  ): Promise<ApplyResult> {
    if (!this.lastNativeRoot) {
      throw new Error(
        "No natively-opened folder — apply-to-disk is only available after " +
          "opening a project via Open Folder on desktop.",
      );
    }
    const res = await this.host.applyChanges(
      this.lastNativeRoot,
      changes.map((c) => ({
        path: c.path,
        action: c.action,
        content: c.content,
      })),
      {
        dryRun: opts.dryRun === true,
        stripMarkers: opts.stripMarkers === true,
        force: opts.force === true,
      },
    );
    return {
      ok: res.ok,
      files: res.files,
      backupDir: res.backupDir ?? undefined,
      errors: res.errors,
    };
  }
}

/**
 * Creates a `DepLenzEngine` backed by the Electron main process / native Rust
 * N-API addon (`window.myprojectDesktop.engineBuildGraph` / `engineSearch`).
 */
export function createDesktopDepLenzEngine(
  host: DesktopHostBridge,
): DepLenzEngine {
  return {
    backend: "desktop-ipc",

    async buildGraph(
      files: ProcessedFile[],
    ): Promise<DepLenzAnalysisResult | null> {
      if (typeof host.engineBuildGraph !== "function") return null;
      const res = await host.engineBuildGraph(toRustFileInputs(files));
      if (!res.ok || !res.graphJson) return null;
      const parsed = JSON.parse(
        res.graphJson,
      ) as SerializedDepLenzAnalysisResult;
      return deserializeDepLenzResult(parsed);
    },

    async search(
      files: ProcessedFile[],
      opts: CodebaseSearchOptions,
      symbolsMap?: Map<string, DepLenzSymbol[]>,
    ): Promise<CodebaseSearchMatch[] | null> {
      if (typeof host.engineSearch !== "function") return null;
      const symbolsMapJson = symbolsMap
        ? JSON.stringify(Object.fromEntries(symbolsMap.entries()))
        : null;
      const res = await host.engineSearch(
        toRustFileInputs(files),
        opts,
        symbolsMapJson,
      );
      if (!res.ok || !res.matchesJson) return null;
      return JSON.parse(res.matchesJson) as CodebaseSearchMatch[];
    },

    async estimateTokens(
      files: ProcessedFile[],
      opts: { includeToc: boolean; includeLineNumbers: boolean },
    ): Promise<Record<AnalyzerStyle, number> | null> {
      if (typeof host.engineEstimateTokens !== "function") return null;
      const res = await host.engineEstimateTokens(
        toRustFileInputs(files),
        opts.includeToc,
        opts.includeLineNumbers,
      );
      if (!res.ok || !res.tokensJson) return null;
      return JSON.parse(res.tokensJson) as Record<AnalyzerStyle, number>;
    },
  };
}
