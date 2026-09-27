"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { makePreviewUrl, withExt, formatBytes, isPng, isJpg } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { RefreshCw, Download, Archive } from "lucide-react";
import { useI18n } from "../shared/I18nProvider";

const tool = getTool("image-converter")!;

type Converted = { blob: Blob; name: string; size: number; previewUrl: string; originalName: string };

export function ImageConverter() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [targetFormat, setTargetFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(0.9);
  const [results, setResults] = useState<Converted[] | null>(null);
  const { t, tTool, lang } = useI18n();

  const imageFiles = sourceFiles.filter((f) => isPng(f.file) || isJpg(f.file));

  const run = async () => {
    if (imageFiles.length === 0) {
      toast.error(lang === "zh" ? "请先添加图片文件" : "Please add image files first.");
      return;
    }
    try {
      startProgress(lang === "zh" ? "转换图片中…" : "Converting images…", "determinate", 0);
      const converted: Converted[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const f = imageFiles[i];
        const url = URL.createObjectURL(f.file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error("Failed to load image"));
          im.src = url;
        });
        URL.revokeObjectURL(url);

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        if (targetFormat === "jpg") {
          // White background for JPG (no alpha)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const mime = targetFormat === "png" ? "image/png" : "image/jpeg";
        const blob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to convert"))), mime, targetFormat === "jpg" ? quality : undefined),
        );

        const name = withExt(f.name, `.${targetFormat}`);
        const previewUrl = makePreviewUrl(blob);
        converted.push({ blob, name, size: blob.size, previewUrl, originalName: f.name });

        if (imageFiles.length > 1) {
          updateProgress(`Converting ${i + 1}/${imageFiles.length}…`, Math.round(((i + 1) / imageFiles.length) * 100));
        }
      }

      setResults(converted);
      stopProgress();

      if (converted.length === 1) {
        setResult({
          blob: converted[0].blob,
          name: converted[0].name,
          type: targetFormat === "png" ? "image/png" : "image/jpeg",
          ext: `.${targetFormat}`,
          size: converted[0].size,
          beforeSize: imageFiles[0].size,
          beforePreviewUrl: makePreviewUrl(imageFiles[0].file),
        });
        setView("result");
      } else {
        // Multi — set first as result but also include all in results array
        setResult({
          blob: converted[0].blob,
          name: converted[0].name,
          type: targetFormat === "png" ? "image/png" : "image/jpeg",
          ext: `.${targetFormat}`,
          size: converted.reduce((a, b) => a + b.size, 0),
          results: converted.map((c) => ({ blob: c.blob, name: c.name, type: targetFormat === "png" ? "image/png" : "image/jpeg", size: c.size, previewUrl: c.previewUrl })),
        });
        setView("result");
      }
      toast.success(lang === "zh" ? `已转换 ${converted.length} 张图片` : `Converted ${converted.length} image${converted.length > 1 ? "s" : ""}`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={lang === "zh" ? "转换图片" : "Convert Images"} ctaColor="var(--cat-convert)" onCtaClick={run}>
      {imageFiles.length > 0 ? (
        <div className="mt-5 space-y-4">
          {/* Format selector */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
              {lang === "zh" ? "目标格式" : "Target format"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetFormat("png")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${targetFormat === "png" ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
              >
                PNG {lang === "zh" ? "（无损）" : "(lossless)"}
              </button>
              <button
                onClick={() => setTargetFormat("jpg")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${targetFormat === "jpg" ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
              >
                JPG {lang === "zh" ? "（更小）" : "(smaller)"}
              </button>
            </div>
          </div>

          {/* Quality slider (JPG only) */}
          {targetFormat === "jpg" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--foreground)]">
                  {lang === "zh" ? "质量" : "Quality"}
                </label>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-[var(--brand)]"
              />
            </div>
          )}

          {/* File list */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {imageFiles.length} {lang === "zh" ? "个图片" : "images"}
            </p>
            <div className="space-y-2">
              {imageFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg bg-[var(--muted)] p-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--cat-convert)" }}>
                    <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" /></svg>
                  </span>
                  <span className="truncate text-sm font-medium text-[var(--foreground)]">{f.name}</span>
                  <span className="ml-auto text-xs text-[var(--muted-foreground)]">{formatBytes(f.size)}</span>
                  <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--foreground)]">→ {targetFormat.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          {lang === "zh" ? "拖拽 PNG 或 JPG 图片到上方开始转换。" : "Drop PNG or JPG images above to convert between formats."}
        </div>
      )}
    </ToolPageShell>
  );
}
