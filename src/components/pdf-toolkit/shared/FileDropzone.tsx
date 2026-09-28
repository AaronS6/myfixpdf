"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileWarning, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile } from "@/lib/pdf/file-helpers";
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
          toast.error(r.error ?? `Could not accept "${f.name}".`);
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
        "group relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[20px] border-2 border-dashed bg-[var(--card)] p-6 text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        compact ? "py-6" : "py-12",
        dragging
          ? "dropzone-active scale-[1.01]"
          : "border-[var(--border)] hover:border-[var(--brand)] hover:shadow-lg",
        className,
      )}
      style={{
        boxShadow: dragging
          ? `0 16px 48px ${accentColor}26, 0 0 0 4px ${accentColor}15`
          : "0 2px 12px rgba(15,23,42,0.04)",
      }}
    >
      {/* Animated gradient border overlay — visible on hover/drag */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-500",
          dragging ? "opacity-100" : "group-hover:opacity-60",
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor}10, transparent 40%, transparent 60%, ${accentColor}10)`,
        }}
      />
      {/* Floating particles on drag */}
      {dragging && (
        <>
          <div className="pointer-events-none absolute left-1/4 top-1/4 size-2 rounded-full bg-[var(--brand)]/30 animate-float" />
          <div className="pointer-events-none absolute right-1/4 top-1/3 size-3 rounded-full bg-[var(--brand-accent)]/20 animate-float-slow" />
          <div className="pointer-events-none absolute bottom-1/4 left-1/3 size-1.5 rounded-full bg-[var(--brand)]/40 animate-float" style={{ animationDelay: "-2s" }} />
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {/* Icon with bounce/pulse animation */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          compact ? "size-12" : "size-16",
          dragging ? "scale-110" : "group-hover:scale-105",
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
          color: accentColor,
        }}
      >
        {dragging ? (
          <FileWarning className={cn(compact ? "size-6" : "size-8", "animate-bounce")} />
        ) : (
          <UploadCloud
            className={cn(
              compact ? "size-6" : "size-8",
              "transition-transform duration-300 group-hover:-translate-y-0.5",
            )}
          />
        )}
        {/* Pulsing ring around the icon on drag */}
        {dragging && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: `${accentColor}20` }}
          />
        )}
      </div>

      <div className="space-y-1.5">
        {title && (
          <p
            className={cn(
              "font-semibold text-[var(--foreground)] transition-colors duration-200",
              compact ? "text-sm" : "text-base",
              dragging && "text-[var(--brand)]",
            )}
          >
            {dragging ? "Drop to upload" : title}
          </p>
        )}
        {subtitle && !compact && (
          <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
        )}
        {!subtitle && !compact && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Drag &amp; drop your file{multiple ? "s" : ""} here, or{" "}
            <span style={{ color: accentColor }} className="font-semibold">
              browse
            </span>
          </p>
        )}
        {compact && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Drop or <span style={{ color: accentColor }} className="font-semibold">browse</span> · {multiple ? "multiple" : "single"}
          </p>
        )}
      </div>

      {/* CTA button with smooth scale + shadow on hover */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:shadow-lg"
        style={{ background: accentColor }}
      >
        <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
        {ctaText}
      </div>
    </div>
  );
}
