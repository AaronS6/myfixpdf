"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { extractPdfText } from "@/lib/pdf/pdfjs";
import { downloadBlob, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileText, Download, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("extract-text")!;

type PageText = { pageNumber: number; text: string; lineCount: number };

export function ExtractText() {
  const { sourceFiles, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [pages, setPages] = useState<PageText[]>([]);
  const [extracted, setExtracted] = useState(false);
  const [copied, setCopied] = useState(false);
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const run = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Extracting text…", "determinate", 0);
      const result = await extractPdfText(target.file, (pct, msg) => updateProgress(msg, pct));
      setPages(result);
      setExtracted(true);
      stopProgress();
      const totalChars = result.reduce((a, b) => a + b.text.length, 0);
      if (totalChars === 0) {
        toast.info("No text found — this PDF may be image-only / scanned.");
      } else {
        toast.success(`Extracted ${totalChars.toLocaleString()} characters from ${result.length} pages`);
      }
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    }
  };

  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join("\n\n");

  const downloadTxt = () => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, withExt(target?.name ?? "extracted", ".txt"));
    toast.success("Text file downloaded");
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard access failed");
    }
  };

  const totalChars = pages.reduce((a, b) => a + b.text.length, 0);
  const totalWords = pages.reduce((a, b) => a + (b.text.match(/\S+/g)?.length ?? 0), 0);

  return (
    <ToolPageShell tool={tool} ctaLabel={extracted ? "Re-extract Text" : "Extract Text"} ctaColor="var(--cat-convert)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          {extracted ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Pages" value={pages.length} />
                <StatCard label="Characters" value={totalChars.toLocaleString()} />
                <StatCard label="Words" value={totalWords.toLocaleString()} />
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] p-3 shadow-sm">
                <FileText className="size-4 text-[#FF8A00]" />
                <span className="text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Extracted text</span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={copyAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] px-3 py-1.5 text-xs font-medium text-[#1D2733] dark:text-[#E6EDF6] hover:bg-[#F7F9FC] dark:hover:bg-[#0E1626]"
                  >
                    {copied ? <Check className="size-3.5 text-[#1FB65B]" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied!" : "Copy all"}
                  </button>
                  <button
                    onClick={downloadTxt}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#23A6D5] to-[#2FE0C6] px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    <Download className="size-3.5" /> Download .txt
                  </button>
                </div>
              </div>

              {/* Page-by-page text */}
              <div className="space-y-3">
                {pages.map((p) => (
                  <details key={p.pageNumber} open={pages.length <= 3} className="group rounded-xl border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] shadow-sm">
                    <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-semibold text-[#1D2733] dark:text-[#E6EDF6]">
                      <span className="flex size-6 items-center justify-center rounded-md bg-[#FF8A00]/15 text-xs font-bold text-[#FF8A00]">
                        {p.pageNumber}
                      </span>
                      Page {p.pageNumber}
                      <span className="ml-auto text-xs font-normal text-[#5B6B79] dark:text-[#93A4B6]">
                        {p.lineCount} lines · {p.text.length.toLocaleString()} chars
                      </span>
                    </summary>
                    <pre className="whitespace-pre-wrap border-t border-[#E4E9F0] dark:border-[#1E2A44] p-3 text-xs text-[#1D2733] dark:text-[#E6EDF6] font-mono leading-relaxed max-h-72 overflow-y-auto thin-scroll">
                      {p.text || "(no extractable text on this page)"}
                    </pre>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-6 text-center text-sm text-[#5B6B79] dark:text-[#93A4B6]">
              <FileText className="mx-auto mb-2 size-8 text-[#FF8A00]" />
              Click <b className="text-[#1D2733] dark:text-[#E6EDF6]">Extract Text</b> to pull all text content out of your PDF.
              <p className="mt-2 text-xs">Uses pdf.js text-content extraction. Image-only / scanned PDFs may return empty results.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-6 text-center text-sm text-[#5B6B79] dark:text-[#93A4B6]">
          Drop a PDF above to extract its text.
        </div>
      )}
    </ToolPageShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] p-3 text-center shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-[#5B6B79] dark:text-[#93A4B6]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1D2733] dark:text-[#E6EDF6]">{value}</p>
    </div>
  );
}
