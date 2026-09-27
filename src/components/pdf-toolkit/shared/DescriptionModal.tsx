"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { useDocumentSession } from "@/store/document-session";
import { toast } from "sonner";
import { setPdfMetadata } from "@/lib/pdf/pdf-ops";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DescriptionModal({ open, onClose }: Props) {
  const { resultFile, setResult, startProgress, stopProgress } = useDocumentSession();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"metadata" | "visible">("metadata");

  if (!open) return null;

  const apply = async () => {
    if (!resultFile) return;
    try {
      startProgress("Adding description…");
      if (mode === "metadata") {
        const out = await setPdfMetadata(
          resultFile.blob,
          {
            subject: text,
            keywords: text ? text.split(/\s+/).slice(0, 10) : [],
          },
          (pct, msg) => useDocumentSession.getState().updateProgress(msg, pct),
        );
        const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        setResult({ ...resultFile, blob, size: blob.size });
        toast.success("Description saved in PDF metadata");
      } else {
        // For visible mode we add a centered text box on page 1.
        const { addTextToPage } = await import("@/lib/pdf/pdf-ops");
        const out = await addTextToPage(
          resultFile.blob,
          0,
          text,
          {
            x: 60,
            y: 40,
            size: 12,
            color: [0.12, 0.15, 0.2],
            font: "Helvetica",
          },
          (pct, msg) => useDocumentSession.getState().updateProgress(msg, pct),
        );
        const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        setResult({ ...resultFile, blob, size: blob.size });
        toast.success("Description added to page 1");
      }
      stopProgress();
      onClose();
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Failed to add description");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B1220]/50 dark:bg-[#000000]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#111A2B] shadow-2xl animate-pop-in">
        <div className="flex items-center justify-between border-b border-[#E4E9F0] dark:border-[#1E2A44] p-4">
          <h3 className="text-lg font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Add description / note</h3>
          <button onClick={onClose} className="text-2xl text-[#5B6B79] dark:text-[#93A4B6] hover:text-[#1D2733] dark:text-[#E6EDF6]">×</button>
        </div>
        <div className="space-y-4 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a note, description, or annotation here…"
            rows={5}
            className="w-full resize-none rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] px-3 py-2 text-sm text-[#1D2733] dark:text-[#E6EDF6] outline-none focus:border-[#1AA8E0] dark:border-[#2FB2E4]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("metadata")}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                mode === "metadata"
                  ? "border-[#1AA8E0] dark:border-[#2FB2E4] bg-[#EAF7FD] dark:bg-[#0d2330]"
                  : "border-[#E4E9F0] dark:border-[#1E2A44] hover:bg-[#F7F9FC] dark:bg-[#0E1626]",
              )}
            >
              <p className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Metadata only</p>
              <p className="text-xs text-[#5B6B79] dark:text-[#93A4B6]">Stored in the PDF's Subject / Keywords. Not visible on the page.</p>
            </button>
            <button
              onClick={() => setMode("visible")}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                mode === "visible"
                  ? "border-[#1AA8E0] dark:border-[#2FB2E4] bg-[#EAF7FD] dark:bg-[#0d2330]"
                  : "border-[#E4E9F0] dark:border-[#1E2A44] hover:bg-[#F7F9FC] dark:bg-[#0E1626]",
              )}
            >
              <p className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Visible text</p>
              <p className="text-xs text-[#5B6B79] dark:text-[#93A4B6]">Renders as text on page 1.</p>
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-[#F7F9FC] dark:bg-[#0E1626] p-2 text-xs text-[#5B6B79] dark:text-[#93A4B6]">
            <Info className="size-4 shrink-0 text-[#1AA8E0] dark:text-[#2FB2E4]" />
            <span>
              Visible-text mode places the description as a footer note on page 1. For full drag-and-drop text annotations, use the Edit PDF tool.
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#E4E9F0] dark:border-[#1E2A44] p-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[#5B6B79] dark:text-[#93A4B6] hover:bg-[#F7F9FC] dark:bg-[#0E1626]">
            Cancel
          </button>
          <button
            onClick={apply}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#23A6D5] to-[#2FE0C6] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition-transform"
          >
            <Check className="size-4" /> Apply description
          </button>
        </div>
      </div>
    </div>
  );
}
