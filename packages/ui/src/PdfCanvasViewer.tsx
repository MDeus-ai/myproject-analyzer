import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2, FileWarning, RefreshCw } from "lucide-react";

// Wire the PDF.js worker through Vite's asset pipeline.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Scale that maps an A4 page to ~790 CSS px wide at 100% zoom. */
const BASE_SCALE = 1.33;

interface PdfCanvasViewerProps {
  /** Raw bytes of the generated PDF document. */
  data: ArrayBuffer | null;
  /** Zoom percentage (100 = natural size). */
  zoom: number;
  isRegenerating?: boolean;
}

/**
 * Renders the real generated PDF onto canvases via PDF.js instead of relying
 * on the browser's built-in viewer. This gives us:
 *  - fully working, crisp zoom at any level (re-rendered, devicePixelRatio-aware)
 *  - zero native-viewer chrome: no gray side rails, no thick gray scrollbars
 *  - identical output to the downloaded file (it IS the downloaded file)
 *
 * Version notes (pdfjs-dist 5.4+ removed two legacy APIs):
 *  - `PDFDocumentProxy.destroy()` is gone -> teardown uses
 *    `PDFDocumentLoadingTask.destroy()`, which exists in every version.
 *  - `RenderParameters.canvasContext` is gone -> `page.render()` now takes the
 *    `canvas` element. Both keys are passed so v4 and v5 runtimes both work.
 */
export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  data,
  zoom,
  isRegenerating,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // ---- Load / reload the PDF document when its bytes change ----------------
  useEffect(() => {
    if (!data) {
      setDoc(null);
      return;
    }

    let cancelled = false;
    // Clone the bytes into a fresh Uint8Array: PDF.js transfers the buffer to
    // its worker, which would detach the original (we still need it for the
    // size metadata and the open-in-new-tab blob URL).
    const bytes = new Uint8Array(data.slice(0));
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    setError(null);

    loadingTask.promise
      .then((loadedDoc) => {
        if (cancelled) {
          // loadingTask.destroy() tears down the loaded document too.
          void loadingTask.destroy().catch(() => {});
        } else {
          setDoc(loadedDoc);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[PdfCanvasViewer] Failed to load PDF:", err);
          setError("Could not render the PDF preview.");
        }
      });

    return () => {
      cancelled = true;
      setDoc(null);
      // Supported teardown path across all pdfjs-dist versions: destroys the
      // document and terminates the worker.
      void loadingTask.destroy().catch(() => {});
    };
  }, [data]);

  // ---- (Re)render every page whenever the document or zoom changes ---------
  useEffect(() => {
    if (!doc || !containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;
    const renderTasks: pdfjsLib.RenderTask[] = [];
    setIsRendering(true);

    (async () => {
      container.innerHTML = "";
      const scale = BASE_SCALE * (zoom / 100);
      const outputScale = Math.max(1, window.devicePixelRatio || 1);

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        if (cancelled) return;

        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: scale * outputScale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const cssWidth = Math.floor(viewport.width / outputScale);
        const cssHeight = Math.floor(viewport.height / outputScale);
        // Fit the page to the available width on narrow screens (phones).
        // The canvas backing store keeps full resolution, so it stays sharp.
        const available = container.clientWidth - 32; // container has px-4 padding
        if (available > 0 && cssWidth > available) {
          const fit = available / cssWidth;
          canvas.style.width = `${available}px`;
          canvas.style.height = `${Math.floor(cssHeight * fit)}px`;
        } else {
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
        }

        canvas.className = "block mx-auto bg-white rounded-[3px] shadow-2xl";

        const wrap = document.createElement("div");
        wrap.className = "mb-6 last:mb-1";
        wrap.appendChild(canvas);
        container.appendChild(wrap);

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // pdfjs-dist >= 5.4 renders onto `canvas`; earlier versions expect a
        // `canvasContext`. Passing both keeps every version happy — each
        // runtime simply reads the key it knows about.
        const renderParams = {
          canvas,
          canvasContext: ctx,
          viewport,
        } as unknown as Parameters<typeof page.render>[0];

        const task = page.render(renderParams);
        renderTasks.push(task);
        try {
          await task.promise;
        } catch {
          // Render cancelled (zoom changed / document swapped) — safe to ignore.
        }
      }

      if (!cancelled) setIsRendering(false);
    })();

    return () => {
      cancelled = true;
      for (const task of renderTasks) {
        try {
          task.cancel();
        } catch {
          // already finished
        }
      }
    };
  }, [doc, zoom]);

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {error ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <FileWarning className="w-8 h-8 text-danger mb-3" />
          <p className="text-slate-300 text-sm font-medium">{error}</p>
          <p className="text-slate-500 text-xs mt-1">
            Try downloading the PDF instead — the file itself is unaffected.
          </p>
        </div>
      ) : !data ? (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
          <p className="text-slate-300 text-sm font-medium">
            Generating PDF preview…
          </p>
        </div>
      ) : (
        <>
          {(isRendering || isRegenerating) && (
            <div className="sticky top-3 z-10 flex justify-center pointer-events-none">
              <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg surface-card border border-chrome text-[11px] text-slate-200 shadow-lg">
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                <span>{isRegenerating ? "Updating PDF…" : "Rendering…"}</span>
              </div>
            </div>
          )}
          <div ref={containerRef} className="px-4 sm:px-8 pb-8 pt-2" />
        </>
      )}
    </div>
  );
};
