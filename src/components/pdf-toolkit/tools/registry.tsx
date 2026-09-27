"use client";

import type { ToolId } from "@/store/document-session";

export type ToolMeta = {
  id: ToolId;
  name: string;
  short: string;
  desc: string;
  color: string;
  category: "compress" | "convert" | "organize" | "edit";
  accept: string;
  multiple: boolean;
  /** "new" badge for recently added tools */
  isNew?: boolean;
};

export const TOOLS: ToolMeta[] = [
  {
    id: "compress-pdf",
    name: "PDF Compressor",
    short: "Compress",
    desc: "Shrink PDFs up to 75% — choose quality vs size.",
    color: "var(--cat-compress)",
    category: "compress",
    accept: ".pdf",
    multiple: true,
  },
  {
    id: "compress-png",
    name: "PNG Compressor",
    short: "Compress",
    desc: "Lossy & lossless PNG / JPG compression with live preview.",
    color: "var(--cat-compress)",
    category: "compress",
    accept: ".png,.jpg,.jpeg",
    multiple: true,
  },
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    short: "Convert",
    desc: "Extract text & images into an editable .docx.",
    color: "var(--cat-convert)",
    category: "convert",
    accept: ".pdf",
    multiple: false,
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    short: "Convert",
    desc: "Render .docx into a clean, shareable PDF.",
    color: "var(--cat-convert)",
    category: "convert",
    accept: ".docx",
    multiple: false,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    short: "Convert",
    desc: "Export every page as a JPG — individually or as ZIP.",
    color: "var(--cat-convert)",
    category: "convert",
    accept: ".pdf",
    multiple: false,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    short: "Convert",
    desc: "Combine JPG/PNG images into a single PDF.",
    color: "var(--cat-convert)",
    category: "convert",
    accept: ".png,.jpg,.jpeg",
    multiple: true,
  },
  {
    id: "split-pdf",
    name: "Split PDF",
    short: "Organize",
    desc: "Extract, group, or split pages by checkbox.",
    color: "var(--cat-organize)",
    category: "organize",
    accept: ".pdf",
    multiple: false,
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    short: "Organize",
    desc: "Mix PDFs + images into one PDF. Per-page include.",
    color: "var(--cat-organize)",
    category: "organize",
    accept: ".pdf,.png,.jpg,.jpeg",
    multiple: true,
  },
  {
    id: "reorder-pdf",
    name: "Reorder Pages",
    short: "Organize",
    desc: "Drag-and-drop to rearrange pages of any PDF.",
    color: "var(--cat-organize)",
    category: "organize",
    accept: ".pdf",
    multiple: false,
    isNew: true,
  },
  {
    id: "edit-pdf",
    name: "Edit PDF",
    short: "Edit & Sign",
    desc: "Rotate (per-page), reorder, delete, draw, sign, add text.",
    color: "var(--cat-edit)",
    category: "edit",
    accept: ".pdf",
    multiple: false,
  },
  {
    id: "watermark-pdf",
    name: "Watermark PDF",
    short: "Edit & Sign",
    desc: "Stamp text or image watermarks on every page.",
    color: "var(--cat-edit)",
    category: "edit",
    accept: ".pdf",
    multiple: false,
    isNew: true,
  },
  {
    id: "page-numbers",
    name: "Page Numbers",
    short: "Edit & Sign",
    desc: "Add page numbers in 4 formats and 4 positions.",
    color: "var(--cat-edit)",
    category: "edit",
    accept: ".pdf",
    multiple: false,
    isNew: true,
  },
  {
    id: "extract-text",
    name: "Extract Text",
    short: "Convert",
    desc: "Pull all text out of a PDF into a .txt file.",
    color: "var(--cat-convert)",
    category: "convert",
    accept: ".pdf",
    multiple: false,
    isNew: true,
  },
];

export const getTool = (id: ToolId): ToolMeta | undefined => TOOLS.find((t) => t.id === id);

export const CATEGORY_LABELS: Record<ToolMeta["category"], string> = {
  compress: "Compress",
  convert: "Convert",
  organize: "Organize",
  edit: "Edit & Sign",
};

export const CATEGORY_COLORS: Record<ToolMeta["category"], string> = {
  compress: "var(--cat-compress)",
  convert: "var(--cat-convert)",
  organize: "var(--cat-organize)",
  edit: "var(--cat-edit)",
};
