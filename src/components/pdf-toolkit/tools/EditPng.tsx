"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { downloadBlob, isPng, isJpg, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import {
  MousePointer2,
  PenLine,
  Type,
  Square,
  Circle as CircleIcon,
  Highlighter,
  Crop as CropIcon,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("edit-png")!;

type ToolKind =
  | "select"
  | "draw"
  | "text"
  | "rect"
  | "circle"
  | "highlighter"
  | "crop";

type Stroke = {
  id: string;
  kind: "draw" | "highlighter";
  points: Array<{ x: number; y: number }>; // canvas pixel coords
  color: string;
  width: number;
};

type Shape = {
  id: string;
  kind: "rect" | "circle";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fill: boolean;
};

type TextItem = {
  id: string;
  x: number;
  y: number;
  value: string;
  color: string;
  size: number;
};

type Snapshot = {
  strokes: Stroke[];
  shapes: Shape[];
  texts: TextItem[];
  rotation: number;
  imgWidth: number;
  imgHeight: number;
};

const PEN_COLORS = ["#1A1A1A", "#2563EB", "#2F855A", "#1D4ED8", "#B5346C", "#D97706"];

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  ctx.save();
  if (s.kind === "highlighter") {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "multiply";
  }
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) {
    ctx.lineTo(s.points[i].x, s.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function EditPng() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  // Pick the first included image file — skip any PDFs/DOCX that may have
  // been left in the persistent session from another tool.
  const target =
    sourceFiles.find((f) => f.included && (isPng(f.file) || isJpg(f.file))) ??
    sourceFiles.find((f) => isPng(f.file) || isJpg(f.file));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const draftStartRef = useRef<{ x: number; y: number } | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [imageFormat, setImageFormat] = useState<"png" | "jpg">("png");
  const [rotation, setRotation] = useState(0); // 0/90/180/270
  const [tool2, setTool2] = useState<ToolKind>("select");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [draft, setDraft] = useState<Stroke | Shape | null>(null);
  const [textDraft, setTextDraft] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  // Load image as HTMLImageElement for rendering to canvas.
  useEffect(() => {
    if (!target) {
      setImageLoaded(false);
      setImageDims(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      setImageFormat(isPng(target.file) ? "png" : "jpg");
      setImageLoaded(true);
      setRotation(0);
      setStrokes([]);
      setShapes([]);
      setTexts([]);
      setUndoStack([]);
      setRedoStack([]);
    };
    img.onerror = () => {
      toast.error("Could not load image.");
    };
    img.src = URL.createObjectURL(target.file);
    return () => {
      URL.revokeObjectURL(img.src);
      imgElRef.current = null;
    };
  }, [target]);

  // Displayed canvas size — fit within a max viewport while preserving
  // aspect ratio. Account for rotation (swap dims at 90/270).
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!imageDims) return;
    const rotated = rotation === 90 || rotation === 270;
    const baseW = rotated ? imageDims.h : imageDims.w;
    const baseH = rotated ? imageDims.w : imageDims.h;
    const maxW = 900;
    const maxH = 600;
    const scale = Math.min(maxW / baseW, maxH / baseH, 1);
    setDisplaySize({
      w: Math.round(baseW * scale),
      h: Math.round(baseH * scale),
    });
  }, [imageDims, rotation]);

  // The conversion factor from canvas pixel coords → original image pixels
  // (for crop & save).
  const getScale = useCallback(() => {
    if (!imageDims || !displaySize) return 1;
    const rotated = rotation === 90 || rotation === 270;
    const baseW = rotated ? imageDims.h : imageDims.w;
    return baseW / displaySize.w;
  }, [imageDims, displaySize, rotation]);

  // Re-render the canvas: image + annotations + draft.
  // If `target` is supplied, render to that offscreen canvas instead of the
  // live `canvasRef` (used by applyCrop to extract the crop region without
  // the draft-rectangle stroke burned into the pixels).
  // If `skipDraft` is true, the in-progress draft stroke/shape is omitted —
  // used when extracting a crop so the user's crop rectangle isn't baked
  // into the resulting image as a black border.
  const renderCanvas = useCallback(
    (opts?: { target?: HTMLCanvasElement; skipDraft?: boolean }) => {
      const canvas = opts?.target ?? canvasRef.current;
      const img = imgElRef.current;
      if (!canvas || !img || !displaySize) return;
      // Always size the target to displaySize — for the live canvas this
      // matches what the user sees; for an offscreen crop canvas this
      // establishes the correct backing-store dimensions.
      canvas.width = displaySize.w;
      canvas.height = displaySize.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear & paint background (white — JPGs may have alpha).
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image with rotation. We translate to center, rotate,
      // then draw image centered.
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      const rotated = rotation === 90 || rotation === 270;
      const drawW = rotated ? canvas.height : canvas.width;
      const drawH = rotated ? canvas.width : canvas.height;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Draw shapes (under strokes for cleaner layering).
      for (const s of shapes) {
        ctx.save();
        if (s.kind === "rect") {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.w === 0 ? 1 : 2; // not used; use penWidth style
          ctx.lineWidth = penWidth;
          if (s.fill) {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x, s.y, s.w, s.h);
          } else {
            ctx.strokeRect(s.x, s.y, s.w, s.h);
          }
        } else if (s.kind === "circle") {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = penWidth;
          ctx.beginPath();
          const rx = Math.abs(s.w) / 2;
          const ry = Math.abs(s.h) / 2;
          ctx.ellipse(
            s.x + s.w / 2,
            s.y + s.h / 2,
            rx,
            ry,
            0,
            0,
            Math.PI * 2,
          );
          if (s.fill) {
            ctx.fillStyle = s.color;
            ctx.fill();
          } else {
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Draw draft shape (rectangle/circle drag) — skipped when extracting
      // a crop so the draft rectangle's stroke doesn't end up baked into
      // the resulting image.
      if (!opts?.skipDraft) {
        if (draft && draft.kind === "rect") {
          const d = draft as Shape;
          ctx.save();
          ctx.strokeStyle = d.color;
          ctx.lineWidth = penWidth;
          ctx.strokeRect(d.x, d.y, d.w, d.h);
          ctx.restore();
        } else if (draft && draft.kind === "circle") {
          const d = draft as Shape;
          ctx.save();
          ctx.strokeStyle = d.color;
          ctx.lineWidth = penWidth;
          ctx.beginPath();
          ctx.ellipse(
            d.x + d.w / 2,
            d.y + d.h / 2,
            Math.abs(d.w) / 2,
            Math.abs(d.h) / 2,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
          ctx.restore();
        } else if (draft && (draft.kind === "draw" || draft.kind === "highlighter")) {
          drawStroke(ctx, draft as Stroke);
        }
      }

      // Draw strokes.
      for (const s of strokes) {
        drawStroke(ctx, s);
      }

      // Draw text items.
      for (const t of texts) {
        ctx.save();
        ctx.fillStyle = t.color;
        ctx.font = `${t.size}px Inter, Helvetica, Arial, sans-serif`;
        ctx.textBaseline = "top";
        // Handle multi-line text.
        const lines = t.value.split("\n");
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], t.x, t.y + i * t.size * 1.2);
        }
        ctx.restore();
      }

      // Draw text draft — also skipped when extracting a crop (otherwise
      // the half-typed text would be baked into the crop output).
      if (!opts?.skipDraft && textDraft) {
        ctx.save();
        ctx.fillStyle = penColor;
        ctx.font = `${Math.max(14, penWidth * 4)}px Inter, Helvetica, Arial, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(textDraft.value || "", textDraft.x, textDraft.y);
        ctx.restore();
      }
    },
    [displaySize, rotation, shapes, strokes, texts, draft, textDraft, penWidth, penColor],
  );

  // Re-render whenever state changes.
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Push current state to undo stack, clear redo.
  const snapshot = (): Snapshot => ({
    strokes: strokes.map((s) => ({ ...s, points: [...s.points] })),
    shapes: shapes.map((s) => ({ ...s })),
    texts: texts.map((t) => ({ ...t })),
    rotation,
    imgWidth: imageDims?.w ?? 0,
    imgHeight: imageDims?.h ?? 0,
  });

  const pushUndo = () => {
    setUndoStack((s) => [...s.slice(-19), snapshot()]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) {
      toast.info("Nothing to undo.");
      return;
    }
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((s) => [...s, snapshot()]);
    setStrokes(prev.strokes.map((s) => ({ ...s, points: [...s.points] })));
    setShapes(prev.shapes.map((s) => ({ ...s })));
    setTexts(prev.texts.map((t) => ({ ...t })));
    setRotation(prev.rotation);
    setUndoStack((s) => s.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) {
      toast.info("Nothing to redo.");
      return;
    }
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, snapshot()]);
    setStrokes(next.strokes.map((s) => ({ ...s, points: [...s.points] })));
    setShapes(next.shapes.map((s) => ({ ...s })));
    setTexts(next.texts.map((t) => ({ ...t })));
    setRotation(next.rotation);
    setRedoStack((s) => s.slice(0, -1));
  };

  // Pointer handlers — convert client coords to canvas pixel coords.
  const getCanvasPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool2 === "select") return;
    const { x, y } = getCanvasPos(e);
    draftStartRef.current = { x, y };

    if (tool2 === "draw" || tool2 === "highlighter") {
      drawingRef.current = true;
      pushUndo();
      setDraft({
        id: `s-${Date.now()}`,
        kind: tool2,
        points: [{ x, y }],
        color: penColor,
        width: penWidth,
      });
    } else if (tool2 === "rect" || tool2 === "circle") {
      drawingRef.current = true;
      pushUndo();
      setDraft({
        id: `sh-${Date.now()}`,
        kind: tool2,
        x,
        y,
        w: 0,
        h: 0,
        color: penColor,
        fill: false,
      });
    } else if (tool2 === "text") {
      // Drop a text box if editing mode is off, otherwise commit current.
      if (textDraft) {
        commitTextDraft();
      }
      setTextDraft({ x, y, value: "" });
      setEditingTextId(null);
    } else if (tool2 === "crop") {
      drawingRef.current = true;
      setDraft({
        id: `cr-${Date.now()}`,
        kind: "rect",
        x,
        y,
        w: 0,
        h: 0,
        color: "var(--brand)",
        fill: false,
      });
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !draftStartRef.current) return;
    const { x, y } = getCanvasPos(e);
    if (tool2 === "draw" || tool2 === "highlighter") {
      setDraft((d) => {
        if (!d || !(d.kind === "draw" || d.kind === "highlighter")) return d;
        const s = d as Stroke;
        return { ...s, points: [...s.points, { x, y }] };
      });
    } else if (tool2 === "rect" || tool2 === "circle" || tool2 === "crop") {
      const start = draftStartRef.current;
      setDraft((d) => {
        if (!d) return d;
        const sh = d as Shape;
        return {
          ...sh,
          x: Math.min(start.x, x),
          y: Math.min(start.y, y),
          w: Math.abs(x - start.x),
          h: Math.abs(y - start.y),
        };
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drawingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!draftStartRef.current) return;
    if (tool2 === "draw" || tool2 === "highlighter") {
      setDraft((d) => {
        if (d && (d.kind === "draw" || d.kind === "highlighter")) {
          setStrokes((prev) => [...prev, d as Stroke]);
        }
        return null;
      });
    } else if (tool2 === "rect" || tool2 === "circle") {
      setDraft((d) => {
        if (d && (d.kind === "rect" || d.kind === "circle")) {
          const sh = d as Shape;
          if (sh.w > 4 && sh.h > 4) {
            setShapes((prev) => [...prev, sh]);
          }
        }
        return null;
      });
    }
    draftStartRef.current = null;
  };

  const commitTextDraft = () => {
    if (!textDraft) return;
    if (!textDraft.value.trim()) {
      setTextDraft(null);
      return;
    }
    pushUndo();
    setTexts((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        x: textDraft.x,
        y: textDraft.y,
        value: textDraft.value,
        color: penColor,
        size: Math.max(14, penWidth * 4),
      },
    ]);
    setTextDraft(null);
  };

  const rotate = (direction: "cw" | "ccw") => {
    pushUndo();
    setRotation((r) => {
      const delta = direction === "cw" ? 90 : -90;
      const next = (r + delta + 360) % 360;
      return next;
    });
  };

  const applyCrop = () => {
    if (!draft || draft.kind !== "rect") {
      toast.error("Drag a rectangle on the image with the Crop tool first.");
      return;
    }
    const rect = draft as Shape;
    if (rect.w < 4 || rect.h < 4) {
      toast.error("Crop rectangle is too small.");
      return;
    }
    setBusy(true);
    try {
      const scale = getScale();
      // The draft rectangle (rect.x/y/w/h) is in CANVAS backing-store pixel
      // coords (same coord space the canvas uses). When we call drawImage we
      // must pass the SOURCE rectangle in those same canvas pixel coords —
      // NOT in scaled original-image pixels. Earlier code multiplied rect
      // coords by `scale` before passing them as the source rect, which
      // shifted + scaled the extracted region to the wrong part of the image
      // (only correct when scale === 1). The destination canvas is sized to
      // the original-image pixel resolution (rect.w * scale × rect.h * scale)
      // so the crop is exported at full source quality.
      const srcX = Math.max(0, rect.x);
      const srcY = Math.max(0, rect.y);
      const srcW = Math.max(1, rect.w);
      const srcH = Math.max(1, rect.h);
      const cropW = Math.max(1, Math.round(rect.w * scale));
      const cropH = Math.max(1, Math.round(rect.h * scale));

      // Render the image (with rotation + existing annotations) to a FRESH
      // offscreen canvas, skipping the in-progress draft rectangle. The live
      // canvas has the crop rectangle's stroke baked in — if we extracted
      // from the live canvas, the black draft stroke would end up as a black
      // border around the cropped image. By rendering fresh + skipDraft, we
      // get a clean image (image + committed annotations only) to crop from.
      const sourceCanvas = document.createElement("canvas");
      renderCanvas({ target: sourceCanvas, skipDraft: true });

      // Create the destination canvas with the cropped region.
      const tmp = document.createElement("canvas");
      tmp.width = cropW;
      tmp.height = cropH;
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(sourceCanvas, srcX, srcY, srcW, srcH, 0, 0, cropW, cropH);
      const dataUrl = tmp.toDataURL(imageFormat === "png" ? "image/png" : "image/jpeg", 0.92);

      // Load the new image and replace our imgEl.
      const newImg = new Image();
      newImg.onload = () => {
        imgElRef.current = newImg;
        setImageDims({ w: cropW, h: cropH });
        setStrokes([]);
        setShapes([]);
        setTexts([]);
        setRotation(0);
        setDraft(null);
        setBusy(false);
        toast.success(`Cropped to ${cropW}×${cropH}px`);
      };
      newImg.onerror = () => {
        setBusy(false);
        toast.error("Crop failed.");
      };
      newImg.src = dataUrl;
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Crop failed");
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("Nothing to save yet.");
      return;
    }
    setBusy(true);
    try {
      const mime = imageFormat === "png" ? "image/png" : "image/jpeg";
      const quality = imageFormat === "png" ? undefined : 0.92;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            toast.error("Could not export image.");
            return;
          }
          setResult({
            blob,
            name: withExt(target?.name ?? "edited", `.${imageFormat}`),
            type: mime,
            ext: `.${imageFormat}`,
            size: blob.size,
            beforeSize: target?.size,
          });
          setBusy(false);
          setView("result");
          toast.success("Image saved");
        },
        mime,
        quality,
      );
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const downloadNow = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = imageFormat === "png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        downloadBlob(blob, withExt(target?.name ?? "edited", `.${imageFormat}`));
      },
      mime,
      0.92,
    );
  };

  const clearAll = () => {
    pushUndo();
    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setDraft(null);
    setTextDraft(null);
    toast.success("Cleared annotations");
  };

  const TOOLS: Array<{ id: ToolKind; label: string; icon: React.ReactNode }> = [
    { id: "select", label: "Select", icon: <MousePointer2 className="size-4" /> },
    { id: "draw", label: "Draw", icon: <PenLine className="size-4" /> },
    { id: "text", label: "Text", icon: <Type className="size-4" /> },
    { id: "rect", label: "Rectangle", icon: <Square className="size-4" /> },
    { id: "circle", label: "Circle", icon: <CircleIcon className="size-4" /> },
    { id: "highlighter", label: "Highlighter", icon: <Highlighter className="size-4" /> },
    { id: "crop", label: "Crop", icon: <CropIcon className="size-4" /> },
  ];

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel="Save Image"
      ctaColor="var(--cat-compress)"
      onCtaClick={save}
      ctaDisabled={!imageLoaded}
    >
      {target && imageLoaded && imageDims ? (
        <div className="mt-5 space-y-4">
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm shadow-sm"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <div className="flex flex-wrap gap-1">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (textDraft) commitTextDraft();
                    setTool2(t.id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                    tool2 === t.id ? "text-white shadow-sm" : "",
                  )}
                  style={{
                    borderColor: tool2 === t.id ? "transparent" : "var(--border)",
                    background: tool2 === t.id ? "var(--brand)" : "transparent",
                    color: tool2 === t.id ? "#fff" : "var(--foreground)",
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Color picker */}
              <div className="flex items-center gap-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all hover:scale-110",
                      penColor === c ? "scale-110" : "",
                    )}
                    style={{
                      background: c,
                      borderColor: penColor === c ? "var(--brand)" : "var(--border)",
                    }}
                    title={`Color ${c}`}
                    aria-label={`Pick color ${c}`}
                  />
                ))}
              </div>

              {/* Stroke width */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Width
                </span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={penWidth}
                  onChange={(e) => setPenWidth(parseInt(e.target.value, 10))}
                  className="w-20"
                  style={{ accentColor: "var(--brand)" }}
                />
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold"
                  style={{
                    background: "var(--muted)",
                    color: "var(--foreground)",
                  }}
                >
                  {penWidth}px
                </span>
              </div>

              {/* Rotate / Undo / Redo / Clear */}
              <div className="flex gap-1">
                <button
                  onClick={() => rotate("ccw")}
                  className="flex size-7 items-center justify-center rounded-md border transition-all hover:scale-105"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    background: "transparent",
                  }}
                  title="Rotate 90° CCW"
                  aria-label="Rotate 90° CCW"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  onClick={() => rotate("cw")}
                  className="flex size-7 items-center justify-center rounded-md border transition-all hover:scale-105"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    background: "transparent",
                  }}
                  title="Rotate 90° CW"
                  aria-label="Rotate 90° CW"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <button
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md border transition-all hover:scale-105",
                    undoStack.length === 0 && "cursor-not-allowed opacity-50",
                  )}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    background: "transparent",
                  }}
                  title="Undo"
                  aria-label="Undo"
                >
                  <Undo2 className="size-3.5" />
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md border transition-all hover:scale-105",
                    redoStack.length === 0 && "cursor-not-allowed opacity-50",
                  )}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    background: "transparent",
                  }}
                  title="Redo"
                  aria-label="Redo"
                >
                  <Redo2 className="size-3.5" />
                </button>
                <button
                  onClick={clearAll}
                  className="flex size-7 items-center justify-center rounded-md border transition-all hover:scale-105"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--danger)",
                    background: "transparent",
                  }}
                  title="Clear annotations"
                  aria-label="Clear annotations"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Preview canvas + active text input */}
          <div className="grid gap-4 lg:grid-cols-4">
            <div
              className="overflow-hidden rounded-xl border shadow-sm lg:col-span-3"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div className="relative">
                <div
                  ref={overlayRef}
                  className="flex items-center justify-center p-4"
                  style={{ background: "var(--muted)" }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="block rounded-lg shadow-md"
                    style={{
                      cursor:
                        tool2 === "select"
                          ? "default"
                          : tool2 === "text"
                            ? "text"
                            : "crosshair",
                      touchAction: "none",
                      maxWidth: "100%",
                      maxHeight: "600px",
                    }}
                  />
                </div>
                {/* Text draft overlay */}
                {textDraft && (
                  <div
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      className="flex flex-col gap-1 rounded-lg border p-2"
                      style={{
                        borderColor: "var(--brand)",
                        background: "var(--card)",
                        pointerEvents: "auto",
                        minWidth: 260,
                      }}
                    >
                      <label
                        className="text-xs font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        Text content
                      </label>
                      <textarea
                        autoFocus
                        value={textDraft.value}
                        onChange={(e) =>
                          setTextDraft((td) =>
                            td ? { ...td, value: e.target.value } : td,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            commitTextDraft();
                          } else if (e.key === "Escape") {
                            setTextDraft(null);
                          }
                        }}
                        placeholder="Type text. Cmd+Enter to add."
                        className="rounded-md border px-2 py-1.5 text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--foreground)",
                          background: "var(--card)",
                        }}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setTextDraft(null)}
                          className="rounded-md border px-2 py-1 text-xs"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--muted-foreground)",
                            background: "transparent",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={commitTextDraft}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                          style={{ background: "var(--brand)" }}
                        >
                          Add text
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: info + apply crop */}
            <div className="space-y-3">
              <div
                className="rounded-xl border p-3 text-sm shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Image
                </p>
                <p
                  className="mt-1 text-sm font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {imageDims.w} × {imageDims.h}px
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Format: {imageFormat.toUpperCase()}
                  {rotation !== 0 ? ` · rotated ${rotation}°` : ""}
                </p>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {strokes.length} stroke{strokes.length === 1 ? "" : "s"} ·{" "}
                  {shapes.length} shape{shapes.length === 1 ? "" : "s"} ·{" "}
                  {texts.length} text{texts.length === 1 ? "" : "s"}
                </p>
              </div>

              {tool2 === "crop" && (
                <button
                  onClick={applyCrop}
                  disabled={busy || !draft}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02]",
                    (busy || !draft) && "cursor-not-allowed opacity-50",
                  )}
                  style={{ background: "var(--brand)" }}
                >
                  <CropIcon className="size-3.5" /> Apply crop
                </button>
              )}

              <button
                onClick={downloadNow}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  background: "transparent",
                }}
              >
                Download now
              </button>
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
            <Save className="size-4 shrink-0" style={{ color: "var(--cat-compress)" }} />
            <p>Draw, add text, and shapes — your edits save automatically when you click <b>Save Image</b>.</p>
          </div>
        </div>
      ) : target ? (
        <div
          className="mt-5 rounded-xl border border-dashed p-12 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          Loading image…
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
          Drop a PNG or JPG above to start annotating.
        </div>
      )}
    </ToolPageShell>
  );
}
