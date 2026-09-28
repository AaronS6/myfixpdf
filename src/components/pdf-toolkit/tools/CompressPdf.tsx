"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { compressPdf, COMPRESSION_LEVELS, type CompressionLevel } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt, formatBytes, percentSaved, isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles, FileText, Archive } from "lucide-react";
import { useI18n } from "../shared/I18nProvider";

const tool = getTool("compress-pdf")!;

const LEVEL_LABELS_ZH: Record<CompressionLevel, string> = {
  light: "最佳质量",
  recommended: "推荐",
  extreme: "最小体积",
};
const LEVEL_DESCS_ZH: Record<CompressionLevel, string> = {
  light: "文件更大，质量最佳",
  recommended: "大小与质量平衡",
  extreme: "文件更小，质量较低",
};

export function CompressPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();
  const { t, tt, lang } = useI18n();
  const [level, setLevel] = useState<CompressionLevel>("recommended");

  const run = async () => {
    // Pick the first included PDF — skip images/DOCX that may persist
    // from a previous tool (sourceFiles follows the user across tools).
    const target =
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));
    if (!target) {
      toast.error(lang === "zh" ? "请先添加一个 PDF。" : "Please add a PDF first.");
      return;
    }
    try {
      startProgress(lang === "zh" ? "正在压缩你的 PDF…" : "Compressing your PDF…", "determinate", 0);
      const beforeSize = target.size;
      const beforeUrl = makePreviewUrl(target.file);
      const bytes = await compressPdf(target.file, level, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      // If we somehow produced a larger file, that's likely an already-optimized vector PDF; still show it.
      const savedPct = percentSaved(beforeSize, blob.size);
      if (savedPct < 5) {
        toast.info(t("tool.compress.alreadyOptimized"), { duration: 5000 });
      } else {
        toast.success(tt("toast.compressed", { before: formatBytes(beforeSize), after: formatBytes(blob.size), pct: savedPct }));
      }
      setResult({
        blob,
        name: withExt(target.name, ".pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize,
        beforePreviewUrl: beforeUrl,
      });
      addOperation({
        tool: "compress-pdf",
        toolName: lang === "zh" ? "压缩 PDF" : "Compressed PDF",
        description: lang === "zh"
          ? `从 ${formatBytes(beforeSize)} 压缩到 ${formatBytes(blob.size)}（${savedPct >= 0 ? `−${savedPct}%` : `+${Math.abs(savedPct)}%`}）`
          : `Reduced from ${formatBytes(beforeSize)} to ${formatBytes(blob.size)} (${savedPct >= 0 ? `−${savedPct}%` : `+${Math.abs(savedPct)}%`})`,
        icon: "compress",
        color: "var(--cat-compress)",
        beforeSize,
        afterSize: blob.size,
      });
      stopProgress();
      setView("result");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "压缩失败" : "Compression failed"));
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={t("tool.compress.cta")} ctaColor="var(--cat-compress)" onCtaClick={run}>
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{t("tool.compress.chooseLevel")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["light", "recommended", "extreme"] as CompressionLevel[]).map((lv) => {
            const preset = COMPRESSION_LEVELS[lv];
            const active = level === lv;
            const label = lang === "zh" ? LEVEL_LABELS_ZH[lv] : preset.label;
            const desc = lang === "zh" ? LEVEL_DESCS_ZH[lv] : preset.desc;
            return (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all",
                  active
                    ? "border-[var(--cat-compress)] bg-[var(--success)]/8"
                    : "border-[var(--border)] hover:border-[var(--cat-compress)]",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                  <Sparkles className="size-4" style={{ color: "var(--cat-compress)" }} />
                  {label}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{desc}</span>
                <span className="mt-1 text-[10px] font-medium uppercase text-[var(--muted-foreground)]">
                  ~{preset.dpi} DPI · JPEG q{(preset.quality * 100).toFixed(0)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
          <FileText className="size-4 shrink-0 text-[var(--brand)]" />
          <p>{t("tool.compress.info")}</p>
        </div>
        {sourceFiles.length > 1 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
            <Archive className="size-4 shrink-0 text-[var(--warning)]" />
            <p>{t("tool.compress.batchWarning")}</p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
