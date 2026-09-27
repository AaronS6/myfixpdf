"use client";

import { useState } from "react";
import { FileStack, ChevronDown, Menu, X, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentSession, type ToolId } from "@/store/document-session";

type Cat = {
  id: string;
  label: string;
  color: string;
  tools: Array<{ id: ToolId; label: string; desc: string }>;
};

const CATS: Cat[] = [
  {
    id: "compress",
    label: "Compress",
    color: "var(--cat-compress)",
    tools: [
      { id: "compress-pdf", label: "PDF Compressor", desc: "Shrink PDFs up to 75%" },
      { id: "compress-png", label: "PNG Compressor", desc: "Lossy & lossless PNG / JPG" },
    ],
  },
  {
    id: "convert",
    label: "Convert",
    color: "var(--cat-convert)",
    tools: [
      { id: "pdf-to-word", label: "PDF to Word", desc: "Editable .docx output" },
      { id: "word-to-pdf", label: "Word to PDF", desc: "Render .docx to PDF" },
      { id: "pdf-to-jpg", label: "PDF to JPG", desc: "Each page → image" },
      { id: "jpg-to-pdf", label: "JPG to PDF", desc: "Combine images → PDF" },
    ],
  },
  {
    id: "organize",
    label: "Organize",
    color: "var(--cat-organize)",
    tools: [
      { id: "split-pdf", label: "Split PDF", desc: "Extract or split by pages" },
      { id: "merge-pdf", label: "Merge PDF", desc: "Mix PDF + images → 1 PDF" },
    ],
  },
  {
    id: "edit",
    label: "Edit & Sign",
    color: "var(--cat-edit)",
    tools: [{ id: "edit-pdf", label: "Edit PDF", desc: "Rotate, reorder, draw, sign" }],
  },
];

export function Header() {
  const setView = useDocumentSession((s) => s.setView);
  const view = useDocumentSession((s) => s.view);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E4E9F0] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-2 transition-transform hover:scale-[1.02]"
          aria-label="PDF Toolkit home"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#23A6D5] to-[#2FE0C6] text-white shadow-md">
            <FileStack className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1D2733]">
            PDF <span className="brand-gradient-text">Toolkit</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {CATS.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenMenu(cat.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#1D2733] transition-colors hover:bg-[#F7F9FC]"
              >
                {cat.label}
                <ChevronDown className={cn("size-3.5 transition-transform", openMenu === cat.id && "rotate-180")} />
              </button>
              {openMenu === cat.id && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                  <div className="grid w-[480px] grid-cols-2 gap-1 rounded-2xl border border-[#E4E9F0] bg-white p-3 shadow-xl">
                    {cat.tools.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setView(t.id);
                          setOpenMenu(null);
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-3 text-left transition-all hover:bg-[#F7F9FC]",
                          view === t.id && "bg-[#F7F9FC]",
                        )}
                      >
                        <span
                          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ background: cat.color }}
                        >
                          <ToolIcon id={t.id} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#1D2733]">{t.label}</p>
                          <p className="truncate text-xs text-[#5B6B79]">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("home")}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              view === "home"
                ? "bg-gradient-to-r from-[#23A6D5] to-[#2FE0C6] text-white shadow-sm"
                : "text-[#5B6B79] hover:bg-[#F7F9FC] hover:text-[#1D2733]",
            )}
          >
            <HomeIcon className="size-4" /> Home
          </button>
          <button
            onClick={() => setView("merge-pdf")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#23A6D5] to-[#2FE0C6] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
          >
            Get Started
          </button>
          {/* Mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#1D2733]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E4E9F0] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3">
            {CATS.map((cat) => (
              <div key={cat.id} className="mb-3">
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-[#5B6B79]">{cat.label}</p>
                <div className="space-y-1">
                  {cat.tools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setView(t.id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#F7F9FC]",
                        view === t.id && "bg-[#F7F9FC]",
                      )}
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ background: cat.color }}
                      >
                        <ToolIcon id={t.id} className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-[#1D2733]">{t.label}</span>
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
  // Lazy import-free icons from lucide — keep small for header
  const map: Record<string, React.ReactNode> = {
    "compress-pdf": <CompressIcon className={className} />,
    "compress-png": <CompressIcon className={className} />,
    "pdf-to-word": <ConvertIcon className={className} />,
    "word-to-pdf": <ConvertIcon className={className} />,
    "pdf-to-jpg": <ConvertIcon className={className} />,
    "jpg-to-pdf": <ConvertIcon className={className} />,
    "split-pdf": <SplitIcon className={className} />,
    "merge-pdf": <MergeIcon className={className} />,
    "edit-pdf": <EditIcon className={className} />,
  };
  return <>{map[id] ?? <FileStack className={className} />}</>;
}

function CompressIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V5a2 2 0 0 1 2-2h4" />
      <path d="M20 9V5a2 2 0 0 0-2-2h-4" />
      <path d="M4 15v4a2 2 0 0 0 2 2h4" />
      <path d="M20 15v4a2 2 0 0 1-2 2h-4" />
      <path d="M12 8v8" />
      <path d="m9 11 3 3 3-3" />
    </svg>
  );
}
function ConvertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "size-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6-6 6 6" /><path d="M12 3v18" /><path d="m6 15 6 6 6-6" />
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
