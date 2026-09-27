"use client";

import { Loader2 } from "lucide-react";
import { useDocumentSession } from "@/store/document-session";
import { useI18n } from "./I18nProvider";

export function ProgressOverlay() {
  const progress = useDocumentSession((s) => s.progress);
  const { lang } = useI18n();
  if (!progress.active) return null;
  const pct = typeof progress.percent === "number" ? Math.max(0, Math.min(100, progress.percent)) : null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--foreground)]/40 backdrop-blur-md animate-pop-in">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center">
          {pct !== null ? (
            <div className="relative size-16">
              <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="url(#pg)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 176} 176`}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--foreground)]">
                {pct}%
              </span>
            </div>
          ) : (
            <Loader2 className="size-16 animate-spin text-[var(--brand)]" strokeWidth={2} />
          )}
        </div>
        <p className="text-base font-semibold text-[var(--foreground)]">
          {progress.message || (lang === "zh" ? "处理中…" : "Working…")}
        </p>
        {pct === null && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {lang === "zh" ? "大文件可能需要一些时间，请稍候。" : "This may take a moment for large files."}
          </p>
        )}
      </div>
    </div>
  );
}
