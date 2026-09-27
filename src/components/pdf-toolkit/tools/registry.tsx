"use client";

import type { ToolId } from "@/store/document-session";

export type ToolMeta = {
  id: ToolId;
  /** Color is language-independent — kept here for category coloring. */
  color: string;
  category: "compress" | "convert" | "organize" | "edit";
  accept: string;
  multiple: boolean;
  isNew?: boolean;
};

export const TOOLS: ToolMeta[] = [
  { id: "compress-pdf", name: "PDF Compressor", short: "Compress", desc: "Shrink PDFs up to 75% — pick your quality vs size trade-off.", color: "var(--cat-compress)", category: "compress", accept: ".pdf", multiple: true },
  { id: "compress-png", name: "Image Compressor", short: "Compress", desc: "Make PNG and JPG files smaller — see the result instantly as you drag the slider.", color: "var(--cat-compress)", category: "compress", accept: ".png,.jpg,.jpeg", multiple: true },
  { id: "edit-png", name: "Edit Image", short: "Edit & Sign", desc: "Annotate PNG and JPG images — draw, add text, shapes, crop, rotate.", color: "var(--cat-compress)", category: "compress", accept: ".png,.jpg,.jpeg", multiple: false },

  { id: "pdf-to-word", name: "PDF to Word", short: "Convert", desc: "Turn a PDF into an editable Word document you can actually open and edit.", color: "var(--cat-convert)", category: "convert", accept: ".pdf", multiple: false },
  { id: "word-to-pdf", name: "Word to PDF", short: "Convert", desc: "Turn a Word document into a clean, shareable PDF.", color: "var(--cat-convert)", category: "convert", accept: ".docx", multiple: false },
  { id: "pdf-to-jpg", name: "PDF to JPG", short: "Convert", desc: "Turn each page of a PDF into a JPG image — download one or all as a ZIP.", color: "var(--cat-convert)", category: "convert", accept: ".pdf", multiple: false },
  { id: "pdf-to-png", name: "PDF to PNG", short: "Convert", desc: "Turn each page of a PDF into a PNG image — download one or all as a ZIP.", color: "var(--cat-convert)", category: "convert", accept: ".pdf", multiple: false },
  { id: "convert-to-pdf", name: "Convert to PDF", short: "Convert", desc: "Turn any image or document into a PDF — JPG, PNG, even another PDF.", color: "var(--cat-convert)", category: "convert", accept: ".pdf,.png,.jpg,.jpeg", multiple: true },
  { id: "extract-text", name: "Extract Text", short: "Convert", desc: "Pull all the text out of a PDF into a plain text file.", color: "var(--cat-convert)", category: "convert", accept: ".pdf", multiple: false },

  { id: "split-pdf", name: "Split PDF", short: "Organize", desc: "Pick exactly which pages to keep — by checkbox or by typing page numbers.", color: "var(--cat-organize)", category: "organize", accept: ".pdf", multiple: false },
  { id: "merge-pdf", name: "Merge PDF", short: "Organize", desc: "Mix PDFs and images into one PDF. Choose which pages to include from each file.", color: "var(--cat-organize)", category: "organize", accept: ".pdf,.png,.jpg,.jpeg", multiple: true },
  { id: "reorder-pdf", name: "Reorder Pages", short: "Organize", desc: "Drag pages around to put them in any order you want.", color: "var(--cat-organize)", category: "organize", accept: ".pdf", multiple: false },
  { id: "rotate-pdf", name: "Rotate PDF", short: "Organize", desc: "Fix sideways or upside-down pages — quick standalone tool.", color: "var(--cat-organize)", category: "organize", accept: ".pdf", multiple: false },
  { id: "delete-pages", name: "Delete Pages", short: "Organize", desc: "Remove pages you don't need — no need to open the full editor.", color: "var(--cat-organize)", category: "organize", accept: ".pdf", multiple: false },
  { id: "crop-pdf", name: "Crop PDF", short: "Organize", desc: "Trim margins and whitespace from your pages.", color: "var(--cat-organize)", category: "organize", accept: ".pdf", multiple: false },

  { id: "edit-pdf", name: "Edit PDF", short: "Edit & Sign", desc: "Rotate one page (not all of them), delete, duplicate, draw, sign, add text.", color: "var(--cat-edit)", category: "edit", accept: ".pdf", multiple: false },
  { id: "watermark-pdf", name: "Watermark PDF", short: "Edit & Sign", desc: "Stamp a text or image watermark across every page.", color: "var(--cat-edit)", category: "edit", accept: ".pdf", multiple: false },
  { id: "page-numbers", name: "Page Numbers", short: "Edit & Sign", desc: "Add page numbers in 4 formats, in 4 positions — one click.", color: "var(--cat-edit)", category: "edit", accept: ".pdf", multiple: false },
  { id: "redact-pdf", name: "Redact PDF", short: "Edit & Sign", desc: "Permanently black out sensitive text so it can never be recovered.", color: "var(--cat-edit)", category: "edit", accept: ".pdf", multiple: false },
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
