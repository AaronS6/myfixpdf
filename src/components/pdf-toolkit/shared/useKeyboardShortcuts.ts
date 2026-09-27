"use client";

import { useEffect } from "react";
import { useDocumentSession, type ToolId } from "@/store/document-session";
import { toast } from "sonner";

// Single-key shortcuts (only when not typing in an input)
const SINGLE_KEYS: Record<string, { view: ToolId; label: string }> = {
  h: { view: "home", label: "Home" },
  "1": { view: "compress-pdf", label: "PDF Compressor" },
  "2": { view: "compress-png", label: "Image Compressor" },
  "3": { view: "pdf-to-word", label: "PDF to Word" },
  "4": { view: "word-to-pdf", label: "Word to PDF" },
  "5": { view: "pdf-to-jpg", label: "PDF to JPG" },
  "6": { view: "jpg-to-pdf", label: "JPG to PDF" },
  "7": { view: "split-pdf", label: "Split PDF" },
  "8": { view: "merge-pdf", label: "Merge PDF" },
  "9": { view: "edit-pdf", label: "Edit PDF" },
  w: { view: "watermark-pdf", label: "Watermark PDF" },
  r: { view: "reorder-pdf", label: "Reorder Pages" },
  e: { view: "extract-text", label: "Extract Text" },
  n: { view: "page-numbers", label: "Page Numbers" },
  d: { view: "delete-pages", label: "Delete Pages" },
  c: { view: "crop-pdf", label: "Crop PDF" },
  x: { view: "rotate-pdf", label: "Rotate PDF" },
  g: { view: "edit-png", label: "Edit Image" },
  t: { view: "translate-pdf", label: "Translate" },
  f: { view: "redact-pdf", label: "Redact PDF" },
};

export const SHORTCUT_LIST = Object.entries(SINGLE_KEYS).map(([key, v]) => ({ key, ...v }));

export function useKeyboardShortcuts() {
  const setView = useDocumentSession((s) => s.setView);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
          return;
        }
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const entry = SINGLE_KEYS[key];
      if (entry) {
        e.preventDefault();
        setView(entry.view);
        toast.success(`→ ${entry.label}`, { duration: 1400 });
      }
      if (key === "?") {
        e.preventDefault();
        const help = SHORTCUT_LIST.map((s) => `${s.key.toUpperCase()} → ${s.label}`).join("\n");
        toast.info("Keyboard shortcuts", { description: help, duration: 10000 });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setView]);
}
