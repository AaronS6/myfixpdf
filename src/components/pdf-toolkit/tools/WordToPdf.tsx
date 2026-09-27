"use client";

import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { docxToPdf } from "@/lib/pdf/convert-ops";
import { withExt, makePreviewUrl } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const tool = getTool("word-to-pdf")!;

export function WordToPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();

  const run = async () => {
    const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];
    if (!target) {
      toast.error("Please add a .docx file first.");
      return;
    }
    try {
      startProgress("Converting Word to PDF…", "determinate", 0);
      const blob = await docxToPdf(target.file, (pct, msg) => updateProgress(msg, pct));
      const beforeUrl = makePreviewUrl(target.file);
      setResult({
        blob,
        name: withExt(target.name, ".pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforePreviewUrl: beforeUrl,
      });
      stopProgress();
      setView("result");
      toast.success("PDF ready");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Convert to PDF" ctaColor="var(--cat-convert)" onCtaClick={run}>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] bg-[#F7F9FC] dark:bg-[#0E1626] p-3 text-xs text-[#5B6B79] dark:text-[#93A4B6]">
        <FileText className="size-4 shrink-0 text-[#1AA8E0] dark:text-[#2FB2E4]" />
        <p>
          The .docx is parsed to HTML by mammoth.js, then rendered to PDF via html2canvas + jsPDF. Headings, bold/italic,
          lists, and embedded images are preserved. Very complex layouts may render imperfectly.
        </p>
      </div>
    </ToolPageShell>
  );
}
