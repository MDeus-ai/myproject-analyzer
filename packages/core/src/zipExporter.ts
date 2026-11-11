import JSZip from "jszip";
import type { ProcessedFile } from "@myproject/core/types";
import { hydrateFilesForExport } from "@myproject/core/content";

export interface ZipProgress {
  percent: number;
  currentFile: string;
}

/**
 * Packs all processed files into a single flat ZIP archive with no directories.
 *
 * Hydrates lazily-loaded content first. Snapshot imports populate
 * textContent at scan time, so on the web app today the pending list is
 * empty and the progress mapping is exactly the legacy one.
 */
export async function createFlatZip(
  files: ProcessedFile[],
  onProgress?: (progress: ZipProgress) => void,
): Promise<Blob> {
  const pendingCount = files.filter(
    (f) => f.textContent === undefined && (f.source || f.blob),
  ).length;

  // Phase 1/3 (only when needed): hydration occupies the first 30%.
  if (pendingCount > 0) {
    await hydrateFilesForExport(files, (done, total) => {
      onProgress?.({
        percent: Math.round((done / Math.max(1, total)) * 30),
        currentFile: `Reading file contents… (${done}/${total})`,
      });
    });
  }

  // Phase 2/3: adding files to the archive.
  const addBase = pendingCount > 0 ? 30 : 0;
  const addSpan = pendingCount > 0 ? 60 : 90;

  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.flattenedName || file.name;

    if (onProgress) {
      onProgress({
        percent: addBase + Math.round((i / files.length) * addSpan),
        currentFile: fileName,
      });
    }

    if (file.blob) {
      zip.file(fileName, file.blob);
    } else if (file.textContent !== undefined) {
      zip.file(fileName, file.textContent);
    } else {
      // Fallback empty placeholder if content is absent (binary or
      // unreadable source) — same behavior as the legacy exporter.
      zip.file(fileName, "");
    }
  }

  // Phase 3/3: compression occupies the final 10%.
  const content = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress({
          percent: 90 + Math.round(metadata.percent * 0.1),
          currentFile: "Compressing archive...",
        });
      }
    },
  );

  return content;
}

/**
 * Triggers a download of a Blob file in the browser.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
