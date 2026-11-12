import { FolderAnalysisStats, FolderNode, ProcessedFile } from "@myproject/core/types";
import { formatBytes, getFileExtension } from "@myproject/core/fileHelpers";

/**
 * Builds a hierarchical FolderNode tree from a flat list of ProcessedFiles.
 */
export function buildFolderTree(
  files: ProcessedFile[],
  rootFolderName: string = "root",
): { root: FolderNode; stats: FolderAnalysisStats } {
  const root: FolderNode = {
    name: rootFolderName,
    relativePath: "",
    depth: 0,
    subfolders: new Map<string, FolderNode>(),
    files: [],
    totalSize: 0,
    totalFilesCount: 0,
    totalFoldersCount: 0,
  };

  const extensionCounts: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;
  let maxDepth = 0;
  const uniqueFolderPaths = new Set<string>();

  for (const file of files) {
    totalSize += file.size;

    // Track extension statistics
    const ext = (file.extension || "no-ext").toLowerCase();
    if (!extensionCounts[ext]) {
      extensionCounts[ext] = { count: 0, size: 0 };
    }
    extensionCounts[ext].count += 1;
    extensionCounts[ext].size += file.size;

    // Split relative path into directory segments
    let cleanPath = file.relativePath
      .replace(/^[\\/]+/, "")
      .replace(/\\/g, "/");
    if (cleanPath.startsWith(rootFolderName + "/")) {
      cleanPath = cleanPath.slice(rootFolderName.length + 1);
    }

    const segments = cleanPath.split("/").filter(Boolean);
    const filename = segments.pop() || file.name;

    let currentNode = root;
    let accumulatedPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
      uniqueFolderPaths.add(accumulatedPath);

      const currentDepth = i + 1;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }

      let subNode = currentNode.subfolders.get(seg);
      if (!subNode) {
        subNode = {
          name: seg,
          relativePath: accumulatedPath,
          depth: currentDepth,
          subfolders: new Map<string, FolderNode>(),
          files: [],
          totalSize: 0,
          totalFilesCount: 0,
          totalFoldersCount: 0,
        };
        currentNode.subfolders.set(seg, subNode);
      }
      currentNode = subNode;
    }

    currentNode.files.push(file);
  }

  // Calculate aggregated totals recursively
  function aggregateNode(node: FolderNode): void {
    let size = 0;
    let filesCount = node.files.length;
    let foldersCount = node.subfolders.size;

    for (const file of node.files) {
      size += file.size;
    }

    for (const sub of node.subfolders.values()) {
      aggregateNode(sub);
      size += sub.totalSize;
      filesCount += sub.totalFilesCount;
      foldersCount += sub.totalFoldersCount;
    }

    node.totalSize = size;
    node.totalFilesCount = filesCount;
    node.totalFoldersCount = foldersCount;
  }

  aggregateNode(root);

  const stats: FolderAnalysisStats = {
    rootName: rootFolderName,
    totalFiles: files.length,
    totalFolders: uniqueFolderPaths.size,
    totalSize,
    maxDepth,
    extensionCounts,
    collisionCount: 0,
    scannedAt: new Date(),
  };

  return { root, stats };
}

/**
 * A single structured row of the directory tree, used by renderers that want
 * precise control over connectors, colors and alignment (e.g. the vector PDF
 * architect). Producing the rows structurally avoids re-parsing connector
 * characters out of a pre-rendered text tree.
 */
export interface TreeRow {
  /** 0 = root, 1 = root's direct children, etc. */
  depth: number;
  /** Whether this row is the last entry of its parent. */
  isLast: boolean;
  /**
   * Vertical-guide continuity per ancestor level (length = depth - 1).
   * guides[i] === true means the ancestor at level i has more siblings
   * following, so a vertical line should pass through this row at that level.
   */
  guides: boolean[];
  /** Display name. Directory names end with '/'. */
  name: string;
  isDirectory: boolean;
  size: number;
  isRoot: boolean;
}

/**
 * Flattens the folder hierarchy into ordered, structured rows describing each
 * tree entry and its connector lineage. Renderers can draw perfect vector
 * guides from this without guessing from text characters.
 */
export function generateTreeRows(
  node: FolderNode,
  options: { includeFiles?: boolean } = {},
): TreeRow[] {
  const { includeFiles = true } = options;
  const rows: TreeRow[] = [];

  rows.push({
    depth: 0,
    isLast: true,
    guides: [],
    name: `${node.name}/`,
    isDirectory: true,
    size: node.totalSize,
    isRoot: true,
  });

  function traverse(
    currentNode: FolderNode,
    guides: boolean[],
    depth: number,
  ): void {
    const subfolderEntries = Array.from(currentNode.subfolders.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const fileEntries = includeFiles
      ? [...currentNode.files].sort((a, b) => a.name.localeCompare(b.name))
      : [];

    const totalEntries = subfolderEntries.length + fileEntries.length;
    let index = 0;

    for (const [, subNode] of subfolderEntries) {
      index++;
      const isLast = index === totalEntries;
      rows.push({
        depth,
        isLast,
        guides: [...guides],
        name: `${subNode.name}/`,
        isDirectory: true,
        size: subNode.totalSize,
        isRoot: false,
      });
      traverse(subNode, [...guides, !isLast], depth + 1);
    }

    for (const file of fileEntries) {
      index++;
      const isLast = index === totalEntries;
      rows.push({
        depth,
        isLast,
        guides: [...guides],
        name: file.name,
        isDirectory: false,
        size: file.size,
        isRoot: false,
      });
    }
  }

  traverse(node, [], 1);
  return rows;
}

/**
 * Generates an ASCII or Unicode tree string representing the directory structure.
 * Using 'ascii' ensures 100% compatibility with standard PDF fonts without encoding corruption.
 */
export function generateTreeText(
  node: FolderNode,
  options: {
    includeSizes?: boolean;
    includeFiles?: boolean;
    style?: "unicode" | "ascii";
  } = {},
): string {
  const {
    includeSizes = true,
    includeFiles = true,
    style = "unicode",
  } = options;
  const lines: string[] = [];

  // Root header
  lines.push(`${node.name}/`);

  const isAscii = style === "ascii";
  const lastConnector = isAscii ? "\\-- " : "└── ";
  const midConnector = isAscii ? "|-- " : "├── ";
  const openIndent = isAscii ? "|   " : "│   ";
  const closedIndent = "    ";

  function traverse(currentNode: FolderNode, prefix: string): void {
    const subfolderEntries = Array.from(currentNode.subfolders.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const fileEntries = includeFiles
      ? [...currentNode.files].sort((a, b) => a.name.localeCompare(b.name))
      : [];

    const totalEntries = subfolderEntries.length + fileEntries.length;
    let index = 0;

    // First list subfolders
    for (const [, subNode] of subfolderEntries) {
      index++;
      const isLast = index === totalEntries;
      const connector = isLast ? lastConnector : midConnector;
      const sizeStr = includeSizes
        ? ` (${formatBytes(subNode.totalSize)})`
        : "";
      lines.push(`${prefix}${connector}${subNode.name}/${sizeStr}`);

      const childPrefix = prefix + (isLast ? closedIndent : openIndent);
      traverse(subNode, childPrefix);
    }

    // Then list files in current directory
    for (const file of fileEntries) {
      index++;
      const isLast = index === totalEntries;
      const connector = isLast ? lastConnector : midConnector;
      const sizeStr = includeSizes ? ` (${formatBytes(file.size)})` : "";
      lines.push(`${prefix}${connector}${file.name}${sizeStr}`);
    }
  }

  traverse(node, "");
  return lines.join("\n");
}

/**
 * Flattens the tree into an ordered list of directory entries for table printing.
 */
export function flattenDirectoryInventory(root: FolderNode): Array<{
  index: number;
  directory: string;
  filename: string;
  size: number;
  extension: string;
  lastModified: number;
}> {
  const result: Array<{
    index: number;
    directory: string;
    filename: string;
    size: number;
    extension: string;
    lastModified: number;
  }> = [];

  let counter = 1;

  function walk(node: FolderNode, currentPath: string): void {
    const sortedFiles = [...node.files].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const file of sortedFiles) {
      result.push({
        index: counter++,
        directory: currentPath || "/",
        filename: file.name,
        size: file.size,
        extension: file.extension || getFileExtension(file.name) || "-",
        lastModified: file.lastModified,
      });
    }

    const sortedFolders = Array.from(node.subfolders.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const sub of sortedFolders) {
      walk(sub, currentPath ? `${currentPath}/${sub.name}` : sub.name);
    }
  }

  walk(root, "");
  return result;
}
