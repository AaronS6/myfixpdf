"use client";

import { useState, useMemo } from "react";
import { FileDropzone } from "./shared/FileDropzone";
import { useDocumentSession, newFileId, type ToolkitFile } from "@/store/document-session";
import { TOOLS, CATEGORY_LABELS, CATEGORY_COLORS, type ToolMeta } from "./tools/registry";
import { imageThumbnail, isPdf, getExt } from "@/lib/pdf/file-helpers";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Zap, Layers, FileStack } from "lucide-react";
import { useDocumentSession as useSession } from "@/store/document-session";
import { useI18n } from "./shared/I18nProvider";
import { cn } from "@/lib/utils";

type FilterCat = "all" | "compress" | "convert" | "organize" | "edit";

export function HomeView() {
  const setView = useSession((s) => s.setView);
  const setSourceFiles = useSession((s) => s.setSourceFiles);
  const clearSourceFiles = useSession((s) => s.clearSourceFiles);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterCat>("all");
  const { t, tTool, tt, lang } = useI18n();

  const handleFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const toolkitFiles: ToolkitFile[] = [];
      for (const f of files) {
        const ext = getExt(f.name);
        const tf: ToolkitFile = {
          id: newFileId(), file: f, name: f.name,
          type: f.type || (isPdf(f) ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg"),
          ext, size: f.size, included: true,
        };
        if (isPdf(f)) {
          try { tf.pageCount = await getPageCount(f); }
          catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/encrypted/i.test(msg)) { toast.error(tt("toast.encryptedPdf", { name: f.name })); continue; }
            toast.error(tt("toast.readPdfError", { name: f.name, msg })); continue;
          }
        } else if (f.type.startsWith("image/")) {
          try { tf.thumbnail = await imageThumbnail(f); } catch {}
        }
        toolkitFiles.push(tf);
      }
      if (toolkitFiles.length === 0) { setBusy(false); return; }
      clearSourceFiles();
      setSourceFiles(toolkitFiles);
      const allPdfs = toolkitFiles.every((f) => f.type === "application/pdf");
      const allImages = toolkitFiles.every((f) => f.type.startsWith("image/"));
      const mixed = !allPdfs && !allImages;
      if (mixed || (toolkitFiles.length > 1 && (allPdfs || allImages))) setView("merge-pdf");
      else if (allImages) setView(toolkitFiles.length > 1 ? "convert-to-pdf" : "edit-png");
      else if (allPdfs) {
        if (toolkitFiles.length === 1) toast.success(t("toast.pdfAddedPickTool"), { duration: 3500 });
        else setView("merge-pdf");
      }
    } finally { setBusy(false); }
  };

  // Popular tools for quick-access pills in the hero
  const popularTools = useMemo(() => {
    const ids = ["compress-pdf", "merge-pdf", "pdf-to-word", "edit-pdf", "split-pdf", "convert-to-pdf"];
    return ids.map(id => TOOLS.find(t => t.id === id)).filter(Boolean) as ToolMeta[];
  }, []);

  // Filtered tools based on the active category filter
  const filteredTools = useMemo(() => {
    if (filter === "all") return TOOLS;
    return TOOLS.filter(t => t.category === filter);
  }, [filter]);

  const filterTabs: Array<{ id: FilterCat; label: string; count: number }> = [
    { id: "all", label: lang === "zh" ? "全部" : "All", count: TOOLS.length },
    { id: "compress", label: CATEGORY_LABELS.compress, count: TOOLS.filter(t => t.category === "compress").length },
    { id: "convert", label: CATEGORY_LABELS.convert, count: TOOLS.filter(t => t.category === "convert").length },
    { id: "organize", label: CATEGORY_LABELS.organize, count: TOOLS.filter(t => t.category === "organize").length },
    { id: "edit", label: CATEGORY_LABELS.edit, count: TOOLS.filter(t => t.category === "edit").length },
  ];

  return (
    <div className="relative">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 grain" />
        {/* Floating decorative orbs — larger, more visible */}
        <div className="absolute -left-20 top-10 -z-10 size-80 rounded-full bg-gradient-to-br from-[var(--brand)]/12 to-[var(--brand-accent)]/8 blur-3xl animate-float-slow" />
        <div className="absolute -right-20 -top-5 -z-10 size-96 rounded-full bg-gradient-to-br from-[var(--cat-organize)]/8 to-[var(--brand)]/6 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/3 -z-10 size-64 rounded-full bg-gradient-to-br from-[var(--cat-edit)]/6 to-[var(--cat-convert)]/6 blur-3xl animate-float-slow" style={{ animationDelay: "-4s" }} />

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] backdrop-blur-md animate-fade-up shadow-sm">
              <ShieldCheck className="size-3.5 text-[var(--success)]" />
              {t("hero.badge")}
            </div>

            {/* Headline — big, bold, two-tone */}
            <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl animate-fade-up leading-[1.05]" style={{ animationDelay: "60ms" }}>
              {t("hero.title1")}{" "}
              <span className="brand-gradient-text">{t("hero.titleAccent")}</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-5 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg animate-fade-up leading-relaxed" style={{ animationDelay: "120ms" }}>
              {t("hero.subtitle")}
            </p>

            {/* Dropzone — prominent, centered, max-width constrained */}
            <div className="mx-auto mt-8 max-w-xl animate-fade-up" style={{ animationDelay: "180ms" }}>
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

            {/* Popular tools quick-access pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: "240ms" }}>
              <span className="text-xs font-medium text-[var(--muted-foreground)] mr-1">{lang === "zh" ? "常用:" : "Popular:"}</span>
              {popularTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setView(tool.id)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:shadow-sm hover:scale-105"
                >
                  <span className="size-1.5 rounded-full" style={{ background: tool.color }} />
                  {tTool(tool.id).name}
                  <ArrowRight className="size-3 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* ===== TOOL GRID with category filter pills ===== */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Header + filter pills */}
        <div className="mb-8 flex flex-col items-center gap-4 animate-fade-up">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {t("hero.allTools")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("hero.allTools.subtitle")}</p>
          </div>
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  filter === tab.id
                    ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-accent)] text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]",
                )}
              >
                {tab.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-bold",
                  filter === tab.id ? "bg-white/20 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid — single unified grid, filtered by the pills */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              name={tTool(tool.id).name}
              desc={tTool(tool.id).desc}
              onClick={() => setView(tool.id)}
              delay={i * 30}
            />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* ===== TRUST SECTION — compact, 3 columns ===== */}
      <section className="mx-auto mb-16 max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, color: "var(--success)", title: t("hero.why.title.private"), text: t("hero.why.text.private"), stat: "0", statLabel: lang === "zh" ? "上传" : "uploads" },
            { icon: Zap, color: "var(--brand)", title: t("hero.why.title.real"), text: t("hero.why.text.real"), stat: String(TOOLS.length), statLabel: lang === "zh" ? "个工具" : "tools" },
            { icon: Layers, color: "var(--cat-organize)", title: t("hero.why.title.chain"), text: t("hero.why.text.chain"), stat: "∞", statLabel: lang === "zh" ? "串联" : "chaining" },
          ].map((card, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute -right-6 -top-6 size-20 rounded-full opacity-10 transition-all duration-500 group-hover:scale-125 group-hover:opacity-20" style={{ background: card.color }} />
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110" style={{ background: card.color }}>
                  <card.icon className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-bold text-[var(--foreground)] leading-none">{card.stat}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{card.statLabel}</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{card.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolCard({
  tool, name, desc, onClick, delay = 0,
}: {
  tool: ToolMeta; name: string; desc: string; onClick: () => void; delay?: number;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover-ring animate-fade-up"
      style={{ animationDelay: `${delay}ms`, minHeight: "180px" }}
    >
      {/* Category-colored top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 opacity-60 transition-opacity group-hover:opacity-100" style={{ background: tool.color }} />
      {/* Floating gradient orb */}
      <div
        className="absolute -right-8 -top-8 size-24 rounded-full opacity-10 transition-all duration-500 group-hover:scale-150 group-hover:opacity-25"
        style={{ background: tool.color }}
      />
      <span
        className="flex size-11 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
        style={{ background: tool.color }}
      >
        <ToolGlyph id={tool.id} />
      </span>
      <div className="relative z-10">
        <p className="text-sm font-semibold text-[var(--foreground)]">{name}</p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--muted-foreground)] line-clamp-2">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: tool.color }}>
        {t("common.openTool")} <ArrowRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function ToolGlyph({ id }: { id: string }) {
  const map: Record<string, React.ReactNode> = {
    "compress-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a2 2 0 0 1 2-2h4" /><path d="M20 9V5a2 2 0 0 0-2-2h-4" /><path d="M4 15v4a2 2 0 0 0 2 2h4" /><path d="M20 15v4a2 2 0 0 1-2 2h-4" /><path d="M12 8v8" /><path d="m9 11 3 3 3-3" /></svg>,
    "compress-png": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" /></svg>,
    "pdf-to-word": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" /></svg>,
    "word-to-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 13 6 6" /><path d="m15 13-6 6" /></svg>,
    "pdf-to-jpg": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" /></svg>,
    "pdf-to-png": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L13 16" /></svg>,
    "convert-to-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /></svg>,
    "split-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="18" rx="1.5" /><rect x="13" y="3" width="8" height="18" rx="1.5" /></svg>,
    "merge-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 6 4 4 4-4" /><path d="M12 10v8" /><path d="M5 22h14" /></svg>,
    "edit-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
    "watermark-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" opacity="0.3" /><path d="M9 12l2 2 4-4" /></svg>,
    "reorder-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
    "extract-text": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>,
    "page-numbers": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" /></svg>,
    "redact-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><rect x="7" y="13" width="10" height="4" fill="currentColor" stroke="none" /></svg>,
    "rotate-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>,
    "delete-pages": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>,
    "crop-pdf": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>,
    "edit-png": <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  };
  return <>{map[id] ?? <FileStack className="size-5" />}</>;
}
