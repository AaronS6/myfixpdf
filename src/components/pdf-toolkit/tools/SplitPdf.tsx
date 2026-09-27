"use client";

import { useState, useMemo } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { splitPdfSelectPages, splitPdfIntoGroups } from "@/lib/pdf/pdf-ops";
import { PageThumbnailGrid } from "../shared/PageThumbnailGrid";
import { makePreviewUrl, withExt, formatBytes } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Scissors, Layers3, Group } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("split-pdf")!;

type Group = { id: string; pages: number[]; color: string };

const GROUP_COLORS = ["#1AA8E0", "#00C48C", "#FF8A00", "#8C54FF", "#FF4B6E"];

export function SplitPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [mode, setMode] = useState<"single" | "groups">("single");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groups, setGroups] = useState<Group[]>([{ id: "g1", pages: [], color: GROUP_COLORS[0] }]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [rangeText, setRangeText] = useState("");

  const target = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const updateRange = (text: string) => {
    setRangeText(text);
    if (!target) return;
    const next = new Set<number>();
    // Parse "1-3, 5, 8-10"
    const parts = text.split(/[,;\s]+/).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1) next.add(i - 1);
        }
      } else if (/^\d+$/.test(p)) {
        const n = parseInt(p, 10);
        if (n >= 1) next.add(n - 1);
      }
    }
    setSelected(next);
  };

  const addGroup = () => {
    setGroups((g) => [...g, { id: `g${g.length + 1}`, pages: [], color: GROUP_COLORS[g.length % GROUP_COLORS.length] }]);
    setActiveGroup(groups.length);
  };

  const togglePageInGroup = (idx: number) => {
    setGroups((gs) =>
      gs.map((g, i) => {
        if (i !== activeGroup) return g;
        const has = g.pages.includes(idx);
        return { ...g, pages: has ? g.pages.filter((p) => p !== idx) : [...g.pages, idx] };
      }),
    );
  };

  const allGroupPages = useMemo(() => new Set(groups.flatMap((g) => g.pages)), [groups]);

  const run = async () => {
    if (!target) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Splitting your PDF…", "determinate", 0);
      if (mode === "single") {
        if (selected.size === 0) {
          stopProgress();
          toast.error("No pages selected. Tick at least one page or use the range input.");
          return;
        }
        const pages = Array.from(selected).sort((a, b) => a - b);
        const bytes = await splitPdfSelectPages(target.file, pages, (pct, msg) => updateProgress(msg, pct));
        const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
        const beforeUrl = makePreviewUrl(target.file);
        setResult({
          blob,
          name: withExt(target.name, "-extracted.pdf"),
          type: "application/pdf",
          ext: ".pdf",
          size: blob.size,
          beforeSize: target.size,
          beforePreviewUrl: beforeUrl,
        });
      } else {
        // Groups
        const nonEmpty = groups.filter((g) => g.pages.length > 0);
        if (nonEmpty.length === 0) {
          stopProgress();
          toast.error("Add at least one page to a group.");
          return;
        }
        const groupsSorted = nonEmpty.map((g) => g.pages.slice().sort((a, b) => a - b));
        const out = await splitPdfIntoGroups(target.file, groupsSorted, (pct, msg) => updateProgress(msg, pct));
        const results = out.map((bytes, i) => {
          const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
          return {
            blob,
            name: withExt(target.name, `-split-${i + 1}.pdf`),
            type: "application/pdf",
            size: blob.size,
            previewUrl: makePreviewUrl(blob),
          };
        });
        setResult({
          blob: results[0].blob,
          name: results[0].name,
          type: "application/pdf",
          ext: ".pdf",
          size: results.reduce((a, b) => a + b.size, 0),
          results,
        });
      }
      stopProgress();
      setView("result");
      toast.success("Split complete");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Split failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel={`Split ${mode === "single" ? `(${selected.size} pages)` : `(${groups.filter((g) => g.pages.length).length} groups)`}`} ctaColor="var(--cat-organize)" onCtaClick={run}>
      {target ? (
        <div className="mt-5 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-1 rounded-lg bg-[#F7F9FC] p-1">
            <button
              onClick={() => setMode("single")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "single" ? "bg-white text-[#8C54FF] shadow-sm" : "text-[#5B6B79]",
              )}
            >
              <Layers3 className="size-4" /> Extract pages into one PDF
            </button>
            <button
              onClick={() => setMode("groups")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "groups" ? "bg-white text-[#8C54FF] shadow-sm" : "text-[#5B6B79]",
              )}
            >
              <Group className="size-4" /> Split into separate PDFs per group
            </button>
          </div>

          {mode === "single" && (
            <div>
              <label className="text-sm font-semibold text-[#1D2733]">Quick range (e.g. “1-3, 5, 8-10”)</label>
              <input
                type="text"
                value={rangeText}
                onChange={(e) => updateRange(e.target.value)}
                placeholder="1-3, 5, 8-10"
                className="mt-1 w-full rounded-lg border border-[#E4E9F0] bg-white px-3 py-2 text-sm text-[#1D2733] outline-none focus:border-[#1AA8E0]"
              />
              <p className="mt-1 text-xs text-[#5B6B79]">Type page ranges to auto-tick checkboxes below.</p>
            </div>
          )}

          {mode === "groups" && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {groups.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(i)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all",
                      activeGroup === i ? "text-white" : "text-[#1D2733] ring-1 ring-[#E4E9F0]",
                    )}
                    style={{ background: activeGroup === i ? g.color : "#fff" }}
                  >
                    Group {i + 1} · {g.pages.length}
                  </button>
                ))}
                <button
                  onClick={addGroup}
                  className="rounded-full border border-dashed border-[#8C54FF] px-3 py-1 text-xs font-semibold text-[#8C54FF] hover:bg-[#F7F9FC]"
                >
                  + New group
                </button>
              </div>
              <p className="text-xs text-[#5B6B79]">
                Clicking pages adds them to the <span className="font-semibold" style={{ color: groups[activeGroup].color }}>active group</span>.
                Each group becomes a separate output PDF.
              </p>
            </div>
          )}

          <PageThumbnailGrid
            blob={target.file}
            selected={mode === "single" ? selected : allGroupPages}
            onToggle={(i) => {
              if (mode === "single") {
                setSelected((s) => {
                  const next = new Set(s);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                });
              } else {
                togglePageInGroup(i);
              }
            }}
            onToggleAll={(sel) => {
              if (mode === "single") {
                // We can't select all without knowing total — but the grid handles it internally via Set size; we approximate by clearing
                setSelected(new Set());
              }
            }}
            perPageActions={
              mode === "groups"
                ? (idx) => {
                    const gid = groups.findIndex((g) => g.pages.includes(idx));
                    return gid >= 0 ? (
                      <div className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: groups[gid].color }}>
                        G{gid + 1}
                      </div>
                    ) : null;
                  }
                : undefined
            }
          />
          <div className="flex items-start gap-2 rounded-lg border border-[#E4E9F0] bg-[#F7F9FC] p-3 text-xs text-[#5B6B79]">
            <Scissors className="size-4 shrink-0 text-[#8C54FF]" />
            <p>Single mode = all selected pages form one new PDF. Group mode = each group becomes its own PDF (download individually or as ZIP).</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#F7F9FC] p-6 text-center text-sm text-[#5B6B79]">
          Drop a PDF above to pick which pages to extract or split.
        </div>
      )}
    </ToolPageShell>
  );
}
