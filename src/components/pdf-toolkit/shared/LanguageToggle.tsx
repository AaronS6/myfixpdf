"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "./I18nProvider";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className={cn(
        "group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-all hover:border-[var(--ring)] hover:shadow-sm px-2.5",
        className,
      )}
      aria-label="Toggle language"
      title={lang === "en" ? "切换为中文" : "Switch to English"}
    >
      <Globe className="size-4 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--brand)]" />
      <span className="text-xs font-bold tracking-wide">
        {mounted ? (lang === "en" ? "EN" : "中") : "EN"}
      </span>
    </button>
  );
}
