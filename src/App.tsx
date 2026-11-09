/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DesktopHeader } from './components/DesktopHeader';
import { FolderDropzone } from './components/FolderDropzone';
import { FlatFilesView } from './components/FlatFilesView';
import { DirectoryTreeView } from './components/DirectoryTreeView';
import { PdfArchitectView } from './components/PdfArchitectView';
import { AnalyticsView } from './components/AnalyticsView';
import { CodeAnalyzerView } from './components/CodeAnalyzerView';
import { FilePreviewModal } from './components/FilePreviewModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';

import {
  CollisionStrategy,
  FolderAnalysisStats,
  FolderNode,
  ProcessedFile,
} from './types';
import { buildFolderTree } from './utils/treeBuilder';
import { resolveCollisions } from './utils/collisionResolver';
import { createFlatZip, triggerFileDownload, ZipProgress } from './utils/zipExporter';
import { generateFolderPdf, downloadPdf } from './utils/pdfGenerator';
import { getSampleProjectFiles } from './utils/sampleProject';
import { processFileList } from './utils/folderReader';

export default function App() {
  const [rawFiles, setRawFiles] = useState<ProcessedFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>('');
  const [collisionStrategy, setCollisionStrategy] = useState<CollisionStrategy>('enumerate');
  const [activeTab, setActiveTab] = useState<'files' | 'tree' | 'pdf' | 'analytics' | 'analyzer'>('files');

  // Preview & Modal states
  const [previewFile, setPreviewFile] = useState<ProcessedFile | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Zipping progress
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | undefined>();

  // Hidden folder input ref
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Compute resolved flattened files based on selected collision strategy
  const { resolvedFiles, collisionCount } = useMemo(() => {
    if (rawFiles.length === 0) {
      return { resolvedFiles: [], collisionCount: 0 };
    }
    return resolveCollisions(rawFiles, collisionStrategy);
  }, [rawFiles, collisionStrategy]);

  // Compute folder hierarchy tree and statistics
  const { rootNode, stats } = useMemo(() => {
    if (resolvedFiles.length === 0) {
      return { rootNode: null, stats: null };
    }
    const tree = buildFolderTree(rawFiles, rootFolderName || 'folder');
    return {
      rootNode: tree.root,
      stats: {
        ...tree.stats,
        collisionCount,
      },
    };
  }, [rawFiles, resolvedFiles, rootFolderName, collisionCount]);

  // Handle files loaded from picker or drag-drop
  const handleFilesLoaded = useCallback((files: ProcessedFile[], folderName: string) => {
    setRawFiles(files);
    setRootFolderName(folderName);
    setActiveTab('files');
  }, []);

  // Load sample demo project
  const handleLoadSample = useCallback(() => {
    const sampleFiles = getSampleProjectFiles();
    handleFilesLoaded(sampleFiles, 'acme-saas-platform');
  }, [handleFilesLoaded]);

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && rawFiles.length === 0) {
      handleLoadSample();
    }
  }, [handleLoadSample, rawFiles.length]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts inside text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        folderInputRef.current?.click();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (resolvedFiles.length > 0 && !isZipping) {
          handleDownloadZip();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (rootNode && stats) {
          handleDownloadPdfDirect();
        }
      } else if (e.key === 'Escape') {
        setPreviewFile(null);
        setIsHelpOpen(false);
      } else if (e.key === '1') {
        setActiveTab('files');
      } else if (e.key === '2') {
        setActiveTab('tree');
      } else if (e.key === '3') {
        setActiveTab('pdf');
      } else if (e.key === '4') {
        setActiveTab('analytics');
      } else if (e.key === '5') {
        setActiveTab('analyzer');
      } else if (e.key === '?') {
        setIsHelpOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Download all stripped files as a flat ZIP archive
  const handleDownloadZip = async () => {
    if (resolvedFiles.length === 0 || isZipping) return;

    setIsZipping(true);
    setZipProgress({ percent: 0, currentFile: 'Initializing flat archive...' });

    try {
      const zipBlob = await createFlatZip(resolvedFiles, progress => {
        setZipProgress(progress);
      });

      const safeName = (rootFolderName || 'flattened_files').replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(zipBlob, `${safeName}_flat_files.zip`);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsZipping(false);
      setZipProgress(undefined);
    }
  };

  // Direct PDF download trigger
  const handleDownloadPdfDirect = () => {
    if (!rootNode || !stats) return;
    const doc = generateFolderPdf(rootNode, stats, resolvedFiles, {
      title: `Directory Structure: ${stats.rootName}`,
      includeTree: true,
      includeStats: true,
      includeInventoryTable: true,
      includeSizes: true,
      includeDates: true,
      treeStyle: 'standard',
      themeColor: 'blue',
    });
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = stats.rootName.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadPdf(doc, `${safeName}_structure_${dateStr}.pdf`);
  };

  const handleFolderPickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const { files, rootName } = await processFileList(e.target.files);
      handleFilesLoaded(files, rootName);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Hidden WebKit folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in WebKit/Blink
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFolderPickerChange}
      />

      {/* Top Desktop Application Header */}
      <DesktopHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenFolderClick={() => folderInputRef.current?.click()}
        onLoadSampleClick={handleLoadSample}
        onDownloadZipClick={handleDownloadZip}
        onDownloadPdfClick={handleDownloadPdfDirect}
        onDownloadImageClick={() => setActiveTab('pdf')}
        onHelpClick={() => setIsHelpOpen(true)}
        isZipping={isZipping}
      />

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {resolvedFiles.length === 0 ? (
          /* Empty / Initial State: Folder Dropzone */
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
            <FolderDropzone
              onFilesLoaded={handleFilesLoaded}
              onLoadSample={handleLoadSample}
            />
          </div>
        ) : (
          /* Loaded Folder Views */
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'files' && (
              <FlatFilesView
                files={resolvedFiles}
                collisionStrategy={collisionStrategy}
                onStrategyChange={setCollisionStrategy}
                collisionCount={collisionCount}
                onPreviewFile={setPreviewFile}
                onDownloadAllZip={handleDownloadZip}
                isZipping={isZipping}
                zipProgress={zipProgress}
                onOpenAnotherFolder={() => folderInputRef.current?.click()}
              />
            )}

            {activeTab === 'tree' && rootNode && (
              <DirectoryTreeView
                rootNode={rootNode}
                onSelectFile={setPreviewFile}
              />
            )}

            {activeTab === 'pdf' && rootNode && stats && (
              <PdfArchitectView
                rootNode={rootNode}
                stats={stats}
                files={resolvedFiles}
              />
            )}

            {activeTab === 'analytics' && stats && (
              <AnalyticsView
                stats={stats}
                files={resolvedFiles}
                collisionCount={collisionCount}
              />
            )}

            {activeTab === 'analyzer' && (
              <CodeAnalyzerView
                files={rawFiles}
                rootFolderName={rootFolderName}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <HelpShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
