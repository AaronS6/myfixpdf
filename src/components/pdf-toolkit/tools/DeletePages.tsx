"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { deletePdfPage } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { X, Undo2, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("delete-pages")!;

export function DeletePages() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  const target = 
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));

  // Live working blob — mutated by each delete op.
  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  // History stack (Uint8Array snapshots) for Undo.
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  // Reset blob/history when source changes.
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
      setRemaining(target.pageCount ?? 0);
    }
  }, [target]);

  const noopSelected = useMemo(() => new Set<number>(), []);

  const pushHistory = (bytes: Uint8Array) => {
    setHistory((h) => {
      const next = h.slice(-15);
      next.push(bytes);
      return next;
    });
  };

  const removePage = async (pageIndex: number) => {
    if (!liveBlob || busy) return;
    if (remaining <= 1) {
      toast.error("Can't delete the last remaining page.");
      return;
    }
    setBusy(true);
    try {
      startProgress(`Deleting page ${pageIndex + 1}…`, "determinate", 0);
      const bytes = await deletePdfPage(liveBlob, pageIndex, (pct, msg) =>
        updateProgress(msg, pct),
      );
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setLiveBlob(blob);
      pushHistory(bytes);
      setRemaining((r) => r - 1);
      stopProgress();
      toast.success(`Deleted page ${pageIndex + 1}`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  const undo = () => {
    if (history.length < 2 || !liveBlob) {
      toast.info("Nothing to undo.");
      return;
    }
    const prev = history[history.length - 2];
    const prevCopy = new Uint8Array(prev);
    const blob = new Blob([prevCopy as unknown as BlobPart], { type: "application/pdf" });
    setLiveBlob(blob);
    setHistory((h) => h.slice(0, -1));
    // Recompute page count lazily by reading blob size — or just increment.
    // For accurate count, we'd need to load; instead, fall back to original.
    setRemaining((r) => r + 1);
    toast.success("Undid last delete");
  };

  const save = () => {
    if (!liveBlob || !target) {
      toast.error("Please add a PDF first.");
      return;
    }
    if (remaining === 0) {
      toast.error("No pages left to save.");
      return;
    }
    setResult({
      blob: liveBlob,
      name: withExt(target.name, "-trimmed.pdf"),
      type: "application/pdf",
      ext: ".pdf",
      size: liveBlob.size,
      beforeSize: target.size,
      beforePreviewUrl: makePreviewUrl(target.file),
    });
    setView("result");
    toast.success("Trimmed PDF saved");
  };

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel="Save Trimmed PDF"
      ctaColor="var(--cat-organize)"
      onCtaClick={save}
      ctaDisabled={!liveBlob || remaining === 0 || history.length < 2}
    >
      {target ? (
        <div className="mt-5 space-y-4">
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm shadow-sm"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <Trash2 className="size-4" style={{ color: "var(--danger)" }} />
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>
              Delete pages
            </span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              · {remaining} page{remaining === 1 ? "" : "s"} remaining
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={undo}
                disabled={busy || history.length < 2}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  (busy || history.length < 2) && "cursor-not-allowed opacity-50",
                )}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  background: "transparent",
                }}
              >
                <Undo2 className="size-3.5" /> Undo
              </button>
            </div>
          </div>

          {/* Thumbnail grid with per-page delete buttons */}
          {liveBlob ? (
            <PageThumbnailGrid
              blob={liveBlob}
              selected={noopSelected}
              showCheckbox={false}
              perPageActions={(index: number) => (
                <div className="mt-1.5 flex items-center justify-center">
                  {pendingDelete === index ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void removePage(index);
                        }}
                        disabled={busy}
                        className="rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-sm disabled:opacity-50"
                        style={{ background: "var(--danger)" }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(null);
                        }}
                        className="rounded-md border px-2 py-1 text-[10px] font-medium"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                          background: "var(--card)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(index);
                      }}
                      disabled={busy || remaining <= 1}
                      className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        borderColor: "var(--danger)",
                        color: "var(--danger)",
                        background: "var(--card)",
                      }}
                      title={`Delete page ${index + 1}`}
                      aria-label={`Delete page ${index + 1}`}
                    >
                      <X className="size-3" /> Delete
                    </button>
                  )}
                </div>
              )}
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

          <div
            className="flex items-start gap-2 rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            <Save className="size-4 shrink-0" style={{ color: "var(--cat-organize)" }} />
            <p>
              Click <b>Delete</b> on any thumbnail to remove that page. Confirm with the prompt.
              <b>Undo</b> restores the previous state. The toolbar shows how many pages remain.
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
          Drop a PDF above to start deleting pages.
        </div>
      )}
    </ToolPageShell>
  );
}
