"use client";

import { useState } from "react";
import { FileDropzone } from "./shared/FileDropzone";
import { useDocumentSession, newFileId, type ToolkitFile } from "@/store/document-session";
import { TOOLS, CATEGORY_LABELS, CATEGORY_COLORS, type ToolMeta } from "./tools/registry";
import { imageThumbnail, isPdf, getExt, formatBytes } from "@/lib/pdf/file-helpers";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Zap, Layers, Sparkles, FileStack } from "lucide-react";
import { useDocumentSession as useSession } from "@/store/document-session";
import { useI18n } from "./shared/I18nProvider";

export function HomeView() {
  const setView = useSession((s) => s.setView);
  const setSourceFiles = useSession((s) => s.setSourceFiles);
  const clearSourceFiles = useSession((s) => s.clearSourceFiles);
  const [busy, setBusy] = useState(false);
  const { t, tTool, tt, lang } = useI18n();

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
              toast.error(tt("toast.encryptedPdf", { name: f.name }));
              continue;
            }
            toast.error(tt("toast.readPdfError", { name: f.name, msg }));
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
        setView(toolkitFiles.length > 1 ? "convert-to-pdf" : "edit-png");
      } else if (allPdfs) {
        if (toolkitFiles.length === 1) {
          toast.success(t("toast.pdfAddedPickTool"), { duration: 3500 });
        } else {
          setView("merge-pdf");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      {/* Hero with premium mesh background */}
      <section className="relative overflow-hidden mesh-bg">
        <div className="absolute inset-0 -z-10 grain" />
        {/* Floating decorative blobs */}
        <div className="absolute -left-32 top-20 -z-10 size-72 rounded-full bg-gradient-to-br from-[#2563EB]/15 to-[#60A5FA]/10 blur-3xl animate-float-slow" />
        <div className="absolute -right-32 -top-10 -z-10 size-96 rounded-full bg-gradient-to-br from-[#6366F1]/10 to-[#2563EB]/8 blur-3xl animate-float" />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] glass px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] backdrop-blur-md animate-fade-up">
              <ShieldCheck className="size-3.5 text-[var(--success)]" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl animate-fade-up" style={{ animationDelay: "60ms" }}>
              {t("hero.title1")}
              <br />
              <span className="brand-gradient-text">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--muted-foreground)] sm:text-lg animate-fade-up" style={{ animationDelay: "120ms" }}>
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
              <FileDropzone
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                multiple
                onFiles={handleFiles}
                accentColor="var(--brand)"
                title={t("hero.dropzone.title")}
                subtitle={t("hero.dropzone.subtitle")}
                ctaText={busy ? t("tool.loading") : t("hero.dropzone.cta")}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-[var(--muted-foreground)] animate-fade-up" style={{ animationDelay: "240ms" }}>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-[var(--brand)]" /> {t("hero.features.instant")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[var(--success)]" /> {t("hero.features.private")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="size-3.5 text-[var(--cat-organize)]" /> {t("hero.features.chain")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tool grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex items-end justify-between animate-fade-up">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {t("hero.allTools")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("hero.allTools.subtitle")}</p>
          </div>
          {busy && <span className="text-xs text-[var(--muted-foreground)]">{t("tool.loading")}</span>}
        </div>

        {(["compress", "convert", "organize", "edit"] as const).map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat);
          return (
            <div key={cat} className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">· {tools.length} {lang === "zh" ? "个工具" : "tools"}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tools.map((tool, i) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    name={tTool(tool.id).name}
                    desc={tTool(tool.id).desc}
                    onClick={() => setView(tool.id)}
                    delay={i * 40}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Why myfixpdf strip */}
      <section className="mx-auto mb-16 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              color: "var(--success)",
              title: t("hero.why.title.private"),
              text: t("hero.why.text.private"),
            },
            {
              icon: Zap,
              color: "var(--brand)",
              title: t("hero.why.title.real"),
              text: t("hero.why.text.real"),
            },
            {
              icon: Layers,
              color: "var(--cat-organize)",
              title: t("hero.why.title.chain"),
              text: t("hero.why.text.chain"),
            },
          ].map((card, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="absolute -right-8 -top-8 size-24 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
                style={{ background: card.color }}
              />
              <span
                className="mb-3 flex size-10 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                style={{ background: card.color }}
              >
                <card.icon className="size-5" />
              </span>
              <p className="text-base font-semibold text-[var(--foreground)]">{card.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{card.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolCard({
  tool,
  name,
  desc,
  onClick,
  delay = 0,
}: {
  tool: ToolMeta;
  name: string;
  desc: string;
  onClick: () => void;
  delay?: number;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover-ring animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute -right-12 -top-12 size-28 rounded-full opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20"
        style={{ background: tool.color }}
      />
      <span
        className="flex size-12 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110"
        style={{ background: tool.color }}
      >
        <ToolGlyph id={tool.id} />
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--foreground)]">{name}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-xs font-semibold" style={{ color: tool.color }}>
        {t("common.openTool")} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ToolGlyph({ id }: { id: string }) {
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
    "pdf-to-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" />
      </svg>
    ),
    "convert-to-pdf": (
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
    "watermark-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" opacity="0.3" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    "reorder-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    "extract-text": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
      </svg>
    ),
    "page-numbers": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" />
      </svg>
    ),
    "redact-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
        <rect x="7" y="13" width="10" height="4" fill="currentColor" stroke="none" />
      </svg>
    ),
    "rotate-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
      </svg>
    ),
    "delete-pages": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    ),
    "crop-pdf": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
    "edit-png": (
      <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  };
  return <>{map[id] ?? <FileStack className="size-6" />}</>;
}
