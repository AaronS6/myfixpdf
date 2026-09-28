"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { imagesToPdf, mergeItemsToPdf, type MergeItem } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
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
import { X, GripVertical, FileText, Image as ImageIcon } from "lucide-react";

const tool = getTool("convert-to-pdf")!;

type OutputPage = "fit" | "a4" | "letter";
type Orientation = "portrait" | "landscape";

/**
 * Convert anything → PDF.
 * - All-PDF input: merge into one PDF (page order preserved).
 * - All-image input: each image becomes one PDF page (existing imagesToPdf path).
 * - Mixed PDF + image input: merge items in upload order (each PDF page copied,
 *   each image embedded on a page sized to the image).
 */
export function ConvertToPdf() {
  const { sourceFiles, setSourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [pageSize, setPageSize] = useState<OutputPage>("fit");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
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
      toast.error("Please add at least one file.");
      return;
    }
    try {
      startProgress("Building your PDF…", "determinate", 0);
      const hasPdf = included.some((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
      const hasImage = included.some((f) => f.type.startsWith("image/"));
      let outBytes: Uint8Array;
      if (hasPdf && hasImage) {
        // Mixed: merge items in upload order — every PDF page copied, every
        // image embedded on its own page sized to the image.
        const items: MergeItem[] = [];
        let total = 0;
        for (const f of included) {
          if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
            // Push every page from this PDF, preserving order.
            try {
              const { loadPdfFromBlob } = await import("@/lib/pdf/pdfjs");
              const doc = await loadPdfFromBlob(f.file);
              for (let i = 0; i < doc.numPages; i++) {
                items.push({ kind: "pdf-page", blob: f.file, pageIndex: i });
                total++;
              }
              try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
            } catch (err) {
              throw new Error(
                `Could not read PDF “${f.name}”: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          } else if (f.type.startsWith("image/")) {
            const bytes = new Uint8Array(await f.file.arrayBuffer());
            const isPng = f.ext === ".png" || f.type === "image/png";
            const dims = await imageDimensions(f.file);
            items.push({
              kind: "image",
              bytes,
              format: isPng ? "png" : "jpg",
              width: dims.w,
              height: dims.h,
            });
            total++;
          }
        }
        outBytes = await mergeItemsToPdf(items, (pct, msg) => updateProgress(msg, pct));
      } else if (hasPdf && !hasImage) {
        // All PDFs: merge them in upload order (use mergeItemsToPdf with all pages).
        const items: MergeItem[] = [];
        for (const f of included) {
          const { loadPdfFromBlob } = await import("@/lib/pdf/pdfjs");
          const doc = await loadPdfFromBlob(f.file);
          for (let i = 0; i < doc.numPages; i++) {
            items.push({ kind: "pdf-page", blob: f.file, pageIndex: i });
          }
          try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
        }
        outBytes = await mergeItemsToPdf(items, (pct, msg) => updateProgress(msg, pct));
      } else {
        // All images
        const items: Array<{ bytes: Uint8Array; format: "png" | "jpg"; width: number; height: number }> = [];
        for (const f of included) {
          const buf = await f.file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          const isPng = f.ext === ".png" || f.type === "image/png";
          const dims = await imageDimensions(f.file);
          items.push({ bytes, format: isPng ? "png" : "jpg", width: dims.w, height: dims.h });
        }
        outBytes = await imagesToPdf(items, { pageSize, orientation, margin }, (pct, msg) => updateProgress(msg, pct));
      }
      const blob = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
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
      addOperation({
        tool: "convert-to-pdf",
        toolName: "Converted to PDF",
        description: "Converted files to PDF",
        icon: "convert-to-pdf",
        color: "var(--cat-convert)",
      });
$1
      toast.success("PDF created");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  const anyImage = sourceFiles.some((f) => f.type.startsWith("image/"));
  const anyPdf = sourceFiles.some((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
  const isMixed = anyImage && anyPdf;
  const isAllImages = anyImage && !anyPdf;

  return (
    <ToolPageShell tool={tool} ctaLabel="Create PDF" ctaColor="var(--cat-convert)" onCtaClick={run}>
      {sourceFiles.length > 0 ? (
        <div className="mt-5 space-y-4">
          {/* Drag-and-drop reorder grid */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Drag to reorder pages</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sourceFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {sourceFiles.map((f, idx) => (
                    <SortableFileTile
                      key={f.id}
                      id={f.id}
                      src={f.thumbnail ?? makePreviewUrl(f.file)}
                      name={f.name}
                      index={idx}
                      size={f.size}
                      isPdf={f.type === "application/pdf" || /\.pdf$/i.test(f.name)}
                      onRemove={() => useDocumentSession.getState().removeSourceFile(f.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          {/* Settings — only meaningful for image-only mode */}
          {isAllImages && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-[var(--foreground)]">Page size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as OutputPage)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                >
                  <option value="fit">Fit to image</option>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--foreground)]">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as Orientation)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Margin (pt)</label>
                  <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{margin}</span>
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
          )}
          {isMixed && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
              <FileImage className="size-4 shrink-0 text-[var(--brand)]" />
              <p>
                You’ve mixed PDFs and images. We’ll merge them all into one PDF in the order shown — every PDF page copied, each image placed on its own page.
              </p>
            </div>
          )}
          {!isMixed && !isAllImages && anyPdf && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
              <FileText className="size-4 shrink-0 text-[var(--brand)]" />
              <p>All your files are PDFs — they’ll be merged into one PDF in the order shown.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Drop a PDF, JPG, or PNG above to convert it into a PDF.
        </div>
      )}
    </ToolPageShell>
  );
}

async function imageDimensions(file: File): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.width, h: im.height });
      im.onerror = () => reject(new Error("Failed to load image"));
      im.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SortableFileTile({
  id,
  src,
  name,
  index,
  size,
  isPdf,
  onRemove,
}: {
  id: string;
  src: string;
  name: string;
  index: number;
  size: number;
  isPdf: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-[var(--border)] bg-[var(--card)]",
        isDragging && "border-[var(--brand)] opacity-50 shadow-lg",
      )}
    >
      <div className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[10px] font-bold text-white">
        {index + 1}
      </div>
      <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[10px] font-bold text-white">
        {isPdf ? <FileText className="size-2.5" /> : <ImageIcon className="size-2.5" />}
        {isPdf ? "PDF" : "IMG"}
      </div>
      <button
        onClick={onRemove}
        className="absolute right-1 bottom-1 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--card)]/90 text-[var(--danger)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove"
      >
        <X className="size-3" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="h-full w-full object-contain" />
      <button
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[var(--foreground)]/70 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" /> Drag
      </button>
    </div>
  );
}
