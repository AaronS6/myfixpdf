"use client";

/**
 * HEIC → PNG auto-conversion using heic2any.
 * Detects HEIC/HEIF files by extension or MIME type and converts them to PNG
 * Blobs that the browser can natively render (canvas, img, pdf-lib).
 */

export function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  );
}

export async function convertHeicToPng(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const pngBlob = (await heic2any({
    blob: file,
    toType: "image/png",
    quality: 0.9,
  })) as Blob;
  // heic2any returns a Blob[] for multi-image HEIC, or a single Blob
  const blob = Array.isArray(pngBlob) ? pngBlob[0] : pngBlob;
  const newName = file.name.replace(/\.(heic|heif)$/i, ".png");
  return new File([blob], newName, { type: "image/png" });
}
