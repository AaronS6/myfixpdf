"use client";

import { Github, Twitter, Linkedin } from "lucide-react";
import { useDocumentSession, type ToolId } from "@/store/document-session";
import { useI18n } from "./I18nProvider";


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
  ];

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-white shadow-md overflow-hidden">
                <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3 h7 l5 5 v13 a0 0 0 0 1 0 0 h-12 a0 0 0 0 1 0 0 z" fill="rgba(255,255,255,0.18)" stroke="currentColor" />
                  <path d="M13 3 v5 h5" />
                  <path d="m9 14.5 2 2 4-4.5" strokeWidth="2.4" />
                </svg>
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
        </div>
      </div>
    </footer>
  );
}
