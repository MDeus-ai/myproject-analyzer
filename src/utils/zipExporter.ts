import JSZip from 'jszip';
import { ProcessedFile } from '../types';

export interface ZipProgress {
  percent: number;
  currentFile: string;
}

/**
 * Packs all processed files into a single flat ZIP archive with no directories.
 */
export async function createFlatZip(
  files: ProcessedFile[],
  onProgress?: (progress: ZipProgress) => void
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.flattenedName || file.name;

    if (onProgress) {
      onProgress({
        percent: Math.round((i / files.length) * 100),
        currentFile: fileName,
      });
    }

    if (file.blob) {
      zip.file(fileName, file.blob);
    } else if (file.textContent) {
      zip.file(fileName, file.textContent);
    } else {
      // Fallback empty placeholder if content is absent
      zip.file(fileName, '');
    }
  }

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    metadata => {
      if (onProgress) {
        onProgress({
          percent: Math.round(metadata.percent),
          currentFile: 'Compressing archive...',
        });
      }
    }
  );

  return content;
}

/**
 * Triggers a download of a Blob file in the browser.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
