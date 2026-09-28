"use client";

import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { pdfToDocx } from "@/lib/pdf/convert-ops";
import { withExt, makePreviewUrl , isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const tool = getTool("pdf-to-word")!;

export function PdfToWord() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress, addOperation } = useDocumentSession();

  const run = async () => {
    const target =
      sourceFiles.find((f) => f.included && isPdf(f.file)) ??
      sourceFiles.find((f) => isPdf(f.file));
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
      addOperation({
        tool: "pdf-to-word",
        toolName: "Converted to Word",
        description: "Converted PDF to editable .docx",
        icon: "pdf-to-word",
        color: "var(--cat-convert)",
      });
      toast.success("Word document ready");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Convert to Word" ctaColor="var(--cat-convert)" onCtaClick={run}>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
        <FileText className="size-4 shrink-0 text-[var(--brand)]" />
        <p>Get an editable Word document from any PDF — perfect for making quick changes.</p>
      </div>
    </ToolPageShell>
  );
}
