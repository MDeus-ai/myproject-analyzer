import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  FileCode,
  FileImage,
  FileText as FileTextIcon,
  File,
  Search,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FolderNode, ProcessedFile } from "../types";
import { formatBytes, getFileCategory } from "../utils/fileHelpers";
import { generateTreeText } from "../utils/treeBuilder";
import { copyToClipboard } from "../utils/clipboard";

interface DirectoryTreeViewProps {
  rootNode: FolderNode;
  onSelectFile: (file: ProcessedFile) => void;
}

export const DirectoryTreeView: React.FC<DirectoryTreeViewProps> = ({
  rootNode,
  onSelectFile,
}) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTree, setCopiedTree] = useState(false);

  const toggleFolder = (path: string) => {
    const next = new Set(collapsedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setCollapsedPaths(next);
  };

  const expandAll = () => setCollapsedPaths(new Set());

  const collapseAll = () => {
    const allPaths = new Set<string>();
    function collectPaths(node: FolderNode) {
      if (node.relativePath) allPaths.add(node.relativePath);
      for (const sub of node.subfolders.values()) collectPaths(sub);
    }
    collectPaths(rootNode);
    setCollapsedPaths(allPaths);
  };

  const handleCopyAsciiTree = async () => {
    const text = generateTreeText(rootNode, { includeSizes: true });
    const succeeded = await copyToClipboard(text);
    if (succeeded) {
      setCopiedTree(true);
      setTimeout(() => setCopiedTree(false), 2000);
    }
  };

  const renderFileIcon = (file: ProcessedFile) => {
    const cat = getFileCategory(file.name, file.type);
    switch (cat) {
      case "code":
        return <FileCode className="w-3.5 h-3.5 text-sky-400" />;
      case "image":
        return <FileImage className="w-3.5 h-3.5 text-emerald-400" />;
      case "document":
        return <FileTextIcon className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <File className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const renderNode = (node: FolderNode, level: number = 0): React.ReactNode => {
    const isCollapsed = collapsedPaths.has(node.relativePath);
    const subfolderEntries = Array.from(node.subfolders.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div key={node.relativePath || node.name} className="select-none">
        {/* Folder row */}
        <div
          onClick={() => toggleFolder(node.relativePath)}
          style={{ paddingLeft: `${Math.max(level * 20, 8)}px` }}
          className="flex items-center space-x-2 py-1.5 px-2 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer text-slate-200 transition-colors group"
        >
          <button
            type="button"
            className="text-slate-400 group-hover:text-slate-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node.relativePath);
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isCollapsed ? (
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <FolderOpen className="w-4 h-4 text-amber-300 shrink-0" />
          )}

          <span className="font-semibold text-xs tracking-tight text-slate-100 font-mono">
            {node.name}/
          </span>

          <div className="flex items-center space-x-1.5 text-[10px] ml-auto">
            <span className="px-1.5 py-0.5 rounded surface-raised text-slate-400 font-mono border border-subtle">
              {node.totalFilesCount} files
            </span>
            <span className="px-1.5 py-0.5 rounded surface-raised text-blue-400 font-mono border border-subtle">
              {formatBytes(node.totalSize)}
            </span>
          </div>
        </div>

        {/* Children */}
        {!isCollapsed && (
          <div className="border-l border-subtle ml-3 sm:ml-4 pl-1">
            {subfolderEntries.map(([, subNode]) =>
              renderNode(subNode, level + 1),
            )}

            {files.map((file) => {
              const matchesSearch =
                !searchQuery ||
                file.name.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return null;

              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  style={{ paddingLeft: `${Math.max((level + 1) * 20, 8)}px` }}
                  className="flex items-center space-x-2 py-1 px-2 rounded-lg hover:bg-blue-500/10 cursor-pointer transition-colors text-slate-300 text-xs font-mono group"
                >
                  <span className="shrink-0">{renderFileIcon(file)}</span>
                  <span className="truncate group-hover:text-blue-300 transition-colors font-sans font-medium">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    {formatBytes(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] text-slate-100">
      {/* Single consolidated toolbar */}
      <div className="surface-header border-b border-chrome px-4 sm:px-5 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="leading-tight mr-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Folder Hierarchy
            </h2>
            <span className="px-1.5 py-0.5 rounded-full surface-raised border border-subtle text-slate-400 text-[10px] font-mono">
              {rootNode.totalFoldersCount} directories
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Full nested tree exactly as organized on disk.
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Highlight file in hierarchy..."
            className="w-full pl-8 pr-3 py-1.5 surface-inset rounded-lg border border-subtle text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1.5 ml-auto text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-300 border border-chrome"
            title="Expand all directories"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expand</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-300 border border-chrome"
            title="Collapse all directories"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Collapse</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAsciiTree}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-all active:scale-95"
            title="Copy formatted Unicode tree structure to clipboard"
          >
            {copiedTree ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Tree</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tree Visual Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto surface-card rounded-2xl border border-chrome p-4 sm:p-6 shadow-lg">
          {renderNode(rootNode, 0)}
        </div>
      </div>
    </div>
  );
};
