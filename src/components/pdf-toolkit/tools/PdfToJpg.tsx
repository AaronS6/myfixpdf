"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { pdfToJpgImages } from "@/lib/pdf/pdf-ops";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileImage } from "lucide-react";

const tool = getTool("pdf-to-jpg")!;

export function PdfToJpg() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [quality, setQuality] = useState(0.85);
  const [scale, setScale] = useState(1.5);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const run = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Rendering PDF pages to JPG…", "determinate", 0);
      const all = await pdfToJpgImages(target.file, scale, quality, (pct, msg) => updateProgress(msg, pct));
      const filtered = selected.size > 0 ? all.filter((_, i) => selected.has(i)) : all;
      if (filtered.length === 0) {
        stopProgress();
        toast.error("No pages selected.");
        return;
      }
      const results = filtered.map((r, i) => ({
        blob: new Blob([r.bytes as unknown as BlobPart], { type: "image/jpeg" }),
        name: `${withExt(target.name, "")}-page-${i + 1}.jpg`,
        type: "image/jpeg",
        size: r.bytes.length,
        previewUrl: r.previewUrl,
      }));
      setResult({
        blob: results[0].blob,
        name: results[0].name,
        type: "image/jpeg",
        ext: ".jpg",
        size: results[0].size,
        results,
      });
      stopProgress();
      setView("result");
      toast.success(`Exported ${results.length} page${results.length > 1 ? "s" : ""} as JPG`);
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={`Export ${selected.size || "all"} as JPG`} ctaColor="var(--cat-convert)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1D2733]">JPG quality</label>
                <span className="rounded-md bg-[#EEF3F8] px-2 py-0.5 text-xs font-bold text-[#1D2733]">
                  {Math.round(quality * 100)}
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.98"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-[var(--cat-convert)]"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1D2733]">Render scale</label>
                <span className="rounded-md bg-[#EEF3F8] px-2 py-0.5 text-xs font-bold text-[#1D2733]">{scale.toFixed(1)}×</span>
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
              <p className="mt-1 text-xs text-[#5B6B79]">Higher = sharper but larger files.</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[#1D2733]">Select pages (optional)</p>
            <p className="mb-2 text-xs text-[#5B6B79]">
              Leave empty to export every page. Check the boxes to export only specific pages.
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
                if (sel) {
                  // select all — but we don't know page count yet; the grid fills in via onThumbsReady
                  setSelected((s) => new Set(s));
                } else {
                  setSelected(new Set());
                }
              }}
              onThumbsReady={(pages) => {
                // Initialize "select all" if user hasn't touched anything
                if (selected.size === 0) {
                  // Leave empty by default — empty = export all
                }
              }}
            />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-[#E4E9F0] bg-[#F7F9FC] p-3 text-xs text-[#5B6B79]">
            <FileImage className="size-4 shrink-0 text-[#1AA8E0]" />
            <p>Every selected page becomes a JPG. The result screen shows a gallery — download them one-by-one or all as a ZIP.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#F7F9FC] p-6 text-center text-sm text-[#5B6B79]">
          Drop a PDF above to pick which pages to export.
        </div>
      )}
    </ToolPageShell>
  );
}
