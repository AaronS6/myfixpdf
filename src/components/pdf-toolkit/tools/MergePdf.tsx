"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession, type ToolkitFile } from "@/store/document-session";
import { mergeItemsToPdf, type MergeItem } from "@/lib/pdf/pdf-ops";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { makePreviewUrl, withExt, formatBytes, imageThumbnail, getExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Combine, FileText, Image as ImageIcon, ChevronDown, X, Plus, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const tool = getTool("merge-pdf")!;

type FlatPage = {
  id: string;
  sourceFileId: string;
  sourceName: string;
  pageIndex: number; // 0-based within source PDF; -1 for image files
  isImage: boolean;
  thumbnail?: string;
  included: boolean;
};

export function MergePdf() {
  const { sourceFiles, updateSourceFile, setResult, setView, startProgress, updateProgress, stopProgress, addSourceFiles, addOperation } = useDocumentSession();
  const [flatPages, setFlatPages] = useState<FlatPage[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");

  const sensors = useSensor(PointerSensor, { activationConstraint: { distance: 4 } });

  // Build flat page list when sourceFiles change
  useEffect(() => {
    (async () => {
      const pages: FlatPage[] = [];
      for (const f of sourceFiles) {
        const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
        if (isPdf) {
          // Only render page 1 thumbnail by default; expand to render all
          try {
            const doc = await loadPdfFromBlob(f.file);
            // Render just the first page for the collapsed view
            const page = await doc.getPage(1);
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
              const thumb = canvas.toDataURL("image/jpeg", 0.6);
              // Use the ACTUAL page count from the loaded PDF doc (doc.numPages),
              // NOT f.pageCount — which is often undefined/stale because the store's
              // addSourceFiles doesn't compute pageCount. Using f.pageCount caused the
              // merge to only include ONE file's worth of pages (the loop didn't run
              // for PDFs with undefined pageCount).
              for (let i = 0; i < doc.numPages; i++) {
                pages.push({
                  id: `${f.id}-p${i}`,
                  sourceFileId: f.id,
                  sourceName: f.name,
                  pageIndex: i,
                  isImage: false,
                  thumbnail: i === 0 ? thumb : undefined,
                  included: true,
                });
              }
            }
            try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
          } catch (e) {
            toast.error(`Could not read “${f.name}”`);
          }
        } else {
          // image
          let thumb = f.thumbnail;
          if (!thumb) {
            try {
              thumb = await imageThumbnail(f.file, 220);
            } catch {
              // ignore
            }
          }
          pages.push({
            id: `${f.id}-img`,
            sourceFileId: f.id,
            sourceName: f.name,
            pageIndex: -1,
            isImage: true,
            thumbnail: thumb,
            included: true,
          });
        }
      }
      setFlatPages(pages);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFiles]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFlatPages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const togglePage = (id: string) => {
    setFlatPages((ps) => ps.map((p) => (p.id === id ? { ...p, included: !p.included } : p)));
  };

  const expandPdf = async (fileId: string) => {
    const f = sourceFiles.find((x) => x.id === fileId);
    if (!f) return;
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
    if (!expanded.has(fileId)) {
      // Render all pages
      try {
        const doc = await loadPdfFromBlob(f.file);
        const total = doc.numPages;
        const updated: Record<number, string> = {};
        for (let i = 1; i <= total; i++) {
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
            updated[i - 1] = canvas.toDataURL("image/jpeg", 0.6);
          }
          page.cleanup();
        }
        try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
        setFlatPages((ps) =>
          ps.map((p) => (p.sourceFileId === fileId && !p.isImage && updated[p.pageIndex] ? { ...p, thumbnail: updated[p.pageIndex] } : p)),
        );
      } catch (e) {
        // ignore
      }
    }
  };

  const included = flatPages.filter((p) => p.included);
  const totalSize = sourceFiles.filter((f) => f.included).reduce((a, b) => a + b.size, 0);

  const run = async () => {
    if (included.length === 0) {
      toast.error("No pages selected for merge.");
      return;
    }
    try {
      startProgress("Merging your files…", "determinate", 0);
      // Prepare merge items
      const fileBlobCache = new Map<string, Blob>();
      const items: MergeItem[] = [];
      for (const p of included) {
        const f = sourceFiles.find((x) => x.id === p.sourceFileId);
        if (!f) continue;
        if (p.isImage) {
          const bytes = new Uint8Array(await f.file.arrayBuffer());
          const isPng = f.ext === ".png" || f.type === "image/png";
          // Get dims
          const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const url = URL.createObjectURL(f.file);
            const im = new Image();
            im.onload = () => {
              URL.revokeObjectURL(url);
              resolve({ w: im.width, h: im.height });
            };
            im.onerror = () => reject(new Error("Failed to load image"));
            im.src = url;
          });
          items.push({ kind: "image", bytes, format: isPng ? "png" : "jpg", width: dims.w, height: dims.h });
        } else {
          if (!fileBlobCache.has(f.id)) fileBlobCache.set(f.id, f.file);
          items.push({ kind: "pdf-page", blob: fileBlobCache.get(f.id)!, pageIndex: p.pageIndex });
        }
      }
      const out = await mergeItemsToPdf(items, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: "merged.pdf",
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: totalSize,
        beforePreviewUrl: makePreviewUrl(included[0]?.thumbnail ? dataUrlToBlob(included[0].thumbnail!) : (sourceFiles[0]?.file ?? new Blob())),
      });
      addOperation({
        tool: "merge-pdf",
        toolName: "Merged files",
        description: `Combined ${included.length} pages from ${sourceFiles.filter(f => f.included).length} files into one PDF (${formatBytes(blob.size)})`,
        icon: "merge",
        color: "var(--cat-organize)",
        beforeSize: totalSize,
        afterSize: blob.size,
      });
      stopProgress();
      setView("result");
      toast.success(`Merged ${items.length} pages into one PDF`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Merge failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={`Merge ${included.length} pages`} ctaColor="var(--cat-organize)" onCtaClick={run}>
      {flatPages.length > 0 ? (
        <div className="mt-5 space-y-4">
          {/* Review header */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <Layers className="size-4 text-[var(--cat-organize)]" />
            <span className="font-semibold text-[var(--foreground)]">{included.length} pages will be merged</span>
            <span className="text-xs text-[var(--muted-foreground)]">·</span>
            <span className="text-xs text-[var(--muted-foreground)]">{sourceFiles.length} source file{sourceFiles.length > 1 ? "s" : ""}</span>
            <span className="text-xs text-[var(--muted-foreground)]">·</span>
            <span className="text-xs text-[var(--muted-foreground)]">Total size: {formatBytes(totalSize)}</span>
            <div className="ml-auto flex gap-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Page size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as "fit" | "a4" | "letter")}
                className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--foreground)] outline-none"
              >
                <option value="fit">Fit to image</option>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Drag tiles to reorder. Uncheck any page you don&apos;t want included. Click a PDF thumbnail to expand its individual pages.
          </p>

          <DndContext sensors={[sensors]} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={flatPages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {flatPages.map((p) => (
                  <SortableMergeTile
                    key={p.id}
                    page={p}
                    onToggle={() => togglePage(p.id)}
                    onExpand={() => expandPdf(p.sourceFileId)}
                    isExpanded={expanded.has(p.sourceFileId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add more files inline */}
          <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] py-3 text-sm font-medium text-[var(--muted-foreground)] hover:border-[var(--cat-organize)] hover:text-[var(--cat-organize)] cursor-pointer">
            <Plus className="size-4" /> Add more files
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                const newToolkit: ToolkitFile[] = [];
                for (const f of files) {
                  const ext = getExt(f.name);
                  const tf: ToolkitFile = {
                    id: `m${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    file: f,
                    name: f.name,
                    type: f.type || (ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg"),
                    ext,
                    size: f.size,
                    included: true,
                  };
                  if (tf.type.startsWith("image/")) tf.thumbnail = await imageThumbnail(f, 220).catch(() => undefined);
                  newToolkit.push(tf);
                }
                addSourceFiles(newToolkit);
              }}
            />
          </label>

          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <Combine className="size-4 shrink-0 text-[var(--cat-organize)]" />
            <p>
              Accepts mixed PDF + JPG + PNG. Expand any PDF to cherry-pick individual pages. Every page is dragged into the
              exact final order before the merge runs.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Loading files…
        </div>
      )}
    </ToolPageShell>
  );
}

function SortableMergeTile({ page, onToggle, onExpand, isExpanded }: { page: FlatPage; onToggle: () => void; onExpand: () => void; isExpanded: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 bg-[var(--card)]",
        page.included ? "border-[var(--border)]" : "border-[var(--border)] opacity-50",
        isDragging && "border-[var(--cat-organize)] opacity-50 shadow-lg",
      )}
    >
      <div className="absolute left-1 top-1 z-10 rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[10px] font-bold text-white">
        {page.isImage ? <ImageIcon className="size-3" /> : <FileText className="size-3" />}
      </div>
      <button
        onClick={onToggle}
        className={cn(
          "absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 text-white transition-all",
          page.included ? "border-[var(--success)] bg-[var(--success)]" : "border-[var(--border)] bg-[var(--card)]/80 text-transparent",
        )}
        aria-label={page.included ? "Exclude" : "Include"}
      >
        ✓
      </button>
      <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] p-2" {...attributes} {...listeners}>
        {page.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.thumbnail} alt={page.sourceName} className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center text-[var(--muted-foreground)]">
            <FileText className="size-8" />
            <span className="mt-1 text-[10px]">Page {page.pageIndex + 1}</span>
          </div>
        )}
      </div>
      {!page.isImage && (
        <button
          onClick={onExpand}
          className="absolute bottom-1 left-1 z-10 flex items-center gap-0.5 rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ChevronDown className={cn("size-3 transition-transform", isExpanded && "rotate-180")} />
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      )}
      <p className="absolute bottom-1 right-1 max-w-[70%] truncate rounded bg-[var(--foreground)]/70 px-1 py-0.5 text-[9px] text-white">
        {page.sourceName}
      </p>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: "image/jpeg" });
}
