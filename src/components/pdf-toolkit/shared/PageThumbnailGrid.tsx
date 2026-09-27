"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfFromBlob } from "@/lib/pdf/pdfjs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Props = {
  blob: Blob;
  scale?: number; // 0..1 — render scale for thumbnail
  onThumbsReady?: (pages: { index: number; thumbnail: string }[]) => void;
  selected: Set<number>; // 0-based page indices
  onToggle?: (index: number) => void;
  onToggleAll?: (sel: boolean) => void;
  className?: string;
  pageSize?: number;
  showCheckbox?: boolean;
  perPageActions?: (index: number) => React.ReactNode;
};

export function PageThumbnailGrid({
  blob,
  scale = 0.35,
  onThumbsReady,
  selected,
  onToggle,
  onToggleAll,
  className,
  pageSize = 4,
  showCheckbox = true,
  perPageActions,
}: Props) {
  const [pages, setPages] = useState<Array<{ index: number; thumbnail: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let doc: Awaited<ReturnType<typeof loadPdfFromBlob>> | null = null;
    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        doc = await loadPdfFromBlob(blob);
        const n = doc.numPages;
        const arr: Array<{ index: number; thumbnail: string }> = [];
        for (let i = 1; i <= n; i++) {
          if (cancelledRef.current) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) throw new Error("Canvas 2D context unavailable");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // @ts-expect-error pdfjs legacy render context
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          arr.push({ index: i - 1, thumbnail: dataUrl });
          if (i % pageSize === 0 || i === n) {
            setPages([...arr]);
          }
          page.cleanup();
        }
        if (cancelledRef.current) return;
        setPages(arr);
        onThumbsReady?.(arr);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        if (!cancelledRef.current) setLoading(false);
        if (doc) {
          try {
            // pdfjs v6 PDFDocumentProxy exposes cleanup(), not destroy()
            void (doc as any).cleanup?.();
          } catch {
            // ignore
          }
        }
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, scale]);

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-sm text-[var(--danger)]">
        Could not render preview: {error}
      </div>
    );
  }

  const total = pages.length;
  const allSelected = total > 0 && selected.size === total;
  const noneSelected = selected.size === 0;

  return (
    <div className={cn("space-y-3", className)}>
      {(onToggleAll || showCheckbox) && onToggleAll && total > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onToggleAll(!allSelected)}
            className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            onClick={() => {
              // Toggle odd pages (1,3,5...)
              const odd = new Set<number>();
              for (let i = 0; i < total; i += 2) odd.add(i);
              onToggleAll(false);
              for (const i of odd) onToggle?.(i);
            }}
            className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            Odd
          </button>
          <button
            onClick={() => {
              const even = new Set<number>();
              for (let i = 1; i < total; i += 2) even.add(i);
              onToggleAll(false);
              for (const i of even) onToggle?.(i);
            }}
            className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            Even
          </button>
          <span className="ml-auto text-xs text-[var(--muted-foreground)]">
            {selected.size} of {total || "—"} selected
            {noneSelected && total > 0 && " · none"}
          </span>
        </div>
      )}
      {loading && pages.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Loader2 className="size-5 animate-spin mr-2" /> Rendering thumbnails…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pages.map((p) => {
            const isSel = selected.has(p.index);
            return (
              <div
                key={p.index}
                className={cn(
                  "group relative overflow-hidden rounded-lg border bg-[var(--card)] p-1.5 transition-all",
                  isSel
                    ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/30"
                    : "border-[var(--border)] hover:border-[var(--brand)]",
                )}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={`Page ${p.index + 1}`} className="h-full w-full object-contain" />
                  {showCheckbox && (
                    <div className="absolute right-1 top-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle?.(p.index);
                        }}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md border-2 text-white shadow-sm transition-all",
                          isSel ? "border-[var(--brand)] bg-[var(--brand)]" : "border-white bg-[var(--card)]/80 text-transparent group-hover:bg-[var(--card)]",
                        )}
                      >
                        <Checkbox checked={isSel} className="pointer-events-none size-3.5 border-0" />
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 rounded bg-[var(--foreground)]/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {p.index + 1}
                  </div>
                </div>
                {perPageActions?.(p.index)}
              </div>
            );
          })}
          {loading && pages.length > 0 && (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-[var(--border)]">
              <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
