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
  embedImageOnPage,
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
  PenTool,
  MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [penColor, setPenColor] = useState("#1AA8E0");
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
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#F7F9FC] p-6 text-center text-sm text-[#5B6B79]">
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
        // Rasterize stroke to a transparent PNG and embed
        const pngBytes = await strokeToPng(s);
        startProgress(`Baking drawing on page ${s.pageIndex + 1}…`);
        const out = await embedImageOnPage(blob, s.pageIndex, pngBytes, "png", {
          x: 0,
          y: 0,
          width: 595.28, // A4 fallback — overlay scaled in PdfPreview based on page dimensions
          height: 841.89,
        });
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
      <div className="mt-5 space-y-4">
        {/* Toolbar */}
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-[#E4E9F0] bg-white p-2 shadow-sm">
          <button
            onClick={undo}
            disabled={historyIdx <= 0}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC] disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIdx >= history2.length - 1}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC] disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="size-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-[#E4E9F0]" />
          <button
            onClick={() => setTool2("select")}
            className={cn("flex size-9 items-center justify-center rounded-lg border", tool2 === "select" ? "border-[#FF4B6E] bg-[#FF4B6E]/10 text-[#FF4B6E]" : "border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]")}
            title="Select"
          >
            <MousePointer2 className="size-4" />
          </button>
          <button
            onClick={() => setTool2("text")}
            className={cn("flex size-9 items-center justify-center rounded-lg border", tool2 === "text" ? "border-[#FF4B6E] bg-[#FF4B6E]/10 text-[#FF4B6E]" : "border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]")}
            title="Add text"
          >
            <Type className="size-4" />
          </button>
          <button
            onClick={() => setTool2("draw")}
            className={cn("flex size-9 items-center justify-center rounded-lg border", tool2 === "draw" ? "border-[#FF4B6E] bg-[#FF4B6E]/10 text-[#FF4B6E]" : "border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]")}
            title="Draw"
          >
            <PenLine className="size-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-[#E4E9F0]" />
          <button
            onClick={() => rotate(90)}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
            title={`Rotate page ${pageNum} clockwise (only this page)`}
          >
            <RotateCw className="size-4" />
          </button>
          <button
            onClick={() => rotate(270)}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
            title={`Rotate page ${pageNum} counter-clockwise (only this page)`}
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={duplicate}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
            title={`Duplicate page ${pageNum}`}
          >
            <Copy className="size-4" />
          </button>
          <button
            onClick={insertBlank}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#F7F9FC]"
            title={`Insert blank page after ${pageNum}`}
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={del}
            className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] hover:bg-[#FEE2E2] hover:text-[#F04438]"
            title={`Delete page ${pageNum}`}
          >
            <Trash2 className="size-4" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FF4B6E] to-[#FF8A00] px-3 py-2 text-sm font-bold text-white shadow-sm"
            >
              <Save className="size-4" /> Save
            </button>
          </div>
        </div>

        {/* Draw toolbar */}
        {tool2 === "draw" && (
          <div className="flex items-center gap-3 rounded-xl border border-[#E4E9F0] bg-white p-2 text-sm">
            <PenTool className="size-4 text-[#FF4B6E]" />
            <span className="text-xs font-medium text-[#5B6B79]">Draw on page {pageNum} — strokes are baked in on Save.</span>
            <div className="ml-auto flex items-center gap-2">
              {["#1D2733", "#1AA8E0", "#F04438", "#1FB65B", "#FF8A00"].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={cn("size-6 rounded-full border-2", penColor === c ? "border-[#1AA8E0] scale-110" : "border-[#E4E9F0]")}
                  style={{ background: c }}
                />
              ))}
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={penWidth}
                onChange={(e) => setPenWidth(parseFloat(e.target.value))}
                className="w-24 accent-[#FF4B6E]"
              />
              <span className="text-xs">{penWidth}px</span>
              <button
                onClick={() => setStrokes((s) => s.filter((st) => st.pageIndex !== pageNum - 1))}
                className="rounded-md border border-[#E4E9F0] px-2 py-1 text-xs text-[#5B6B79] hover:bg-[#F7F9FC]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* PDF preview + overlay */}
        <div className="overflow-hidden rounded-2xl border border-[#E4E9F0] bg-white shadow-sm">
          <div className="relative h-[70vh]">
            <PdfPreview
              blob={liveBlob}
              initialScale={1}
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

        <div className="rounded-lg border border-[#E4E9F0] bg-[#F7F9FC] p-3 text-xs text-[#5B6B79]">
          <b className="text-[#1D2733]">Per-page rotation:</b> rotate / delete / duplicate buttons above operate on the
          page currently in view only — other pages are left untouched. Use the page navigation arrows in the preview
          toolbar to switch pages, or the +/- zoom controls.
        </div>
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
      if (s.pageIndex !== pageIndex) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * scale;
      ctx.beginPath();
      const pts = s.points;
      if (pts.length === 0) continue;
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
    if (drawingRef.current.points.length > 1) {
      setStrokes((s) => [...s, drawingRef.current!]);
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
            className="absolute select-none rounded border border-[#1AA8E0]/40 bg-white/80 px-1 text-[#1D2733]"
            style={{
              left: t.x * scale,
              top: t.y * scale,
              fontSize: t.size * scale,
              color: `rgb(${t.color.map((c) => Math.round(c * 255)).join(",")})`,
            }}
          >
            {t.text}
            {t.baked && <span className="ml-1 text-[8px] text-[#1FB65B]">baked</span>}
            {!t.baked && (
              <button
                onClick={() => setTextItems((items) => items.filter((x) => x.id !== t.id))}
                className="ml-1 text-[10px] text-[#F04438]"
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
            className="min-w-[120px] rounded border border-[#1AA8E0] bg-white px-1 py-0.5 text-sm text-[#1D2733] outline-none"
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

async function strokeToPng(stroke: DrawStroke): Promise<Uint8Array> {
  // Rasterize the stroke to a transparent PNG sized to the stroke's bounding box + padding.
  const pts = stroke.points;
  if (pts.length === 0) return new Uint8Array(0);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = stroke.width + 2;
  const w = Math.max(1, Math.ceil(maxX - minX + pad * 2));
  const h = Math.max(1, Math.ceil(maxY - minY + pad * 2));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array(0);
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
  return arr;
}
