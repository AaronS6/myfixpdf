"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { addPageNumbers } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Hash } from "lucide-react";

const tool = getTool("page-numbers")!;

const FORMATS: Array<{ id: "1/3" | "Page 1 of 3" | "1" | "1 of 3"; label: string; example: (n: number, total: number) => string }> = [
  { id: "1", label: "Just the number", example: (n) => String(n) },
  { id: "1/3", label: "n/total", example: (n, t) => `${n}/${t}` },
  { id: "1 of 3", label: "n of total", example: (n, t) => `${n} of ${t}` },
  { id: "Page 1 of 3", label: "Page n of total", example: (n, t) => `Page ${n} of ${t}` },
];

const POSITIONS: Array<{ id: "bottom-center" | "bottom-right" | "top-center" | "top-right"; label: string }> = [
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
];

export function PageNumbers() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [format, setFormat] = useState<(typeof FORMATS)[number]["id"]>("Page 1 of 3");
  const [position, setPosition] = useState<(typeof POSITIONS)[number]["id"]>("bottom-center");
  const [fontSize, setFontSize] = useState(11);
  const [startFrom, setStartFrom] = useState(1);
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const run = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Adding page numbers…", "determinate", 0);
      const beforeUrl = makePreviewUrl(target.file);
      const bytes = await addPageNumbers(target.file, {
        format, fontSize, position, color: [0.25, 0.27, 0.30], startFrom,
      }, (pct, msg) => updateProgress(msg, pct));
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: withExt(target.name, "-numbered.pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: target.size,
        beforePreviewUrl: beforeUrl,
      });
      stopProgress();
      setView("result");
      toast.success("Page numbers added");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Failed to add page numbers");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Add Page Numbers" ctaColor="var(--cat-edit)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Format</label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    format === f.id ? "border-[#FF4B6E] bg-[#FF4B6E]/10" : "border-[#E4E9F0] dark:border-[#1E2A44] hover:bg-[#F7F9FC] dark:hover:bg-[#0E1626]",
                  )}
                >
                  <p className={cn("text-xs font-semibold", format === f.id ? "text-[#FF4B6E]" : "text-[#1D2733] dark:text-[#E6EDF6]")}>{f.label}</p>
                  <p className="mt-1 text-[10px] text-[#5B6B79] dark:text-[#93A4B6]">e.g. {f.example(startFrom, startFrom + 4)}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Position</label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPosition(p.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                    position === p.id ? "border-[#FF4B6E] bg-[#FF4B6E]/10 text-[#FF4B6E]" : "border-[#E4E9F0] dark:border-[#1E2A44] text-[#5B6B79] dark:text-[#93A4B6] hover:bg-[#F7F9FC] dark:hover:bg-[#0E1626]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Font size</label>
                <span className="rounded-md bg-[#EEF3F8] dark:bg-[#182238] px-2 py-0.5 text-xs font-bold text-[#1D2733] dark:text-[#E6EDF6]">{fontSize}pt</span>
              </div>
              <input type="range" min="8" max="20" step="1" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-full accent-[#FF4B6E]" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Start from</label>
                <span className="rounded-md bg-[#EEF3F8] dark:bg-[#182238] px-2 py-0.5 text-xs font-bold text-[#1D2733] dark:text-[#E6EDF6]">{startFrom}</span>
              </div>
              <input type="range" min="1" max="10" step="1" value={startFrom} onChange={(e) => setStartFrom(parseInt(e.target.value, 10))} className="w-full accent-[#FF4B6E]" />
            </div>
          </div>

          {/* Live preview mockup */}
          <div className="rounded-xl border border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5B6B79] dark:text-[#93A4B6]">Preview (page 2 of 5)</p>
            <div className="relative mx-auto aspect-[3/4] w-48 overflow-hidden rounded border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] shadow-sm">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-16 rounded-lg bg-gradient-to-br from-[#23A6D5]/20 to-[#2FE0C6]/20" />
              </div>
              <span
                className={cn(
                  "absolute text-[#3F4A56]",
                  position === "bottom-center" && "bottom-2 left-1/2 -translate-x-1/2",
                  position === "bottom-right" && "bottom-2 right-3",
                  position === "top-center" && "top-2 left-1/2 -translate-x-1/2",
                  position === "top-right" && "top-2 right-3",
                )}
                style={{ fontSize: Math.min(fontSize, 14) }}
              >
                {FORMATS.find((f) => f.id === format)!.example(startFrom + 1, startFrom + 4)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-3 text-xs text-[#5B6B79] dark:text-[#93A4B6]">
            <Hash className="size-4 shrink-0 text-[#FF4B6E]" />
            <p>Page numbers are baked into the PDF using pdf-lib&apos;s <code className="rounded bg-[#EEF3F8] dark:bg-[#182238] px-1">drawText</code> with the Helvetica font.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-6 text-center text-sm text-[#5B6B79] dark:text-[#93A4B6]">
          Drop a PDF above to add page numbers.
        </div>
      )}
    </ToolPageShell>
  );
}
