import { ProcessedFile, FolderScanResult, ExcludedFolderInfo } from '../types';
import { getFileExtension } from './fileHelpers';
import {
  DEFAULT_EXCLUSION_RULES,
  filterFilesByExclusions,
  matchExcludedSegment,
} from './folderExclusions';

export interface FolderReaderOptions {
  excludedPatterns?: string[];
  enableAutoExclusion?: boolean;
}

/**
 * Parses File objects from a webkitdirectory input into ProcessedFile array,
 * automatically detecting and excluding heavy folders like node_modules.
 */
export async function processFileList(
  fileList: FileList | File[],
  options?: FolderReaderOptions
): Promise<FolderScanResult> {
  const allRawFiles: ProcessedFile[] = [];
  const array = Array.from(fileList);

  const excludedPatterns =
    options?.excludedPatterns ||
    DEFAULT_EXCLUSION_RULES.filter(r => r.isDefault).map(r => r.pattern);
  const enableAutoExclusion = options?.enableAutoExclusion !== false;

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

    allRawFiles.push({
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

  if (!enableAutoExclusion) {
    return {
      files: allRawFiles,
      rootName,
      detectedExclusions: [],
      totalExcludedFiles: 0,
      allRawFiles,
    };
  }

  const { filteredFiles, detectedExclusions, totalSkipped } = filterFilesByExclusions(
    allRawFiles,
    excludedPatterns
  );

  return {
    files: filteredFiles,
    rootName,
    detectedExclusions,
    totalExcludedFiles: totalSkipped,
    allRawFiles,
  };
}

/**
 * Recursively scans files from HTML5 Drag and Drop DataTransferItem list,
 * automatically bypassing heavy folders (e.g. node_modules, .git) for browser performance.
 */
export async function readDroppedEntries(
  items: DataTransferItemList,
  options?: FolderReaderOptions
): Promise<FolderScanResult> {
  const fileEntries: { file: File; path: string }[] = [];
  const detectedExclusionsMap = new Map<string, { count: number; samplePath: string }>();
  let detectedRoot = '';

  const excludedPatterns =
    options?.excludedPatterns ||
    DEFAULT_EXCLUSION_RULES.filter(r => r.isDefault).map(r => r.pattern);
  const excludedSet = new Set(excludedPatterns.map(p => p.trim().toLowerCase()));
  const enableAutoExclusion = options?.enableAutoExclusion !== false;

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

      const dirName = entry.name;
      const matched = matchExcludedSegment([dirName], excludedSet);

      // If heavy folder like node_modules is detected and auto-exclusion is enabled,
      // skip deep traversal to prevent browser freezing!
      if (enableAutoExclusion && matched) {
        const fullDirPath = path ? `${path}/${dirName}` : dirName;
        // Count approximate direct child entries quickly
        let childCount = 0;
        try {
          const dirReader = entry.createReader();
          const batch: any[] = await new Promise((res, rej) => dirReader.readEntries(res, rej));
          childCount = batch.length;
        } catch {
          childCount = 1;
        }

        const curr = detectedExclusionsMap.get(matched) || { count: 0, samplePath: fullDirPath };
        curr.count += childCount || 1;
        detectedExclusionsMap.set(matched, curr);
        return; // Skip deep recursive traversal
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
    Object.defineProperty(item.file, 'webkitRelativePath', {
      value: item.path.replace(/^\/+/, ''),
      writable: false,
    });
    filesWithRelative.push(item.file);
  }

  const result = await processFileList(filesWithRelative, options);
  if (detectedRoot) {
    result.rootName = detectedRoot;
  }

  // Merge directory-level exclusions detected during drag-and-drop traversal
  for (const [name, data] of detectedExclusionsMap.entries()) {
    const existing = result.detectedExclusions.find(e => e.name === name);
    if (!existing) {
      const rule = DEFAULT_EXCLUSION_RULES.find(
        r => r.pattern.toLowerCase() === name.toLowerCase()
      );
      result.detectedExclusions.push({
        name,
        path: data.samplePath,
        fileCount: data.count,
        description: rule?.description || 'Heavy dependency or generated directory',
        category: rule?.category || 'dependencies',
      });
      result.totalExcludedFiles += data.count;
    }
  }

  return result;
}
