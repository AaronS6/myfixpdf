"use client";

/**
 * Thin wrapper around pdfjs-dist for client-side PDF rendering.
 * Loads the worker via a CDN that ships the matching version.
 */
import type * as PdfJs from "pdfjs-dist";

let _pdfjsPromise: Promise<typeof PdfJs> | null = null;

export async function getPdfJs(): Promise<typeof PdfJs> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = (async () => {
    const pdfjs = await import("pdfjs-dist");
    // Pin worker version exactly to the installed version.
    const version = pdfjs.version;
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    try {
      // Some bundlers support new Worker(new URL(...)); here we use CDN URL.
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch (e) {
      // ignore
    }
    return pdfjs;
  })();
  return _pdfjsPromise;
}

export async function loadPdfFromBlob(blob: Blob): Promise<PdfJs.PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const buf = await blob.arrayBuffer();
  const task = pdfjs.getDocument({ data: buf });
  // Capture password errors explicitly so callers can detect encryption.
  try {
    return await task.promise;
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err?.name === "PasswordException") {
      throw new Error("This PDF is encrypted. Please remove the password first.");
    }
    throw e;
  }
}

export async function loadPdfFromBytes(bytes: Uint8Array): Promise<PdfJs.PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  // pdfjs mutates the input buffer; pass a copy to be safe.
  const copy = bytes.slice();
  return await pdfjs.getDocument({ data: copy }).promise;
}

export async function renderPdfPageToCanvas(
  doc: PdfJs.PDFDocumentProxy,
  pageNumber: number,
  target: HTMLCanvasElement,
  scale = 1.0,
  options?: { keepBackingSize?: boolean },
): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // If keepBackingSize is set, the caller has already configured the canvas
  // backing store (e.g. for retina 2x output) — don't overwrite it.
  if (!options?.keepBackingSize) {
    target.width = viewport.width;
    target.height = viewport.height;
  }
  // @ts-expect-error pdfjs needs the legacy render context type
  await page.render({ canvasContext: ctx, viewport }).promise;
}

export async function renderPdfPageToDataUrl(
  doc: PdfJs.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.0,
  quality = 0.7,
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // @ts-expect-error pdfjs needs the legacy render context type
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", quality);
}

export async function getPageCount(blob: Blob): Promise<number> {
  const doc = await loadPdfFromBlob(blob);
  const n = doc.numPages;
  try {
    await doc.cleanup();
  } catch {
    // ignore cleanup errors
  }
  return n;
}

export async function isPdfEncrypted(blob: Blob): Promise<boolean> {
  try {
    await loadPdfFromBlob(blob);
    return false;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return /encrypted/i.test(msg);
  }
}

/**
 * Extract text content from every page of a PDF. Returns an array of pages,
 * each with the recovered text (lines preserved heuristically).
 */
export async function extractPdfText(
  blob: Blob,
  onProgress?: (pct: number, message: string) => void,
): Promise<Array<{ pageNumber: number; text: string; lineCount: number }>> {
  const doc = await loadPdfFromBlob(blob);
  const total = doc.numPages;
  const out: Array<{ pageNumber: number; text: string; lineCount: number }> = [];
  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p);
    let textContent;
    try {
      textContent = await page.getTextContent();
    } catch {
      textContent = { items: [] };
    }
    const items = textContent.items as Array<{ str?: string; transform?: number[] }>;
    const sorted = [...items]
      .filter((it) => it.transform && typeof it.str === "string")
      .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5] }))
      .sort((a, b) => (Math.abs(a.y - b.y) > 4 ? b.y - a.y : a.x - b.x));
    const lines: string[] = [];
    let lastY: number | null = null;
    let buf: string[] = [];
    for (const it of sorted) {
      if (lastY !== null && Math.abs(it.y - lastY) > 4) {
        lines.push(buf.join(" ").trim());
        buf = [];
      }
      buf.push(it.str ?? "");
      lastY = it.y;
    }
    if (buf.length) lines.push(buf.join(" ").trim());
    const text = lines.join("\n");
    out.push({ pageNumber: p, text, lineCount: lines.length });
    if (onProgress) onProgress(Math.round((p / total) * 100), `Extracting page ${p}…`);
    page.cleanup();
  }
  try {
    await (doc as any).cleanup?.();
  } catch {
    // ignore
  }
  return out;
}
