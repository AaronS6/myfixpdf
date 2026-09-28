"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PdfPreview } from "../shared/PdfPreview";
import {
  rotatePdfPage,
  deletePdfPage,
  duplicatePdfPage,
  reorderPdfPages,
  insertBlankPage,
  addTextToPage,
  embedStrokeOnPage,
  rotateAllPages,
} from "@/lib/pdf/pdf-ops";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  Type,
  PenLine,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Save,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const tool = getTool("edit-pdf")!;

type TextItem = {
  id: string;
  pageIndex: number;
  x: number; // PDF points
  y: number;
  text: string;
  size: number;
  color: [number, number, number];
  baked: boolean;
};

type DrawStroke = {
  pageIndex: number;
  points: Array<{ x: number; y: number }>; // PDF points
  color: string;
  width: number;
};

export function EditPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, pushHistory, popHistory } = useDocumentSession();
  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [tool2, setTool2] = useState<"select" | "text" | "draw">("select");
  const [penColor, setPenColor] = useState("var(--brand)");
  const [penWidth, setPenWidth] = useState(3);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; pageIndex: number; value: string; size: number; color: [number, number, number] } | null>(null);
  const [history2, setHistory2] = useState<Uint8Array[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<DrawStroke | null>(null);

  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  useEffect(() => {
    if (target) {
      // Defer setState to a microtask so we don't run it synchronously in the effect body
      queueMicrotask(() => {
        setLiveBlob(target.file);
      });
      // Prime history with original
      void (async () => {
        const bytes = new Uint8Array(await target.file.arrayBuffer());
        setHistory2([bytes]);
        setHistoryIdx(0);
      })();
    }
  }, [target]);

  const updateBlob = (bytes: Uint8Array) => {
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    setLiveBlob(blob);
    // Truncate any history forward of current index, push new state
    setHistory2((h) => {
      const trimmed = h.slice(0, historyIdx + 1);
      trimmed.push(bytes);
      return trimmed.slice(-20);
    });
    setHistoryIdx((i) => Math.min(i + 1, 19));
  };

  const undo = () => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    const bytes = history2[newIdx];
    setLiveBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
  };
  const redo = () => {
    if (historyIdx >= history2.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const bytes = history2[newIdx];
    setLiveBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
  };

  if (!target || !liveBlob) {
    return (
      <ToolPageShell tool={tool} ctaLabel="" ctaDisabled>
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Drop a PDF above to start editing.
        </div>
      </ToolPageShell>
    );
  }

  const rotate = async (degrees: 90 | 180 | 270) => {
    try {
      startProgress(`Rotating page ${pageNum}…`, "determinate", 0);
      const out = await rotatePdfPage(liveBlob, pageNum - 1, degrees, (pct, msg) => updateProgress(msg, pct));
      updateBlob(out);
      stopProgress();
      toast.success(`Rotated page ${pageNum} by ${degrees}° (other pages unchanged)`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Rotate failed");
    }
  };

  const rotateAll = async (degrees: 90 | 180 | 270) => {
    try {
      startProgress(`Rotating every page ${degrees}°…`, "determinate", 0);
      const out = await rotateAllPages(liveBlob, degrees, (pct, msg) => updateProgress(msg, pct));
      updateBlob(out);
      stopProgress();
      toast.success(`Rotated every page by ${degrees}°`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Rotate all failed");
    }
  };

  const del = async () => {
    if (!confirm(`Delete page ${pageNum}? This cannot be undone via this dialog (but you can press Undo).`)) return;
    try {
      startProgress(`Deleting page ${pageNum}…`, "determinate", 0);
      const out = await deletePdfPage(liveBlob, pageNum - 1, (pct, msg) => updateProgress(msg, pct));
      updateBlob(out);
      stopProgress();
      toast.success(`Deleted page ${pageNum}`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const duplicate = async () => {
    try {
      startProgress(`Duplicating page ${pageNum}…`, "determinate", 0);
      const out = await duplicatePdfPage(liveBlob, pageNum - 1, (pct, msg) => updateProgress(msg, pct));
      updateBlob(out);
      stopProgress();
      toast.success(`Duplicated page ${pageNum}`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    }
  };

  const insertBlank = async () => {
    try {
      startProgress(`Inserting blank page after ${pageNum}…`, "determinate", 0);
      const out = await insertBlankPage(liveBlob, pageNum, (pct, msg) => updateProgress(msg, pct));
      updateBlob(out);
      stopProgress();
      toast.success(`Inserted blank page`);
      setPageNum((p) => p + 1);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Insert failed");
    }
  };

  const save = async () => {
    if (!liveBlob) return;
    // Bake any pending text items onto their pages
    let blob = liveBlob;
    const pending = textItems.filter((t) => !t.baked);
    for (const t of pending) {
      try {
        startProgress(`Baking text on page ${t.pageIndex + 1}…`);
        const out = await addTextToPage(blob, t.pageIndex, t.text, {
          x: t.x,
          y: t.y,
          size: t.size,
          color: t.color,
          font: "Helvetica",
        });
        blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      } catch (e) {
        // ignore single-page errors
      }
    }
    // Bake strokes
    for (const s of strokes) {
      try {
        // Rasterize stroke to a transparent PNG + its bounding box (in PDF points).
        const strokePng = await strokeToPng(s);
        if (strokePng.bytes.length === 0) continue;
        startProgress(`Baking drawing on page ${s.pageIndex + 1}…`);
        // Embed at the stroke's REAL bounding-box position + size (NOT full A4).
        // embedStrokeOnPage handles the Y-axis flip (screen top-down → PDF bottom-up).
        const out = await embedStrokeOnPage(blob, s.pageIndex, strokePng);
        blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      } catch (e) {
        // ignore
      }
    }
    setLiveBlob(blob);
    setTextItems((items) => items.map((t) => ({ ...t, baked: true })));
    setStrokes([]);
    stopProgress();
    setResult({
      blob,
      name: withExt(target.name, "-edited.pdf"),
      type: "application/pdf",
      ext: ".pdf",
      size: blob.size,
      beforeSize: target.size,
      beforePreviewUrl: makePreviewUrl(target.file),
    });
    setView("result");
    toast.success("Saved — review the result");
  };

  // Click handler: when text tool active, click on canvas drops a text box
  const onCanvasClick = (pageIndex: number, xRatio: number, yRatio: number) => {
    if (tool2 !== "text" || !liveBlob) return;
    // Get page dimensions (approximate A4 portrait)
    // We'll defer to actual page size via PdfPreview's overlay; use ratios
    // Use 595x842 fallback for the PDF coordinate space.
    const pageW = 595.28;
    const pageH = 841.89;
    const x = xRatio * pageW;
    const y = yRatio * pageH;
    setTextDraft({ x, y, pageIndex, value: "", size: 14, color: [0.12, 0.15, 0.2] });
  };

  const commitTextDraft = () => {
    if (!textDraft || !textDraft.value.trim()) {
      setTextDraft(null);
      return;
    }
    const item: TextItem = {
      id: `t${Date.now()}`,
      pageIndex: textDraft.pageIndex,
      x: textDraft.x,
      y: textDraft.y,
      text: textDraft.value,
      size: textDraft.size,
      color: textDraft.color,
      baked: false,
    };
    setTextItems((items) => [...items, item]);
    setTextDraft(null);
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Save changes" ctaColor="var(--cat-edit)" onCtaClick={save}>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row" style={{ height: "calc(100vh - 200px)", minHeight: "350px" }}>
        {/* Sidebar — vertical on desktop, horizontal scroll on mobile */}
        <div
          className="flex flex-row gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm thin-scroll sm:flex-col sm:w-16 sm:overflow-y-auto sm:overflow-x-hidden shrink-0"
        >
          <ToolButton onClick={undo} disabled={historyIdx <= 0} label="Undo last change" desc="Step back one change. Other pages stay the same.">
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton onClick={redo} disabled={historyIdx >= history2.length - 1} label="Redo" desc="Re-apply a change you just undid.">
            <Redo2 className="size-4" />
          </ToolButton>
          <div className="mx-1 h-8 w-px shrink-0 bg-[var(--border)] sm:mx-0 sm:my-1 sm:h-px sm:w-full" />
          <ToolButton onClick={() => setTool2("select")} active={tool2 === "select"} label="Select" desc="Move around without drawing anything.">
            <MousePointer2 className="size-4" />
          </ToolButton>
          <ToolButton onClick={() => setTool2("text")} active={tool2 === "text"} label="Add text" desc="Add text anywhere on the page.">
            <Type className="size-4" />
          </ToolButton>
          <ToolButton onClick={() => setTool2("draw")} active={tool2 === "draw"} label="Draw freehand" desc="Draw freehand on the page — strokes are baked in on Save.">
            <PenLine className="size-4" />
          </ToolButton>
          <div className="mx-1 h-8 w-px shrink-0 bg-[var(--border)] sm:mx-0 sm:my-1 sm:h-px sm:w-full" />
          <ToolButton onClick={() => rotate(90)} label={`Rotate page ${pageNum} clockwise`} desc={`Rotate this page clockwise (other pages stay the same)`}>
            <RotateCw className="size-4" />
          </ToolButton>
          <ToolButton onClick={() => rotate(270)} label={`Rotate page ${pageNum} counter-clockwise`} desc={`Rotate this page counter-clockwise (other pages stay the same)`}>
            <RotateCcw className="size-4" />
          </ToolButton>
          <ToolButton onClick={() => rotateAll(90)} label="Rotate ALL pages 90° clockwise" desc="Rotate every page in this PDF by 90° clockwise — a bulk action.">
            <span className="relative">
              <RotateCw className="size-4" />
              <span className="absolute -right-2 -top-2 rounded bg-[var(--cat-edit)] px-1 py-0 text-[8px] font-bold leading-tight text-white">ALL</span>
            </span>
          </ToolButton>
          <ToolButton onClick={duplicate} label={`Duplicate page ${pageNum}`} desc={`Make a copy of this page right after it.`}>
            <Copy className="size-4" />
          </ToolButton>
          <ToolButton onClick={insertBlank} label={`Insert blank page after ${pageNum}`} desc={`Add an empty page right after this one.`}>
            <Plus className="size-4" />
          </ToolButton>
          <ToolButton onClick={del} label={`Delete page ${pageNum}`} desc={`Remove this page from the PDF.`} danger>
            <Trash2 className="size-4" />
          </ToolButton>

          {/* Draw toolbar — inline in sidebar when draw is active */}
          {tool2 === "draw" && (
            <>
              <div className="mx-1 h-8 w-px shrink-0 bg-[var(--border)] sm:mx-0 sm:my-1 sm:h-px sm:w-full" />
              {["var(--foreground)", "var(--brand)", "var(--danger)", "var(--success)", "var(--cat-convert)"].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={cn("size-7 rounded-full border-2 transition-all hover:scale-110", penColor === c ? "border-[var(--brand)] scale-110" : "border-[var(--border)]")}
                  style={{ background: c }}
                  aria-label={`Pen color ${c}`}
                />
              ))}
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={penWidth}
                onChange={(e) => setPenWidth(parseFloat(e.target.value))}
                className="w-12 accent-[var(--cat-edit)]"
                title="Pen width"
              />
              <button
                onClick={() => setStrokes((s) => s.filter((st) => st.pageIndex !== pageNum - 1))}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                title="Clear strokes on this page"
              >
                Clear
              </button>
            </>
          )}

          <div className="mt-auto pt-2">
            <ToolButton onClick={save} label="Save and review the result" desc="Bake in all changes and go to the result screen." cta>
              <Save className="size-4" />
            </ToolButton>
          </div>
        </div>

        {/* Large PDF preview — takes the rest of the space */}
        <div className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="relative h-full">
            <PdfPreview
              blob={liveBlob}
              initialScale={0}
              onCanvasClick={onCanvasClick}
              renderOverlay={(pageIndex, pageW, pageH, scale) => (
                <EditOverlay
                  pageIndex={pageIndex}
                  pageW={pageW}
                  pageH={pageH}
                  scale={scale}
                  pageNum={pageNum}
                  setPageNum={setPageNum}
                  textItems={textItems}
                  strokes={strokes}
                  setStrokes={setStrokes}
                  tool2={tool2}
                  penColor={penColor}
                  penWidth={penWidth}
                  textDraft={textDraft}
                  setTextDraft={setTextDraft}
                  commitTextDraft={commitTextDraft}
                  setTextItems={setTextItems}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Help note — BELOW the sidebar+preview row (full width).
          Previously this sat INSIDE the sm:flex-row as a third flex item, where
          its long text ate ~1326px and left only ~2px for the preview, so the
          PDF canvas Fit-computed to a 30px-wide sliver ("picture not there"). */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
        <b className="text-[var(--foreground)]">Per-page rotation:</b> rotate / delete / duplicate buttons above operate on the
        page currently in view only — other pages are left untouched. Use the page navigation arrows in the preview
        toolbar to switch pages, or the +/- zoom controls.
      </div>
    </ToolPageShell>
  );
}

function EditOverlay(props: {
  pageIndex: number;
  pageW: number;
  pageH: number;
  scale: number;
  pageNum: number;
  setPageNum: (n: number | ((n: number) => number)) => void;
  textItems: TextItem[];
  strokes: DrawStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<DrawStroke[]>>;
  tool2: "select" | "text" | "draw";
  penColor: string;
  penWidth: number;
  textDraft: { x: number; y: number; pageIndex: number; value: string; size: number; color: [number, number, number] } | null;
  setTextDraft: React.Dispatch<React.SetStateAction<{ x: number; y: number; pageIndex: number; value: string; size: number; color: [number, number, number] } | null>>;
  commitTextDraft: () => void;
  setTextItems: React.Dispatch<React.SetStateAction<TextItem[]>>;
}) {
  const { pageIndex, pageW, pageH, scale, pageNum, setPageNum, textItems, strokes, setStrokes, tool2, penColor, penWidth, textDraft, setTextDraft, commitTextDraft, setTextItems } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<DrawStroke | null>(null);

  // Sync pageNum with the page being rendered (so toolbar actions target the right page)
  useEffect(() => {
    setPageNum(pageIndex + 1);
  }, [pageIndex, setPageNum]);

  // Redraw strokes for this page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = pageW * scale;
    canvas.height = pageH * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      // Defensive: never crash on a malformed stroke entry.
      if (!s || typeof s.pageIndex !== "number" || !Array.isArray(s.points) || s.points.length === 0) continue;
      if (s.pageIndex !== pageIndex) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * scale;
      ctx.beginPath();
      const pts = s.points;
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      ctx.stroke();
    }
  }, [strokes, pageIndex, scale, pageW, pageH]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool2 !== "draw") return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    drawingRef.current = { pageIndex, points: [{ x, y }], color: penColor, width: penWidth };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool2 !== "draw" || !drawingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    drawingRef.current.points.push({ x, y });
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = drawingRef.current.color;
    ctx.lineWidth = drawingRef.current.width * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = drawingRef.current.points;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x * scale, pts[pts.length - 2].y * scale);
    ctx.lineTo(pts[pts.length - 1].x * scale, pts[pts.length - 1].y * scale);
    ctx.stroke();
  };
  const onPointerUp = () => {
    if (tool2 !== "draw" || !drawingRef.current) return;
    // Capture the stroke by VALUE before clearing the ref, because the
    // setStrokes updater runs asynchronously and would otherwise read null.
    const stroke = drawingRef.current;
    if (stroke.points.length > 1) {
      setStrokes((s) => [...s, stroke]);
    }
    drawingRef.current = null;
  };

  return (
    <div className="absolute inset-0 pointer-events-auto" style={{ width: pageW * scale, height: pageH * scale }}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn("absolute inset-0", tool2 === "draw" ? "cursor-crosshair" : "cursor-default")}
        style={{ width: pageW * scale, height: pageH * scale }}
      />
      {/* Existing text items for this page */}
      {textItems
        .filter((t) => t.pageIndex === pageIndex)
        .map((t) => (
          <div
            key={t.id}
            className="absolute select-none rounded border border-[var(--brand)]/40 bg-[var(--card)]/80 px-1 text-[var(--foreground)]"
            style={{
              left: t.x * scale,
              top: t.y * scale,
              fontSize: t.size * scale,
              color: `rgb(${t.color.map((c) => Math.round(c * 255)).join(",")})`,
            }}
          >
            {t.text}
            {t.baked && <span className="ml-1 text-[8px] text-[var(--success)]">baked</span>}
            {!t.baked && (
              <button
                onClick={() => setTextItems((items) => items.filter((x) => x.id !== t.id))}
                className="ml-1 text-[10px] text-[var(--danger)]"
              >
                ×
              </button>
            )}
          </div>
        ))}
      {/* Draft text input */}
      {textDraft && textDraft.pageIndex === pageIndex && (
        <div
          className="absolute"
          style={{ left: textDraft.x * scale, top: textDraft.y * scale }}
        >
          <textarea
            autoFocus
            value={textDraft.value}
            onChange={(e) => setTextDraft((d) => (d ? { ...d, value: e.target.value } : d))}
            onBlur={commitTextDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitTextDraft();
              }
              if (e.key === "Escape") {
                setTextDraft(null);
              }
            }}
            placeholder="Type text… (Enter to add, Esc to cancel)"
            className="min-w-[120px] rounded border border-[var(--brand)] bg-[var(--card)] px-1 py-0.5 text-sm text-[var(--foreground)] outline-none"
            style={{
              fontSize: textDraft.size * scale,
              color: `rgb(${textDraft.color.map((c) => Math.round(c * 255)).join(",")})`,
            }}
          />
        </div>
      )}
    </div>
  );
}

async function strokeToPng(stroke: DrawStroke): Promise<{ bytes: Uint8Array; minX: number; minY: number; maxX: number; maxY: number; w: number; h: number; pad: number }> {
  // Rasterize the stroke to a transparent PNG sized to the stroke's bounding box + padding.
  // Returns the PNG bytes AND the bounding box (in PDF points) so the embed step can
  // place the image at the stroke's REAL position/size (not stretched to full A4).
  const pts = stroke.points;
  if (pts.length === 0) return { bytes: new Uint8Array(0), minX: 0, minY: 0, maxX: 0, maxY: 0, w: 1, h: 1, pad: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = stroke.width + 2;
  const w = Math.max(1, Math.ceil(maxX - minX + pad * 2));
  const h = Math.max(1, Math.ceil(maxY - minY + pad * 2));
  // Render at 2x DPI for crisp output, but embed at the 1:1 PDF-point size (w×h)
  // so the stroke stays at its true dimensions — a small line stays small.
  const dpi = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * dpi;
  canvas.height = h * dpi;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { bytes: new Uint8Array(0), minX, minY, maxX, maxY, w, h, pad };
  ctx.scale(dpi, dpi);
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(pts[0].x - minX + pad, pts[0].y - minY + pad);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x - minX + pad, pts[i].y - minY + pad);
  }
  ctx.stroke();
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"));
  const arr = new Uint8Array(await blob.arrayBuffer());
  return { bytes: arr, minX, minY, maxX, maxY, w, h, pad };
}

/**
 * ToolButton — toolbar button with a hover tooltip. Wraps the shadcn Tooltip
 * component and uses our CSS vars for consistent theming. The tooltip is
 * portaled and avoids viewport overflow via Radix's collision-aware positioning.
 */
function ToolButton({
  onClick,
  disabled,
  label,
  desc,
  active,
  danger,
  cta,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  desc: string;
  active?: boolean;
  danger?: boolean;
  cta?: boolean;
  children: React.ReactNode;
}) {
  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border w-11 h-11 sm:w-auto sm:h-auto px-2.5 py-2 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        cta
          ? "border-transparent bg-[var(--brand)] px-3 text-white font-bold shadow-sm hover:opacity-90"
          : active
            ? "border-[var(--cat-edit)] bg-[var(--cat-edit)]/10 text-[var(--cat-edit)]"
            : danger
              ? "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-[220px] text-center leading-snug border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-md"
      >
        <p className="font-semibold">{label}</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );
}

