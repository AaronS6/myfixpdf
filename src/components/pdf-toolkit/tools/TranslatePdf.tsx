"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { extractPdfText } from "@/lib/pdf/pdfjs";
import { rebuildPdfWithText } from "@/lib/pdf/pdf-ops";
import { downloadBlob, makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { isDocx, isPdf } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Languages, Download, FileText, Wand2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("translate-pdf")!;

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "Chinese", label: "Chinese" },
  { code: "Spanish", label: "Spanish" },
  { code: "French", label: "French" },
  { code: "German", label: "German" },
  { code: "Japanese", label: "Japanese" },
  { code: "Korean", label: "Korean" },
  { code: "Arabic", label: "Arabic" },
  { code: "Portuguese", label: "Portuguese" },
  { code: "Russian", label: "Russian" },
  { code: "Hindi", label: "Hindi" },
  { code: "Italian", label: "Italian" },
  { code: "Dutch", label: "Dutch" },
];

type PagePair = { pageNumber: number; original: string; translated: string };

export function TranslatePdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } =
    useDocumentSession();
  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const [targetLang, setTargetLang] = useState("Chinese");
  const [pairs, setPairs] = useState<PagePair[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    if (!target) {
      toast.error("Please add a file first.");
      return;
    }
    setRunning(true);
    setDone(false);
    setPairs([]);
    try {
      // Step 1: extract text (PDF via pdfjs, DOCX via mammoth)
      startProgress("Extracting text…", "determinate", 0);
      let pageTexts: Array<{ pageNumber: number; text: string }> = [];
      if (isPdf(target.file)) {
        const pages = await extractPdfText(target.file, (pct, msg) =>
          updateProgress(msg, Math.min(50, pct)),
        );
        pageTexts = pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text }));
      } else if (isDocx(target.file)) {
        updateProgress("Reading .docx…", 10);
        const mammoth = (await import("mammoth")).default;
        const buf = await target.file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        updateProgress("Extracting text from HTML…", 30);
        // Strip HTML tags and split into "pages" of ~2000 chars each.
        const plain = result.value
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const chunks: string[] = [];
        const CHUNK = 2000;
        for (let i = 0; i < plain.length; i += CHUNK) {
          chunks.push(plain.slice(i, i + CHUNK));
        }
        pageTexts = chunks.map((text, i) => ({ pageNumber: i + 1, text }));
      } else {
        toast.error("Unsupported file type. Please use .pdf or .docx.");
        stopProgress();
        setRunning(false);
        return;
      }

      const total = pageTexts.length || 1;
      const newPairs: PagePair[] = [];
      for (let i = 0; i < pageTexts.length; i++) {
        const item = pageTexts[i];
        updateProgress(
          `Translating page ${i + 1} of ${total}…`,
          Math.round(50 + (i / total) * 40),
        );
        let translated = "";
        if (item.text.trim()) {
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: item.text, targetLang }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: "Request failed" }));
              throw new Error(err.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            translated = data.translated || "";
          } catch (e) {
            translated = `[translation error: ${e instanceof Error ? e.message : "unknown"}]`;
          }
        }
        newPairs.push({
          pageNumber: item.pageNumber,
          original: item.text,
          translated,
        });
        setPairs([...newPairs]);
      }

      setPairs(newPairs);
      stopProgress();
      setDone(true);
      const totalChars = newPairs.reduce((a, b) => a + b.translated.length, 0);
      if (totalChars === 0) {
        toast.info("No text was extracted — the file may be image-only.");
      } else {
        toast.success(
          `Translated ${newPairs.length} page${newPairs.length === 1 ? "" : "s"} to ${targetLang}`,
        );
      }
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setRunning(false);
    }
  };

  const downloadTxt = () => {
    if (pairs.length === 0) {
      toast.error("Translate the file first.");
      return;
    }
    const text = pairs
      .map(
        (p) =>
          `--- Page ${p.pageNumber} ---\n[Original]\n${p.original}\n\n[${targetLang}]\n${p.translated}`,
      )
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, withExt(target?.name ?? "translated", ".txt"));
    toast.success("Text file downloaded");
  };

  const rebuildPdf = async () => {
    if (pairs.length === 0) {
      toast.error("Translate the file first.");
      return;
    }
    try {
      startProgress("Building PDF…", "determinate", 0);
      const bytes = await rebuildPdfWithText(
        pairs.map((p) => ({ text: p.translated })),
        { fontSize: 12 },
        (pct, msg) => updateProgress(msg, pct),
      );
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: withExt(target?.name ?? "translated", `-${targetLang.toLowerCase()}.pdf`),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: target?.size,
        beforePreviewUrl: target ? makePreviewUrl(target.file) : undefined,
      });
      stopProgress();
      setView("result");
      toast.success("Translated PDF built");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "PDF rebuild failed");
    }
  };

  const totalChars = pairs.reduce((a, b) => a + b.translated.length, 0);

  return (
    <ToolPageShell
      tool={tool}
      ctaLabel={running ? "Translating…" : done ? "Re-translate" : "Translate"}
      ctaColor="var(--cat-convert)"
      onCtaClick={run}
      ctaDisabled={running}
    >
      {target ? (
        <div className="mt-5 space-y-4">
          {/* Language selector */}
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm shadow-sm"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <Languages className="size-4" style={{ color: "var(--cat-convert)" }} />
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Target language
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={running}
              className="rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none disabled:opacity-50"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
                background: "var(--card)",
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <span
              className="ml-auto text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {pairs.length} page{pairs.length === 1 ? "" : "s"} ·{" "}
              {totalChars.toLocaleString()} translated chars
            </span>
          </div>

          {/* Result panels */}
          {pairs.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-6 text-center text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {running ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin" style={{ color: "var(--brand)" }} />
                  <p>Translating… real progress shown in the overlay.</p>
                </div>
              ) : (
                <>
                  <FileText
                    className="mx-auto mb-2 size-8"
                    style={{ color: "var(--cat-convert)" }}
                  />
                  Pick a language and click <b style={{ color: "var(--foreground)" }}>Translate</b>{" "}
                  to extract and translate text from your{" "}
                  {isPdf(target.file) ? "PDF" : "DOCX"} file.
                </>
              )}
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div
                className="flex flex-wrap items-center gap-2 rounded-xl border p-3 shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <FileText className="size-4" style={{ color: "var(--cat-convert)" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Translated text
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={downloadTxt}
                    disabled={running || pairs.length === 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      (running || pairs.length === 0) && "cursor-not-allowed opacity-50",
                    )}
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      background: "transparent",
                    }}
                  >
                    <Download className="size-3.5" /> Download .txt
                  </button>
                  {isPdf(target.file) && (
                    <button
                      onClick={rebuildPdf}
                      disabled={running}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02]",
                        running && "cursor-not-allowed opacity-50",
                      )}
                      style={{ background: "var(--cat-convert)" }}
                    >
                      <Wand2 className="size-3.5" /> Rebuild PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-side preview */}
              <div className="space-y-3">
                {pairs.map((p) => (
                  <div
                    key={p.pageNumber}
                    className="overflow-hidden rounded-xl border shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                  >
                    <div
                      className="border-b px-3 py-2 text-xs font-semibold"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      Page {p.pageNumber}
                    </div>
                    <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                      <div className="p-3">
                        <p
                          className="mb-1 text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Original
                        </p>
                        <pre
                          className="thin-scroll max-h-48 overflow-y-auto whitespace-pre-wrap text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {p.original || "(no text on this page)"}
                        </pre>
                      </div>
                      <div className="p-3" style={{ background: "var(--muted)" }}>
                        <p
                          className="mb-1 text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--brand)" }}
                        >
                          {targetLang}
                        </p>
                        <pre
                          className="thin-scroll max-h-48 overflow-y-auto whitespace-pre-wrap text-xs"
                          style={{ color: "var(--foreground)" }}
                        >
                          {p.translated || "(empty)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div
            className="flex items-start gap-2 rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            <Languages className="size-4 shrink-0" style={{ color: "var(--cat-convert)" }} />
            <p>
              Text is extracted with pdf.js (PDF) or mammoth (DOCX), then translated by an LLM via
              the server-side <code className="rounded px-1" style={{ background: "var(--card)" }}>/api/translate</code>{" "}
              route. <b>Rebuild PDF</b> creates a brand-new PDF with the translated text on each page
              — original layout is NOT preserved.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          Drop a PDF or DOCX above to start translating.
        </div>
      )}
    </ToolPageShell>
  );
}
