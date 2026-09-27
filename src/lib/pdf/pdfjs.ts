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
): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  target.width = viewport.width;
  target.height = viewport.height;
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
