"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { imagesToPdf } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt, formatBytes } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileImage } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { X, GripVertical } from "lucide-react";

const tool = getTool("jpg-to-pdf")!;

export function JpgToPdf() {
  const { sourceFiles, setSourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState(20);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinates: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSourceFiles((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const run = async () => {
    const included = sourceFiles.filter((f) => f.included);
    if (included.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }
    try {
      startProgress("Building PDF from images…", "determinate", 0);
      const items: Array<{ bytes: Uint8Array; format: "png" | "jpg"; width: number; height: number }> = [];
      for (const f of included) {
        const buf = await f.file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isPng = f.ext === ".png" || f.type === "image/png";
        // Get natural dimensions
        const url = URL.createObjectURL(f.file);
        const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve({ w: im.width, h: im.height });
          im.onerror = () => reject(new Error("Failed to load image"));
          im.src = url;
        });
        URL.revokeObjectURL(url);
        items.push({ bytes, format: isPng ? "png" : "jpg", width: dims.w, height: dims.h });
      }
      const out = await imagesToPdf(items, { pageSize, orientation, margin }, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      const first = included[0];
      setResult({
        blob,
        name: withExt(first.name, ".pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: included.reduce((a, b) => a + b.size, 0),
        beforePreviewUrl: makePreviewUrl(first.file),
      });
      stopProgress();
      setView("result");
      toast.success("PDF created");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Create PDF" ctaColor="var(--cat-convert)" onCtaClick={run}>
      {sourceFiles.length > 0 ? (
        <div className="mt-5 space-y-4">
          {/* Drag-and-drop reorder grid */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[#1D2733]">Drag to reorder pages</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sourceFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {sourceFiles.map((f, idx) => (
                    <SortableImageTile key={f.id} id={f.id} src={f.thumbnail ?? makePreviewUrl(f.file)} name={f.name} index={idx} size={f.size} onRemove={() => useDocumentSession.getState().removeSourceFile(f.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          {/* Settings */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-[#1D2733]">Page size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as "fit" | "a4" | "letter")}
                className="mt-1 w-full rounded-lg border border-[#E4E9F0] bg-white px-3 py-2 text-sm text-[#1D2733] outline-none focus:border-[#1AA8E0]"
              >
                <option value="fit">Fit to image</option>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1D2733]">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                className="mt-1 w-full rounded-lg border border-[#E4E9F0] bg-white px-3 py-2 text-sm text-[#1D2733] outline-none focus:border-[#1AA8E0]"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1D2733]">Margin (pt)</label>
                <span className="rounded-md bg-[#EEF3F8] px-2 py-0.5 text-xs font-bold text-[#1D2733]">{margin}</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="2"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--cat-convert)]"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-[#E4E9F0] bg-[#F7F9FC] p-3 text-xs text-[#5B6B79]">
            <FileImage className="size-4 shrink-0 text-[#1AA8E0]" />
            <p>Drag tiles to reorder. Pages are sized to your chosen page size; images are scaled to fit with the chosen margin.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#F7F9FC] p-6 text-center text-sm text-[#5B6B79]">
          Drop JPG / PNG images above to start.
        </div>
      )}
    </ToolPageShell>
  );
}

function SortableImageTile({ id, src, name, index, size, onRemove }: { id: string; src: string; name: string; index: number; size: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-[#E4E9F0] bg-white",
        isDragging && "border-[#1AA8E0] opacity-50 shadow-lg",
      )}
    >
      <div className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-[#1D2733]/70 px-1 py-0.5 text-[10px] font-bold text-white">
        {index + 1}
      </div>
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-white/90 text-[#F04438] opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove"
      >
        <X className="size-3" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="h-full w-full object-contain" />
      <button
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#1D2733]/70 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" /> Drag
      </button>
    </div>
  );
}
