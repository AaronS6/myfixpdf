"use client";

import { useEffect, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { reorderPdfPages } from "@/lib/pdf/pdf-ops";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { makePreviewUrl, withExt , isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { GripVertical, RotateCw, Download } from "lucide-react";

const tool = getTool("reorder-pdf")!;

type Page = { id: string; index: number; thumbnail: string };

export function ReorderPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const target = 
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinates: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!target) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let doc: Awaited<ReturnType<typeof loadPdfFromBlob>> | null = null;
    (async () => {
      try {
        doc = await loadPdfFromBlob(target.file);
        const total = doc.numPages;
        const arr: Page[] = [];
        for (let i = 1; i <= total; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // @ts-expect-error pdfjs legacy render context
            await page.render({ canvasContext: ctx, viewport }).promise;
            arr.push({ id: `p${i}`, index: i - 1, thumbnail: canvas.toDataURL("image/jpeg", 0.6) });
          }
          page.cleanup();
          if (arr.length % 4 === 0 || i === total) setPages([...arr]);
        }
        if (cancelled) return;
        setPages(arr);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
        if (doc) try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const run = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Reordering pages…", "determinate", 0);
      const newOrder = pages.map((p) => p.index);
      const bytes = await reorderPdfPages(target.file, newOrder, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: withExt(target.name, "-reordered.pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: target.size,
        beforePreviewUrl: makePreviewUrl(target.file),
      });
      addOperation({
        tool: "reorder-pdf",
        toolName: "Reordered pages",
        description: "Reordered pages in the PDF",
        icon: "reorder-pdf",
        color: "var(--cat-organize)",
      });
      stopProgress();
      setView("result");
      toast.success("Pages reordered");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Save New Order" ctaColor="var(--cat-organize)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm shadow-sm">
            <GripVertical className="size-4 text-[var(--cat-organize)]" />
            <span className="font-semibold text-[var(--foreground)]">Drag pages to reorder</span>
            <span className="text-xs text-[var(--muted-foreground)]">· {pages.length} pages total</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setPages((p) => [...p].reverse())}
                className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] dark:hover:bg-[var(--background)]"
              >
                Reverse order
              </button>
              <button
                onClick={() => setPages((p) => [...p].sort((a, b) => a.index - b.index))}
                className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] dark:hover:bg-[var(--background)]"
              >
                Reset to original
              </button>
            </div>
          </div>

          {loading && pages.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg border border-[var(--border)] skeleton" />
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {pages.map((p, displayIdx) => (
                    <SortablePageTile key={p.id} page={p} displayIdx={displayIdx} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <RotateCw className="size-4 shrink-0 text-[var(--cat-organize)]" />
            <p>Drag tiles to reorder pages. The new order is applied with pdf-lib&apos;s <code className="rounded bg-[var(--muted)] px-1">copyPages</code> — a true reorder, not a render.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Drop a PDF above to start reordering pages.
        </div>
      )}
    </ToolPageShell>
  );
}

function SortablePageTile({ page, displayIdx }: { page: Page; displayIdx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-[var(--border)] bg-[var(--card)]",
        isDragging && "border-[var(--cat-organize)] opacity-50 shadow-xl z-10",
      )}
    >
      <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded bg-[var(--cat-organize)] px-1.5 py-0.5 text-[10px] font-bold text-white">
        {displayIdx + 1}
      </div>
      <div className="absolute right-1 top-1 z-10 rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[9px] text-white">
        was {page.index + 1}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={page.thumbnail} alt={`Page ${page.index + 1}`} className="h-full w-full object-contain" />
      <button
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[var(--cat-organize)] py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" /> Drag
      </button>
    </div>
  );
}
