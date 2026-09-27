"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, X, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

type Props = {
  /** Object-URL or data-URL of the image to render. */
  src: string;
  className?: string;
  /**
   * Initial scale. 0 means "Fit" (auto-compute best scale on mount, like
   * PdfPreview). Default is 0 so images open at the best-fit size, not 1:1.
   */
  initialScale?: number;
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;

/**
 * ImagePreview — zoomable, scrollable image preview with a true fullscreen
 * modal (mirrors the PdfPreview UX so the ResultScreen feels consistent).
 *
 * The image is rendered at scale × natural dimensions. Wheel + Ctrl zooms.
 * Toolbar: zoom out, % numeric input (5–800), zoom in, Fit, expand (fullscreen).
 *
 * Defaults to Fit on mount so images always show at the best size.
 *
 * To avoid the "refs during render" lint error, the Fit-mode effective scale
 * is computed inside an effect (ResizeObserver) and stored in `fitScale`,
 * not read from `containerRef.current` during render.
 */
export function ImagePreview({ src, className, initialScale = 0 }: Props) {
  const [scale, setScale] = useState(initialScale);
  const [zoomInput, setZoomInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number; src: string } | null>(null);
  // Container size, kept in state via ResizeObserver so Fit can recompute.
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
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

  // Track container size for Fit-mode computation.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const update = () => {
      setContainerSize({
        w: container.clientWidth,
        h: container.clientHeight,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // True when the loaded image matches the current src.
  const dimsReady = imgDims && imgDims.src === src ? imgDims : null;

  // Compute the Fit scale (best-fit) using container + natural dims.
  const fitScale = (() => {
    if (!containerSize || !dimsReady) return 1;
    const availW = Math.max(0, containerSize.w - 32); // p-4 padding
    const availH = Math.max(0, containerSize.h - 32);
    if (availW <= 0 || availH <= 0 || dimsReady.w <= 0 || dimsReady.h <= 0) return 1;
    const s = Math.min(availW / dimsReady.w, availH / dimsReady.h);
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  })();
  // Effective scale: when Fit mode (scale === 0), use fitScale; else use scale.
  const effScale = scale === 0 ? fitScale : scale;

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      setScale((s) => {
        const cur = s === 0 ? 1 : s;
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cur + dir * 0.1));
        return Math.round(next * 100) / 100;
      });
    }
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => {
      const cur = s === 0 ? effScale : s;
      const next = Math.min(MAX_SCALE, cur + 0.25);
      return Math.round(next * 100) / 100;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effScale]);
  const zoomOut = useCallback(() => {
    setScale((s) => {
      const cur = s === 0 ? effScale : s;
      const next = Math.max(MIN_SCALE, cur - 0.25);
      return Math.round(next * 100) / 100;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effScale]);

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
            aria-label={lang === "zh" ? "缩小" : "Zoom out"}
            title={lang === "zh" ? "缩小" : "Zoom out"}
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
              value={zoomInput !== "" ? zoomInput : Math.round(effScale * 100)}
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
            onClick={zoomIn}
            className="flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label={lang === "zh" ? "放大" : "Zoom in"}
            title={lang === "zh" ? "放大" : "Zoom in"}
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
            title={lang === "zh" ? "适合屏幕" : "Fit to screen"}
          >
            {t("common.fit")}
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
              width: dimsReady ? dimsReady.w * effScale : "auto",
              height: dimsReady ? dimsReady.h * effScale : "auto",
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
