"use client";

/**
 * Thin wrapper around pdfjs-dist for client-side PDF rendering.
 * Loads the worker via a CDN that ships the matching version.
 *
 * NOTE: pdfjs-dist v6's TypeScript type defs for PDFDocumentProxy don't
 * include `cleanup()` (it exists at runtime). All `(doc as any).cleanup?.()`
 * calls in this codebase are this same pattern — safe because cleanup() is
 * the correct API (not destroy(), which lives on PDFDocumentLoadingTask).
 */
import type * as PdfJs from "pdfjs-dist";

let _pdfjsPromise: Promise<typeof PdfJs> | null = null;

/**
 * Polyfill: pdfjs-dist v6 calls `.toHex()` on internal hash/fingerprint
 * Uint8Array objects inside the Web Worker. The worker has its OWN JavaScript
 * context — prototypes patched in the main thread DON'T carry over.
 *
 * Solution: fetch the worker source from CDN, PREPEND the polyfill, create a
 * blob URL, and use THAT as the worker source. This way the polyfill runs
 * inside the worker before pdfjs code executes.
 *
 * If the fetch fails (offline/CDN issues), we fall back to disabling the
 * worker entirely — pdfjs runs in the main thread where our polyfill IS
 * active. Slightly slower but 100% reliable.
 */
const TOHEX_POLYFILL = `
if (typeof Uint8Array !== 'undefined' && !Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function() {
    var out = '';
    for (var i = 0; i < this.length; i++) {
      out += this[i].toString(16).padStart(2, '0');
    }
    return out;
  };
}
if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.prototype && !ArrayBuffer.prototype.toHex) {
  ArrayBuffer.prototype.toHex = function() {
    return new Uint8Array(this).toHex();
  };
}
`;

function polyfillToHexMainThread() {
  if (typeof Uint8Array !== "undefined" && !(Uint8Array.prototype as any).toHex) {
    (Uint8Array.prototype as any).toHex = function () {
      let out = "";
      for (let i = 0; i < this.length; i++) {
        out += this[i].toString(16).padStart(2, "0");
      }
      return out;
    };
  }
}

export async function getPdfJs(): Promise<typeof PdfJs> {
  if (_pdfjsPromise) return _pdfjsPromise;
  // Apply polyfill in main thread too (for disableWorker fallback)
  polyfillToHexMainThread();
  _pdfjsPromise = (async () => {
    // Use the LEGACY build — it includes polyfills for getOrInsertComputed,
    // toHex, and other modern JS APIs that older browsers don't have.
    // The modern build assumes the browser supports these natively.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const version = (pdfjs as any).version || "6.3.289";
    // Legacy worker URL — includes all the same polyfills as the legacy main build
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`;

    // Try to create a patched worker with the polyfill prepended as extra safety.
    try {
      const resp = await fetch(workerUrl);
      if (resp.ok) {
        const workerCode = await resp.text();
        const patchedCode = TOHEX_POLYFILL + "\n" + workerCode;
        const blob = new Blob([patchedCode], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        (pdfjs as any).GlobalWorkerOptions.workerSrc = blobUrl;
      } else {
        (pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl;
      }
    } catch {
      try {
        (pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl;
      } catch {
        // Last resort: no worker — pdfjs runs in main thread where polyfill is active
      }
    }
    return pdfjs as typeof PdfJs;
  })();
  return _pdfjsPromise;
}

export async function loadPdfFromBlob(blob: Blob): Promise<PdfJs.PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const buf = await blob.arrayBuffer();
  // Try loading with the worker first. If it fails with toHex, retry
  // with disableWorker (main thread, where our polyfill is active).
  const tryLoad = async (opts: Record<string, unknown>) => {
    const task = pdfjs.getDocument({ data: buf, ...opts });
    try {
      return await task.promise;
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "PasswordException") {
        throw new Error("This PDF is encrypted. Please remove the password first.");
      }
      throw e;
    }
  };

  try {
    return await tryLoad({});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // If the error is about toHex, retry in the main thread (no worker)
    // where our polyfill is active.
    if (msg.includes("toHex") || msg.includes("is not a function")) {
      try {
        return await tryLoad({ disableWorker: true });
      } catch (e2: unknown) {
        const err = e2 as { name?: string; message?: string };
        if (err?.name === "PasswordException") {
          throw new Error("This PDF is encrypted. Please remove the password first.");
        }
        throw e2;
      }
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
/**
 * Load tesseract.js from a CDN via a dynamic <script> tag (UMD build exposes
 * window.Tesseract). We use the CDN script approach instead of `import("tesseract.js")`
 * because the npm package's dynamic import doesn't resolve cleanly through
 * Turbopack in the browser (Web Worker path + wasm path issues). The UMD CDN
 * build self-configures its worker + core + lang-data URLs to the same CDN.
 */
function loadTesseractFromCdn(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("not in browser"));
    const w = window as any;
    if (w.Tesseract) return resolve(w.Tesseract);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      if ((window as any).Tesseract) resolve((window as any).Tesseract);
      else reject(new Error("Tesseract script loaded but window.Tesseract is not set"));
    };
    s.onerror = () => reject(new Error("Failed to load tesseract.js from CDN (cdn.jsdelivr.net)"));
    document.head.appendChild(s);
  });
}

export async function extractPdfText(
  blob: Blob,
  onProgress?: (pct: number, message: string) => void,
): Promise<Array<{ pageNumber: number; text: string; lineCount: number; ocrUsed?: boolean }>> {
  const doc = await loadPdfFromBlob(blob);
  const total = doc.numPages;
  const out: Array<{ pageNumber: number; text: string; lineCount: number; ocrUsed?: boolean }> = [];

  // Group pdfjs text items into lines by Y proximity (4px threshold).
  // Items on the same visual line (Y diff <= 4px) are joined with spaces;
  // larger Y gaps start a new line. Sorted top-to-bottom (PDF Y grows up,
  // so descending Y = reading order), left-to-right within a line.
  const groupItemsToLines = (rawItems: unknown[]): { text: string; lineCount: number } => {
    const items = rawItems as Array<{ str?: string; transform?: number[] }>;
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
    return { text: lines.join("\n"), lineCount: lines.length };
  };

  // Phase 1: fast pdfjs text extraction on every page (0-30% progress).
  // For normal text PDFs this gets everything and we skip OCR entirely.
  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p);
    let textContent;
    try {
      textContent = await page.getTextContent();
    } catch {
      textContent = { items: [] };
    }
    const { text, lineCount } = groupItemsToLines(textContent.items);
    out.push({ pageNumber: p, text, lineCount, ocrUsed: false });
    page.cleanup();
    if (onProgress) onProgress(Math.round((p / total) * 30), `Extracting text from page ${p}…`);
  }

  // Phase 2: OCR fallback for pages that got little/no text from pdfjs.
  // This handles SCANNED / image-only PDFs (no text layer) and mixed PDFs
  // (some text pages + some image pages). tesseract.js is loaded from CDN
  // (UMD build → window.Tesseract) — the npm package's dynamic import doesn't
  // resolve cleanly through Turbopack in the browser (worker path issues).
  // We render each sparse page to a 2x-DPI canvas and OCR it, keeping whichever
  // result is longer.
  const SPARSE_THRESHOLD = 30; // chars below which a page is considered "sparse"
  const sparsePages = out.filter((p) => p.text.trim().length < SPARSE_THRESHOLD);
  if (sparsePages.length > 0) {
    try {
      const Tesseract = await loadTesseractFromCdn();
      const worker = await Tesseract.createWorker("eng");
      try {
        let done = 0;
        for (let p = 1; p <= total; p++) {
          const existing = out[p - 1];
          if (existing.text.trim().length >= SPARSE_THRESHOLD) continue; // page already has text
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // No { alpha: false } + no pre-fill — matches PdfPreview's working
            // render pattern. (With alpha:false pdfjs compositing drew nothing.)
            // @ts-expect-error pdfjs legacy render context
            await page.render({ canvasContext: ctx, viewport }).promise;
            const { data: { text: ocrText } } = await worker.recognize(canvas);
            if (ocrText && ocrText.trim().length > existing.text.trim().length) {
              const ocrLines = ocrText.split("\n").filter((l) => l.trim().length > 0);
              existing.text = ocrLines.join("\n");
              existing.lineCount = ocrLines.length;
              existing.ocrUsed = true;
            }
          }
          page.cleanup();
          done++;
          if (onProgress) onProgress(30 + Math.round((done / sparsePages.length) * 70), `OCR on page ${p} of ${total}…`);
        }
      } finally {
        await worker.terminate();
      }
    } catch (e) {
      // OCR failed (CDN unreachable, worker init error, pdfjs couldn't render
      // the page, etc.) — keep the pdfjs results. Log so it's debuggable.
      console.warn("[extractPdfText] OCR fallback failed:", e);
    }
  }

  try {
    await (doc as any).cleanup?.();
  } catch {
    // ignore
  }
  return out;
}
