import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Download,
  Settings2,
  RefreshCw,
  Palette,
  Eye,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ImageIcon,
  Type,
} from "lucide-react";
import {
  FolderAnalysisStats,
  FolderNode,
  PdfOptions,
  PdfTreeFont,
  ProcessedFile,
} from "../types";
import {
  generateFolderPdf,
  getPdfBlobUrl,
  downloadPdf,
} from "../utils/pdfGenerator";
import { formatBytes, formatDate } from "../utils/fileHelpers";
import {
  generateTreeText,
  flattenDirectoryInventory,
} from "../utils/treeBuilder";
import { downloadElementAsImage } from "../utils/imageExporter";
import { PdfCanvasViewer } from "./PdfCanvasViewer";

interface PdfArchitectViewProps {
  rootNode: FolderNode;
  stats: FolderAnalysisStats;
  files: ProcessedFile[];
}

const PDF_REGEN_DEBOUNCE_MS = 350;

/** Sheet-view equivalents of the PDF font choices (fonts available in the app). */
const SHEET_FONT_MAP: Record<PdfTreeFont, string> = {
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
  serif: 'Georgia, "Times New Roman", Times, serif',
};

const TREE_FONT_OPTIONS: { id: PdfTreeFont; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "mono", label: "Mono" },
  { id: "serif", label: "Serif" },
];

export const PdfArchitectView: React.FC<PdfArchitectViewProps> = ({
  rootNode,
  stats,
  files,
}) => {
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    title: `Directory Structure: ${stats.rootName}`,
    includeTree: true,
    includeStats: true,
    includeInventoryTable: true,
    includeSizes: true,
    includeDates: true,
    treeStyle: "standard",
    themeColor: "blue",
    treeFont: "sans",
    treeFontSize: 9.5,
  });

  const [previewMode, setPreviewMode] = useState<"sheet" | "native">("sheet");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfMeta, setPdfMeta] = useState<{
    pages: number;
    sizeKb: number;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const currentBlobUrlRef = useRef<string | null>(null);
  const documentSheetRef = useRef<HTMLDivElement>(null);

  // Generate the real PDF (blob URL for "open in new tab" + bytes for the canvas viewer).
  const refreshPdf = useCallback(() => {
    setIsGenerating(true);
    try {
      const doc = generateFolderPdf(rootNode, stats, files, pdfOptions);
      const url = getPdfBlobUrl(doc);
      const buffer = doc.output("arraybuffer");

      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
      currentBlobUrlRef.current = url;
      setPreviewUrl(url);
      setPdfData(buffer);
      setPdfMeta({
        pages: doc.getNumberOfPages(),
        sizeKb: Math.max(1, Math.round(buffer.byteLength / 1024)),
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [rootNode, stats, files, pdfOptions]);

  // Debounce regeneration so typing in the settings panel doesn't rebuild
  // the whole document (and re-render every page) on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(refreshPdf, PDF_REGEN_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [refreshPdf]);

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
    };
  }, []);

  const handleDownloadPdf = () => {
    const doc = generateFolderPdf(rootNode, stats, files, pdfOptions);
    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = stats.rootName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadPdf(doc, `${safeName}_structure_${dateStr}.pdf`);
  };

  const handleDownloadImage = async (format: "png" | "jpeg" = "png") => {
    if (isExportingImage) return;

    // The image is rendered from the sheet DOM node — switch to sheet view
    // first if the user exports from the PDF viewer.
    if (previewMode !== "sheet" || !documentSheetRef.current) {
      setPreviewMode("sheet");
      window.setTimeout(() => {
        void handleDownloadImage(format);
      }, 150);
      return;
    }

    setIsExportingImage(true);
    const element = documentSheetRef.current;
    const originalTransform = element.style.transform;
    try {
      element.style.transform = "none";
      const dateStr = new Date().toISOString().split("T")[0];
      const safeName = stats.rootName.replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadElementAsImage(
        element,
        `${safeName}_structure_${dateStr}.${format}`,
        format,
      );
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      element.style.transform = originalTransform;
      setIsExportingImage(false);
    }
  };

  // Mode-aware zoom bounds: the PDF viewer re-renders canvases at any scale,
  // while the sheet scales via CSS transform.
  const minZoom = previewMode === "native" ? 50 : 70;
  const maxZoom = previewMode === "native" ? 200 : 130;

  useEffect(() => {
    setZoomLevel((z) => Math.min(Math.max(z, minZoom), maxZoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode]);

  const zoomIn = () => setZoomLevel((z) => Math.min(maxZoom, z + 10));
  const zoomOut = () => setZoomLevel((z) => Math.max(minZoom, z - 10));
  const resetZoom = () => setZoomLevel(100);

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Pre-generate data for the live Sheet View
  const treeText = useMemo(() => {
    return generateTreeText(rootNode, {
      includeSizes: pdfOptions.includeSizes,
      includeFiles: true,
      style: "unicode",
    });
  }, [rootNode, pdfOptions.includeSizes]);

  const inventory = useMemo(() => {
    return flattenDirectoryInventory(rootNode);
  }, [rootNode]);

  /** Accent colors for the PDF document itself (rendered on the protected
   *  white sheet, so they stay document accents — not UI chrome). */
  const themeColors = {
    blue: { headerBg: "#2563eb" },
    indigo: { headerBg: "#4f46e5" },
    emerald: { headerBg: "#059669" },
    amber: { headerBg: "#d97706" },
  }[pdfOptions.themeColor];

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[var(--app-bg)] text-slate-100 overflow-hidden">
      {/* Settings / Configuration Sidebar */}
      <div className="w-full lg:w-96 max-h-[55dvh] lg:max-h-none surface-card border-b lg:border-b-0 lg:border-r border-chrome flex flex-col shrink-0">
        <div className="p-4 sm:p-5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg icon-chip border">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                PDF & Image Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure layout, sections & export
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshPdf}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--surface-hover)] transition-colors"
            title="Refresh preview"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* Document Title */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Document Header Title
            </label>
            <input
              type="text"
              value={pdfOptions.title}
              onChange={(e) =>
                setPdfOptions((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-1.5 surface-inset rounded-xl border border-subtle text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block text-slate-300 font-medium mb-2 flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <span>Document Accent Color</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "blue", label: "Blue", color: "bg-blue-600" },
                { id: "indigo", label: "Indigo", color: "bg-indigo-600" },
                { id: "emerald", label: "Emerald", color: "bg-emerald-600" },
                { id: "amber", label: "Amber", color: "bg-amber-600" },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() =>
                    setPdfOptions((prev) => ({
                      ...prev,
                      themeColor: th.id as any,
                    }))
                  }
                  className={`flex items-center space-x-1.5 p-2 rounded-xl border transition-all ${
                    pdfOptions.themeColor === th.id
                      ? "chip-accent shadow-sm"
                      : "border-subtle surface-inset hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${th.color} shrink-0`}
                  />
                  <span className="text-[11px] font-medium text-slate-300">
                    {th.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-3 pt-2 border-t border-subtle">
            <span className="block text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>Tree Typography</span>
            </span>

            {/* Font family — selected chip follows the active theme palette
                and stays readable in light mode (chip-accent helper). */}
            <div className="grid grid-cols-3 gap-2">
              {TREE_FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() =>
                    setPdfOptions((prev) => ({ ...prev, treeFont: font.id }))
                  }
                  className={`p-2 rounded-xl border text-center transition-all ${
                    pdfOptions.treeFont === font.id
                      ? "chip-accent font-semibold"
                      : "border-subtle surface-inset text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="block text-sm leading-tight"
                    style={{ fontFamily: SHEET_FONT_MAP[font.id] }}
                  >
                    Ag
                  </span>
                  <span className="block text-[10px] mt-0.5">{font.label}</span>
                </button>
              ))}
            </div>

            {/* Font size */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-300 font-medium">Font Size</span>
                <span className="font-mono text-[11px] text-accent">
                  {pdfOptions.treeFontSize.toFixed(1)} pt
                </span>
              </div>
              <input
                type="range"
                min={7}
                max={14}
                step={0.5}
                value={pdfOptions.treeFontSize}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    treeFontSize: Number(e.target.value),
                  }))
                }
                aria-label="Tree font size in points"
                className="w-full h-1.5 rounded-full bg-[var(--surface-raised)] slider-accent cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>7 pt</span>
                <span>14 pt</span>
              </div>
            </div>
          </div>

          {/* Section Toggles */}
          <div className="space-y-3 pt-2 border-t border-subtle">
            <span className="block text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Sections to Include
            </span>

            <label className="flex items-center justify-between p-2.5 rounded-xl surface-inset border border-subtle cursor-pointer hover:bg-[var(--surface-hover)]">
              <div>
                <span className="block font-medium text-slate-200">
                  Folder Summary Cards
                </span>
                <span className="block text-[11px] text-slate-400">
                  Total items, sizes, depth, and timestamps
                </span>
              </div>
              <input
                type="checkbox"
                checked={pdfOptions.includeStats}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    includeStats: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl surface-inset border border-subtle cursor-pointer hover:bg-[var(--surface-hover)]">
              <div>
                <span className="block font-medium text-slate-200">
                  Visual Hierarchy Tree
                </span>
                <span className="block text-[11px] text-slate-400">
                  Vector branch guides with color-coded directories
                </span>
              </div>
              <input
                type="checkbox"
                checked={pdfOptions.includeTree}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    includeTree: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl surface-inset border border-subtle cursor-pointer hover:bg-[var(--surface-hover)]">
              <div>
                <span className="block font-medium text-slate-200">
                  Complete File Inventory Table
                </span>
                <span className="block text-[11px] text-slate-400">
                  Structured directory-by-directory inventory
                </span>
              </div>
              <input
                type="checkbox"
                checked={pdfOptions.includeInventoryTable}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    includeInventoryTable: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Details Options */}
          <div className="space-y-3 pt-2 border-t border-subtle">
            <span className="block text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Data Columns
            </span>

            <label className="flex items-center justify-between p-2 rounded-xl surface-inset border border-subtle cursor-pointer">
              <span className="text-slate-300">Show File Sizes</span>
              <input
                type="checkbox"
                checked={pdfOptions.includeSizes}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    includeSizes: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl surface-inset border border-subtle cursor-pointer">
              <span className="text-slate-300">Show Modification Dates</span>
              <input
                type="checkbox"
                checked={pdfOptions.includeDates}
                onChange={(e) =>
                  setPdfOptions((prev) => ({
                    ...prev,
                    includeDates: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-700 bg-transparent text-purple-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Tree Style */}
          <div className="pt-2 border-t border-subtle">
            <label className="block text-slate-300 font-medium mb-1.5">
              Tree Row Density
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setPdfOptions((prev) => ({ ...prev, treeStyle: "standard" }))
                }
                className={`p-2 rounded-xl border text-center transition-all ${
                  pdfOptions.treeStyle === "standard"
                    ? "chip-accent font-semibold"
                    : "border-subtle surface-inset text-slate-400 hover:text-slate-200"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() =>
                  setPdfOptions((prev) => ({ ...prev, treeStyle: "compact" }))
                }
                className={`p-2 rounded-xl border text-center transition-all ${
                  pdfOptions.treeStyle === "compact"
                    ? "chip-accent font-semibold"
                    : "border-subtle surface-inset text-slate-400 hover:text-slate-200"
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons in sidebar */}
        <div className="p-4 border-t border-subtle surface-card space-y-2">
          <button
            type="button"
            onClick={() => handleDownloadImage("png")}
            disabled={isExportingImage}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium text-xs transition-all active:scale-98 disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" />
            <span>
              {isExportingImage
                ? "Generating PNG..."
                : "Download as Image (PNG)"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Document</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col bg-[var(--app-bg)] overflow-hidden">
        {/* Preview Toolbar */}
        <div className="px-6 py-3 border-b border-subtle flex flex-wrap gap-2 items-center justify-between surface-header">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-200">
                Structure Document Preview
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center surface-inset rounded-lg p-0.5 border border-subtle text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode("sheet")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  previewMode === "sheet"
                    ? "surface-raised text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Page Sheet View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("native")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  previewMode === "native"
                    ? "surface-raised text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                PDF Viewer
              </button>
            </div>

            {/* PDF metadata pill */}
            {previewMode === "native" && pdfMeta && (
              <span className="hidden md:inline-flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 px-2.5 py-1 rounded-lg surface-inset border border-subtle">
                <span>
                  {pdfMeta.pages} page{pdfMeta.pages !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-600">•</span>
                <span>{pdfMeta.sizeKb} KB</span>
                <span className="text-slate-600">•</span>
                <span className="text-ok">A4 Vector</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom controls — sheet scales via CSS, PDF viewer re-renders canvases */}
            <div className="flex items-center space-x-1 surface-raised px-2 py-1 rounded-lg border border-chrome text-xs">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomLevel <= minZoom}
                className="p-0.5 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="font-mono text-[11px] text-slate-300 px-1 hover:text-white transition-colors"
                title="Reset zoom to 100%"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomLevel >= maxZoom}
                className="p-0.5 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Open the raw PDF in a new browser tab */}
            {previewMode === "native" && (
              <button
                type="button"
                onClick={handleOpenExternal}
                disabled={!previewUrl}
                aria-label="Open PDF in new tab"
                className="p-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-300 border border-chrome transition-colors disabled:opacity-40"
                title="Open the generated PDF in a new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Download as Image */}
            <button
              type="button"
              onClick={() => handleDownloadImage("png")}
              disabled={isExportingImage}
              aria-label="Download image version"
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium transition-all active:scale-95 disabled:opacity-50"
              title="Download structure report as high-resolution PNG image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>
                {isExportingImage ? "Rendering Image..." : "Download Image"}
              </span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              aria-label="Download PDF document"
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-sm transition-all active:scale-95"
              title="Download directory structure as vector PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div
          className={`flex-1 p-4 sm:p-6 bg-[var(--app-bg)] ${
            previewMode === "sheet"
              ? "overflow-y-auto flex justify-center items-start"
              : "overflow-hidden flex"
          }`}
        >
          {previewMode === "sheet" ? (
            /* High-fidelity Vector Document Sheet matching the PDF and Image Export */
            <div
              ref={documentSheetRef}
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
              className="w-full max-w-4xl bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-12 min-h-[1100px] border border-slate-300 font-sans transition-transform duration-150"
            >
              {/* Header Banner */}
              <div
                style={{ backgroundColor: themeColors.headerBg }}
                className="rounded-xl p-6 text-white mb-6 shadow-sm"
              >
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {pdfOptions.title || `Directory Structure: ${stats.rootName}`}
                </h1>
                <div className="flex items-center space-x-3 text-xs text-white/80 mt-2 font-mono">
                  <span>Generated: {formatDate(Date.now())}</span>
                  <span>|</span>
                  <span>Target Folder: {stats.rootName}</span>
                </div>
              </div>

              {/* Summary Stats Row */}
              {pdfOptions.includeStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="block text-base sm:text-lg font-bold font-mono text-slate-800">
                      {stats.totalFiles.toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Files
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="block text-base sm:text-lg font-bold font-mono text-slate-800">
                      {stats.totalFolders.toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Subfolders
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="block text-base sm:text-lg font-bold font-mono text-slate-800">
                      {formatBytes(stats.totalSize)}
                    </span>
                    <span className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Size
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="block text-base sm:text-lg font-bold font-mono text-slate-800">
                      {stats.maxDepth} levels
                    </span>
                    <span className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Max Depth
                    </span>
                  </div>
                </div>
              )}

              {/* Visual Tree Diagram — mirrors the chosen PDF font + size so the
                  sheet, image export and PDF all share the same typography. */}
              {pdfOptions.includeTree && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200">
                    Directory Hierarchy Tree
                  </h3>
                  <div
                    className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 overflow-x-auto whitespace-pre shadow-inner"
                    style={{
                      fontFamily: SHEET_FONT_MAP[pdfOptions.treeFont],
                      fontSize: `${(pdfOptions.treeFontSize * 4) / 3}px`,
                      lineHeight:
                        pdfOptions.treeStyle === "compact" ? 1.45 : 1.7,
                    }}
                  >
                    {treeText}
                  </div>
                </div>
              )}

              {/* Complete File Inventory Table */}
              {pdfOptions.includeInventoryTable && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200">
                    Complete File Inventory
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-xs min-w-[540px]">
                      <thead
                        style={{ backgroundColor: themeColors.headerBg }}
                        className="text-white font-semibold"
                      >
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3">Directory Path</th>
                          <th className="py-2.5 px-3">File Name</th>
                          <th className="py-2.5 px-2 text-center">Ext</th>
                          {pdfOptions.includeSizes && (
                            <th className="py-2.5 px-3 text-right">Size</th>
                          )}
                          {pdfOptions.includeDates && (
                            <th className="py-2.5 px-3 text-center">
                              Last Modified
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[11px]">
                        {inventory.map((item) => (
                          <tr key={item.index} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400">
                              {item.index}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {item.directory}
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800">
                              {item.filename}
                            </td>
                            <td className="py-2 px-2 text-center uppercase font-bold text-slate-500">
                              {item.extension}
                            </td>
                            {pdfOptions.includeSizes && (
                              <td className="py-2 px-3 text-right">
                                {formatBytes(item.size)}
                              </td>
                            )}
                            {pdfOptions.includeDates && (
                              <td className="py-2 px-3 text-center text-slate-500">
                                {formatDate(item.lastModified)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Document Footer */}
              <div className="mt-12 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                <span>MyProject Analyzer</span>
                <span>
                  Exportable as Vector PDF or High-Res Image (PNG/JPEG)
                </span>
              </div>
            </div>
          ) : (
            /* PDF.js canvas viewer — the real generated document, fully zoomable,
               with zero native-viewer chrome (no gray side rails/scrollbars) */
            <div className="relative flex-1 w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-chrome shadow-2xl surface-card">
              <PdfCanvasViewer
                data={pdfData}
                zoom={zoomLevel}
                isRegenerating={isGenerating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
