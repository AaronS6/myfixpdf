"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { loadPdfFromBlob, renderPdfPageToCanvas } from "@/lib/pdf/pdfjs";
import { cn } from "@/lib/utils";

type Props = {
  blob: Blob;
  className?: string;
  initialScale?: number;
  /** When provided, an overlay is rendered per page (used by Edit PDF). */
  renderOverlay?: (pageIndex: number, pageWidth: number, pageHeight: number, scale: number) => React.ReactNode;
  /** Click-to-add text support */
  onCanvasClick?: (pageIndex: number, xRatio: number, yRatio: number) => void;
  showToolbar?: boolean;
};

const SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function PdfPreview({
  blob,
  className,
  initialScale = 1,
  renderOverlay,
  onCanvasClick,
  showToolbar = true,
}: Props) {
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof loadPdfFromBlob>> | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let localDoc: Awaited<ReturnType<typeof loadPdfFromBlob>> | null = null;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        localDoc = await loadPdfFromBlob(blob);
        if (cancelled) {
          localDoc.destroy();
          return;
        }
        setDoc(localDoc);
        setNumPages(localDoc.numPages);
        setPageNum(1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (localDoc) {
        try {
          // pdfjs v6 PDFDocumentProxy exposes cleanup(), not destroy()
          void (localDoc as any).cleanup?.();
        } catch {
          // ignore
        }
      }
    };
  }, [blob]);

  useEffect(() => {
    let cancelled = false;
    if (!doc || !canvasRef.current) return;
    (async () => {
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await renderPdfPageToCanvas(doc, pageNum, canvas, scale);
        if (!cancelled) {
          setPageSize({ w: viewport.width / scale, h: viewport.height / scale });
        }
        page.cleanup();
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNum, scale]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      setScale((s) => {
        const idx = SCALES.findIndex((v) => v >= s);
        const next = idx === -1 ? SCALES.length - 1 : Math.max(0, Math.min(SCALES.length - 1, idx + dir));
        return SCALES[next];
      });
    }
  }, []);

  const clickHandler = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onCanvasClick || !pageSize || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      onCanvasClick(pageNum - 1, xRatio, yRatio);
    },
    [onCanvasClick, pageSize, pageNum],
  );

  if (error) {
    return (
      <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-sm text-[#F04438]">
        {error}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 border-b border-[#E4E9F0] bg-white px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="flex size-8 items-center justify-center rounded-md border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC] disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-xs font-medium text-[#1D2733]">
              Page {pageNum} of {numPages || "—"}
            </span>
            <button
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="flex size-8 items-center justify-center rounded-md border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC] disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => SCALES[Math.max(0, SCALES.findIndex((v) => v >= s) - 1)] ?? s)}
              className="flex size-8 items-center justify-center rounded-md border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            <select
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="rounded-md border border-[#E4E9F0] bg-white px-2 py-1 text-xs text-[#1D2733] outline-none"
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {Math.round(s * 100)}%
                </option>
              ))}
              <option value={0}>Fit</option>
            </select>
            <button
              onClick={() => setScale((s) => SCALES[Math.min(SCALES.length - 1, SCALES.findIndex((v) => v >= s) + 1)] ?? s)}
              className="flex size-8 items-center justify-center rounded-md border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="ml-1 flex size-8 items-center justify-center rounded-md border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
              aria-label="Reset zoom"
              title="100%"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        onWheel={onWheel}
        className={cn(
          "relative flex-1 overflow-auto thin-scroll bg-[#F7F9FC] p-4",
          loading && "flex items-center justify-center",
        )}
      >
        <div className="mx-auto" style={{ width: pageSize ? pageSize.w * scale : "auto" }}>
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              onClick={clickHandler}
              className="block mx-auto rounded-md shadow-md"
              style={{ background: "#fff" }}
            />
            {pageSize && renderOverlay && (
              <div
                className="pointer-events-auto absolute left-0 top-0"
                style={{ width: pageSize.w * scale, height: pageSize.h * scale }}
              >
                {renderOverlay(pageNum - 1, pageSize.w, pageSize.h, scale)}
              </div>
            )}
          </div>
        </div>
        {loading && !error && (
          <p className="text-sm text-[#5B6B79]">Loading PDF…</p>
        )}
      </div>
    </div>
  );
}
