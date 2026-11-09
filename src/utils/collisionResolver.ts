import { CollisionStrategy, ProcessedFile } from '../types';
import { getFileExtension } from './fileHelpers';

/**
 * Resolves flattened file names according to the selected collision strategy.
 */
export function resolveCollisions(
  files: ProcessedFile[],
  strategy: CollisionStrategy
): { resolvedFiles: ProcessedFile[]; collisionCount: number } {
  const nameCounts = new Map<string, number>();
  const resolvedFiles: ProcessedFile[] = [];
  let collisionCount = 0;

  // First pass: identify which original file names appear more than once
  const occurrences = new Map<string, number>();
  for (const f of files) {
    const lowerName = f.name.toLowerCase();
    occurrences.set(lowerName, (occurrences.get(lowerName) || 0) + 1);
  }

  for (const [, count] of occurrences.entries()) {
    if (count > 1) {
      collisionCount += count - 1;
    }
  }

  if (strategy === 'overwrite') {
    // Overwrite strategy: Keep the latest or subsequent occurrence with the exact name
    const seenMap = new Map<string, ProcessedFile>();
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      seenMap.set(lowerName, {
        ...file,
        flattenedName: file.name,
      });
    }
    return {
      resolvedFiles: Array.from(seenMap.values()),
      collisionCount,
    };
  }

  // Handle enumerate or prefix-path
  for (const file of files) {
    const originalName = file.name;
    const lowerName = originalName.toLowerCase();

    if (strategy === 'prefix-path') {
      const parts = file.relativePath.split(/[\\/]/).filter(Boolean);
      let prefixedName: string;
      if (parts.length > 1) {
        prefixedName = parts.join('_');
      } else {
        prefixedName = originalName;
      }

      // Check if even the prefixed name collides
      const prefixLower = prefixedName.toLowerCase();
      const currentCount = nameCounts.get(prefixLower) || 0;
      nameCounts.set(prefixLower, currentCount + 1);

      if (currentCount > 0) {
        const ext = getFileExtension(prefixedName);
        const base = ext
          ? prefixedName.slice(0, -(ext.length + 1))
          : prefixedName;
        prefixedName = ext ? `${base} (${currentCount}).${ext}` : `${base} (${currentCount})`;
      }

      resolvedFiles.push({
        ...file,
        flattenedName: prefixedName,
      });
    } else {
      // Default: enumerate strategy
      const currentCount = nameCounts.get(lowerName) || 0;
      nameCounts.set(lowerName, currentCount + 1);

      if (currentCount === 0) {
        resolvedFiles.push({
          ...file,
          flattenedName: originalName,
        });
      } else {
        const ext = getFileExtension(originalName);
        const base = ext
          ? originalName.slice(0, -(ext.length + 1))
          : originalName;
        const newName = ext ? `${base} (${currentCount}).${ext}` : `${base} (${currentCount})`;

        resolvedFiles.push({
          ...file,
          flattenedName: newName,
        });
      }
    }
  }

  return { resolvedFiles, collisionCount };
}
