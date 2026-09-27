"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { PdfPreview } from "../shared/PdfPreview";
import { cropPdfPage } from "@/lib/pdf/pdf-ops";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { makePreviewUrl, withExt , isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Crop, Wand2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("crop-pdf")!;

type CropMargins = { left: number; right: number; top: number; bottom: number };
const ZERO_CROP: CropMargins = { left: 0, right: 0, top: 0, bottom: 0 };

export function CropPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  const target = 
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));

  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  const [selectedPage, setSelectedPage] = useState(0);
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [busy, setBusy] = useState(false);
  // Crop margins in PDF points (0–300). The PageThumbnailGrid selection is
  // driven by a Set<number> we own here.
  const [selected, setSelected] = useState<Set<number>>(() => new Set([0]));
  const [crop, setCrop] = useState<CropMargins>(ZERO_CROP);
  const [applyToAll, setApplyToAll] = useState(false);
  const [pageSizes, setPageSizes] = useState<Array<{ w: number; h: number }>>([]);

  // Reset when source changes.
  useEffect(() => {
    if (target) {
      const blob = target.file;
      setLiveBlob(blob);
      void (async () => {
        try {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          setHistory([bytes]);
        } catch {
          // ignore
        }
      })();
      void (async () => {
        try {
          const doc = await loadPdfFromBlob(blob);
          const sizes: Array<{ w: number; h: number }> = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const vp = page.getViewport({ scale: 1 });
            sizes.push({ w: vp.width, h: vp.height });
            page.cleanup();
          }
          setPageSizes(sizes);
          try {
            await (doc as any).cleanup?.();
          } catch {
            // ignore
          }
        } catch {
          // ignore
        }
      })();
      setSelectedPage(0);
      setSelected(new Set([0]));
      setCrop(ZERO_CROP);
    }
  }, [target]);

  const pushHistory = (bytes: Uint8Array) => {
    setHistory((h) => {
      const next = h.slice(-15);
      next.push(bytes);
      return next;
    });
  };

  // Toggle selection — only one page active at a time.
  const onToggle = (index: number) => {
    setSelectedPage(index);
    setSelected(new Set([index]));
    setCrop(ZERO_CROP);
  };

  const applyCrop = async () => {
    if (!liveBlob || busy) return;
    setBusy(true);
    try {
      startProgress("Cropping page…", "determinate", 0);
      let bytes: Uint8Array;
      if (applyToAll) {
        // Crop every page in the PDF — loop sequentially, feeding output
        // into the next call.
        let currentBlob = liveBlob;
        const total = pageSizes.length || (target?.pageCount ?? 1);
        for (let i = 0; i < total; i++) {
          updateProgress(`Cropping page ${i + 1} of ${total}…`, Math.round((i / total) * 100));
          const out = await cropPdfPage(currentBlob, i, crop);
          currentBlob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        }
        bytes = new Uint8Array(await currentBlob.arrayBuffer());
      } else {
        bytes = await cropPdfPage(liveBlob, selectedPage, crop, (pct, msg) =>
          updateProgress(msg, pct),
        );
      }
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setLiveBlob(blob);
      pushHistory(bytes);
      stopProgress();
      toast.success(
        applyToAll
          ? `Cropped all ${pageSizes.length || "?"} pages`
          : `Cropped page ${selectedPage + 1}`,
      );
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!liveBlob || !target) {
      toast.error("Please add a PDF first.");
      return;
    }
    setResult({
      blob: liveBlob,
      name: withExt(target.name, "-cropped.pdf"),
      type: "application/pdf",
      ext: ".pdf",
      size: liveBlob.size,
      beforeSize: target.size,
      beforePreviewUrl: makePreviewUrl(target.file),
    });
    setView("result");
    toast.success("Cropped PDF saved");
  };

  // The currently-selected page's dimensions (PDF points).
  const currentSize = pageSizes[selectedPage];
  const showCropOverlay = !!currentSize;

  const noopSelected = useMemo(() => selected, [selected]);

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel="Save Cropped PDF"
      ctaColor="var(--cat-organize)"
      onCtaClick={save}
      ctaDisabled={!liveBlob}
    >
      {target ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: thumbnail grid */}
            <div className="space-y-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                Pick a page to crop
              </p>
              {liveBlob ? (
                <PageThumbnailGrid
                  blob={liveBlob}
                  selected={noopSelected}
                  onToggle={onToggle}
                  showCheckbox={false}
                  scale={0.3}
                />
              ) : (
                <div
                  className="rounded-xl border border-dashed p-12 text-center text-sm"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Loading pages…
                </div>
              )}
            </div>

            {/* Right: live crop preview with sliders */}
            <div className="space-y-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                Crop page {selectedPage + 1}
              </p>
              <div
                className="overflow-hidden rounded-xl border shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                {liveBlob ? (
                  <div className="relative h-[520px]">
                    <PdfPreview
                      blob={liveBlob}
                      initialScale={1}
                      showToolbar={false}
                      renderOverlay={(_pi, w, h, scale) => {
                        if (_pi !== selectedPage || !showCropOverlay) return null;
                        return (
                          <CropOverlay
                            pageW={w}
                            pageH={h}
                            scale={scale}
                            crop={crop}
                            setCrop={setCrop}
                          />
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="p-12 text-center text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Loading preview…
                  </div>
                )}
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-3">
                {(["left", "right", "top", "bottom"] as const).map((side) => (
                  <div key={side}>
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        className="text-sm font-semibold capitalize"
                        style={{ color: "var(--foreground)" }}
                      >
                        {side}
                      </label>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: "var(--muted)",
                          color: "var(--foreground)",
                        }}
                      >
                        {crop[side]}pt
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={300}
                      step={5}
                      value={crop[side]}
                      onChange={(e) =>
                        setCrop((c) => ({ ...c, [side]: parseInt(e.target.value, 10) }))
                      }
                      className="w-full"
                      style={{ accentColor: "var(--brand)" }}
                    />
                  </div>
                ))}
              </div>

              {/* Apply-to-all + Apply button */}
              <div
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--muted)",
                }}
              >
                <label
                  className="flex cursor-pointer items-center gap-2 text-xs font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="size-4"
                    style={{ accentColor: "var(--brand)" }}
                  />
                  Apply same crop to all pages
                </label>
                <button
                  onClick={applyCrop}
                  disabled={busy}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02]",
                    busy && "cursor-not-allowed opacity-50",
                  )}
                  style={{ background: "var(--brand)" }}
                >
                  <Wand2 className="size-3.5" /> Apply crop
                </button>
              </div>
            </div>
          </div>

          <div
            className="flex items-start gap-2 rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            <Crop className="size-4 shrink-0" style={{ color: "var(--cat-organize)" }} />
            <p>
              Click and drag on the page to draw the crop area, or fine-tune with the sliders. <b>Apply crop</b> bakes it in; <b>Save</b> produces the final file.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          Drop a PDF above to start cropping pages.
        </div>
      )}
    </ToolPageShell>
  );
}

/**
 * CropOverlay — interactive crop rectangle on top of the PDF preview.
 * The user can:
 *   - Click and drag on empty area to draw a new crop rectangle (replacing the
 *     current margins).
 *   - Drag the kept rectangle to move it.
 *   - Drag any of the 4 corner handles to resize.
 * The 4 sliders in the parent state (`crop`) update live as the user drags,
 * and the sliders can also drive the rectangle (two-way sync).
 *
 * Coordinate space:
 *   - crop.left/right/top/bottom are in PDF points.
 *   - The overlay is sized pageW * scale × pageH * scale in CSS pixels.
 *   - Conversion: cssPx = pdfPt * scale, pdfPt = cssPx / scale.
 */
function CropOverlay({
  pageW,
  pageH,
  scale,
  crop,
  setCrop,
}: {
  pageW: number;
  pageH: number;
  scale: number;
  crop: CropMargins;
  setCrop: React.Dispatch<React.SetStateAction<CropMargins>>;
}) {
  const safeScale = scale > 0 ? scale : 1;
  const fullW = pageW * safeScale;
  const fullH = pageH * safeScale;
  const leftPx = crop.left * safeScale;
  const rightPx = crop.right * safeScale;
  const topPx = crop.top * safeScale;
  const bottomPx = crop.bottom * safeScale;
  const keptW = Math.max(0, fullW - leftPx - rightPx);
  const keptH = Math.max(0, fullH - topPx - bottomPx);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  // dragRef tracks the active drag operation. We use window-level mousemove
  // listeners so the drag keeps tracking even if the cursor leaves the overlay.
  const dragRef = useRef<
    | {
        kind: "new" | "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";
        startX: number;
        startY: number;
        startCrop: CropMargins;
      }
    | null
  >(null);

  // Helper to convert a CSS-pixel rectangle (x1,y1,x2,y2) to crop margins.
  const rectToCrop = (x1: number, y1: number, x2: number, y2: number): CropMargins => {
    // Normalize so x1<=x2, y1<=y2.
    const nx1 = Math.min(x1, x2);
    const nx2 = Math.max(x1, x2);
    const ny1 = Math.min(y1, y2);
    const ny2 = Math.max(y1, y2);
    // Clamp to page bounds.
    const cx1 = Math.max(0, Math.min(fullW, nx1));
    const cx2 = Math.max(0, Math.min(fullW, nx2));
    const cy1 = Math.max(0, Math.min(fullH, ny1));
    const cy2 = Math.max(0, Math.min(fullH, ny2));
    return {
      left: cx1 / safeScale,
      right: (fullW - cx2) / safeScale,
      top: cy1 / safeScale,
      bottom: (fullH - cy2) / safeScale,
    };
  };

  const startDrag = (
    e: React.MouseEvent,
    kind: "new" | "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
    const move = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (d.kind === "new") {
        // Convert start point to overlay-local coords.
        const overlayEl = overlayRef.current;
        if (!overlayEl) return;
        const rect = overlayEl.getBoundingClientRect();
        const sx = d.startX - rect.left;
        const sy = d.startY - rect.top;
        const ex = sx + dx;
        const ey = sy + dy;
        setCrop(rectToCrop(sx, sy, ex, ey));
      } else if (d.kind === "move") {
        // Convert dx, dy to PDF points and shift the margins.
        const dxPt = dx / safeScale;
        const dyPt = dy / safeScale;
        const start = d.startCrop;
        // Compute the current kept size in PDF points.
        const keptWPt = pageW - start.left - start.right;
        const keptHPt = pageH - start.top - start.bottom;
        // New top-left = (start.left + dxPt, start.top + dyPt).
        let newLeft = start.left + dxPt;
        let newTop = start.top + dyPt;
        // Clamp: don't let left go negative or push right edge past pageW.
        newLeft = Math.max(0, Math.min(newLeft, pageW - keptWPt - start.right));
        newTop = Math.max(0, Math.min(newTop, pageH - keptHPt - start.bottom));
        setCrop({
          ...start,
          left: newLeft,
          top: newTop,
          right: pageW - newLeft - keptWPt,
          bottom: pageH - newTop - keptHPt,
        });
      } else {
        // Resize handles — recompute corners.
        const overlayEl = overlayRef.current;
        if (!overlayEl) return;
        const rect = overlayEl.getBoundingClientRect();
        // Original rectangle corners in CSS px:
        const sx1 = d.startCrop.left * safeScale;
        const sy1 = d.startCrop.top * safeScale;
        const sx2 = fullW - d.startCrop.right * safeScale;
        const sy2 = fullH - d.startCrop.bottom * safeScale;
        // New cursor position in overlay-local CSS px:
        const cx = ev.clientX - rect.left;
        const cy = ev.clientY - rect.top;
        // Choose which corner is the "moving" one based on kind:
        let nx1 = sx1;
        let ny1 = sy1;
        let nx2 = sx2;
        let ny2 = sy2;
        if (d.kind === "resize-tl") { nx1 = cx; ny1 = cy; }
        else if (d.kind === "resize-tr") { nx2 = cx; ny1 = cy; }
        else if (d.kind === "resize-bl") { nx1 = cx; ny2 = cy; }
        else if (d.kind === "resize-br") { nx2 = cx; ny2 = cy; }
        setCrop(rectToCrop(nx1, ny1, nx2, ny2));
      }
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ cursor: "crosshair" }}
      onMouseDown={(e) => {
        // Only start a "new" drag if the click was on the empty area
        // (not on the kept rectangle or its handles).
        const target = e.target as HTMLElement;
        if (target.dataset && (target.dataset.cropHandle || target.dataset.cropRect)) return;
        startDrag(e, "new");
      }}
    >
      {/* Top mask */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: fullW,
          height: topPx,
          background: "rgba(15, 23, 42, 0.55)",
        }}
      />
      {/* Bottom mask */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: topPx + keptH,
          width: fullW,
          height: bottomPx,
          background: "rgba(15, 23, 42, 0.55)",
        }}
      />
      {/* Left mask */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: topPx,
          width: leftPx,
          height: keptH,
          background: "rgba(15, 23, 42, 0.55)",
        }}
      />
      {/* Right mask */}
      <div
        className="absolute"
        style={{
          left: leftPx + keptW,
          top: topPx,
          width: rightPx,
          height: keptH,
          background: "rgba(15, 23, 42, 0.55)",
        }}
      />
      {/* Kept rectangle — draggable to move */}
      <div
        data-crop-rect="true"
        onMouseDown={(e) => startDrag(e, "move")}
        className="absolute"
        style={{
          left: leftPx,
          top: topPx,
          width: keptW,
          height: keptH,
          outline: "2px solid var(--brand)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.5), inset 0 0 0 1px rgba(255,255,255,0.5)",
          cursor: "move",
        }}
      >
        {/* Corner handles */}
        {[
          { kind: "resize-tl" as const, x: 0, y: 0, cursor: "nwse-resize" },
          { kind: "resize-tr" as const, x: keptW, y: 0, cursor: "nesw-resize" },
          { kind: "resize-bl" as const, x: 0, y: keptH, cursor: "nesw-resize" },
          { kind: "resize-br" as const, x: keptW, y: keptH, cursor: "nwse-resize" },
        ].map((h) => (
          <div
            key={h.kind}
            data-crop-handle="true"
            onMouseDown={(e) => startDrag(e, h.kind)}
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--brand)] bg-[var(--card)] shadow-md"
            style={{
              left: h.x,
              top: h.y,
              cursor: h.cursor,
            }}
          />
        ))}
      </div>
    </div>
  );
}

