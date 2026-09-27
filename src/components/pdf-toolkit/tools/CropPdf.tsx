"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { PdfPreview } from "../shared/PdfPreview";
import { cropPdfPage } from "@/lib/pdf/pdf-ops";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Crop, Wand2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("crop-pdf")!;

type CropMargins = { left: number; right: number; top: number; bottom: number };
const ZERO_CROP: CropMargins = { left: 0, right: 0, top: 0, bottom: 0 };

export function CropPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

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
                        const leftPx = crop.left * scale;
                        const rightPx = crop.right * scale;
                        const topPx = crop.top * scale;
                        const bottomPx = crop.bottom * scale;
                        const fullW = w * scale;
                        const fullH = h * scale;
                        // We render 4 dark masks around the kept rectangle.
                        // The kept rectangle has top-left at (leftPx, topPx)
                        // and bottom-right at (fullW - rightPx, fullH - bottomPx).
                        const keptW = Math.max(0, fullW - leftPx - rightPx);
                        const keptH = Math.max(0, fullH - topPx - bottomPx);
                        return (
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Top */}
                            <div
                              className="absolute"
                              style={{
                                left: 0,
                                top: 0,
                                width: fullW,
                                height: topPx,
                                background: "rgba(20, 19, 15, 0.55)",
                                border: "1px dashed var(--brand)",
                                borderBottomWidth: 0,
                              }}
                            />
                            {/* Bottom */}
                            <div
                              className="absolute"
                              style={{
                                left: 0,
                                top: topPx + keptH,
                                width: fullW,
                                height: bottomPx,
                                background: "rgba(20, 19, 15, 0.55)",
                                border: "1px dashed var(--brand)",
                                borderTopWidth: 0,
                              }}
                            />
                            {/* Left */}
                            <div
                              className="absolute"
                              style={{
                                left: 0,
                                top: topPx,
                                width: leftPx,
                                height: keptH,
                                background: "rgba(20, 19, 15, 0.55)",
                                border: "1px dashed var(--brand)",
                                borderRightWidth: 0,
                              }}
                            />
                            {/* Right */}
                            <div
                              className="absolute"
                              style={{
                                left: leftPx + keptW,
                                top: topPx,
                                width: rightPx,
                                height: keptH,
                                background: "rgba(20, 19, 15, 0.55)",
                                border: "1px dashed var(--brand)",
                                borderLeftWidth: 0,
                              }}
                            />
                            {/* Outline around kept area */}
                            <div
                              className="absolute"
                              style={{
                                left: leftPx,
                                top: topPx,
                                width: keptW,
                                height: keptH,
                                outline: "2px solid var(--brand)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
                              }}
                            />
                          </div>
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
              Drag the sliders to set crop margins in PDF points. The dark mask shows the area that
              will be removed. <b>Apply crop</b> bakes the crop into the live PDF; <b>Save</b>{" "}
              produces the final file.
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
