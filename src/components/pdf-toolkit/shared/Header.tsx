"use client";

import { useState } from "react";
import { FileStack, ChevronDown, Menu, X, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentSession, type ToolId } from "@/store/document-session";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useI18n } from "./I18nProvider";

type Cat = {
  id: string;
  labelKey: "nav.compress" | "nav.convert" | "nav.organize" | "nav.edit";
  color: string;
  tools: Array<{ id: ToolId; label: string; desc: string }>;
  /** Alignment hint for the dropdown so it never overflows the viewport. */
  align: "left" | "center" | "right";
};

export function Header() {
  const setView = useDocumentSession((s) => s.setView);
  const view = useDocumentSession((s) => s.view);
  const { t, tTool } = useI18n();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const CATS: Cat[] = [
    {
      id: "compress",
      labelKey: "nav.compress",
      color: "var(--cat-compress)",
      align: "left",
      tools: [
        { id: "compress-pdf", label: tTool("compress-pdf").name, desc: tTool("compress-pdf").desc },
        { id: "compress-png", label: tTool("compress-png").name, desc: tTool("compress-png").desc },
        { id: "edit-png", label: tTool("edit-png").name, desc: tTool("edit-png").desc },
      ],
    },
    {
      id: "convert",
      labelKey: "nav.convert",
      color: "var(--cat-convert)",
      align: "left",
      tools: [
        { id: "pdf-to-word", label: tTool("pdf-to-word").name, desc: tTool("pdf-to-word").desc },
        { id: "word-to-pdf", label: tTool("word-to-pdf").name, desc: tTool("word-to-pdf").desc },
        { id: "pdf-to-jpg", label: tTool("pdf-to-jpg").name, desc: tTool("pdf-to-jpg").desc },
        { id: "pdf-to-png", label: tTool("pdf-to-png").name, desc: tTool("pdf-to-png").desc },
        { id: "convert-to-pdf", label: tTool("convert-to-pdf").name, desc: tTool("convert-to-pdf").desc },
        { id: "image-converter", label: tTool("image-converter").name, desc: tTool("image-converter").desc },
        { id: "image-to-text", label: tTool("image-to-text").name, desc: tTool("image-to-text").desc },
        { id: "extract-text", label: tTool("extract-text").name, desc: tTool("extract-text").desc },
      ],
    },
    {
      id: "organize",
      labelKey: "nav.organize",
      color: "var(--cat-organize)",
      align: "center",
      tools: [
        { id: "split-pdf", label: tTool("split-pdf").name, desc: tTool("split-pdf").desc },
        { id: "merge-pdf", label: tTool("merge-pdf").name, desc: tTool("merge-pdf").desc },
        { id: "reorder-pdf", label: tTool("reorder-pdf").name, desc: tTool("reorder-pdf").desc },
        { id: "rotate-pdf", label: tTool("rotate-pdf").name, desc: tTool("rotate-pdf").desc },
        { id: "delete-pages", label: tTool("delete-pages").name, desc: tTool("delete-pages").desc },
        { id: "crop-pdf", label: tTool("crop-pdf").name, desc: tTool("crop-pdf").desc },
      ],
    },
    {
      id: "edit",
      labelKey: "nav.edit",
      color: "var(--cat-edit)",
      align: "right",
      tools: [
        { id: "edit-pdf", label: tTool("edit-pdf").name, desc: tTool("edit-pdf").desc },
        { id: "watermark-pdf", label: tTool("watermark-pdf").name, desc: tTool("watermark-pdf").desc },
        { id: "page-numbers", label: tTool("page-numbers").name, desc: tTool("page-numbers").desc },
        { id: "redact-pdf", label: tTool("redact-pdf").name, desc: tTool("redact-pdf").desc },
      ],
    },
  ];

  const menuWidth = (cat: Cat) => (cat.tools.length > 4 ? 560 : 280);

  const menuPosition = (cat: Cat) => {
    if (cat.align === "left") return "left-0";
    if (cat.align === "right") return "right-0";
    return "left-1/2 -translate-x-1/2";
  };

  return (
    <header className="sticky top-0 z-40 w-full glass" style={{ overflow: "visible" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("home")}
            className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-all duration-200 hover:bg-[var(--muted)]/60"
            aria-label="myfixpdf — home"
          >
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-white overflow-hidden ring-1 ring-[var(--brand)]/20 shadow-[var(--shadow-sm)] transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-[var(--shadow-brand)] group-hover:ring-[var(--brand)]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="myfixpdf logo" className="size-10 object-cover" />
              {/* Subtle top-edge highlight on the logo chip */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
              {/* Inner brand tint ring for depth */}
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--brand)]/10" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[17px] font-bold tracking-[-0.025em] text-[var(--foreground)]">
                my<span className="brand-gradient-text">fixpdf</span>
              </span>
              <span className="text-[10px] font-medium tracking-tight text-[var(--muted-foreground)]">
                {t("nav.madeBy")}
              </span>
            </div>
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5" style={{ overflow: "visible" }}>
          {CATS.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenMenu(cat.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                className={cn(
                  "group relative flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                  openMenu === cat.id
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "text-[var(--foreground)]/80 hover:bg-[var(--muted)]/70 hover:text-[var(--foreground)]",
                )}
              >
                {t(cat.labelKey)}
                <ChevronDown className={cn("size-3.5 transition-transform duration-200", openMenu === cat.id ? "rotate-180 text-[var(--brand)]" : "text-[var(--muted-foreground)]")} />
                {/* Tiny accent dot under the active menu */}
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-3 -bottom-px h-px origin-center scale-x-0 transition-transform duration-200 group-hover:scale-x-100",
                    openMenu === cat.id && "scale-x-100",
                  )}
                  style={{ background: cat.color, opacity: 0.7 }}
                />
              </button>
              {openMenu === cat.id && (
                <div className={cn("absolute top-full pt-3 z-50 animate-fade-up", menuPosition(cat))}>
                  <div
                    className={cn(
                      "grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 overflow-hidden",
                      cat.tools.length > 4 ? "grid-cols-2" : "grid-cols-1",
                    )}
                    style={{
                      width: menuWidth(cat),
                      boxShadow: "var(--shadow-lg), var(--edge-highlight)",
                    }}
                  >
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setView(tool.id);
                          setOpenMenu(null);
                        }}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-[var(--muted)]",
                          view === tool.id && "bg-[var(--muted)]",
                        )}
                      >
                        <span
                          className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white transition-transform duration-200 group-hover:scale-105"
                          style={{
                            background: `linear-gradient(180deg, ${cat.color} 0%, color-mix(in oklch, ${cat.color} 82%, black) 100%)`,
                            boxShadow: `0 1px 2px ${cat.color}40, inset 0 1px 0 0 rgba(255, 255, 255, 0.22)`,
                          }}
                        >
                          <ToolIcon id={tool.id} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight text-[var(--foreground)]">{tool.label}</p>
                          <p className="truncate text-xs leading-snug text-[var(--muted-foreground)]">{tool.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* Beam — external link to mybeam.vercel.app */}
          <a
            href="https://mybeam.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-3 py-2 text-sm font-semibold text-[var(--brand)] transition-all duration-200 hover:bg-[var(--brand)]/10 hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow-sm)] active:scale-95"
            title="Beam — transfer files by QR code or network search"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4 transition-transform duration-300 group-hover:-translate-y-px" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
            </svg>
            Beam
          </a>
          <button
            onClick={() => setView("home")}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-95",
              view === "home"
                ? "btn-primary"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <HomeIcon className="size-4" /> {t("nav.home")}
          </button>
          <ThemeToggle />
          <LanguageToggle />
          {/* Mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)] active:scale-95"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — FIXED overlay below the header so the page behind can't scroll.
          Previously this was in-flow, so scrolling the page scrolled the drawer away
          and revealed the homepage ('scroll out of it leads back to homepage').
          Now: backdrop dims + closes on tap, drawer traps scroll via overscroll-contain. */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-16 z-30 bg-[var(--foreground)]/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] animate-fade-in overflow-y-auto thin-scroll overscroll-contain shadow-[var(--shadow-lg)]"
          >
          <div className="mx-auto max-w-7xl px-4 py-3">
            {CATS.map((cat) => (
              <div key={cat.id} className="mb-3">
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t(cat.labelKey)}
                </p>
                <div className="space-y-1">
                  {cat.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setView(tool.id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--muted)]",
                        view === tool.id && "bg-[var(--muted)]",
                      )}
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ background: cat.color }}
                      >
                        <ToolIcon id={tool.id} className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-[var(--foreground)]">{tool.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </header>
  );
}

function ToolIcon({ id, className }: { id: ToolId; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    "compress-pdf": <CompressIcon className={className} />,
    "compress-png": <ImageIcon className={className} />,
    "pdf-to-word": <ConvertIcon className={className} />,
    "word-to-pdf": <ConvertIcon className={className} />,
    "pdf-to-jpg": <ImageIcon className={className} />,
    "pdf-to-png": <ImageIcon className={className} />,
    "convert-to-pdf": <ConvertIcon className={className} />,
    "split-pdf": <SplitIcon className={className} />,
    "merge-pdf": <MergeIcon className={className} />,
    "edit-pdf": <EditIcon className={className} />,
    "watermark-pdf": <WatermarkIcon className={className} />,
    "reorder-pdf": <ReorderIcon className={className} />,
    "extract-text": <TextIcon className={className} />,
    "page-numbers": <NumberIcon className={className} />,
    "redact-pdf": <RedactIcon className={className} />,
    "rotate-pdf": <RotateIcon className={className} />,
    "delete-pages": <DeleteIcon className={className} />,
    "crop-pdf": <CropIcon className={className} />,
    "edit-png": <EditIcon className={className} />,
  };
  return <>{map[id] ?? <FileStack className={className} />}</>;
}

function CompressIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V5a2 2 0 0 1 2-2h4" /><path d="M20 9V5a2 2 0 0 0-2-2h-4" /><path d="M4 15v4a2 2 0 0 0 2 2h4" /><path d="M20 15v4a2 2 0 0 1-2 2h-4" /><path d="M12 8v8" /><path d="m9 11 3 3 3-3" />
    </svg>
  );
}
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
    </svg>
  );
}
function ConvertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" />
    </svg>
  );
}
function SplitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="18" rx="1.5" /><rect x="13" y="3" width="8" height="18" rx="1.5" />
    </svg>
  );
}
function MergeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 6 4 4 4-4" /><path d="M12 10v8" /><path d="M5 22h14" />
    </svg>
  );
}
function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function WatermarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" opacity="0.3" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TextIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
    </svg>
  );
}
function NumberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" />
    </svg>
  );
}
function RedactIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><rect x="7" y="13" width="10" height="4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function RotateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
    </svg>
  );
}
function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function CropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}
