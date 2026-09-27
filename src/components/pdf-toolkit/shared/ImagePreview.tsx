"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, X, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

type Props = {
  /** Object-URL or data-URL of the image to render. */
  src: string;
  className?: string;
  initialScale?: number;
};

const SCALES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/**
 * ImagePreview — zoomable, scrollable image preview with a true fullscreen
 * modal (mirrors the PdfPreview UX so the ResultScreen feels consistent).
 *
 * The image is rendered at scale × natural dimensions. Wheel + Ctrl zooms.
 * Toolbar: zoom out, %, zoom in, fit-to-width, expand (fullscreen).
 */
export function ImagePreview({ src, className, initialScale = 1 }: Props) {
  const [scale, setScale] = useState(initialScale);
  const [fullscreen, setFullscreen] = useState(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number; src: string } | null>(null);
  const [fit, setFit] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { t, lang } = useI18n();

  // Load image dimensions on src change.
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (!cancelled) setImgDims({ w: im.width, h: im.height, src });
    };
    im.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  // True when the loaded image matches the current src.
  const dimsReady = imgDims && imgDims.src === src ? imgDims : null;

  // Fit-to-width: compute a scale that makes the rendered width match the container width.
  useEffect(() => {
    if (!fit || !containerRef.current || !dimsReady) return;
    const container = containerRef.current;
    const update = () => {
      const cw = container.clientWidth - 32; // subtract padding (p-4 = 16px each side)
      if (cw > 0 && dimsReady.w > 0) {
        const s = cw / dimsReady.w;
        // Snap to nearest scale in SCALES for consistency.
        let best = SCALES[0];
        let bestDiff = Infinity;
        for (const v of SCALES) {
          const d = Math.abs(v - s);
          if (d < bestDiff) {
            best = v;
            bestDiff = d;
          }
        }
        setScale(best);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fit, dimsReady]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      setScale((s) => {
        const idx = SCALES.findIndex((v) => v >= s);
        const next = idx === -1 ? SCALES.length - 1 : Math.max(0, Math.min(SCALES.length - 1, idx + dir));
        setFit(false);
        return SCALES[next];
      });
    }
  }, []);

  const zoomIn = useCallback(() => {
    setFit(false);
    setScale((s) => SCALES[Math.min(SCALES.length - 1, SCALES.findIndex((v) => v >= s) + 1)] ?? s);
  }, []);
  const zoomOut = useCallback(() => {
    setFit(false);
    setScale((s) => SCALES[Math.max(0, SCALES.findIndex((v) => v >= s) - 1)] ?? s);
  }, []);

  const ui = (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] glass px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="px-2 text-xs font-medium text-[var(--foreground)]">
            {dimsReady ? `${dimsReady.w} × ${dimsReady.h}` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Zoom out"
            title={lang === "zh" ? "缩小" : "Zoom out"}
          >
            <ZoomOut className="size-4" />
          </button>
          <select
            value={fit ? 0 : scale}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v === 0) {
                setFit(true);
              } else {
                setFit(false);
                setScale(v);
              }
            }}
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
            onClick={zoomIn}
            className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Zoom in"
            title={lang === "zh" ? "放大" : "Zoom in"}
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={() => setFit(true)}
            className="ml-1 hidden sm:inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Fit to width"
            title={lang === "zh" ? "适合宽度" : "Fit to width"}
          >
            {lang === "zh" ? "适合宽度" : "Fit"}
          </button>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="ml-1 flex size-8 items-center justify-center rounded-md border border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 transition-colors"
            aria-label={fullscreen ? (lang === "zh" ? "退出全屏" : "Exit fullscreen") : (lang === "zh" ? "全屏查看" : "Expand to fullscreen")}
            title={fullscreen ? (lang === "zh" ? "退出全屏" : "Exit fullscreen") : (lang === "zh" ? "全屏查看" : "Expand to fullscreen")}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onWheel={onWheel}
        className="relative flex-1 overflow-auto thin-scroll bg-[var(--muted)] p-4"
      >
        <div className="flex min-h-full min-w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt={lang === "zh" ? "图片预览" : "Image preview"}
            draggable={false}
            onClick={() => setFullscreen((v) => !v)}
            className="block rounded-md shadow-lg bg-[var(--card)] cursor-zoom-in transition-shadow hover:shadow-xl"
            style={{
              width: dimsReady ? dimsReady.w * scale : "auto",
              height: dimsReady ? dimsReady.h * scale : "auto",
              maxWidth: "none",
              background: "#fff",
            }}
          />
        </div>
        {!dimsReady && (
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
            {lang === "zh" ? "正在加载图片…" : "Loading image…"}
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
            aria-label={t("common.done")}
            title={lang === "zh" ? "关闭全屏" : "Close fullscreen"}
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
