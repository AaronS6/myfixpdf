"use client";

import { useState } from "react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import type { ToolMeta } from "./tools/registry";
import { useDocumentSession } from "@/store/document-session";
import { FileDropzone } from "./shared/FileDropzone";
import { FileListItem } from "./shared/FileListItem";
import { imageThumbnail, getExt, isPdf, formatBytes } from "@/lib/pdf/file-helpers";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { newFileId, type ToolkitFile } from "@/store/document-session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  tool: ToolMeta;
  children: React.ReactNode;
  /** Show the file list below the dropzone when files exist. */
  showFileList?: boolean;
  ctaLabel?: string;
  ctaColor?: string;
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
  /** Override the dropzone appearance to match the tool's accent color. */
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
  const { sourceFiles, setSourceFiles, addSourceFiles, removeSourceFile, clearSourceFiles, setView, pushHistory } = useDocumentSession();
  const [busy, setBusy] = useState(false);

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
              toast.error(`“${f.name}” is password-protected. Please remove the password first.`);
              continue;
            }
            toast.error(`Could not read PDF “${f.name}”: ${msg}`);
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
      if (arr.length) addSourceFiles(arr);
    } finally {
      setBusy(false);
    }
  };

  const accent = accentColor ?? tool.color;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button
        onClick={() => {
          pushHistory();
          setView("home");
        }}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#5B6B79] hover:text-[#1D2733]"
      >
        <ChevronLeft className="size-4" /> Back to tools
      </button>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: accent }}>
          <ToolGlyph id={tool.id} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#1D2733] sm:text-3xl">{tool.name}</h1>
          <p className="mt-1 text-sm text-[#5B6B79]">{tool.desc}</p>
        </div>
      </div>

      {/* Dropzone */}
      <FileDropzone
        accept={tool.accept}
        multiple={tool.multiple}
        onFiles={handleFiles}
        accentColor={accent}
        ctaText={busy ? "Loading…" : "Choose Files"}
        title={`Drop ${tool.accept.replace(/\./g, "").replace(/,/g, " / ")} here`}
        subtitle={tool.multiple ? "Multiple files supported" : "Single file"}
      />

      {/* File list */}
      {showFileList && sourceFiles.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1D2733]">
              {sourceFiles.length} file{sourceFiles.length > 1 ? "s" : ""} · {formatBytes(sourceFiles.reduce((a, b) => a + b.size, 0))}
            </p>
            <button
              onClick={() => clearSourceFiles()}
              className="text-xs font-medium text-[#5B6B79] hover:text-[#F04438]"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {sourceFiles.map((f) => (
              <FileListItem key={f.id} file={f} onRemove={removeSourceFile} accentColor={accent} showInclude />
            ))}
          </div>
        </div>
      )}

      {children}

      {/* CTA bar */}
      {ctaLabel && sourceFiles.length > 0 && (
        <div className="mt-6 flex items-center justify-end gap-3 rounded-2xl border border-[#E4E9F0] bg-white p-4 shadow-sm">
          <span className="mr-auto text-sm text-[#5B6B79]">
            {sourceFiles.length} file{sourceFiles.length > 1 ? "s" : ""} ready
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
    "jpg-to-pdf": (
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
  };
  return <>{map[id] ?? null}</>;
}
