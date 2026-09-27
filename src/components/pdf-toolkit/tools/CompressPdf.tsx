"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { compressPdf, COMPRESSION_LEVELS, type CompressionLevel } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt, formatBytes, percentSaved } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles, FileText, Archive } from "lucide-react";

const tool = getTool("compress-pdf")!;

export function CompressPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [level, setLevel] = useState<CompressionLevel>("recommended");

  const run = async () => {
    const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Compressing your PDF…", "determinate", 0);
      const beforeSize = target.size;
      const beforeUrl = makePreviewUrl(target.file);
      const bytes = await compressPdf(target.file, level, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      // If we somehow produced a larger file, that's likely an already-optimized vector PDF; still show it.
      const savedPct = percentSaved(beforeSize, blob.size);
      if (savedPct < 5) {
        toast.info("This PDF is already well-optimized. Savings were minimal.", { duration: 5000 });
      } else {
        toast.success(`Compressed: ${formatBytes(beforeSize)} → ${formatBytes(blob.size)} (−${savedPct}%)`);
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
      stopProgress();
      setView("result");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Compression failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Compress PDF" ctaColor="var(--cat-compress)" onCtaClick={run}>
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Choose a compression level</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["light", "recommended", "extreme"] as CompressionLevel[]).map((lv) => {
            const preset = COMPRESSION_LEVELS[lv];
            const active = level === lv;
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
                  {preset.label}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{preset.desc}</span>
                <span className="mt-1 text-[10px] font-medium uppercase text-[var(--muted-foreground)]">
                  ~{preset.dpi} DPI · JPEG q{(preset.quality * 100).toFixed(0)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
          <FileText className="size-4 shrink-0 text-[var(--brand)]" />
          <p>Pick a quality level — smaller files reduce quality slightly, larger files keep it crisp.</p>
        </div>
        {sourceFiles.length > 1 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
            <Archive className="size-4 shrink-0 text-[#F5A623]" />
            <p>Batch mode: the first included file will be compressed first. After compressing it, run again for the next file from the result screen.</p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
