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
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
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
        const renderScale = scale === 0 ? 0.5 : scale; // 0 = Fit, fallback to 0.5
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await renderPdfPageToCanvas(doc, pageNum, canvas, renderScale);
        if (!cancelled) {
          setPageSize({ w: viewport.width / renderScale, h: viewport.height / renderScale });
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
              onClick={() => setScale((s) => SCALES[Math.max(0, SCALES.findIndex((v) => v >= s) - 1)] ?? s)}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            <select
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--foreground)] outline-none"
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
              className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
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
        <div className="mx-auto" style={{ width: pageSize ? pageSize.w * (scale === 0 ? 0.5 : scale) : "auto" }}>
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              onClick={clickHandler}
              className="block mx-auto rounded-md shadow-lg bg-[var(--card)]"
              style={{ background: "#fff" }}
            />
            {pageSize && renderOverlay && (
              <div
                className="pointer-events-auto absolute left-0 top-0"
                style={{
                  width: pageSize.w * (scale === 0 ? 0.5 : scale),
                  height: pageSize.h * (scale === 0 ? 0.5 : scale),
                }}
              >
                {renderOverlay(pageNum - 1, pageSize.w, pageSize.h, scale === 0 ? 0.5 : scale)}
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
