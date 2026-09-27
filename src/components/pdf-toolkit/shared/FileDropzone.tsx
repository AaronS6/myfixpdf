"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileWarning, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile, type AcceptString } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";

type Props = {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  accentColor?: string;
  ctaText?: string;
  /** Soft cap per file (MB). */
  maxSizeMB?: number;
};

export function FileDropzone({
  accept,
  multiple = true,
  onFiles,
  className,
  title,
  subtitle,
  compact = false,
  accentColor = "var(--brand)",
  ctaText = "Choose Files",
  maxSizeMB = 100,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const arr = Array.from(fileList);
      const ok: File[] = [];
      for (const f of arr) {
        const r = validateFile(f, accept, maxSizeMB);
        if (!r.ok) {
          toast.error(r.error ?? `Could not accept “${f.name}”.`);
          continue;
        }
        ok.push(f);
      }
      if (ok.length) {
        onFiles(multiple ? ok : [ok[0]]);
      }
    },
    [accept, multiple, onFiles, maxSizeMB],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label={title ?? "Upload files"}
      className={cn(
        "relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed bg-white p-6 text-center transition-all",
        compact ? "py-6" : "py-10",
        dragging ? "dropzone-active" : "border-[#cbd6e3] hover:border-[#1AA8E0]",
        className,
      )}
      style={{
        boxShadow: dragging ? "0 12px 36px rgba(35,166,213,0.18)" : "0 8px 24px rgba(20,40,80,0.06)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset input so the same file can be re-selected
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          compact ? "size-12" : "size-16",
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
          color: accentColor,
        }}
      >
        {dragging ? (
          <FileWarning className={compact ? "size-6" : "size-8"} />
        ) : (
          <UploadCloud className={compact ? "size-6" : "size-8"} />
        )}
      </div>
      <div className="space-y-1">
        {title && (
          <p className={cn("font-semibold text-[#1D2733]", compact ? "text-sm" : "text-base")}>
            {dragging ? "Drop to upload" : title}
          </p>
        )}
        {subtitle && !compact && (
          <p className="text-sm text-[#5B6B79]">{subtitle}</p>
        )}
        {!subtitle && !compact && (
          <p className="text-sm text-[#5B6B79]">
            Drag &amp; drop your file{multiple ? "s" : ""} here, or{" "}
            <span style={{ color: accentColor }} className="font-semibold">
              browse
            </span>
          </p>
        )}
        {compact && (
          <p className="text-xs text-[#5B6B79]">
            Drop or <span style={{ color: accentColor }} className="font-semibold">browse</span> · {multiple ? "multiple" : "single"}
          </p>
        )}
      </div>
      <div
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
        style={{ background: accentColor }}
      >
        <Plus className="size-4" />
        {ctaText}
      </div>
    </div>
  );
}
