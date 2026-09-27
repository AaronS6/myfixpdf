"use client";

import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { pdfToDocx } from "@/lib/pdf/convert-ops";
import { withExt, makePreviewUrl } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const tool = getTool("pdf-to-word")!;

export function PdfToWord() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();

  const run = async () => {
    const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Converting PDF to Word…", "determinate", 0);
      const blob = await pdfToDocx(target.file, (pct, msg) => updateProgress(msg, pct));
      const beforeUrl = makePreviewUrl(target.file);
      setResult({
        blob,
        name: withExt(target.name, ".docx"),
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ext: ".docx",
        size: blob.size,
        beforePreviewUrl: beforeUrl,
      });
      stopProgress();
      setView("result");
      toast.success("Word document ready");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Convert to Word" ctaColor="var(--cat-convert)" onCtaClick={run}>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#E4E9F0] bg-[#F7F9FC] p-3 text-xs text-[#5B6B79]">
        <FileText className="size-4 shrink-0 text-[#1AA8E0]" />
        <p>
          Real client-side conversion: text content is extracted from each PDF page via pdf.js, then reconstructed as paragraphs
          and headings in a real .docx (using the docx library). Image-only / scanned PDFs are rasterized and embedded as pictures.
        </p>
      </div>
    </ToolPageShell>
  );
}
