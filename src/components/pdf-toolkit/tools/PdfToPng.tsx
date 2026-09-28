"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { pdfToPngImages } from "@/lib/pdf/pdf-ops";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { withExt , isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileImage } from "lucide-react";
import { useI18n } from "../shared/I18nProvider";

const tool = getTool("pdf-to-png")!;

export function PdfToPng() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();
  const { t, tt, lang } = useI18n();
  const [scale, setScale] = useState(1.5);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Track total page count so onToggleAll(true) can actually add every
  // page index — PageThumbnailGrid only fires onToggleAll with a boolean,
  // so we need to know the count ourselves. Populated via onThumbsReady.
  const [pageCount, setPageCount] = useState(0);
  const target = 
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));

  const run = async () => {
    if (!target) {
      toast.error(lang === "zh" ? "请先添加一个 PDF。" : "Please add a PDF first.");
      return;
    }
    try {
      startProgress(
        lang === "zh" ? "正在把 PDF 渲染为 PNG…" : "Rendering PDF pages to PNG…",
        "determinate",
        0,
      );
      const all = await pdfToPngImages(target.file, scale, (pct, msg) => updateProgress(msg, pct));
      const filtered = selected.size > 0 ? all.filter((_, i) => selected.has(i)) : all;
      if (filtered.length === 0) {
        stopProgress();
        toast.error(lang === "zh" ? "未选择任何页面。" : "No pages selected.");
        return;
      }
      const results = filtered.map((r, i) => ({
        blob: new Blob([r.bytes as unknown as BlobPart], { type: "image/png" }),
        name: `${withExt(target.name, "")}-page-${i + 1}.png`,
        type: "image/png",
        size: r.bytes.length,
        previewUrl: r.previewUrl,
      }));
      setResult({
        blob: results[0].blob,
        name: results[0].name,
        type: "image/png",
        ext: ".png",
        size: results[0].size,
        results,
      });
      addOperation({
        tool: "pdf-to-png",
        toolName: "Exported as PNG",
        description: "Converted PDF pages to PNG images",
        icon: "pdf-to-png",
        color: "var(--cat-convert)",
      });
      stopProgress();
      setView("result");
      toast.success(
        tt("toast.exportedPng", { n: results.length }),
      );
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "转换失败" : "Conversion failed"));
    }
  };

  const ctaLabel =
    selected.size > 0
      ? lang === "zh"
        ? `导出 ${selected.size} 页为 PNG`
        : `Export ${selected.size} as PNG`
      : lang === "zh"
        ? "全部导出为 PNG"
        : "Export all as PNG";

  return (
    <ToolPageShell tool={tool} ctaLabel={ctaLabel} ctaColor="var(--cat-convert)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--foreground)]">
                  {t("tool.pdfToPng.renderScale")}
                </label>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">
                  {scale.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-[var(--cat-convert)]"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t("tool.pdfToPng.scaleHint")}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
              {t("tool.pdfToPng.selectPages")}
            </p>
            <p className="mb-2 text-xs text-[var(--muted-foreground)]">
              {t("tool.pdfToPng.selectPagesHint")}
            </p>
            <PageThumbnailGrid
              blob={target.file}
              selected={selected}
              onToggle={(i) =>
                setSelected((s) => {
                  const next = new Set(s);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              onToggleAll={(sel) => {
                // `sel === true` means "select all" — add every page index
                // 0..pageCount-1. The previous implementation just copied the
                // existing Set, which made "Select all" a no-op (the bug: the
                // button stayed useful only because the Odd/Even helpers call
                // onToggleAll(false) first and then per-index toggles).
                // The Odd/Even helpers in PageThumbnailGrid still work after
                // this change because they call onToggleAll(false) then
                // onToggle(i) for each odd/even index.
                if (sel) {
                  const next = new Set<number>();
                  for (let i = 0; i < pageCount; i++) next.add(i);
                  setSelected(next);
                } else {
                  setSelected(new Set());
                }
              }}
              onThumbsReady={(pages) => {
                setPageCount(pages.length);
              }}
            />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <FileImage className="size-4 shrink-0 text-[var(--brand)]" />
            <p>{t("tool.pdfToPng.info")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          {t("tool.pdfToPng.empty")}
        </div>
      )}
    </ToolPageShell>
  );
}
