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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
            aria-label="myfixpdf — home"
          >
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-white shadow-md overflow-hidden">
              {/* Custom logo: stylized document with a fold-corner + checkmark */}
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3 h7 l5 5 v13 a0 0 0 0 1 0 0 h-12 a0 0 0 0 1 0 0 z" fill="rgba(255,255,255,0.18)" stroke="currentColor" />
                <path d="M13 3 v5 h5" />
                <path d="m9 14.5 2 2 4-4.5" strokeWidth="2.4" />
              </svg>
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[17px] font-bold tracking-tight text-[var(--foreground)]">
                my<span className="brand-gradient-text">fixpdf</span>
              </span>
              <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
                {t("nav.madeBy")}
              </span>
            </div>
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {CATS.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenMenu(cat.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                {t(cat.labelKey)}
                <ChevronDown className={cn("size-3.5 transition-transform", openMenu === cat.id && "rotate-180")} />
              </button>
              {openMenu === cat.id && (
                <div className={cn("absolute top-full pt-2 z-50 animate-fade-up", menuPosition(cat))}>
                  <div
                    className={cn(
                      "grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 shadow-xl",
                      cat.tools.length > 4 ? "grid-cols-2" : "grid-cols-1",
                    )}
                    style={{ width: menuWidth(cat) }}
                  >
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setView(tool.id);
                          setOpenMenu(null);
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-[var(--muted)]",
                          view === tool.id && "bg-[var(--muted)]",
                        )}
                      >
                        <span
                          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                          style={{ background: cat.color }}
                        >
                          <ToolIcon id={tool.id} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{tool.label}</p>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">{tool.desc}</p>
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
          <button
            onClick={() => setView("home")}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              view === "home"
                ? "bg-gradient-to-br from-[#2563EB] to-[#60A5FA] text-white shadow-sm"
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
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — scrollable independently of the page */}
      {mobileOpen && (
        <div
          className="lg:hidden border-t border-[var(--border)] bg-[var(--card)] animate-fade-in overflow-y-auto thin-scroll"
          style={{ maxHeight: "calc(100vh - 4rem)" }}
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
