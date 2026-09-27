"use client";

import { Loader2 } from "lucide-react";
import { useDocumentSession } from "@/store/document-session";

export function ProgressOverlay() {
  const progress = useDocumentSession((s) => s.progress);
  if (!progress.active) return null;
  const pct = typeof progress.percent === "number" ? Math.max(0, Math.min(100, progress.percent)) : null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1220]/40 backdrop-blur-sm animate-pop-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center">
          {pct !== null ? (
            <div className="relative size-16">
              <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#E4E9F0" strokeWidth="6" />
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
                    <stop offset="0%" stopColor="#23A6D5" />
                    <stop offset="100%" stopColor="#2FE0C6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#1D2733]">
                {pct}%
              </span>
            </div>
          ) : (
            <Loader2 className="size-16 animate-spin text-[#1AA8E0]" strokeWidth={2} />
          )}
        </div>
        <p className="text-base font-semibold text-[#1D2733]">
          {progress.message || "Working…"}
        </p>
        {pct === null && (
          <p className="mt-1 text-sm text-[#5B6B79]">This may take a moment for large files.</p>
        )}
      </div>
    </div>
  );
}
