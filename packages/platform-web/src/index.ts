/**
 * WebPlatformBridge — every operation implemented with the exact browser
 * code paths the app uses today. Zero behavior change: this is a relocation,
 * not a rewrite. Watch/applyToDisk/saveToPath stay absent (capabilities
 * advertise false) — those arrive with the Electron bridge in Phase 1+.
 */

import type { PlatformBridge, PlatformCapabilities } from "@myproject/platform";
import type { FolderScanResult, ProcessedFile } from "@myproject/core/types";
import {
  processFileList,
  readDroppedEntries,
  readTextIfReadable,
  type ScanProgress,
} from "@myproject/core/folderReader";
import { triggerFileDownload } from "@myproject/core/zipExporter";

export class WebPlatformBridge implements PlatformBridge {
  readonly id = "web" as const;

  readonly capabilities: PlatformCapabilities = {
    watch: false,
    nativeDialogs: false,
    applyToDisk: false,
    saveToPath: false,
  };

  async pickFolder(): Promise<FolderScanResult | null> {
    // The web app triggers a hidden <input webkitdirectory> element and
    // routes the resulting FileList through scanFileObjects. Null signals
    // "the UI owns folder picking on this platform".
    return null;
  }

  scanFileObjects(
    files: File[] | FileList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
    return processFileList(files, { onProgress });
  }

  scanDroppedItems(
    items: DataTransferItemList,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<FolderScanResult> {
    return readDroppedEntries(items, { onProgress });
  }

  async readText(file: ProcessedFile): Promise<string | undefined> {
    const blob = file.source?.blob ?? file.blob;
    if (!blob) return undefined;
    return readTextIfReadable(blob, file.name, file.type);
  }

  createPreviewUrl(file: ProcessedFile): string | undefined {
    if (file.previewUrl) return file.previewUrl;
    const blob = file.source?.blob ?? file.blob;
    if (!blob || !file.type.startsWith("image/")) return undefined;
    const url = URL.createObjectURL(blob);
    file.previewUrl = url;
    return url;
  }

  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  async saveBlob(blob: Blob, suggestedName: string): Promise<void> {
    triggerFileDownload(blob, suggestedName);
  }
}
