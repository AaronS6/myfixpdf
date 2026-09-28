"use client";

import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { docxToPdf } from "@/lib/pdf/convert-ops";
import { withExt, makePreviewUrl , isPdf, isDocx } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const tool = getTool("word-to-pdf")!;

export function WordToPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();

  const run = async () => {
    const target = 
    sourceFiles.find((f) => f.included && (isPdf(f.file) || isDocx(f.file))) ??
    sourceFiles.find((f) => isPdf(f.file) || isDocx(f.file));
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
      addOperation({
        tool: "word-to-pdf",
        toolName: "Converted to PDF",
        description: "Converted .docx to PDF",
        icon: "word-to-pdf",
        color: "var(--cat-convert)",
      });
$1
      toast.success("PDF ready");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Convert to PDF" ctaColor="var(--cat-convert)" onCtaClick={run}>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
        <FileText className="size-4 shrink-0 text-[var(--brand)]" />
        <p>Turn your Word document into a clean, shareable PDF.</p>
      </div>
    </ToolPageShell>
  );
}
