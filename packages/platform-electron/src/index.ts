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
 */

import type {
  DesktopHostBridge,
  PlatformBridge,
  PlatformCapabilities,
} from "@myproject/platform";
import type { FolderScanResult, ProcessedFile } from "@myproject/core/types";
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
} from "@myproject/core/codeAnalyzer";
import {
  DEFAULT_EXCLUSION_RULES,
  matchExcludedSegment,
} from "@myproject/core/folderExclusions";

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
    watch: false, // Phase 2
    nativeDialogs: true,
    applyToDisk: false, // Phase 3
    saveToPath: true,
  };

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

    return applyScanFilters(files, rootName);
  }

  /** Scenario loads / webkit input still work on desktop — same pipeline. */
  scanFileObjects(
    files: File[] | FileList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
    return processFileList(files, { onProgress });
  }

  /** Drag-and-drop: v1 keeps the browser traversal (works fine in Electron). */
  scanDroppedItems(
    items: DataTransferItemList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
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
}
