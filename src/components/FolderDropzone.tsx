import React, { useRef, useState } from 'react';
import {
  FolderUp,
  FolderTree,
  FileArchive,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { readDroppedEntries, processFileList } from '../utils/folderReader';
import { ProcessedFile } from '../types';

interface FolderDropzoneProps {
  onFilesLoaded: (files: ProcessedFile[], rootName: string) => void;
  onLoadSample: () => void;
  isLoading?: boolean;
}

export const FolderDropzone: React.FC<FolderDropzoneProps> = ({
  onFilesLoaded,
  onLoadSample,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setLoadingStatus('Scanning directories and reading files...');
      try {
        const { files, rootName } = await readDroppedEntries(e.dataTransfer.items);
        if (files.length > 0) {
          onFilesLoaded(files, rootName || 'imported-folder');
        } else {
          setLoadingStatus('No readable files found in dropped item.');
        }
      } catch (err) {
        console.error('Error processing dropped folder:', err);
        setLoadingStatus('Failed to process folder. Try the folder browser button.');
      } finally {
        setTimeout(() => setLoadingStatus(''), 2000);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setLoadingStatus('Processing files...');
      const { files, rootName } = await processFileList(e.dataTransfer.files);
      onFilesLoaded(files, rootName || 'imported-folder');
      setLoadingStatus('');
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoadingStatus('Analyzing folder tree...');
      try {
        const { files, rootName } = await processFileList(e.target.files);
        onFilesLoaded(files, rootName || 'selected-folder');
      } catch (err) {
        console.error('Error reading selected folder:', err);
        setLoadingStatus('Error loading folder.');
      } finally {
        setLoadingStatus('');
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Hidden WebKit directory input for folder selection */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in WebKit/Blink
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-200 text-center cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-500/10 scale-[1.01] shadow-2xl shadow-blue-500/20'
            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80 shadow-xl'
        }`}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center max-w-lg mx-auto">
          {/* Animated Icon Circle */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <FolderUp className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-emerald-500 text-white shadow-md">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Drop your folder here
          </h2>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
            Drag & drop any folder with nested subfolders. We will strip away all inner
            directories to extract pure flat files, and construct a beautiful structure PDF.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-8">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 hover:shadow-lg active:scale-95"
            >
              <FolderUp className="w-4 h-4" />
              <span>Select Folder from Computer</span>
            </button>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all hover:border-slate-600 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Try Demo Multi-Tier Project</span>
            </button>
          </div>

          {/* Status readout */}
          {loadingStatus && (
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs mb-4 animate-pulse">
              <span>{loadingStatus}</span>
            </div>
          )}

          {/* Feature checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-6 border-t border-slate-800/80">
            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60">
              <FileArchive className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Flat File Stripper
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight">
                  Removes all folder levels into pure flat files.
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Structure PDF
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight">
                  Ascii hierarchy tree & complete item inventory.
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Collision Resolver
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight">
                  Smart auto-renaming for duplicate file names.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
