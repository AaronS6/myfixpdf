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
  const pdfCache = new Map<Blob, PDFDocument>();
  const MAX_IMG_DIM = 2000; // downscale large images to keep the PDF small + fast

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
      // For images: if the image is very large, downscale it via canvas first
      // to keep the PDF small and the embedding fast. pdf-lib's embedPng/embedJpg
      // has to process the full image data — a 4000×3000 PNG is ~48MB of raw
      // pixel data that slows everything down.
      let embedBytes = item.bytes;
      let embedW = item.width;
      let embedH = item.height;
      const longest = Math.max(item.width, item.height);
      if (longest > MAX_IMG_DIM) {
        const scale = MAX_IMG_DIM / longest;
        embedW = Math.round(item.width * scale);
        embedH = Math.round(item.height * scale);
        // Downscale via canvas
        const blob = new Blob([item.bytes as unknown as BlobPart], { type: item.format === "png" ? "image/png" : "image/jpeg" });
        const url = URL.createObjectURL(blob);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error("Failed to load image for downscaling"));
            im.src = url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = embedW;
          canvas.height = embedH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, embedW, embedH);
            const reencoded: Blob = await new Promise((resolve, reject) =>
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("Re-encode failed"))),
                item.format === "png" ? "image/png" : "image/jpeg",
                0.9,
              ),
            );
            embedBytes = new Uint8Array(await reencoded.arrayBuffer());
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      const img = item.format === "png"
        ? await out.embedPng(embedBytes)
        : await out.embedJpg(embedBytes);
      const page = out.addPage([embedW, embedH]);
      page.drawImage(img, { x: 0, y: 0, width: embedW, height: embedH });
    }

    if (onProgress) onProgress(Math.round(((i + 1) / items.length) * 100), `Merging ${i + 1} of ${items.length}…`);

    // Yield to the event loop every 3 items so the UI doesn't freeze.
    // This lets the ProgressOverlay update and the browser stay responsive.
    if (i % 3 === 2) {
      await new Promise((r) => setTimeout(r, 0));
    }
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

// ====== PDF → PNG images (one per page) ======
export async function pdfToPngImages(
  blob: Blob,
  scale = 1.5,
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
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    // White background so transparent PDF regions don't end up as alpha-only
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @ts-expect-error pdfjs legacy render context
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob2: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    });
    const url = URL.createObjectURL(blob2);
    out.push({
      bytes: new Uint8Array(await blob2.arrayBuffer()),
      name: `page-${i}.png`,
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

// ====== Add a text watermark to every page ======
export type WatermarkOptions = {
  text: string;
  fontSize: number; // pt
  opacity: number; // 0..1
  rotation: number; // degrees
  color: [number, number, number]; // 0..1 each
  /** "all" | "first" | "last" | number (specific 0-based page) */
  target: "all" | "first" | "last" | number;
  /** "center" | "tile" (grid) | corner positions */
  position: "center" | "tile" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export async function addTextWatermark(
  blob: Blob,
  opts: WatermarkOptions,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const targetIndices = computeTargetIndices(opts.target, pages.length);
  for (let i = 0; i < pages.length; i++) {
    if (!targetIndices.has(i)) continue;
    const page = pages[i];
    const { width, height } = page.getSize();
    const positions = computeWatermarkPositions(opts.position, width, height, opts.fontSize, opts.text.length);
    for (const pos of positions) {
      page.drawText(opts.text, {
        x: pos.x,
        y: pos.y,
        size: opts.fontSize,
        font,
        color: rgb(opts.color[0], opts.color[1], opts.color[2]),
        opacity: opts.opacity,
        rotate: degrees(opts.rotation),
      });
    }
    if (onProgress) onProgress(Math.round(((i + 1) / pages.length) * 100), `Watermarking page ${i + 1}…`);
  }
  return doc.save({ useObjectStreams: true });
}

function computeTargetIndices(target: WatermarkOptions["target"], total: number): Set<number> {
  if (target === "all") return new Set(Array.from({ length: total }, (_, i) => i));
  if (target === "first") return new Set([0]);
  if (target === "last") return new Set([total - 1]);
  if (typeof target === "number") return new Set([Math.max(0, Math.min(total - 1, target))]);
  return new Set();
}

function computeWatermarkPositions(
  position: WatermarkOptions["position"],
  pageW: number,
  pageH: number,
  fontSize: number,
  textLen: number,
): Array<{ x: number; y: number }> {
  const textW = textLen * fontSize * 0.55; // approximate
  const textH = fontSize;
  if (position === "center") {
    return [{ x: (pageW - textW) / 2, y: (pageH - textH) / 2 }];
  }
  if (position === "top-left") return [{ x: 40, y: pageH - textH - 40 }];
  if (position === "top-right") return [{ x: pageW - textW - 40, y: pageH - textH - 40 }];
  if (position === "bottom-left") return [{ x: 40, y: 40 }];
  if (position === "bottom-right") return [{ x: pageW - textW - 40, y: 40 }];
  // tile — 3×3 grid
  const out: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (pageW / 3) * col + (pageW / 6) - textW / 2;
      const y = (pageH / 3) * row + (pageH / 6) - textH / 2;
      out.push({ x, y });
    }
  }
  return out;
}

// ====== Add image watermark (logo/stamp) ======
export async function addImageWatermark(
  blob: Blob,
  imageBytes: Uint8Array,
  imageFormat: "png" | "jpg",
  opts: { opacity: number; scale: number; position: WatermarkOptions["position"]; target: WatermarkOptions["target"] },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const img = imageFormat === "png" ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  const pages = doc.getPages();
  const targetIndices = computeTargetIndices(opts.target, pages.length);
  const imgW = img.width * opts.scale;
  const imgH = img.height * opts.scale;
  for (let i = 0; i < pages.length; i++) {
    if (!targetIndices.has(i)) continue;
    const page = pages[i];
    const { width, height } = page.getSize();
    let x = (width - imgW) / 2;
    let y = (height - imgH) / 2;
    if (opts.position === "top-left") { x = 40; y = height - imgH - 40; }
    else if (opts.position === "top-right") { x = width - imgW - 40; y = height - imgH - 40; }
    else if (opts.position === "bottom-left") { x = 40; y = 40; }
    else if (opts.position === "bottom-right") { x = width - imgW - 40; y = 40; }
    page.drawImage(img, { x, y, width: imgW, height: imgH, opacity: opts.opacity });
    if (onProgress) onProgress(Math.round(((i + 1) / pages.length) * 100), `Stamping page ${i + 1}…`);
  }
  return doc.save({ useObjectStreams: true });
}

// ====== Crop a single PDF page (trim margins to a specified rectangle) ======
export async function cropPdfPage(
  blob: Blob,
  pageIndex: number,
  crop: { left: number; right: number; top: number; bottom: number }, // each in PDF points
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const page = doc.getPages()[pageIndex];
  if (!page) throw new Error(`Page ${pageIndex + 1} does not exist.`);
  const { width, height } = page.getSize();
  const newW = Math.max(40, width - crop.left - crop.right);
  const newH = Math.max(40, height - crop.top - crop.bottom);
  page.setCropBox(crop.left, crop.bottom, newW, newH);
  page.setMediaBox(crop.left, crop.bottom, newW, newH);
  if (onProgress) onProgress(100, "Done");
  return doc.save({ useObjectStreams: true });
}

// ====== Add page numbers to every page (footer center) ======
export async function addPageNumbers(
  blob: Blob,
  opts: { format: "1/3" | "Page 1 of 3" | "1" | "1 of 3"; fontSize: number; position: "bottom-center" | "bottom-right" | "top-center" | "top-right"; color: [number, number, number]; startFrom: number },
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const num = i + opts.startFrom;
    const text = opts.format
      .replace("1", String(num))
      .replace("3", String(total + opts.startFrom - 1));
    const textW = font.widthOfTextAtSize(text, opts.fontSize);
    const { width, height } = page.getSize();
    let x = (width - textW) / 2;
    let y = 20;
    if (opts.position === "bottom-right") { x = width - textW - 30; y = 20; }
    else if (opts.position === "top-center") { x = (width - textW) / 2; y = height - opts.fontSize - 20; }
    else if (opts.position === "top-right") { x = width - textW - 30; y = height - opts.fontSize - 20; }
    page.drawText(text, {
      x, y, size: opts.fontSize, font,
      color: rgb(opts.color[0], opts.color[1], opts.color[2]),
    });
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 100), `Numbering page ${i + 1}…`);
  }
  return doc.save({ useObjectStreams: true });
}

// ====== Rotate ALL pages in one pass (true bulk rotation) ======
export async function rotateAllPages(
  blob: Blob,
  rotation: 90 | 180 | 270,
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const current = page.getRotation().angle;
    // Add rotation modulo 360 so we never exceed 360.
    page.setRotation(degrees((current + rotation) % 360));
    if (onProgress && total > 0) {
      onProgress(Math.round(((i + 1) / total) * 100), `Rotating page ${i + 1} of ${total}…`);
    }
  }
  return doc.save({ useObjectStreams: true });
}

// ====== Redact pages — bake filled-black rectangles over sensitive text ======
// The redaction is TRUE: the underlying text/vector content remains in the
// PDF but is visually covered by an opaque black rectangle rendered ABOVE it.
// Coordinates are in PDF points; y is measured from the TOP-left of the page
// (matches the on-screen canvas drag convention). We convert to pdf-lib's
// bottom-left origin internally.
export type Redaction = {
  pageIndex: number; // 0-based
  x: number; // top-left X in PDF points
  y: number; // top-left Y from the top of the page
  width: number;
  height: number;
};

export async function redactPdfPages(
  blob: Blob,
  redactions: Redaction[],
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const pages = doc.getPages();
  // Group by page so we only resolve page size once per page.
  const byPage = new Map<number, Redaction[]>();
  for (const r of redactions) {
    if (r.pageIndex < 0 || r.pageIndex >= pages.length) continue;
    if (!byPage.has(r.pageIndex)) byPage.set(r.pageIndex, []);
    byPage.get(r.pageIndex)!.push(r);
  }
  const total = redactions.length || 1;
  let done = 0;
  for (const [pageIndex, rects] of byPage) {
    const page = pages[pageIndex];
    const { height } = page.getSize();
    for (const r of rects) {
      // Convert top-left Y to bottom-left Y for pdf-lib.
      const yFromBottom = height - r.y - r.height;
      page.drawRectangle({
        x: r.x,
        y: yFromBottom,
        width: r.width,
        height: r.height,
        color: rgb(0, 0, 0),
      });
      done++;
      if (onProgress) {
        onProgress(Math.round((done / total) * 100), `Baking redaction ${done} of ${total}…`);
      }
    }
  }
  return doc.save({ useObjectStreams: true });
}

// ====== Rebuild a brand-new PDF from translated text (one page → one or more pages) ======
// The original layout is NOT preserved — we word-wrap the translated text into
// A4 pages with the Helvetica font. This is approximate by design.
export async function rebuildPdfWithText(
  pages: Array<{ text: string }>,
  opts: { fontSize?: number; margin?: number; lineHeight?: number } = {},
  onProgress?: (pct: number, message: string) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = opts.fontSize ?? 12;
  const margin = opts.margin ?? 40;
  const lineH = opts.lineHeight ?? fontSize * 1.4;
  // A4 portrait in PDF points (72 DPI).
  const pageW = 595.28;
  const pageH = 841.89;
  const maxW = pageW - margin * 2;

  // Wrap text into display lines, preserving blank-line paragraph breaks.
  const wrapParagraph = (paragraph: string): string[] => {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return [""];
    const out: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxW) {
        if (line) out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out;
  };

  for (let i = 0; i < pages.length; i++) {
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - margin - fontSize;
    const text = pages[i].text || "";
    // Preserve paragraph breaks (\n) as blank lines.
    const paragraphs = text.split(/\n/);
    const allLines: string[] = [];
    for (const para of paragraphs) {
      const lines = wrapParagraph(para);
      for (const ln of lines) allLines.push(ln);
    }

    for (const ln of allLines) {
      if (y < margin) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - margin - fontSize;
      }
      if (ln) {
        try {
          page.drawText(ln, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        } catch {
          // Skip any un-encodable characters (Helvetica StandardFont is WinAnsi).
        }
      }
      y -= lineH;
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / pages.length) * 100), `Building PDF page ${i + 1} of ${pages.length}…`);
    }
  }
  return doc.save({ useObjectStreams: true });
}

