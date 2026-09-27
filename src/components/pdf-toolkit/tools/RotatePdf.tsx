"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { rotateAllPages, rotatePdfPage } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { RotateCw, RotateCcw, Undo2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "../shared/I18nProvider";

const tool = getTool("rotate-pdf")!;

export function RotatePdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  const { t, tt, lang } = useI18n();
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  // Live working blob — starts as the original, mutated by each rotate op.
  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  // Simple history stack (Uint8Array snapshots) so Undo works.
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [rotationCount, setRotationCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Reset blob/history when the source file changes.
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
      setRotationCount(0);
    }
  }, [target]);

  const pageCount = useMemo(() => target?.pageCount ?? 0, [target]);

  const pushHistory = (bytes: Uint8Array) => {
    setHistory((h) => {
      const next = h.slice(-15); // cap at 16 snapshots
      next.push(bytes);
      return next;
    });
  };

  const applyBlob = (bytes: Uint8Array) => {
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    setLiveBlob(blob);
    pushHistory(bytes);
    setRotationCount((c) => c + 1);
  };

  const rotateAll = async (direction: "cw" | "ccw") => {
    if (!liveBlob || busy) return;
    const rotation: 90 | 180 | 270 = direction === "cw" ? 90 : 270;
    setBusy(true);
    try {
      startProgress(lang === "zh" ? `正在旋转所有页面 ${direction === "cw" ? "90° 顺时针" : "90° 逆时针"}…` : `Rotating all pages ${direction === "cw" ? "90° CW" : "90° CCW"}…`, "determinate", 0);
      const bytes = await rotateAllPages(liveBlob, rotation, (pct, msg) =>
        updateProgress(msg, pct),
      );
      applyBlob(bytes);
      stopProgress();
      toast.success(tt("toast.rotatedAll", { dir: direction === "cw" ? (lang === "zh" ? "90° 顺时针" : "90° clockwise") : (lang === "zh" ? "90° 逆时针" : "90° counter-clockwise") }));
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "旋转失败" : "Rotate failed"));
    } finally {
      setBusy(false);
    }
  };

  const rotateOne = async (pageIndex: number, direction: "cw" | "ccw") => {
    if (!liveBlob || busy) return;
    const rotation: 90 | 180 | 270 = direction === "cw" ? 90 : 270;
    setBusy(true);
    try {
      startProgress(lang === "zh" ? `正在旋转第 ${pageIndex + 1} 页…` : `Rotating page ${pageIndex + 1}…`, "determinate", 0);
      // rotatePdfPage only touches the requested index — other pages stay put.
      const bytes = await rotatePdfPage(liveBlob, pageIndex, rotation, (pct, msg) =>
        updateProgress(msg, pct),
      );
      applyBlob(bytes);
      stopProgress();
      toast.success(tt("toast.rotatedPage", { n: pageIndex + 1, dir: direction === "cw" ? (lang === "zh" ? "90° 顺时针" : "90° CW") : (lang === "zh" ? "90° 逆时针" : "90° CCW") }));
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "旋转失败" : "Rotate failed"));
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    if (history.length < 2 || !liveBlob) {
      toast.info(t("tool.rotate.undoEmpty"));
      return;
    }
    const prev = history[history.length - 2];
    const prevCopy = new Uint8Array(prev); // copy so we don't mutate the snapshot
    const blob = new Blob([prevCopy as unknown as BlobPart], { type: "application/pdf" });
    setLiveBlob(blob);
    setHistory((h) => h.slice(0, -1));
    setRotationCount((c) => Math.max(0, c - 1));
    toast.success(t("toast.undone"));
  };

  const save = async () => {
    if (!liveBlob || !target) {
      toast.error(lang === "zh" ? "请先添加一个 PDF。" : "Please add a PDF first.");
      return;
    }
    setResult({
      blob: liveBlob,
      name: withExt(target.name, "-rotated.pdf"),
      type: "application/pdf",
      ext: ".pdf",
      size: liveBlob.size,
      beforeSize: target.size,
      beforePreviewUrl: makePreviewUrl(target.file),
    });
    setView("result");
    toast.success(t("toast.rotatedSaved"));
  };

  // PageThumbnailGrid calls onToggle — we don't actually need selection here,
  // but we provide a per-page rotate button row via perPageActions.
  const noopSelected = useMemo(() => new Set<number>(), []);

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel={t("tool.rotate.saveCta")}
      ctaColor="var(--cat-organize)"
      onCtaClick={save}
      ctaDisabled={!liveBlob || rotationCount === 0}
    >
      {target ? (
        <div className="mt-5 space-y-4">
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm shadow-sm"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <RotateCw className="size-4" style={{ color: "var(--cat-organize)" }} />
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>
              {t("tool.rotate.quickRotate")}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              · {pageCount || "—"} {lang === "zh" ? "页" : "pages"} · {rotationCount} {lang === "zh" ? "次旋转已应用" : `rotation${rotationCount === 1 ? "" : "s"} applied`}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => rotateAll("cw")}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02]",
                  busy && "cursor-not-allowed opacity-50",
                )}
                style={{ background: "var(--cat-organize)" }}
              >
                <RotateCw className="size-3.5" /> {t("tool.rotate.rotateAllCw")}
              </button>
              <button
                onClick={() => rotateAll("ccw")}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02]",
                  busy && "cursor-not-allowed opacity-50",
                )}
                style={{ background: "var(--cat-organize)" }}
              >
                <RotateCcw className="size-3.5" /> {t("tool.rotate.rotateAllCcw")}
              </button>
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
                <Undo2 className="size-3.5" /> {t("tool.rotate.undo")}
              </button>
            </div>
          </div>

          {/* Thumbnail grid with per-page rotate buttons */}
          {liveBlob ? (
            <PageThumbnailGrid
              blob={liveBlob}
              selected={noopSelected}
              showCheckbox={false}
              perPageActions={(index: number) => (
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void rotateOne(index, "ccw");
                    }}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md border text-[10px] transition-all hover:scale-110 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                      background: "var(--card)",
                    }}
                    title={lang === "zh" ? `旋转第 ${index + 1} 页 90° 逆时针` : `Rotate page ${index + 1} 90° CCW`}
                    aria-label={lang === "zh" ? `旋转第 ${index + 1} 页 90° 逆时针` : `Rotate page ${index + 1} 90° CCW`}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void rotateOne(index, "cw");
                    }}
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-md border text-[10px] transition-all hover:scale-110 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                      background: "var(--card)",
                    }}
                    title={lang === "zh" ? `旋转第 ${index + 1} 页 90° 顺时针` : `Rotate page ${index + 1} 90° CW`}
                    aria-label={lang === "zh" ? `旋转第 ${index + 1} 页 90° 顺时针` : `Rotate page ${index + 1} 90° CW`}
                  >
                    <RotateCw className="size-3.5" />
                  </button>
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
              {t("tool.rotate.loadingPages")}
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
              {t("tool.rotate.info")}
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
          {t("tool.rotate.empty")}
        </div>
      )}
    </ToolPageShell>
  );
}
