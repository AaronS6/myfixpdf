"use client";

import { Check, FileText, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/pdf/file-helpers";
import type { ToolkitFile } from "@/store/document-session";

type Props = {
  file: ToolkitFile;
  onRemove?: (id: string) => void;
  onToggleInclude?: (id: string) => void;
  progress?: number; // 0..100 if processing
  className?: string;
  accentColor?: string;
  showInclude?: boolean;
};

export function FileListItem({
  file,
  onRemove,
  onToggleInclude,
  progress,
  className,
  accentColor = "var(--brand)",
  showInclude = false,
}: Props) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[#E4E9F0] bg-white p-3 shadow-sm transition-all hover:shadow-md",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md border border-[#E4E9F0] bg-[#F7F9FC]">
        {file.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.thumbnail} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#5B6B79]">
            {isPdf ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#1D2733]">{file.name}</p>
          {file.pageCount && file.pageCount > 0 && (
            <span className="rounded-full bg-[#EEF3F8] px-1.5 py-0.5 text-[10px] font-medium text-[#5B6B79]">
              {file.pageCount} page{file.pageCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5B6B79]">
          <span>{formatBytes(file.size)}</span>
          {typeof progress === "number" && (
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4E9F0]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(2, Math.min(100, progress))}%`,
                    background: `linear-gradient(90deg, ${accentColor}, var(--brand-accent))`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {showInclude && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleInclude?.(file.id);
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-white transition-all",
              file.included ? "border-transparent" : "border-[#E4E9F0] bg-white text-transparent hover:bg-[#F7F9FC]",
            )}
            style={file.included ? { background: accentColor } : {}}
            aria-label={file.included ? "Exclude" : "Include"}
            title={file.included ? "Included — click to exclude" : "Excluded — click to include"}
          >
            <Check className="size-4" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file.id);
            }}
            className="flex size-7 items-center justify-center rounded-full text-[#5B6B79] hover:bg-[#FEE2E2] hover:text-[#F04438]"
            aria-label="Remove file"
            title="Remove"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
