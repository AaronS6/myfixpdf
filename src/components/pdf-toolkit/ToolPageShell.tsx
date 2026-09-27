"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ArrowRight, Plus, Info } from "lucide-react";
import type { ToolMeta } from "./tools/registry";
import { useDocumentSession, newFileId, type ToolkitFile } from "@/store/document-session";
import { FileDropzone } from "./shared/FileDropzone";
import { FileListItem } from "./shared/FileListItem";
import { imageThumbnail, getExt, isPdf, formatBytes } from "@/lib/pdf/file-helpers";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "./shared/I18nProvider";

type Props = {
  tool: ToolMeta;
  children: React.ReactNode;
  showFileList?: boolean;
  ctaLabel?: string;
  ctaColor?: string;
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
  accentColor?: string;
};

export function ToolPageShell({
  tool,
  children,
  showFileList = true,
  ctaLabel,
  ctaColor,
  onCtaClick,
  ctaDisabled,
  accentColor,
}: Props) {
  const { sourceFiles, addSourceFiles, removeSourceFile, clearSourceFiles, setView, pushHistory } = useDocumentSession();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { t, tTool, tt, lang } = useI18n();

  // Show a reminder toast once when files first appear in a tool
  useEffect(() => {
    if (sourceFiles.length === 1) {
      // First file added — remind user about persistence
      const timer = setTimeout(() => {
        toast.info(
          t("toast.filesLoaded"),
          {
            description: t("tool.reminder"),
            duration: 5500,
          },
        );
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [sourceFiles.length, lang, t]);

  const handleFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const arr: ToolkitFile[] = [];
      for (const f of files) {
        const ext = getExt(f.name);
        const tf: ToolkitFile = {
          id: newFileId(),
          file: f,
          name: f.name,
          type: f.type || (isPdf(f) ? "application/pdf" : ext === ".png" ? "image/png" : ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "image/jpeg"),
          ext,
          size: f.size,
          included: true,
        };
        if (isPdf(f)) {
          try {
            tf.pageCount = await getPageCount(f);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/encrypted/i.test(msg)) {
              toast.error(tt("toast.encryptedPdf", { name: f.name }));
              continue;
            }
            toast.error(tt("toast.readPdfError", { name: f.name, msg }));
            continue;
          }
        } else if (f.type.startsWith("image/")) {
          try {
            tf.thumbnail = await imageThumbnail(f);
          } catch {
            // ignore
          }
        }
        arr.push(tf);
      }
      if (arr.length) {
        addSourceFiles(arr);
        toast.success(tt("toast.addedFiles", { n: arr.length }), { duration: 1800 });
      }
    } finally {
      setBusy(false);
    }
  };

  const accent = accentColor ?? tool.color;
  const hasFiles = sourceFiles.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 animate-fade-up">
      <button
        onClick={() => {
          pushHistory();
          setView("home");
        }}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="size-4" /> {t("tool.back")}
      </button>
      <div className="mb-5 flex items-start gap-3 animate-fade-up">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: accent }}>
          <ToolGlyph id={tool.id} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {tTool(tool.id).name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{tTool(tool.id).desc}</p>
        </div>
      </div>

      {/* Dropzone — large when empty, compact inline "add more" when files exist */}
      {!hasFiles ? (
        <FileDropzone
          accept={tool.accept}
          multiple={tool.multiple}
          onFiles={handleFiles}
          accentColor={accent}
          ctaText={busy ? t("tool.loading") : t("tool.chooseFiles")}
          title={lang === "zh" ? `把 ${tool.accept.replace(/\./g, "").replace(/,/g, " / ")} 文件拖到这里` : `Drop ${tool.accept.replace(/\./g, "").replace(/,/g, " / ")} here`}
          subtitle={tool.multiple ? (lang === "zh" ? "支持同时上传多个文件" : "Multiple files supported") : (lang === "zh" ? "单个文件" : "Single file")}
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-all",
            dragOver
              ? "border-[var(--brand)] bg-[var(--brand)]/5 scale-[1.01]"
              : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--brand)]",
          )}
        >
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: accent }}>
            <Plus className="size-4" /> {t("tool.addMore")}
            <input
              type="file"
              accept={tool.accept}
              multiple={tool.multiple}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) handleFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-sm text-[var(--muted-foreground)]">{t("tool.dropHere")}</span>
          <button
            onClick={() => clearSourceFiles()}
            className="ml-auto text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--danger)]"
          >
            {t("tool.clearAll")}
          </button>
        </div>
      )}

      {/* File list */}
      {showFileList && hasFiles && (
        <div className="mt-5 space-y-2 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {sourceFiles.length} file{sourceFiles.length > 1 ? "s" : ""} ·{" "}
              {formatBytes(sourceFiles.reduce((a, b) => a + b.size, 0))}
            </p>
          </div>
          <div className="space-y-2">
            {sourceFiles.map((f) => (
              <FileListItem key={f.id} file={f} onRemove={removeSourceFile} accentColor={accent} showInclude />
            ))}
          </div>
        </div>
      )}

      {children}

      {/* Reminder banner — subtle persistent hint */}
      {hasFiles && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
          <Info className="size-4 shrink-0 text-[var(--brand)]" />
          <p>{t("tool.reminder")}</p>
        </div>
      )}

      {/* CTA bar */}
      {ctaLabel && hasFiles && (
        <div className="mt-6 flex items-center justify-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <span className="mr-auto text-sm text-[var(--muted-foreground)]">
            {sourceFiles.length} {t("tool.filesReady")}
          </span>
          <button
            onClick={onCtaClick}
            disabled={ctaDisabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02]",
              ctaDisabled && "cursor-not-allowed opacity-50",
            )}
            style={{ background: ctaColor ?? accent }}
          >
            {ctaLabel} <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ToolGlyph({ id }: { id: string }) {
  const map: Record<string, React.ReactNode> = {
    "compress-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V5a2 2 0 0 1 2-2h4" /><path d="M20 9V5a2 2 0 0 0-2-2h-4" /><path d="M4 15v4a2 2 0 0 0 2 2h4" /><path d="M20 15v4a2 2 0 0 1-2 2h-4" /><path d="M12 8v8" /><path d="m9 11 3 3 3-3" />
      </svg>
    ),
    "compress-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "pdf-to-word": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" />
      </svg>
    ),
    "word-to-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" />
      </svg>
    ),
    "pdf-to-jpg": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "pdf-to-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "convert-to-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" />
      </svg>
    ),
    "split-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="18" rx="1.5" /><rect x="13" y="3" width="8" height="18" rx="1.5" />
      </svg>
    ),
    "merge-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 6 4 4 4-4" /><path d="M12 10v8" /><path d="M5 22h14" />
      </svg>
    ),
    "edit-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    "watermark-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" opacity="0.3" /><path d="M9 12l2 2 4-4" />
      </svg>
    ),
    "reorder-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    "extract-text": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
      </svg>
    ),
    "page-numbers": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" />
      </svg>
    ),
    "redact-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><rect x="7" y="13" width="10" height="4" fill="currentColor" stroke="none" />
      </svg>
    ),
    "rotate-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
      </svg>
    ),
    "delete-pages": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    ),
    "crop-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
    "edit-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  };
  return <>{map[id] ?? null}</>;
}
