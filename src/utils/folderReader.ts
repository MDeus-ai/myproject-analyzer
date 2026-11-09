import { ProcessedFile } from '../types';
import { getFileExtension } from './fileHelpers';

/**
 * Parses File objects from a webkitdirectory input into ProcessedFile array.
 */
export async function processFileList(fileList: FileList | File[]): Promise<{
  files: ProcessedFile[];
  rootName: string;
}> {
  const files: ProcessedFile[] = [];
  const array = Array.from(fileList);

  let rootName = 'folder';
  if (array.length > 0) {
    const firstRel = array[0].webkitRelativePath || array[0].name;
    const parts = firstRel.split(/[\\/]/);
    if (parts.length > 1) {
      rootName = parts[0];
    }
  }

  for (let i = 0; i < array.length; i++) {
    const file = array[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split(/[\\/]/).filter(Boolean);
    const name = file.name;
    const extension = getFileExtension(name);

    // Get directory path (excluding root and filename)
    let directoryPath = '';
    if (parts.length > 2) {
      directoryPath = parts.slice(1, -1).join('/');
    } else if (parts.length === 2 && parts[0] !== rootName) {
      directoryPath = parts[0];
    }

    let textContent: string | undefined;
    let previewUrl: string | undefined;

    // Read preview text if small text/code file
    if (
      file.size < 50000 &&
      (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/javascript' ||
        ['md', 'txt', 'ts', 'tsx', 'js', 'json', 'css', 'html', 'py', 'sh', 'csv', 'svg'].includes(extension))
    ) {
      try {
        textContent = await file.text();
      } catch {
        // Ignore reading error for binary or locked files
      }
    }

    // Generate object URL for image previews
    if (file.type.startsWith('image/')) {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {
        // ignore
      }
    }

    files.push({
      id: `file-${i}-${Date.now()}`,
      name,
      originalName: name,
      flattenedName: name,
      relativePath: relPath,
      pathSegments: parts,
      directoryPath,
      size: file.size,
      type: file.type || 'application/octet-stream',
      extension,
      lastModified: file.lastModified || Date.now(),
      blob: file,
      previewUrl,
      textContent,
    });
  }

  return { files, rootName };
}

/**
 * Recursively scans files from HTML5 Drag and Drop DataTransferItem list
 */
export async function readDroppedEntries(
  items: DataTransferItemList
): Promise<{ files: ProcessedFile[]; rootName: string }> {
  const fileEntries: { file: File; path: string }[] = [];
  let detectedRoot = '';

  const entries: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry);
      }
    }
  }

  async function traverseEntry(entry: any, path: string): Promise<void> {
    if (entry.isFile) {
      await new Promise<void>((resolve, reject) => {
        entry.file(
          (file: File) => {
            fileEntries.push({ file, path: `${path}/${file.name}` });
            resolve();
          },
          (err: any) => reject(err)
        );
      });
    } else if (entry.isDirectory) {
      if (!detectedRoot && !path) {
        detectedRoot = entry.name;
      }
      const dirReader = entry.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        const batch: any[] = [];
        let done = false;
        while (!done) {
          const results: any[] = await new Promise((res, rej) =>
            dirReader.readEntries(res, rej)
          );
          if (results.length === 0) {
            done = true;
          } else {
            batch.push(...results);
          }
        }
        return batch;
      };

      const children = await readAllEntries();
      for (const child of children) {
        await traverseEntry(child, path ? `${path}/${entry.name}` : entry.name);
      }
    }
  }

  for (const entry of entries) {
    await traverseEntry(entry, '');
  }

  const filesWithRelative: File[] = [];
  for (const item of fileEntries) {
    // Attach webkitRelativePath property for compatibility
    Object.defineProperty(item.file, 'webkitRelativePath', {
      value: item.path.replace(/^\/+/, ''),
      writable: false,
    });
    filesWithRelative.push(item.file);
  }

  const result = await processFileList(filesWithRelative);
  if (detectedRoot) {
    result.rootName = detectedRoot;
  }
  return result;
}
