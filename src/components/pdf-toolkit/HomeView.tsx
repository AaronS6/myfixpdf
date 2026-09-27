"use client";

import { useState } from "react";
import { FileDropzone } from "./shared/FileDropzone";
import { useDocumentSession, newFileId, type ToolkitFile } from "@/store/document-session";
import { TOOLS, CATEGORY_LABELS, CATEGORY_COLORS, type ToolMeta } from "./tools/registry";
import { imageThumbnail, isPdf, getExt, formatBytes } from "@/lib/pdf/file-helpers";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Zap, Layers } from "lucide-react";
import { useDocumentSession as useSession } from "@/store/document-session";

export function HomeView() {
  const setView = useSession((s) => s.setView);
  const setSourceFiles = useSession((s) => s.setSourceFiles);
  const clearSourceFiles = useSession((s) => s.clearSourceFiles);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const toolkitFiles: ToolkitFile[] = [];
      for (const f of files) {
        const ext = getExt(f.name);
        const tf: ToolkitFile = {
          id: newFileId(),
          file: f,
          name: f.name,
          type: f.type || (isPdf(f) ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg"),
          ext,
          size: f.size,
          included: true,
        };
        if (isPdf(f)) {
          try {
            tf.pageCount = await getPageCount(f);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/encrypted/i.test(msg)) {
              toast.error(`“${f.name}” is password-protected. Please remove the password first.`);
              continue;
            }
            toast.error(`Could not read PDF “${f.name}”: ${msg}`);
            continue;
          }
        } else if (f.type.startsWith("image/")) {
          try {
            tf.thumbnail = await imageThumbnail(f);
          } catch {
            // ignore
          }
        }
        toolkitFiles.push(tf);
      }
      if (toolkitFiles.length === 0) {
        setBusy(false);
        return;
      }
      clearSourceFiles();
      setSourceFiles(toolkitFiles);
      // Auto-route to the most appropriate tool
      const allPdfs = toolkitFiles.every((f) => f.type === "application/pdf");
      const allImages = toolkitFiles.every((f) => f.type.startsWith("image/"));
      const mixed = !allPdfs && !allImages;
      if (mixed || (toolkitFiles.length > 1 && (allPdfs || allImages))) {
        setView("merge-pdf");
      } else if (allImages) {
        setView(toolkitFiles.length > 1 ? "jpg-to-pdf" : "compress-png");
      } else if (allPdfs) {
        // Single PDF → ask via toast
        if (toolkitFiles.length === 1) {
          toast.success("PDF added. Pick a tool below.", { duration: 3500 });
        } else {
          setView("merge-pdf");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="absolute inset-0 -z-10 brand-gradient opacity-[0.08]" />
        <div className="absolute -right-32 -top-32 -z-10 size-96 rounded-full bg-gradient-to-br from-[#23A6D5]/20 to-[#2FE0C6]/20 blur-3xl" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4E9F0] bg-white/80 px-3 py-1 text-xs font-medium text-[#5B6B79] backdrop-blur">
            <ShieldCheck className="size-3.5 text-[#1FB65B]" />
            100% client-side · Your files never leave your browser
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1D2733] sm:text-5xl">
            Every PDF tool you need,
            <br />
            <span className="brand-gradient-text">in one place.</span>
          </h1>
          <p className="mt-4 text-base text-[#5B6B79] sm:text-lg">
            Compress, convert, merge, split, edit &amp; sign — all in your browser. Real processing, real results, no uploads.
          </p>
          <div className="mt-8">
            <FileDropzone
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              multiple
              onFiles={handleFiles}
              accentColor="var(--brand)"
              title="Drop files here or click to browse"
              subtitle="PDFs, JPGs, PNGs, DOCX — multiple files supported"
              ctaText="Choose Files"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#5B6B79]">
            <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-[#1AA8E0]" /> Instant processing</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#1FB65B]" /> Private &amp; secure</span>
            <span className="inline-flex items-center gap-1.5"><Layers className="size-3.5 text-[#8C54FF]" /> Chain tools freely</span>
          </div>
        </div>
      </section>

      {/* Tool grid */}
      <section className="py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1D2733] sm:text-3xl">All tools</h2>
            <p className="mt-1 text-sm text-[#5B6B79]">
              Pick a tool to start, or drop files above — we&apos;ll route you automatically.
            </p>
          </div>
          {busy && <span className="text-xs text-[#5B6B79]">Loading files…</span>}
        </div>

        {(["compress", "convert", "organize", "edit"] as const).map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat);
          return (
            <div key={cat} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D2733]">
                  {CATEGORY_LABELS[cat]}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tools.map((t) => (
                  <ToolCard key={t.id} tool={t} onClick={() => setView(t.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Why PDF Toolkit strip */}
      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, color: "#1FB65B", title: "Truly private", text: "Every byte is processed by your browser. Nothing is uploaded anywhere." },
          { icon: Zap, color: "#1AA8E0", title: "Real results", text: "Real PDF libraries (pdf-lib, pdf.js, UPNG, docx) doing the work — no mock spinners." },
          { icon: Layers, color: "#8C54FF", title: "Chain freely", text: "Compress → merge → sign → split, all without ever pressing Download in between." },
        ].map((card, i) => (
          <div key={i} className="rounded-2xl border border-[#E4E9F0] bg-white p-5 shadow-sm">
            <span
              className="mb-3 flex size-10 items-center justify-center rounded-xl text-white"
              style={{ background: card.color }}
            >
              <card.icon className="size-5" />
            </span>
            <p className="text-base font-semibold text-[#1D2733]">{card.title}</p>
            <p className="mt-1 text-sm text-[#5B6B79]">{card.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function ToolCard({ tool, onClick }: { tool: ToolMeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[#E4E9F0] bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div
        className="absolute -right-10 -top-10 size-24 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
        style={{ background: tool.color }}
      />
      <span
        className="flex size-12 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
        style={{ background: tool.color }}
      >
        <ToolGlyph id={tool.id} />
      </span>
      <div>
        <p className="text-base font-semibold text-[#1D2733]">{tool.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#5B6B79]">{tool.desc}</p>
      </div>
      <div className="mt-auto flex items-center text-xs font-semibold" style={{ color: tool.color }}>
        Open tool <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function ToolGlyph({ id }: { id: string }) {
  // Inline SVG glyphs matching the Header icons
  const map: Record<string, React.ReactNode> = {
    "compress-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V5a2 2 0 0 1 2-2h4" /><path d="M20 9V5a2 2 0 0 0-2-2h-4" /><path d="M4 15v4a2 2 0 0 0 2 2h4" /><path d="M20 15v4a2 2 0 0 1-2 2h-4" /><path d="M12 8v8" /><path d="m9 11 3 3 3-3" />
      </svg>
    ),
    "compress-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "pdf-to-word": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" />
      </svg>
    ),
    "word-to-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" />
      </svg>
    ),
    "pdf-to-jpg": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "jpg-to-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" />
      </svg>
    ),
    "split-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="18" rx="1.5" /><rect x="13" y="3" width="8" height="18" rx="1.5" />
      </svg>
    ),
    "merge-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 6 4 4 4-4" /><path d="M12 10v8" /><path d="M5 22h14" />
      </svg>
    ),
    "edit-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  };
  return <>{map[id] ?? null}</>;
}
