"use client";

import { PDFDocument, degrees, StandardFonts, rgb } from "pdf-lib";
import type { PDFPage } from "pdf-lib";

/**
 * Real client-side PDF compression pipeline:
 *  - Re-loads the PDF with pdfjs.
 *  - Rasterizes each page to a JPEG at a target DPI / quality.
 *  - Reconstructs a new PDF with pdf-lib, embedding each JPEG as a page sized
 *    to match the original page dimensions (in PDF points, 72 DPI).
 *
 * This produces genuinely smaller output for image-heavy or scanned PDFs, and
 * applies true downsampling + JPEG re-encoding to all raster content. For
 * pure-vector PDFs with no embedded images, the result is often similar to
 * the original — which we surface to the user with a friendly note.
 *
 * Levels:
 *   - "recommended":  ~110 DPI, JPEG quality 0.70  → balanced
 *   - "extreme":      ~80 DPI,  JPEG quality 0.45  → smallest
 *   - "light":        ~150 DPI, JPEG quality 0.92  → best quality
 */

export type CompressionLevel = "light" | "recommended" | "extreme";

const LEVEL_PRESETS: Record<CompressionLevel, { dpi: number; quality: number; label: string; desc: string }> = {
  light: { dpi: 150, quality: 0.92, label: "Best quality", desc: "Larger file, best quality" },
  recommended: { dpi: 110, quality: 0.70, label: "Recommended", desc: "Balanced size & quality" },
  extreme: { dpi: 80, quality: 0.45, label: "Smallest size", desc: "Smaller file, lower quality" },
};

export const COMPRESSION_LEVELS = LEVEL_PRESETS;

export async function compressPdf(
  blob: Blob,
  level: CompressionLevel,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const { loadPdfFromBlob } = await import("./pdfjs");
  const preset = LEVEL_PRESETS[level];
  const doc = await loadPdfFromBlob(blob);
  const total = doc.numPages;
  const images: Array<{ bytes: Uint8Array; width: number; height: number; pageW: number; pageH: number; isJpg: boolean }> = [];

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const pageW = viewport.width; // in PDF points (1pt = 1/72 inch)
    const pageH = viewport.height;
    // Convert target DPI to render scale: scale = targetDpi / 72
    const scale = preset.dpi / 72;
    const renderVp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @ts-expect-error pdfjs legacy render context
    await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", preset.quality);
    const bytes = dataUrlToBytes(dataUrl);
    images.push({
      bytes,
      width: canvas.width,
      height: canvas.height,
      pageW,
      pageH,
      isJpg: true,
    });
    if (onProgress) {
      onProgress(Math.round((i / total) * 70), `Rendering page ${i} of ${total}…`);
    }
  }
  try {
    // pdfjs v6 PDFDocumentProxy exposes cleanup(), not destroy()
    await (doc as any).cleanup?.();
  } catch {
    // ignore
  }

  // Rebuild PDF with each JPEG embedded as a page sized to match the original page dimensions.
  const out = await PDFDocument.create();
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const img = await out.embedJpg(item.bytes);
    const page = out.addPage([item.pageW, item.pageH]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: item.pageW,
      height: item.pageH,
    });
    if (onProgress) {
      const pct = 70 + Math.round(((i + 1) / images.length) * 25);
      onProgress(pct, `Embedding compressed page ${i + 1}…`);
    }
  }
  const bytes = await out.save({ useObjectStreams: true });
  if (onProgress) onProgress(100, "Done");
  return bytes;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ====== Split PDF ======
export async function splitPdfSelectPages(
  blob: Blob,
  pageIndices: number[], // 0-based
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(await blob.arrayBuffer());
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageIndices);
  for (const p of copied) out.addPage(p);
  if (onProgress) onProgress(100, "Done");
  return out.save({ useObjectStreams: true });
}

export async function splitPdfIntoGroups(
  blob: Blob,
  groups: number[][], // each group is an array of 0-based page indices
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(await blob.arrayBuffer());
  const result: Uint8Array[] = [];
  for (let g = 0; g < groups.length; g++) {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, groups[g]);
    for (const p of copied) out.addPage(p);
    result.push(await out.save({ useObjectStreams: true }));
    if (onProgress) onProgress(Math.round(((g + 1) / groups.length) * 100), `Building group ${g + 1}…`);
  }
  return result;
}

// ====== Rotate a single page (does NOT rotate all pages — only the requested index) ======
export async function rotatePdfPage(
  blob: Blob,
  pageIndex: number, // 0-based
  rotation: 90 | 180 | 270,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const pages = doc.getPages();
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`Page ${pageIndex + 1} does not exist in this PDF.`);
  }
  const page = pages[pageIndex];
  const current = page.getRotation().angle;
  page.setRotation(degrees((current + rotation) % 360));
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Delete a single page ======
export async function deletePdfPage(
  blob: Blob,
  pageIndex: number,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  doc.removePage(pageIndex);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Duplicate a single page ======
export async function duplicatePdfPage(
  blob: Blob,
  pageIndex: number,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const pages = doc.getPages();
  const [copy] = await doc.copyPages(doc, [pageIndex]);
  doc.insertPage(pageIndex + 1, copy);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Reorder pages by index permutation ======
export async function reorderPdfPages(
  blob: Blob,
  newOrder: number[],
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(await blob.arrayBuffer());
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, newOrder);
  for (const p of copied) out.addPage(p);
  if (onProgress) onProgress(100, "Done");
  return out.save({ useObjectStreams: true });
}

// ====== Add a blank page ======
export async function insertBlankPage(
  blob: Blob,
  atIndex: number,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  // Insert a default-sized blank page (A4 portrait)
  const page = doc.insertPage(atIndex, [595.28, 841.89]);
  // Touch it so pdf-lib doesn't optimize it away
  page.setSize(595.28, 841.89);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Add text to a page at given coords ======
export async function addTextToPage(
  blob: Blob,
  pageIndex: number,
  text: string,
  opts: { x: number; y: number; size: number; color: [number, number, number]; font?: "Helvetica" | "TimesRoman" },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const font =
    opts.font === "TimesRoman"
      ? await doc.embedFont(StandardFonts.TimesRoman)
      : await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[pageIndex];
  if (!page) throw new Error(`Page ${pageIndex + 1} does not exist.`);
  page.drawText(text, {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font,
    color: rgb(opts.color[0], opts.color[1], opts.color[2]),
  });
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Embed an image (PNG or JPG) at coords on a page ======
export async function embedImageOnPage(
  blob: Blob,
  pageIndex: number,
  imageBytes: Uint8Array,
  imageFormat: "png" | "jpg",
  opts: { x: number; y: number; width: number; height: number },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const img = imageFormat === "png" ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  const page = doc.getPages()[pageIndex];
  if (!page) throw new Error(`Page ${pageIndex + 1} does not exist.`);
  page.drawImage(img, opts);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Set PDF metadata (Subject / Keywords etc.) ======
export async function setPdfMetadata(
  blob: Blob,
  meta: { title?: string; author?: string; subject?: string; keywords?: string[] },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== JPG/PNG → single PDF ======
export async function imagesToPdf(
  images: Array<{ bytes: Uint8Array; format: "png" | "jpg"; width: number; height: number }>,
  opts: { pageSize: "fit" | "a4" | "letter"; orientation: "portrait" | "landscape"; margin: number },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const A4 = [595.28, 841.89];
  const Letter = [612, 792];
  const base = opts.pageSize === "a4" ? A4 : opts.pageSize === "letter" ? Letter : null;
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const img = item.format === "png" ? await doc.embedPng(item.bytes) : await doc.embedJpg(item.bytes);
    let pageW: number, pageH: number;
    if (base) {
      if (opts.orientation === "landscape") {
        pageW = base[1];
        pageH = base[0];
      } else {
        pageW = base[0];
        pageH = base[1];
      }
    } else {
      // Fit to image
      pageW = item.width;
      pageH = item.height;
    }
    const page = doc.addPage([pageW, pageH]);
    const margin = opts.margin;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const scale = Math.min(availW / item.width, availH / item.height);
    const drawW = item.width * scale;
    const drawH = item.height * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;
    page.drawImage(img, { x, y, width: drawW, height: drawH });
    if (onProgress) onProgress(Math.round(((i + 1) / images.length) * 100), `Embedding image ${i + 1}…`);
  }
  return doc.save({ useObjectStreams: true });
}

// ====== Merge mixed PDF + images into one PDF ======
export type MergeItem =
  | { kind: "pdf-page"; blob: Blob; pageIndex: number }
  | { kind: "image"; bytes: Uint8Array; format: "png" | "jpg"; width: number; height: number };

export async function mergeItemsToPdf(
  items: MergeItem[],
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  // Cache source PDF documents by blob reference
  const pdfCache = new Map<Blob, PDFDocument>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "pdf-page") {
      let src = pdfCache.get(item.blob);
      if (!src) {
        src = await PDFDocument.load(await item.blob.arrayBuffer());
        pdfCache.set(item.blob, src);
      }
      const [copied] = await out.copyPages(src, [item.pageIndex]);
      out.addPage(copied);
    } else {
      const img = item.format === "png" ? await out.embedPng(item.bytes) : await out.embedJpg(item.bytes);
      // Page sized to image
      const page = out.addPage([item.width, item.height]);
      page.drawImage(img, { x: 0, y: 0, width: item.width, height: item.height });
    }
    if (onProgress) onProgress(Math.round(((i + 1) / items.length) * 100), `Merging page ${i + 1}…`);
  }
  return out.save({ useObjectStreams: true });
}

// ====== PDF → JPG images (one per page) ======
export async function pdfToJpgImages(
  blob: Blob,
  scale = 1.5,
  quality = 0.85,
  onProgress?: (pct: number, message: string) => void,
): Promise<Array<{ bytes: Uint8Array; name: string; width: number; height: number; previewUrl: string }>> {
  const { loadPdfFromBlob } = await import("./pdfjs");
  const doc = await loadPdfFromBlob(blob);
  const total = doc.numPages;
  const out: Array<{ bytes: Uint8Array; name: string; width: number; height: number; previewUrl: string }> = [];
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @ts-expect-error pdfjs legacy render context
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob2: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality),
    );
    const url = URL.createObjectURL(blob2);
    out.push({
      bytes: new Uint8Array(await blob2.arrayBuffer()),
      name: `page-${i}.jpg`,
      width: canvas.width,
      height: canvas.height,
      previewUrl: url,
    });
    if (onProgress) onProgress(Math.round((i / total) * 100), `Rendering page ${i}…`);
  }
  try {
    await (doc as any).cleanup?.();
  } catch {
    // ignore
  }
  return out;
}
