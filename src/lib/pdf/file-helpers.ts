"use client";

/** General client-side file helpers — sizes, validation, thumbnails. */

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  if (!bytes || bytes < 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function percentSaved(before: number, after: number): number {
  if (!before || before === 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}

export function getExt(name: string): string {
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}

export function isPdf(f: File | { type: string; name: string }): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}
export function isPng(f: File | { type: string; name: string }): boolean {
  return f.type === "image/png" || /\.png$/i.test(f.name);
}
export function isJpg(f: File | { type: string; name: string }): boolean {
  return (
    f.type === "image/jpeg" ||
    f.type === "image/jpg" ||
    /\.(jpe?g)$/i.test(f.name)
  );
}
export function isImage(f: File | { type: string; name: string }): boolean {
  return isPng(f) || isJpg(f) || f.type === "image/webp" || f.type === "image/gif" || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
}
export function isDocx(f: File | { type: string; name: string }): boolean {
  return (
    f.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(f.name)
  );
}

export type AcceptString =
  | ".pdf"
  | ".png,.jpg,.jpeg"
  | ".pdf,.png,.jpg,.jpeg"
  | ".docx"
  | ".pdf,.docx"
  | "image/*"
  | "application/pdf";

export function matchesAccept(file: File, accept: string): boolean {
  if (!accept) return true;
  const parts = accept.split(",").map((p) => p.trim().toLowerCase());
  const ext = getExt(file.name).toLowerCase();
  const type = file.type.toLowerCase();
  return parts.some((p) => {
    if (!p) return false;
    if (p.startsWith(".")) return ext === p;
    if (p.endsWith("/*")) return type.startsWith(p.slice(0, -1));
    return type === p;
  });
}

export function validateFile(
  file: File,
  accept: string,
  maxSizeMB = 100,
): { ok: boolean; error?: string } {
  if (!matchesAccept(file, accept)) {
    return {
      ok: false,
      error: `“${file.name}” is not a supported file type.`,
    };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      ok: false,
      error: `“${file.name}” is larger than ${maxSizeMB}MB. Please use a smaller file.`,
    };
  }
  return { ok: true };
}

/** Generate a thumbnail dataURL for an image File. */
export async function imageThumbnail(file: File, maxDim = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/** Pick a sensible filename with a given extension. */
export function withExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  // Smart ext handling:
  //  - If ext starts with "." → use as-is (e.g. ".pdf")
  //  - If ext starts with "-" or "_" → treat as a suffix + keep the original
  //    extension's family (e.g. "-rotated.pdf" → strip ".pdf" off ext →
  //    "-rotated" → use base + "-rotated" + ".pdf")
  let cleanExt: string;
  if (ext.startsWith(".")) {
    cleanExt = ext;
  } else if (ext.startsWith("-") || ext.startsWith("_")) {
    // Already in form "-suffix.ext" or "-suffix"
    cleanExt = ext.includes(".") ? ext : `${ext}.pdf`;
  } else {
    cleanExt = `.${ext}`;
  }
  return `${base}${cleanExt}`;
}

/** Trigger a browser download of a Blob with a given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Returns the blob URL for previews (use object URL — to be revoked when done). */
export function makePreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
