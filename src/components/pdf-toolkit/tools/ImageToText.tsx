"use client";

import { useState, useRef, useCallback } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { isPng, isJpg, downloadBlob, withExt, formatBytes } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Scan, Copy, Download, Check, Type } from "lucide-react";
import { useI18n } from "../shared/I18nProvider";
import { cn } from "@/lib/utils";

const tool = getTool("image-to-text")!;

export function ImageToText() {
  const { sourceFiles, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const target = sourceFiles.find((f) => f.included && (isPng(f.file) || isJpg(f.file))) ??
    sourceFiles.find((f) => isPng(f.file) || isJpg(f.file));
  const [extractedText, setExtractedText] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { t, tTool, lang } = useI18n();

  const run = async () => {
    if (!target) {
      toast.error(lang === "zh" ? "请先添加图片" : "Please add an image first.");
      return;
    }
    try {
      startProgress(lang === "zh" ? "正在识别文字…" : "Recognizing text…", "determinate", 0);
      // Dynamically import tesseract.js (heavy library — only load when needed)
      const { default: Tesseract } = await import("tesseract.js");
      const url = URL.createObjectURL(target.file);
      const result = await Tesseract.recognize(url, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            updateProgress(`Recognizing… ${Math.round(m.progress * 100)}%`, Math.round(m.progress * 100));
          }
        },
      });
      URL.revokeObjectURL(url);
      const text = result.data.text.trim();
      setExtractedText(text);
      setConfidence(result.data.confidence);
      setHasRun(true);
      stopProgress();
      if (text.length === 0) {
        toast.info(lang === "zh" ? "未检测到文字" : "No text detected — the image may not contain readable text.");
      } else {
        toast.success(lang === "zh" ? `识别到 ${text.length} 个字符` : `Extracted ${text.length} characters`);
      }
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "OCR failed");
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(lang === "zh" ? "已复制到剪贴板" : "Copied to clipboard");
    } catch {
      toast.error(lang === "zh" ? "复制失败" : "Copy failed");
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, withExt(target?.name ?? "extracted", ".txt"));
    toast.success(lang === "zh" ? "已下载文本文件" : "Text file downloaded");
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={hasRun ? (lang === "zh" ? "重新识别" : "Re-run OCR") : (lang === "zh" ? "提取文字" : "Extract Text")} ctaColor="var(--cat-convert)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          {/* Image preview */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(target.file)} alt={target.name} className="max-h-48 rounded-lg shadow-md" />
          </div>

          {/* Stats */}
          {hasRun && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{lang === "zh" ? "字符" : "Characters"}</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{extractedText.length.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{lang === "zh" ? "单词" : "Words"}</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{(extractedText.match(/\S+/g)?.length ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{lang === "zh" ? "置信度" : "Confidence"}</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{confidence !== null ? `${Math.round(confidence)}%` : "—"}</p>
              </div>
            </div>
          )}

          {/* Action bar */}
          {hasRun && extractedText && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
              <Type className="size-4 text-[var(--cat-convert)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">{lang === "zh" ? "识别结果" : "Extracted text"}</span>
              <div className="ml-auto flex gap-2">
                <button onClick={copyAll} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                  {copied ? <Check className="size-3.5 text-[var(--success)]" /> : <Copy className="size-3.5" />}
                  {copied ? (lang === "zh" ? "已复制" : "Copied!") : (lang === "zh" ? "复制" : "Copy")}
                </button>
                <button onClick={downloadTxt} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[var(--brand)] to-[var(--brand-accent)] px-2.5 py-1.5 text-xs font-bold text-white shadow-sm">
                  <Download className="size-3.5" /> {lang === "zh" ? "下载 .txt" : "Download .txt"}
                </button>
              </div>
            </div>
          )}

          {/* Text output */}
          {hasRun ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <pre className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)] font-mono leading-relaxed max-h-96 overflow-y-auto thin-scroll">
                {extractedText || (lang === "zh" ? "（未检测到文字）" : "(no text detected in this image)")}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center">
              <Scan className="mx-auto mb-2 size-8 text-[var(--cat-convert)]" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {lang === "zh"
                  ? "点击「提取文字」使用 OCR 从图片中识别文字。支持照片、截图、扫描件。"
                  : "Click \"Extract Text\" to use OCR to read text from the image. Works with photos, screenshots, and scanned documents."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          {lang === "zh" ? "拖拽 PNG 或 JPG 图片到上方开始提取文字。" : "Drop a PNG or JPG image above to extract text from it."}
        </div>
      )}
    </ToolPageShell>
  );
}
