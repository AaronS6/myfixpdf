"use client";

import { useState, useEffect, useRef } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession, type ToolkitFile } from "@/store/document-session";
import { compressImage, previewCompress } from "@/lib/pdf/image-ops";
import { makePreviewUrl, withExt, formatBytes, percentSaved, imageThumbnail, isPng, isJpg } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const tool = getTool("compress-png")!;

export function CompressPng() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();
  const [quality, setQuality] = useState(0.6); // 0..1
  const [maxWidth, setMaxWidth] = useState<number>(1920);
  const [debouncedQ, setDebouncedQ] = useState(0.6);
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce quality slider for live preview size estimate
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(quality), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [quality]);

  // Pick the first included IMAGE file — skip PDFs/DOCX that may persist
  // from a previous tool (sourceFiles follows the user across tools).
  const first =
    sourceFiles.find((f) => f.included && (isPng(f.file) || isJpg(f.file))) ??
    sourceFiles.find((f) => isPng(f.file) || isJpg(f.file));

  // Compute projected size preview (debounced). The setState calls inside the
  // async callback run in a microtask, not synchronously in the effect body.
  useEffect(() => {
    if (!first) {
      // Wrap setState in queueMicrotask so it doesn't run synchronously in the effect.
      queueMicrotask(() => {
        setPreviewSize(null);
        setPreviewUrl(null);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await previewCompress(first.file, { quality: debouncedQ, maxWidth });
        if (cancelled) return;
        setPreviewSize(result.blob.size);
        setPreviewUrl(makePreviewUrl(result.blob));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [first, debouncedQ, maxWidth]);

  const run = async () => {
    if (!first) {
      toast.error("Please add an image first.");
      return;
    }
    try {
      startProgress("Compressing image…", "determinate", 0);
      const beforeSize = first.size;
      const beforeUrl = makePreviewUrl(first.file);
      const result = await compressImage(first.file, { quality, maxWidth }, (pct, msg) => updateProgress(msg, pct));
      const ext = first.ext === ".png" ? ".png" : ".jpg";
      const type = ext === ".png" ? "image/png" : "image/jpeg";
      const blob = result.blob;
      const savedPct = percentSaved(beforeSize, blob.size);
      // percentSaved() clamps to Math.max(0, …) so a negative result is
      // impossible — the old `savedPct < 0` branch was dead code. The honest
      // "no reduction" case (savedPct === 0) covers both "same size" and
      // "output is larger than original", which can happen for already-tiny
      // PNGs that UPNG.js can't shrink further.
      if (savedPct === 0) {
        toast.info(`No reduction — the original is already as small as it gets (${formatBytes(blob.size)}). Try a smaller max width or a JPG instead.`, { duration: 5000 });
      } else {
        toast.success(`Compressed: ${formatBytes(beforeSize)} → ${formatBytes(blob.size)} (−${savedPct}%)`);
      }
      setResult({
        blob,
        name: withExt(first.name, ext),
        type,
        ext,
        size: blob.size,
        beforeSize,
        beforePreviewUrl: beforeUrl,
      });
      addOperation({
        tool: "compress-png",
        toolName: "Compressed image",
        description: "Reduced image file size",
        icon: "compress-png",
        color: "var(--cat-compress)",
      });
      stopProgress();
      setView("result");
      toast.success("Image compressed");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Compression failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Compress Image" ctaColor="var(--cat-compress)" onCtaClick={run}>
      {first ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Live preview / compare */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">Live preview</p>
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl ?? makePreviewUrl(first.file)} alt="Preview" className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">
                  Original: <b className="text-[var(--foreground)]">{formatBytes(first.size)}</b>
                </span>
                {previewSize !== null && (
                  <span className="text-[var(--muted-foreground)]">
                    Projected: <b className="text-[var(--cat-compress)]">{formatBytes(previewSize)}</b>{" "}
                    <span className="ml-1 rounded-full bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                      −{percentSaved(first.size, previewSize)}%
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--foreground)]">Quality</label>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">
                  {Math.round(quality * 100)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-[var(--cat-compress)]"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Drag the slider — smaller files have a bit less detail, larger files keep everything crisp.
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--foreground)]">Max longest edge</label>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{maxWidth}px</span>
              </div>
              <input
                type="range"
                min="320"
                max="4000"
                step="40"
                value={maxWidth}
                onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--cat-compress)]"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Downsamples the image if larger than this. Lower = smaller file.</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
              <Sparkles className="size-4 shrink-0 text-[var(--cat-compress)]" />
              <p>The preview shows exactly what the output will be — drag the slider and watch the projected size update in real time.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Drop a PNG or JPG above to see the live compression preview.
        </div>
      )}
    </ToolPageShell>
  );
}
