import React, { useRef, useState } from "react";
import {
  FolderUp,
  FolderTree,
  FileArchive,
  FileText,
  Sparkles,
  ShieldAlert,
  Code2,
  FlaskConical,
} from "lucide-react";
import {
  readDroppedEntries,
  processFileList,
  ScanProgress,
} from "@myproject/core/folderReader";
import { FolderScanResult } from "@myproject/core/types";
import { SAMPLE_SCENARIOS, SampleScenarioId } from "@myproject/core/sampleProject";

interface FolderDropzoneProps {
  onScanResult: (result: FolderScanResult) => void;
  onLoadSample: () => void;
  onLoadSampleWithHeavyFolders?: () => void;
  onLoadScenario?: (id: SampleScenarioId) => void;
  onScanProgress?: (progress: ScanProgress | null) => void;
  isLoading?: boolean;
  /** Test scenarios are developer QA — rendered only behind ?dev=1. */
  showScenarios?: boolean;
}

export const FolderDropzone: React.FC<FolderDropzoneProps> = ({
  onScanResult,
  onLoadSample,
  onLoadSampleWithHeavyFolders,
  onLoadScenario,
  onScanProgress,
  isLoading,
  showScenarios,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string>("");
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
      try {
        const result = await readDroppedEntries(e.dataTransfer.items, {
          onProgress: (p) => onScanProgress?.(p),
        });
        if (
          result.files.length > 0 ||
          (result.allRawFiles && result.allRawFiles.length > 0)
        ) {
          onScanResult(result);
        } else {
          setErrorStatus("No readable files found in dropped item.");
        }
      } catch (err) {
        console.error("Error processing dropped folder:", err);
        setErrorStatus(
          "Failed to process folder. Try the folder browser button.",
        );
      } finally {
        onScanProgress?.(null);
        setTimeout(() => setErrorStatus(""), 3000);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      try {
        const result = await processFileList(e.dataTransfer.files, {
          onProgress: (p) => onScanProgress?.(p),
        });
        onScanResult(result);
      } finally {
        onScanProgress?.(null);
      }
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const result = await processFileList(e.target.files, {
          onProgress: (p) => onScanProgress?.(p),
        });
        onScanResult(result);
      } catch (err) {
        console.error("Error reading selected folder:", err);
        setErrorStatus("Error loading folder.");
      } finally {
        onScanProgress?.(null);
        e.target.value = "";
        setTimeout(() => setErrorStatus(""), 3000);
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
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-200 text-center cursor-pointer surface-card ${
          isDragOver
            ? "border-purple-400 bg-purple-500/10"
            : "border-chrome hover:border-purple-500/40"
        }`}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center max-w-xl mx-auto">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <FolderUp className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-purple-500 text-white shadow-sm">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mb-3">
            Drop your folder here
          </h2>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
            Drag &amp; drop any project folder. We automatically strip inner
            directories into flat files, generate a clean hierarchy PDF/image,
            and analyze codefiles.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <FolderUp className="w-4 h-4" />
              <span>Select Folder from Computer</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium text-sm transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>Try Clean Demo Project</span>
            </button>

            {onLoadSampleWithHeavyFolders && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSampleWithHeavyFolders();
                }}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium text-sm transition-all active:scale-95"
                title="Test how the software detects and warns about node_modules, .git, and dist"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Test node_modules Warning</span>
              </button>
            )}
          </div>

          {/* Error readout */}
          {errorStatus && (
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs mb-4">
              <span>{errorStatus}</span>
            </div>
          )}

          {/* Feature checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full text-left pt-6 border-t border-subtle">
            <div className="flex items-start space-x-2.5 p-2 rounded-lg surface-raised border border-subtle">
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

            <div className="flex items-start space-x-2.5 p-2 rounded-lg surface-raised border border-subtle">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Structure PDF &amp; Image
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight">
                  ASCII tree &amp; high-res image export.
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg surface-raised border border-subtle">
              <Code2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  CodeFile Analyzer
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight">
                  Location &amp; type metadata bundler.
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-warn-soft border border-warn">
              <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-semibold text-warn">
                  Auto-Excludes Heavy Folders
                </span>
                <span className="block text-[11px] text-warn opacity-75 leading-tight">
                  Detects node_modules &amp; warns before importing.
                </span>
              </div>
            </div>
          </div>

          {/* Test Scenarios — dev-only QA panel (?dev=1).
              Expected-results checklists come from the static SAMPLE_SCENARIOS
              list, so rendering these buttons never builds File objects
              (previously getScenarioProject ran per scenario per render,
              allocating the 600KB limits fixture on every drag-over flip). */}
          {onLoadScenario && showScenarios && (
            <div className="w-full pt-6 border-t border-subtle mt-6">
              <details className="group rounded-xl surface-raised border border-subtle text-left">
                <summary className="flex items-center space-x-2 p-3 cursor-pointer text-xs font-semibold text-cyan-300 list-none">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                  <span>Test Scenarios — verify all fixes end-to-end</span>
                  <span className="ml-auto text-slate-500 text-[10px] group-open:hidden">
                    expand ▾
                  </span>
                  <span className="ml-auto hidden text-slate-500 text-[10px] group-open:inline">
                    collapse ▴
                  </span>
                </summary>
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SAMPLE_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadScenario(scenario.id);
                      }}
                      title={`Expected results:\n• ${scenario.expected.join("\n• ")}`}
                      className="text-left p-2.5 rounded-lg surface-inset border border-subtle hover:border-cyan-500/40 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <span className="block text-[11px] font-semibold text-slate-200">
                        {scenario.label}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {scenario.verifies}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="px-3 pb-3 text-[10px] text-slate-500 leading-relaxed">
                  Each scenario loads a synthetic project through the exact same
                  scan pipeline as real folder imports (.gitignore parsing,
                  exclusions, secrets detection, text reading), so what you see
                  is what a real import would produce. Hover a button for the
                  expected results checklist.
                </p>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
