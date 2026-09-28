"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PdfPreview } from "../shared/PdfPreview";
import { redactPdfPages, type Redaction } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt , isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Eye, X, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("redact-pdf")!;

type Rect = {
  id: string;
  pageIndex: number;
  /** Coords in PDF points, top-left origin. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export function RedactPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } =
    useDocumentSession();
  const target = 
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));

  const [rects, setRects] = useState<Rect[]>([]);
  // Draft rectangle currently being drawn on the active page.
  const [draft, setDraft] = useState<{
    pageIndex: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Click-and-drag rectangle drawing on the overlay. We receive canvas
  // pixel coords, convert to PDF points by dividing by the current scale.
  const onPointerDown = useCallback(
    (pageIndex: number, pageWidth: number, pageHeight: number, scale: number) =>
      (e: React.PointerEvent) => {
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        // Clamp to page bounds.
        const cx = Math.max(0, Math.min(pageWidth, x));
        const cy = Math.max(0, Math.min(pageHeight, y));
        startRef.current = { x: cx, y: cy };
        drawingRef.current = true;
        setDraft({
          pageIndex,
          startX: cx,
          startY: cy,
          endX: cx,
          endY: cy,
        });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      },
    [],
  );

  const onPointerMove = useCallback(
    (pageIndex: number, pageWidth: number, pageHeight: number, scale: number) =>
      (e: React.PointerEvent) => {
        if (!drawingRef.current || !startRef.current || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        const cx = Math.max(0, Math.min(pageWidth, x));
        const cy = Math.max(0, Math.min(pageHeight, y));
        setDraft((d) =>
          d && d.pageIndex === pageIndex
            ? { ...d, endX: cx, endY: cy }
            : d,
        );
      },
    [],
  );

  const onPointerUp = useCallback(
    (_pageIndex: number) => (e: React.PointerEvent) => {
      drawingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setDraft((d) => {
        if (!d) return null;
        const x = Math.min(d.startX, d.endX);
        const y = Math.min(d.startY, d.endY);
        const width = Math.abs(d.endX - d.startX);
        const height = Math.abs(d.endY - d.startY);
        if (width < 4 || height < 4) {
          startRef.current = null;
          return null; // too small — ignore
        }
        const newRect: Rect = {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          pageIndex: d.pageIndex,
          x,
          y,
          width,
          height,
        };
        startRef.current = null;
        setRects((prev) => [...prev, newRect]);
        return null;
      });
    },
    [],
  );

  const removeRect = (id: string) => {
    setRects((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAll = () => {
    setRects([]);
    toast.success("Cleared all redactions");
  };

  const applyRedactions = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    if (rects.length === 0) {
      toast.error("Draw at least one redaction rectangle first.");
      return;
    }
    try {
      startProgress(`Baking ${rects.length} redaction${rects.length === 1 ? "" : "s"}…`, "determinate", 0);
      const redactions: Redaction[] = rects.map((r) => ({
        pageIndex: r.pageIndex,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));
      const bytes = await redactPdfPages(target.file, redactions, (pct, msg) =>
        updateProgress(msg, pct),
      );
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: withExt(target.name, "-redacted.pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: target.size,
        beforePreviewUrl: makePreviewUrl(target.file),
      });
      addOperation({
        tool: "redact-pdf",
        toolName: "Redacted PDF",
        description: "Permanently redacted sensitive content",
        icon: "redact-pdf",
        color: "var(--cat-edit)",
      });
      toast.success(`Applied ${rects.length} redaction${rects.length === 1 ? "" : "s"}`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Redaction failed");
    }
  };

  // Group redactions by page for the side list.
  const byPage = useMemo(() => {
    const map = new Map<number, Rect[]>();
    for (const r of rects) {
      if (!map.has(r.pageIndex)) map.set(r.pageIndex, []);
      map.get(r.pageIndex)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rects]);

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel={`Apply ${rects.length} Redaction${rects.length === 1 ? "" : "s"}`}
      ctaColor="var(--cat-edit)"
      onCtaClick={applyRedactions}
      ctaDisabled={rects.length === 0}
    >
      {target ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Main preview pane */}
            <div
              className="overflow-hidden rounded-xl border shadow-sm lg:col-span-2"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div className="h-[620px]">
                <PdfPreview
                  blob={target.file}
                  initialScale={1}
                  renderOverlay={(pageIndex, pageWidth, pageHeight, scale) => {
                    return (
                      <div
                        ref={overlayRef}
                        className="absolute inset-0"
                        style={{
                          width: pageWidth * scale,
                          height: pageHeight * scale,
                          cursor: "crosshair",
                          touchAction: "none",
                        }}
                        onPointerDown={onPointerDown(pageIndex, pageWidth, pageHeight, scale)}
                        onPointerMove={onPointerMove(pageIndex, pageWidth, pageHeight, scale)}
                        onPointerUp={onPointerUp(pageIndex)}
                        onPointerCancel={onPointerUp(pageIndex)}
                      >
                        {/* Existing redactions on this page */}
                        {rects
                          .filter((r) => r.pageIndex === pageIndex)
                          .map((r) => (
                            <div
                              key={r.id}
                              className="absolute group"
                              style={{
                                left: r.x * scale,
                                top: r.y * scale,
                                width: r.width * scale,
                                height: r.height * scale,
                                background: "#000",
                                border: "1px solid var(--brand)",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRect(r.id);
                                }}
                                className="absolute -right-2 -top-2 hidden size-5 items-center justify-center rounded-full text-white shadow group-hover:flex"
                                style={{ background: "var(--danger)" }}
                                title="Remove redaction"
                                aria-label="Remove redaction"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        {/* Active draft rectangle */}
                        {draft && draft.pageIndex === pageIndex && (
                          <div
                            className="absolute"
                            style={{
                              left: Math.min(draft.startX, draft.endX) * scale,
                              top: Math.min(draft.startY, draft.endY) * scale,
                              width: Math.abs(draft.endX - draft.startX) * scale,
                              height: Math.abs(draft.endY - draft.startY) * scale,
                              background: "rgba(0, 0, 0, 0.65)",
                              border: "1px dashed var(--brand)",
                            }}
                          />
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            {/* Side: redactions list */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <span
                  className="inline-flex items-center gap-2 font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  <Eye className="size-4" style={{ color: "var(--cat-edit)" }} />
                  {rects.length} redaction{rects.length === 1 ? "" : "s"}
                </span>
                <button
                  onClick={clearAll}
                  disabled={rects.length === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                    rects.length === 0 && "cursor-not-allowed opacity-50",
                  )}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--danger)",
                    background: "transparent",
                  }}
                >
                  <Trash2 className="size-3" /> Clear all
                </button>
              </div>

              <div className="space-y-2">
                {byPage.length === 0 ? (
                  <div
                    className="rounded-xl border border-dashed p-4 text-center text-xs"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--muted)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Click and drag on the page to draw a black rectangle over sensitive text.
                    Navigate pages with the toolbar above the preview.
                  </div>
                ) : (
                  byPage.map(([pageIndex, pageRects]) => (
                    <div
                      key={pageIndex}
                      className="rounded-lg border p-2"
                      style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    >
                      <p
                        className="mb-1.5 text-xs font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        Page {pageIndex + 1} · {pageRects.length} area
                        {pageRects.length === 1 ? "" : "s"}
                      </p>
                      <ul className="space-y-1">
                        {pageRects.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between text-[11px]"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <span>
                              {Math.round(r.width)}×{Math.round(r.height)}pt at (
                              {Math.round(r.x)}, {Math.round(r.y)})
                            </span>
                            <button
                              onClick={() => removeRect(r.id)}
                              className="rounded p-0.5 transition-all hover:bg-[var(--muted)]"
                              style={{ color: "var(--danger)" }}
                              title="Remove"
                              aria-label="Remove redaction"
                            >
                              <X className="size-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
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
            <Save className="size-4 shrink-0" style={{ color: "var(--cat-edit)" }} />
            <p>
              <b>True redaction:</b> the black rectangles are baked into the PDF with pdf-lib&apos;s{" "}
              <code className="rounded px-1" style={{ background: "var(--card)" }}>
                page.drawRectangle
              </code>
              . The underlying text is overwritten visually in the saved file — not just covered in
              the live view.
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
          Drop a PDF above to start redacting.
        </div>
      )}
    </ToolPageShell>
  );
}
