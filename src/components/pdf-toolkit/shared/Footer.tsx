"use client";

import { FileStack, Github, Twitter, Linkedin } from "lucide-react";
import { useDocumentSession, type ToolId } from "@/store/document-session";
import { useI18n } from "./I18nProvider";
import { SHORTCUT_LIST } from "./useKeyboardShortcuts";

export function Footer() {
  const setView = useDocumentSession((s) => s.setView);
  const { t, tTool, lang } = useI18n();

  const toolLinks: Array<{ tool: ToolId }> = [
    { tool: "compress-pdf" },
    { tool: "compress-png" },
    { tool: "edit-png" },
    { tool: "pdf-to-word" },
    { tool: "word-to-pdf" },
    { tool: "pdf-to-jpg" },
    { tool: "convert-to-pdf" },
    { tool: "split-pdf" },
    { tool: "merge-pdf" },
    { tool: "rotate-pdf" },
    { tool: "delete-pages" },
    { tool: "reorder-pdf" },
    { tool: "crop-pdf" },
    { tool: "edit-pdf" },
    { tool: "watermark-pdf" },
    { tool: "page-numbers" },
    { tool: "redact-pdf" },
    { tool: "extract-text" },
    { tool: "translate-pdf" },
  ];

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-white shadow-md">
                <FileStack className="size-5" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold text-[var(--foreground)]">
                  my<span className="brand-gradient-text">fixpdf</span>
                </span>
                <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
                  {t("nav.madeBy")}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {lang === "zh"
                ? "你需要的每一个 PDF 工具，一站式搞定。所有处理都在你的浏览器中完成 — 文件永不离开你的设备。"
                : "Every PDF tool you need, in one place. Everything runs in your browser — your files never leave your device."}
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  aria-label="Social link"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {t("footer.product")}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(0, 6).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="text-left text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--brand)]"
                  >
                    {tTool(l.tool!).name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {t("footer.tools")}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(6, 13).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="text-left text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--brand)]"
                  >
                    {tTool(l.tool!).name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {lang === "zh" ? "更多" : "More"}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(13).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="text-left text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--brand)]"
                  >
                    {tTool(l.tool!).name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} myfixpdf ·{" "}
            <span className="font-semibold text-[var(--foreground)]">Made By Aaron Shan</span>, Vancouver BC Grade 11 Student
          </p>
          <button
            onClick={() => {
              import("sonner").then(({ toast }) =>
                toast.info(t("footer.shortcut"), {
                  description: SHORTCUT_LIST.map((s) => `${s.key.toUpperCase()} → ${s.label}`).join("\n"),
                  duration: 10000,
                }),
              );
            }}
            className="rounded-md border border-[var(--border)] px-2 py-1 transition-colors hover:bg-[var(--muted)]"
            title="Show keyboard shortcuts"
          >
            <kbd className="font-mono text-[10px] font-bold text-[var(--foreground)]">?</kbd>{" "}
            {t("footer.shortcut")}
          </button>
        </div>
      </div>
    </footer>
  );
}
