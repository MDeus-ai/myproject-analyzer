/**
 * Types for MyProject Analyzer
 */

export interface ProcessedFile {
  id: string;
  name: string;
  originalName: string;
  flattenedName: string;
  relativePath: string;
  pathSegments: string[];
  directoryPath: string;
  size: number;
  type: string;
  extension: string;
  lastModified: number;
  blob?: Blob;
  previewUrl?: string;
  textContent?: string;
}

export type CollisionStrategy = 'enumerate' | 'prefix-path' | 'overwrite';

export interface FolderNode {
  name: string;
  relativePath: string;
  depth: number;
  subfolders: Map<string, FolderNode>;
  files: ProcessedFile[];
  totalSize: number;
  totalFilesCount: number;
  totalFoldersCount: number;
}

export interface FolderAnalysisStats {
  rootName: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  maxDepth: number;
  extensionCounts: Record<string, { count: number; size: number }>;
  collisionCount: number;
  scannedAt: Date;
}

export interface PdfOptions {
  title: string;
  includeTree: boolean;
  includeStats: boolean;
  includeInventoryTable: boolean;
  includeSizes: boolean;
  includeDates: boolean;
  treeStyle: 'standard' | 'compact';
  themeColor: 'blue' | 'indigo' | 'emerald' | 'amber';
}
