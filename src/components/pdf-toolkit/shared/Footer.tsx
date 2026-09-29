"use client";

import { Github, Mail } from "lucide-react";
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
    { tool: "pdf-to-png" },
    { tool: "convert-to-pdf" },
    { tool: "image-converter" },
    { tool: "image-to-text" },
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
    <footer className="relative mt-auto border-t border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-xl">
      {/* Subtle top-edge accent line so the footer reads as a distinct surface */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/25 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-9 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden ring-1 ring-[var(--border)]/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="myfixpdf logo" className="size-9 object-cover" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-[-0.025em] text-[var(--foreground)]">
                  my<span className="brand-gradient-text">fixpdf</span>
                </span>
                <span className="text-[10px] font-medium tracking-tight text-[var(--muted-foreground)]">
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
              <a
                href="https://github.com/AaronS6"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--foreground)]/40 hover:text-[var(--foreground)] hover:shadow-[var(--shadow-sm)] active:scale-95"
                aria-label="GitHub — AaronS6"
                title="GitHub @AaronS6"
              >
                <Github className="size-4 transition-transform duration-200 group-hover:scale-110" />
              </a>
              <a
                href="mailto:aaronshansh@gmail.com"
                className="group flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--foreground)]/40 hover:text-[var(--foreground)] hover:shadow-[var(--shadow-sm)] active:scale-95"
                aria-label="Email — aaronshansh@gmail.com"
                title="aaronshansh@gmail.com"
              >
                <Mail className="size-4 transition-transform duration-200 group-hover:scale-110" />
              </a>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--foreground)]">
              {t("footer.product")}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(0, 6).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="group inline-flex items-center gap-1 text-left text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--brand)]"
                  >
                    <span className="h-px w-0 bg-[var(--brand)] transition-all duration-200 group-hover:w-3" />
                    {tTool(l.tool!).name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--foreground)]">
              {t("footer.tools")}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(6, 13).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="group inline-flex items-center gap-1 text-left text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--brand)]"
                  >
                    <span className="h-px w-0 bg-[var(--brand)] transition-all duration-200 group-hover:w-3" />
                    {tTool(l.tool!).name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--foreground)]">
              {lang === "zh" ? "更多" : "More"}
            </p>
            <ul className="space-y-2">
              {toolLinks.slice(13).map((l) => (
                <li key={l.tool}>
                  <button
                    onClick={() => setView(l.tool!)}
                    className="group inline-flex items-center gap-1 text-left text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--brand)]"
                  >
                    <span className="h-px w-0 bg-[var(--brand)] transition-all duration-200 group-hover:w-3" />
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
