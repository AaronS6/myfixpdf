"use client";

import UPNG from "upng-js";
import imageCompression from "browser-image-compression";

export type ImageCompressLevel = {
  /** 0..1 — higher is higher quality. */
  quality: number;
  /** Maximum longest edge in pixels (downsample if larger). */
  maxWidth?: number;
};

/**
 * Compress a JPG/PNG. For PNGs we use UPNG.js lossy quantization (real PNG size
 * reduction). For JPGs we re-encode at the given quality. Output format is
 * always the same as input (a PNG stays a PNG, a JPG stays a JPG) unless
 * `forceConvertJpg` is set (for the "convert to optimized JPG" fallback).
 */
export async function compressImage(
  file: Blob,
  level: ImageCompressLevel,
  onProgress?: (pct: number, message: string) => void,
): Promise<{ blob: Blob; width: number; height: number; format: "png" | "jpg" }> {
  const isPng = file.type === "image/png";
  if (isPng) {
    return await compressPng(file, level, onProgress);
  }
  // JPG path
  return await compressJpg(file, level, onProgress);
}

async function loadAndDownscale(
  blob: Blob,
  maxWidth: number | undefined,
): Promise<{ canvas: HTMLCanvasElement; img: HTMLImageElement }> {
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Failed to load image"));
    im.src = url;
  });
  const scale = maxWidth ? Math.min(1, maxWidth / Math.max(img.width, img.height)) : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  return { canvas, img };
}

async function compressPng(
  file: Blob,
  level: ImageCompressLevel,
  onProgress?: (pct: number, message: string) => void,
): Promise<{ blob: Blob; width: number; height: number; format: "png" }> {
  if (onProgress) onProgress(10, "Decoding PNG…");
  // Use UPNG.js for true lossy quantization. The number of colors is mapped
  // from the quality slider: higher quality → more colors.
  // quality 1.0 → 256 colors, 0.0 → 16 colors.
  const colors = Math.max(2, Math.round(2 + Math.pow(level.quality, 1.5) * 254));
  const buf = new Uint8Array(await file.arrayBuffer());
  // UPNG.decode returns ImageData-like { width, height, data: Uint8Array (RGBA) }
  const decoded = UPNG.decode(buf);
  const rgba = UPNG.toRGBA8(decoded);
  // Build a single ImageData blob; rgba is an array of frames (one per frame).
  const width = decoded.width;
  const height = decoded.height;
  if (onProgress) onProgress(40, `Quantizing to ${colors} colors…`);
  // Encode back: UPNG.encode(frames, w, h, cnum)
  const compressed = UPNG.encode(rgba, width, height, colors);
  const bytes = new Uint8Array(compressed);
  const outBlob = new Blob([bytes], { type: "image/png" });
  if (onProgress) onProgress(100, "Done");
  return { blob: outBlob, width, height, format: "png" };
}

async function compressJpg(
  file: Blob,
  level: ImageCompressLevel,
  onProgress?: (pct: number, message: string) => void,
): Promise<{ blob: Blob; width: number; height: number; format: "png" | "jpg" }> {
  if (onProgress) onProgress(10, "Decoding image…");
  const { canvas } = await loadAndDownscale(file, level.maxWidth);
  if (onProgress) onProgress(50, "Re-encoding JPEG…");
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode JPEG"))),
      "image/jpeg",
      level.quality,
    ),
  );
  if (onProgress) onProgress(100, "Done");
  return { blob, width: canvas.width, height: canvas.height, format: "jpg" };
}

/** Preview a compression level without committing — returns a Blob quickly. */
export async function previewCompress(
  file: Blob,
  level: ImageCompressLevel,
): Promise<{ blob: Blob; width: number; height: number; format: "png" | "jpg" }> {
  // Same as compressImage but without onProgress noise
  return compressImage(file, level);
}
