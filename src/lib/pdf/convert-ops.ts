"use client";

import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
} from "docx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/** Bundle an array of {blob, name} pairs into a ZIP and trigger download. */
export async function downloadAsZip(
  items: Array<{ blob: Blob; name: string }>,
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  for (const item of items) {
    zip.file(item.name, item.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, zipName);
}

/** ====== PDF → DOCX ====== */
export async function pdfToDocx(
  blob: Blob,
  onProgress?: (pct: number, message: string) => void,
): Promise<Blob> {
  const { loadPdfFromBlob } = await import("./pdfjs");
  const doc = await loadPdfFromBlob(blob);
  const total = doc.numPages;
  const paragraphs: Paragraph[] = [];
  let imageCount = 0;
  let textLayerSize = 0;

  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p);
    if (onProgress) onProgress(Math.round((p / total) * 70), `Extracting page ${p}…`);

    // Try to extract text content
    let textContent;
    try {
      textContent = await page.getTextContent();
    } catch {
      textContent = { items: [] };
    }
    // Group items by their Y coordinate to recover line structure
    const items = textContent.items as Array<{ str?: string; transform?: number[]; height?: number }>;
    textLayerSize += items.reduce((acc, it) => acc + (it.str?.length ?? 0), 0);

    // Sort by Y descending (top to bottom) then X ascending
    const sorted = [...items]
      .filter((it) => it.transform && typeof it.str === "string")
      .map((it) => ({
        str: it.str as string,
        x: it.transform![4],
        y: it.transform![5],
        h: it.height ?? 10,
      }))
      .sort((a, b) => (Math.abs(a.y - b.y) > 4 ? b.y - a.y : a.x - b.x));

    // Group into lines
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

    if (lines.length === 0) {
      // No text → treat page as image-only, rasterize and embed
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // @ts-expect-error pdfjs legacy render context
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgBlob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.85),
        );
        const imgBytes = new Uint8Array(await imgBlob.arrayBuffer());
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: canvas.width, height: canvas.height },
                type: "jpg",
              } as any),
            ],
          }),
          new Paragraph({}),
        );
        imageCount++;
      }
    } else {
      for (const line of lines) {
        if (!line.trim()) {
          paragraphs.push(new Paragraph({}));
          continue;
        }
        // Heuristic: large font (height > ~14) → heading
        const maxH = Math.max(
          ...sorted
            .filter((it) => line.includes(it.str))
            .map((it) => it.h)
            .map((h) => (typeof h === "number" ? h : 10)),
        );
        const heading =
          maxH > 18
            ? HeadingLevel.HEADING_1
            : maxH > 14
            ? HeadingLevel.HEADING_2
            : undefined;
        paragraphs.push(
          new Paragraph({
            heading,
            children: [new TextRun(line)],
          }),
        );
      }
      paragraphs.push(new Paragraph({}));
    }
    page.cleanup();
  }

  if (onProgress) onProgress(85, "Building .docx…");
  const docx = new DocxDocument({
    creator: "PDF Toolkit",
    title: "Converted from PDF",
    sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph("")] }],
  });
  const blobOut = await Packer.toBlob(docx);
  if (onProgress) onProgress(100, "Done");
  try {
    await (doc as any).cleanup?.();
  } catch {
    // ignore
  }
  return blobOut;
}

/** ====== DOCX → PDF (via mammoth HTML → html2canvas + jsPDF) ====== */
export async function docxToPdf(
  blob: Blob,
  onProgress?: (pct: number, message: string) => void,
): Promise<Blob> {
  const mammoth = (await import("mammoth")).default;
  if (onProgress) onProgress(20, "Reading .docx…");
  const arrayBuf = await blob.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer: arrayBuf },
    { styleMap: ["p[style-name='Title'] => h1:fresh", "b => strong", "i => em"] },
  );
  const html = result.value;
  if (onProgress) onProgress(50, "Rendering HTML…");

  // Render the HTML inside a hidden iframe-like container to a canvas via html2canvas
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: 794px; /* A4 width at ~96dpi */
    padding: 36px;
    background: #ffffff;
    color: #111;
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;
  container.innerHTML = `<div>${html}</div>`;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    if (onProgress) onProgress(75, "Slicing into PDF pages…");
    const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }
    const out = pdf.output("blob");
    if (onProgress) onProgress(100, "Done");
    return out;
  } finally {
    document.body.removeChild(container);
  }
}
