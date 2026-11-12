import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  FileImage,
  File,
  Calendar,
  HardDrive,
  FolderTree,
} from "lucide-react";
import { ProcessedFile } from "@myproject/core/types";
import {
  formatBytes,
  formatDate,
  getFileCategory,
} from "@myproject/core/fileHelpers";
import { copyToClipboard } from "@myproject/core/clipboard";
import { getPlatform } from "@myproject/platform";
import { CodeSyntaxHighlighter } from "./CodeSyntaxHighlighter";

interface FilePreviewModalProps {
  file: ProcessedFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<
    string | undefined
  >(undefined);
  const [hydratedText, setHydratedText] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!file) {
      setResolvedPreviewUrl(undefined);
      setHydratedText(undefined);
      return;
    }

    const platform = getPlatform();
    const cat = getFileCategory(file.name, file.type);
    let createdUrl: string | undefined;

    if (cat === "image") {
      createdUrl = platform.createPreviewUrl?.(file) ?? file.previewUrl;
      setResolvedPreviewUrl(createdUrl);
    } else {
      setResolvedPreviewUrl(file.previewUrl);
    }

    setHydratedText(file.textContent);
    let cancelled = false;
    if (file.textContent === undefined && file.source?.kind === "path") {
      void platform.readText(file).then((text) => {
        if (!cancelled && text !== undefined) {
          setHydratedText(text);
        }
      });
    }

    return () => {
      cancelled = true;
      if (createdUrl && createdUrl !== file.previewUrl) {
        platform.revokePreviewUrl?.(createdUrl);
      }
    };
  }, [file]);

  if (!file) return null;

  const textToDisplay = hydratedText ?? file.textContent;

  const handleCopyContent = async () => {
    if (!textToDisplay) return;
    const succeeded = await copyToClipboard(textToDisplay);
    if (succeeded) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    const platform = getPlatform();
    const blob = file.source?.blob ?? file.blob;
    if (blob) {
      await platform.saveBlob(blob, file.flattenedName);
    } else if (textToDisplay !== undefined) {
      const textBlob = new Blob([textToDisplay], {
        type: file.type || "text/plain",
      });
      await platform.saveBlob(textBlob, file.flattenedName);
    }
  };

  const category = getFileCategory(file.name, file.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl surface-card border border-chrome rounded-2xl shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle surface-raised">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl icon-chip border shrink-0">
              {category === "image" ? (
                <FileImage className="w-5 h-5" />
              ) : category === "code" ? (
                <FileCode className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 text-sm truncate">
                {file.flattenedName}
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate">
                Original Path:{" "}
                <span className="text-slate-300">{file.relativePath}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {textToDisplay && (
              <button
                type="button"
                onClick={handleCopyContent}
                className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] border border-chrome text-slate-300 transition-colors"
                title="Copy file text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-ok" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleDownload()}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors shadow-sm"
              title="Download this file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata info cards */}
        <div className="grid grid-cols-3 gap-2 px-6 py-2.5 surface-inset border-b border-subtle text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">
              Size:{" "}
              <strong className="text-slate-200 font-mono">
                {formatBytes(file.size)}
              </strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              Modified:{" "}
              <strong className="text-slate-200 font-mono">
                {formatDate(file.lastModified).split(" ")[0]}
              </strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <FolderTree className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">
              Format:{" "}
              <strong className="text-slate-200 uppercase font-mono">
                {file.extension || "binary"}
              </strong>
            </span>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6">
          {category === "image" && resolvedPreviewUrl ? (
            <div className="flex items-center justify-center p-4 surface-inset rounded-xl border border-subtle">
              <img
                src={resolvedPreviewUrl}
                alt={file.name}
                className="max-h-96 max-w-full object-contain rounded-lg"
              />
            </div>
          ) : textToDisplay ? (
            <div className="code-well rounded-xl py-3 border border-subtle overflow-x-auto">
              <CodeSyntaxHighlighter
                code={textToDisplay}
                filePath={file.relativePath}
                showLineNumbers={true}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <File className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">
                Binary or large file
              </p>
              <p className="text-xs mt-1">
                Preview is not available for this format. You can download the
                stripped file directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

