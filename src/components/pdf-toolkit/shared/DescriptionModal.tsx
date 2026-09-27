"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { useDocumentSession } from "@/store/document-session";
import { toast } from "sonner";
import { setPdfMetadata } from "@/lib/pdf/pdf-ops";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DescriptionModal({ open, onClose }: Props) {
  const { resultFile, setResult, startProgress, stopProgress } = useDocumentSession();
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"metadata" | "visible">("metadata");

  if (!open) return null;

  const apply = async () => {
    if (!resultFile) return;
    try {
      startProgress(lang === "zh" ? "正在添加描述…" : "Adding description…");
      if (mode === "metadata") {
        const out = await setPdfMetadata(
          resultFile.blob,
          {
            subject: text,
            keywords: text ? text.split(/\s+/).slice(0, 10) : [],
          },
          (pct, msg) => useDocumentSession.getState().updateProgress(msg, pct),
        );
        const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        setResult({ ...resultFile, blob, size: blob.size });
        toast.success(lang === "zh" ? "描述已保存到 PDF 元数据" : "Description saved in PDF metadata");
      } else {
        // For visible mode we add a centered text box on page 1.
        const { addTextToPage } = await import("@/lib/pdf/pdf-ops");
        const out = await addTextToPage(
          resultFile.blob,
          0,
          text,
          {
            x: 60,
            y: 40,
            size: 12,
            color: [0.12, 0.15, 0.2],
            font: "Helvetica",
          },
          (pct, msg) => useDocumentSession.getState().updateProgress(msg, pct),
        );
        const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        setResult({ ...resultFile, blob, size: blob.size });
        toast.success(lang === "zh" ? "描述已加到第 1 页" : "Description added to page 1");
      }
      stopProgress();
      onClose();
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "添加描述失败" : "Failed to add description"));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--foreground)]/50 dark:bg-[#000000]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--card)] shadow-2xl animate-pop-in">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{t("modal.description.title")}</h3>
          <button onClick={onClose} className="text-2xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]">×</button>
        </div>
        <div className="space-y-4 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("modal.description.placeholder")}
            rows={5}
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("metadata")}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                mode === "metadata"
                  ? "border-[var(--brand)] bg-[var(--brand)]/8"
                  : "border-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("modal.description.metadata")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("modal.description.metadataDesc")}</p>
            </button>
            <button
              onClick={() => setMode("visible")}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                mode === "visible"
                  ? "border-[var(--brand)] bg-[var(--brand)]/8"
                  : "border-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("modal.description.visible")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("modal.description.visibleDesc")}</p>
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-[var(--muted)] p-2 text-xs text-[var(--muted-foreground)]">
            <Info className="size-4 shrink-0 text-[var(--brand)]" />
            <span>
              {t("modal.description.info")}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
            {t("common.cancel")}
          </button>
          <button
            onClick={apply}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition-transform"
          >
            <Check className="size-4" /> {t("modal.description.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
