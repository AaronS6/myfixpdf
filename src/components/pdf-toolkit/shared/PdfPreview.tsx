"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, X, Minimize2 } from "lucide-react";
import { loadPdfFromBlob, renderPdfPageToCanvas } from "@/lib/pdf/pdfjs";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

type Props = {
  blob: Blob;
  className?: string;
  initialScale?: number;
  renderOverlay?: (pageIndex: number, pageWidth: number, pageHeight: number, scale: number) => React.ReactNode;
  onCanvasClick?: (pageIndex: number, xRatio: number, yRatio: number) => void;
  showToolbar?: boolean;
};

const SCALES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const MIN_SCALE = 0.05;
const MAX_SCALE = 8;

export function PdfPreview({
  blob,
  className,
  initialScale = 0, // 0 = Fit (auto-compute best scale on mount)
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
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomInput, setZoomInput] = useState(""); // user-typed zoom % string
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  // The actual rendered CSS dimensions (after Fit / zoom applied). Used to size
  // the container so scrollbars & layout match the canvas exactly.
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number } | null>(null);
  // The effective scale used for the last render (when Fit is on, this is the
  // computed best-fit scale, not 0).
  const [effectiveScale, setEffectiveScale] = useState(1);
  const { t, tTool, lang } = useI18n();

  useEffect(() => {
    let cancelled = false;
    let localDoc: Awaited<ReturnType<typeof loadPdfFromBlob>> | null = null;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        localDoc = await loadPdfFromBlob(blob);
        if (cancelled) {
          try { await (localDoc as any).cleanup?.(); } catch { /* ignore */ }
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
        // Get intrinsic page dimensions at scale 1.
        const baseViewport = page.getViewport({ scale: 1 });
        const intrinsicW = baseViewport.width;
        const intrinsicH = baseViewport.height;
        // Compute Fit scale: smallest scale that fits the page in the container.
        let renderScale = scale;
        if (scale === 0) {
          const container = containerRef.current;
          if (container) {
            const availW = container.clientWidth - 32;
            const availH = container.clientHeight - 32;
            renderScale = Math.min(availW / intrinsicW, availH / intrinsicH);
            renderScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, renderScale));
          } else {
            renderScale = 1;
          }
        }
        // Render at 2x DPI for crisp retina output.
        const dpiBoost = Math.max(2, Math.min(3, (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1));
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        canvas.width = Math.round(viewport.width * dpiBoost);
        canvas.height = Math.round(viewport.height * dpiBoost);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpiBoost, dpiBoost);
        }
        await renderPdfPageToCanvas(doc, pageNum, canvas, renderScale, { keepBackingSize: true });
        if (!cancelled) {
          setPageSize({ w: intrinsicW, h: intrinsicH });
          setRenderedSize({ w: viewport.width, h: viewport.height });
          setEffectiveScale(renderScale);
        }
        page.cleanup();
      } catch {
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
      // If an external onCanvasClick handler is provided (e.g. Edit PDF text tool),
      // call it. Otherwise, treat a click on the canvas as "open fullscreen".
      if (onCanvasClick && pageSize && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;
        const yRatio = (e.clientY - rect.top) / rect.height;
        onCanvasClick(pageNum - 1, xRatio, yRatio);
        return;
      }
      // No external click handler → toggle fullscreen on click
      setFullscreen((v) => !v);
    },
    [onCanvasClick, pageSize, pageNum],
  );

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-sm text-[var(--danger)]">
        {error}
      </div>
    );
  }

  const ui = (
    <div className={cn("flex h-full flex-col", className)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] glass px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-xs font-medium text-[var(--foreground)]">
              {lang === "zh" ? `第 ${pageNum} 页，共 ${numPages || "—"} 页` : `${t("common.page")} ${pageNum} ${t("common.pageOf")} ${numPages || "—"}`}
            </span>
            <button
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => {
                const cur = s === 0 ? 1 : s;
                const next = Math.max(MIN_SCALE, cur - 0.25);
                return Math.round(next * 100) / 100;
              })}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            {/* Numeric zoom input — user can type any % from 5 to 800 */}
            <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1">
              <input
                type="number"
                min={5}
                max={800}
                step={5}
                value={zoomInput !== "" ? zoomInput : Math.round((scale === 0 ? 1 : scale) * 100)}
                onChange={(e) => setZoomInput(e.target.value)}
                onBlur={() => {
                  const n = parseFloat(zoomInput);
                  if (!isNaN(n) && n >= 5 && n <= 800) {
                    setScale(n / 100);
                  }
                  setZoomInput("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseFloat(zoomInput);
                    if (!isNaN(n) && n >= 5 && n <= 800) {
                      setScale(n / 100);
                    }
                    setZoomInput("");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-12 bg-transparent text-xs text-[var(--foreground)] outline-none"
              />
              <span className="text-xs text-[var(--muted-foreground)]">%</span>
            </div>
            <button
              onClick={() => setScale((s) => {
                const cur = s === 0 ? 1 : s;
                const next = Math.min(MAX_SCALE, cur + 0.25);
                return Math.round(next * 100) / 100;
              })}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => setScale(0)}
              className={cn(
                "ml-1 inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                scale === 0
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
              )}
              title="Fit to screen"
            >
              Fit
            </button>
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="ml-1 flex size-8 items-center justify-center rounded-md border border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 transition-colors"
              aria-label={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
              title={fullscreen ? (lang === "zh" ? "退出全屏" : "Exit fullscreen") : (lang === "zh" ? "全屏查看" : "Expand to fullscreen")}
            >
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        onWheel={onWheel}
        className={cn(
          "relative flex-1 overflow-auto thin-scroll bg-[var(--muted)] p-4",
          loading && "flex items-center justify-center",
        )}
      >
        <div className="mx-auto" style={{ width: renderedSize ? renderedSize.w : "auto" }}>
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              onClick={clickHandler}
              className={cn(
                "block mx-auto rounded-md shadow-lg bg-[var(--card)] transition-shadow hover:shadow-xl",
                !onCanvasClick && "cursor-zoom-in",
              )}
              style={{ background: "#fff" }}
            />
            {pageSize && renderOverlay && renderedSize && (
              <div
                className="pointer-events-auto absolute left-0 top-0"
                style={{
                  width: renderedSize.w,
                  height: renderedSize.h,
                }}
              >
                {renderOverlay(pageNum - 1, pageSize.w, pageSize.h, effectiveScale)}
              </div>
            )}
          </div>
        </div>
        {loading && !error && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {lang === "zh" ? "正在加载 PDF…" : "Loading PDF…"}
          </p>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--background)]/95 backdrop-blur-md animate-fade-in">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {lang === "zh" ? "全屏预览" : "Fullscreen preview"}
          </span>
          <button
            onClick={() => setFullscreen(false)}
            className="flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            aria-label="Close fullscreen"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{ui}</div>
      </div>
    );
  }

  return ui;
}
