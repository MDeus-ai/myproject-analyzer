import { ProcessedFile } from '../types';

export interface ExcludedFolderRule {
  pattern: string;
  description: string;
  category: 'dependencies' | 'vcs' | 'build' | 'cache' | 'env';
  isDefault: boolean;
}

export interface ExcludedFolderInfo {
  name: string;
  path: string;
  fileCount: number;
  description: string;
  category: 'dependencies' | 'vcs' | 'build' | 'cache' | 'env';
}

/**
 * Standard list of common heavy / generated folders that clutter projects.
 */
export const DEFAULT_EXCLUSION_RULES: ExcludedFolderRule[] = [
  {
    pattern: 'node_modules',
    description: 'Node.js dependency packages (often 10,000+ files)',
    category: 'dependencies',
    isDefault: true,
  },
  {
    pattern: '.git',
    description: 'Git version control internal database & pack files',
    category: 'vcs',
    isDefault: true,
  },
  {
    pattern: 'dist',
    description: 'Compiled distribution build artifacts',
    category: 'build',
    isDefault: true,
  },
  {
    pattern: 'build',
    description: 'Application production build directory',
    category: 'build',
    isDefault: true,
  },
  {
    pattern: 'out',
    description: 'Framework build output directory',
    category: 'build',
    isDefault: true,
  },
  {
    pattern: '.output',
    description: 'Nuxt/Nitro server build output',
    category: 'build',
    isDefault: true,
  },
  {
    pattern: '.next',
    description: 'Next.js compiler cache and production build bundles',
    category: 'cache',
    isDefault: true,
  },
  {
    pattern: '.nuxt',
    description: 'Nuxt.js build cache',
    category: 'cache',
    isDefault: true,
  },
  {
    pattern: '.turbo',
    description: 'Turborepo task and artifact cache',
    category: 'cache',
    isDefault: true,
  },
  {
    pattern: '.cache',
    description: 'General framework / tool cache directory',
    category: 'cache',
    isDefault: true,
  },
  {
    pattern: '__pycache__',
    description: 'Python compiled bytecode (.pyc)',
    category: 'cache',
    isDefault: true,
  },
  {
    pattern: '.venv',
    description: 'Python virtual environment directory',
    category: 'env',
    isDefault: true,
  },
  {
    pattern: 'venv',
    description: 'Python virtual environment directory',
    category: 'env',
    isDefault: true,
  },
  {
    pattern: 'vendor',
    description: 'PHP Composer or Go third-party vendor libraries',
    category: 'dependencies',
    isDefault: true,
  },
  {
    pattern: 'target',
    description: 'Rust Cargo or Java Maven/Gradle build directory',
    category: 'build',
    isDefault: true,
  },
];

/**
 * Checks if a relative path or its segments intersect with any excluded folder patterns.
 */
export function matchExcludedSegment(
  pathSegments: string[],
  excludedSet: Set<string>
): string | null {
  for (const segment of pathSegments) {
    const cleanSegment = segment.trim().toLowerCase();
    if (excludedSet.has(cleanSegment)) {
      return segment;
    }
  }
  return null;
}

/**
 * Filters a list of processed files and identifies which folders were excluded and how many files were skipped.
 */
export function filterFilesByExclusions(
  files: ProcessedFile[],
  excludedPatterns: string[]
): {
  filteredFiles: ProcessedFile[];
  detectedExclusions: ExcludedFolderInfo[];
  totalSkipped: number;
} {
  const excludedSet = new Set(excludedPatterns.map(p => p.trim().toLowerCase()));
  const filteredFiles: ProcessedFile[] = [];
  const excludedFolderStats = new Map<string, { count: number; samplePath: string }>();

  for (const file of files) {
    const segments = file.pathSegments || file.relativePath.split(/[\\/]/).filter(Boolean);
    const matched = matchExcludedSegment(segments, excludedSet);

    if (matched) {
      const current = excludedFolderStats.get(matched) || { count: 0, samplePath: file.relativePath };
      current.count += 1;
      excludedFolderStats.set(matched, current);
    } else {
      filteredFiles.push(file);
    }
  }

  const detectedExclusions: ExcludedFolderInfo[] = [];
  let totalSkipped = 0;

  for (const [name, data] of excludedFolderStats.entries()) {
    const rule = DEFAULT_EXCLUSION_RULES.find(
      r => r.pattern.toLowerCase() === name.toLowerCase()
    );
    detectedExclusions.push({
      name,
      path: data.samplePath,
      fileCount: data.count,
      description: rule?.description || 'Heavy dependency or generated directory',
      category: rule?.category || 'dependencies',
    });
    totalSkipped += data.count;
  }

  // Sort descending by skipped count
  detectedExclusions.sort((a, b) => b.fileCount - a.fileCount);

  return {
    filteredFiles,
    detectedExclusions,
    totalSkipped,
  };
}
