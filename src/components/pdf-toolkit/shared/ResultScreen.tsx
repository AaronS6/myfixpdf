"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  RefreshCw,
  Combine,
  Scissors,
  PenLine,
  FileText,
  FilePlus2,
  Info,
  History,
  Image as ImageIcon,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Archive,
  RotateCcw,
  RotateCw,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useDocumentSession, type ToolId } from "@/store/document-session";
import { formatBytes, percentSaved, downloadBlob, makePreviewUrl } from "@/lib/pdf/file-helpers";
import { PdfPreview } from "./PdfPreview";
import { ImagePreview } from "./ImagePreview";
import { SignaturePadModal } from "./SignaturePadModal";
import { DescriptionModal } from "./DescriptionModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { embedImageOnPage, setPdfMetadata, rotatePdfPage } from "@/lib/pdf/pdf-ops";
import { useI18n } from "./I18nProvider";

const SIZE_WARNING_PDF_MB = 10;
const SIZE_WARNING_IMG_MB = 5;

export function ResultScreen() {
  const { resultFile, setView, chainTo, setResult, reset, startProgress, updateProgress, stopProgress, pushHistory, operations } = useDocumentSession();
  const { t, tt, lang } = useI18n();
  const [compareMode, setCompareMode] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [rename, setRename] = useState<string>("");
  const [sigModal, setSigModal] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  // sigPos is in CSS pixels relative to the page canvas (top-left origin).
  // The scale + page dims are captured at render time into the ref below.
  const [sigPos, setSigPos] = useState<{ x: number; y: number; w: number; h: number; page: number }>({
    x: 80,
    y: 80,
    w: 200,
    h: 80,
    page: 0,
  });
  // Live ref to the page dims/scale the overlay was last rendered with.
  // Used at bake time to convert CSS pixels → PDF points (and flip Y).
  const sigOverlayInfoRef = useRef<{ pageW: number; pageH: number; scale: number; pageIndex: number }>({
    pageW: 595.28,
    pageH: 841.89,
    scale: 1,
    pageIndex: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (resultFile) setRename(resultFile.name);
  }, [resultFile]);

  const isPdf = resultFile?.type === "application/pdf";
  const isImage = resultFile?.type?.startsWith("image/");
  const showMultiResults = !!(resultFile?.results && resultFile.results.length > 0);

  // Memoize preview URL — must be called BEFORE any early return to satisfy rules-of-hooks.
  const previewUrl = useMemo(() => (resultFile ? makePreviewUrl(resultFile.blob) : null), [resultFile]);

  if (!resultFile && !showMultiResults) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[var(--muted-foreground)]">{t("result.noResult")}</p>
        <button onClick={() => setView("home")} className="mt-3 rounded-lg bg-[var(--brand)] px-4 py-2 text-white">
          {t("result.backHome")}
        </button>
      </div>
    );
  }

  const oversizeThreshold = isPdf ? SIZE_WARNING_PDF_MB : isImage ? SIZE_WARNING_IMG_MB : SIZE_WARNING_PDF_MB;
  const isOversize = resultFile && resultFile.size > oversizeThreshold * 1024 * 1024;
  const savedPct = resultFile?.beforeSize ? percentSaved(resultFile.beforeSize, resultFile.size) : 0;
  const saved = !!resultFile?.beforeSize && resultFile.beforeSize > resultFile.size;

  const handleDownload = () => {
    if (!resultFile) return;
    downloadBlob(resultFile.blob, rename || resultFile.name);
    toast.success(t("result.downloadStarted"), { description: rename || resultFile.name });
  };

  const handleDownloadAllZip = async () => {
    if (!resultFile?.results) return;
    const { downloadAsZip } = await import("@/lib/pdf/convert-ops");
    await downloadAsZip(
      resultFile.results.map((r) => ({ blob: r.blob, name: r.name })),
      "pdf-toolkit-export.zip",
    );
    toast.success(t("result.zipDownloaded"));
  };

  // Rotate the current preview 90° clockwise.
  // - PDF: bake rotation into the requested page via pdf-lib (rotatePdfPage).
  // - Image: rotate the pixels via canvas and replace the result blob.
  const handleRotate = async () => {
    if (!resultFile) return;
    try {
      if (isPdf) {
        const pageIndex = Math.max(0, sigOverlayInfoRef.current?.pageIndex ?? 0);
        startProgress(lang === "zh" ? `正在旋转第 ${pageIndex + 1} 页…` : `Rotating page ${pageIndex + 1}…`, "determinate", 0);
        const out = await rotatePdfPage(resultFile.blob, pageIndex, 90, (pct, msg) => updateProgress(msg, pct));
        const newBlob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
        setResult({ ...resultFile, blob: newBlob, size: newBlob.size, name: rename || resultFile.name });
        stopProgress();
        toast.success(lang === "zh" ? `已旋转第 ${pageIndex + 1} 页 90° 顺时针` : `Rotated page ${pageIndex + 1} 90° clockwise`);
      } else if (isImage) {
        startProgress(lang === "zh" ? "正在旋转图片…" : "Rotating image…", "determinate", 0);
        const rotated = await rotateImageBlobCw(resultFile.blob);
        // Preserve ext; mime may shift from jpeg to png if rotated blob becomes png.
        const ext = resultFile.ext || (rotated.type === "image/png" ? ".png" : ".jpg");
        const name = rename || resultFile.name;
        const finalName = ext === resultFile.ext ? name : name.replace(/\.(png|jpe?g)$/i, "") + ext;
        setResult({
          ...resultFile,
          blob: rotated,
          type: rotated.type,
          ext,
          size: rotated.size,
          name: finalName,
        });
        stopProgress();
        toast.success(lang === "zh" ? "已旋转图片 90° 顺时针" : "Rotated image 90° clockwise");
      }
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "旋转失败" : "Rotate failed"));
    }
  };

  const handleAddSignature = async (sig: { dataUrl: string; format: "drawn" | "typed"; color: string }) => {
    if (!resultFile) return;
    setSigModal(false);
    setSignaturePreview(sig.dataUrl);
    // The signature will be baked in when the user clicks "Apply signature" via the apply button below
    toast.success(t("result.signatureReady"), { duration: 4000 });
  };

  const applySignature = async () => {
    if (!resultFile || !signaturePreview) return;
    try {
      startProgress("Baking signature into the PDF…");
      // Convert dataURL → bytes
      const base64 = signaturePreview.split(",")[1] ?? "";
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      // Convert overlay CSS pixels → PDF points (Y measured from bottom-left in PDF space).
      const { pageW, pageH, scale, pageIndex } = sigOverlayInfoRef.current;
      const safeScale = scale > 0 ? scale : 1;
      const pdfX = sigPos.x / safeScale;
      // Y-up conversion: pdfY is the bottom-left Y of the signature rectangle.
      const pdfY = pageH - (sigPos.y + sigPos.h) / safeScale;
      const pdfW = sigPos.w / safeScale;
      const pdfH = sigPos.h / safeScale;
      const out = await embedImageOnPage(
        resultFile.blob,
        pageIndex,
        bytes,
        "png",
        {
          x: pdfX,
          y: pdfY,
          width: Math.max(1, pdfW),
          height: Math.max(1, pdfH),
        },
        (pct, msg) => useDocumentSession.getState().updateProgress(msg, pct),
      );
      const newBlob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      setResult({ ...resultFile, blob: newBlob, size: newBlob.size, name: rename || resultFile.name });
      setSignaturePreview(null);
      stopProgress();
      toast.success(t("result.signatureApplied"));
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : (lang === "zh" ? "应用签名失败" : "Failed to apply signature"));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Header row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              pushHistory();
              setView("home");
            }}
            className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            aria-label="Back"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <input
              type="text"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-[var(--foreground)] outline-none hover:border-[var(--border)] focus:border-[var(--brand)]"
              style={{ width: `${Math.max(20, rename.length + 2)}ch` }}
              aria-label="Edit filename"
            />
            <div className="mt-1 flex items-center gap-2 px-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                {isPdf ? <FileText className="size-3" /> : isImage ? <ImageIcon className="size-3" /> : null}
                {resultFile?.ext.toUpperCase().replace(".", "") || "FILE"}
              </span>
              <span className="text-sm font-semibold text-[var(--foreground)]">{formatBytes(resultFile?.size ?? 0)}</span>
              {saved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                  <RefreshCw className="size-3" />
                  {formatBytes(resultFile!.beforeSize!)} → {formatBytes(resultFile!.size)} (−{savedPct}%)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <button
              onClick={() => setCompareMode((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                compareMode
                  ? "border-[var(--brand)] bg-[var(--brand)]/8 text-[var(--brand)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
              )}
            >
              <Layers className="size-4" /> {compareMode ? t("result.compare.exit") : t("result.compare")}
            </button>
          )}
          {/* Rotate button — for PDF bakes rotation into the current page; for images rotates via canvas */}
          {(isPdf || isImage) && (
            <button
              onClick={handleRotate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label={t("result.rotate")}
              title={t("result.rotate")}
            >
              <RotateCw className="size-4" /> {t("result.rotate")}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.03]"
          >
            <Download className="size-4" /> {t("result.download")}
          </button>
        </div>
      </div>

      {/* Oversize warning */}
      {isOversize && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-sm text-[var(--warning)]">
          <AlertTriangle className="size-5 shrink-0 text-[var(--warning)]" />
          <span className="flex-1">
            {tt("result.oversize.body", { size: formatBytes(resultFile!.size) })}
          </span>
          <button
            onClick={() => chainTo("compress-pdf")}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--warning)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            <Sparkles className="size-3.5" /> {t("result.compressMore")}
          </button>
        </div>
      )}

      {/* Preview pane — stacks above sidebar on mobile */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          {showMultiResults ? (
            <MultiResultsGallery results={resultFile!.results!} />
          ) : compareMode && saved && previewUrl && resultFile?.beforePreviewUrl ? (
            <CompareSlider beforeUrl={resultFile.beforePreviewUrl} afterUrl={previewUrl} position={comparePos} onPosition={setComparePos} />
          ) : isPdf && previewUrl ? (
            <div className="relative h-[60vh] lg:h-[85vh]">
              <PdfPreview
                blob={resultFile!.blob}
                renderOverlay={(pageIndex, pageW, pageH, scale) => {
                  // Capture page/scale info for bake-time conversion. Writing to a ref during
                  // render is safe (does not trigger re-render).
                  sigOverlayInfoRef.current = { pageW, pageH, scale, pageIndex };
                  if (!signaturePreview) return null;
                  return (
                    <SignatureOverlay
                      dataUrl={signaturePreview}
                      pos={sigPos}
                      onChange={setSigPos}
                      onApply={applySignature}
                      onRemove={() => setSignaturePreview(null)}
                      pageIndex={pageIndex}
                    />
                  );
                }}
              />
            </div>
          ) : isImage && previewUrl ? (
            <div className="relative h-[60vh] lg:h-[85vh]">
              <ImagePreview src={previewUrl} />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-[var(--muted-foreground)]">{t("result.noPreview")}</div>
          )}
        </div>

        {/* Action toolbar */}
        <div className="space-y-4">
          {/* What you've done — operation history (moved to top so it's visible) */}
          {operations.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                <History className="size-3.5 text-[var(--brand)]" />
                {lang === "zh" ? "操作历史" : "What you've done"}
              </p>
              <div className="space-y-2">
                {operations.map((op, i) => (
                  <div key={op.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: op.color }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--foreground)]">{op.toolName}</p>
                      <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">{op.description}</p>
                    </div>
                    {op.beforeSize && op.afterSize && op.beforeSize !== op.afterSize && (
                      <span className="shrink-0 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-bold" style={{ color: op.afterSize < op.beforeSize ? "var(--success)" : "var(--warning)" }}>
                        {formatBytes(op.beforeSize)} → {formatBytes(op.afterSize)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{t("result.continueWorking")}</p>
            <div className="grid grid-cols-2 gap-2">
              {isPdf && (
                <>
                  <ActionButton icon={Sparkles} label={t("result.compressMore")} color="var(--cat-compress)" onClick={() => chainTo("compress-pdf")} />
                  <ActionButton icon={Combine} label={t("result.mergeMore")} color="var(--cat-organize)" onClick={() => chainTo("merge-pdf")} />
                  <ActionButton icon={Scissors} label={t("result.splitThis")} color="var(--cat-organize)" onClick={() => chainTo("split-pdf")} />
                  <ActionButton icon={PenLine} label={t("result.signAnnotate")} color="var(--cat-edit)" onClick={() => setSigModal(true)} />
                  <ActionButton icon={FileText} label={t("result.addDescription")} color="var(--cat-edit)" onClick={() => setDescModal(true)} />
                  <ActionButton icon={Layers} label={t("result.editPages")} color="var(--cat-edit)" onClick={() => chainTo("edit-pdf")} />
                </>
              )}
              {isImage && (
                <>
                  <ActionButton icon={Sparkles} label={t("result.compressMore")} color="var(--cat-compress)" onClick={() => chainTo("compress-png")} />
                  <ActionButton icon={Combine} label={t("result.addToMerge")} color="var(--cat-organize)" onClick={() => chainTo("merge-pdf")} />
                  <ActionButton icon={FilePlus2} label={t("result.addToConvertPdf")} color="var(--cat-convert)" onClick={() => chainTo("convert-to-pdf")} />
                  <ActionButton icon={Pencil} label={t("result.editImage")} color="var(--cat-compress)" onClick={() => chainTo("edit-png")} />
                </>
              )}
              <ActionButton icon={RotateCcw} label={t("result.startOver")} color="var(--muted-foreground)" onClick={reset} />
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm shadow-sm">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
              <Info className="size-4 text-[var(--brand)]" /> {t("result.didYouKnow")}
            </p>
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              {t("result.didYouKnow.body")}
            </p>
          </div>

          {/* Compare tip */}
          {saved && (
            <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/8 p-4 text-sm shadow-sm">
              <p className="flex items-center gap-1.5 font-semibold text-[var(--success)]">
                <CheckCircle2 className="size-4" /> {t("result.saved")} {savedPct}%
              </p>
              <p className="mt-1 text-xs text-[var(--foreground)]/70">
                {lang === "zh"
                  ? `原文件 ${formatBytes(resultFile!.beforeSize!)} → 现在 ${formatBytes(resultFile!.size)}。可用上方「对比前后效果」按钮查看质量。`
                  : `Original ${formatBytes(resultFile!.beforeSize!)} → Now ${formatBytes(resultFile!.size)}. Use the “Compare before/after” button above to visually confirm quality.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden ZIP-download helper if multi-result */}
      {showMultiResults && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleDownloadAllZip}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:scale-[1.02] transition-transform"
          >
            <Archive className="size-4" /> {t("result.downloadAllZip")}
          </button>
        </div>
      )}

      {sigModal && <SignaturePadModal open={sigModal} onClose={() => setSigModal(false)} onConfirm={handleAddSignature} />}
      {descModal && <DescriptionModal open={descModal} onClose={() => setDescModal(false)} />}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded-xl border border-[var(--border)] p-3 text-left transition-all hover:border-[var(--brand)] hover:shadow-sm"
    >
      <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ background: color }}>
        <Icon className="size-4" />
      </span>
      <span className="text-xs font-semibold text-[var(--foreground)] leading-tight">{label}</span>
    </button>
  );
}

function MultiResultsGallery({ results }: { results: NonNullable<NonNullable<ReturnType<typeof useDocumentSession.getState>["resultFile"]>["results"]> }) {
  const { t } = useI18n();
  return (
    <div className="bg-[var(--muted)] p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {results.map((r, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="aspect-square overflow-hidden bg-[var(--muted)] p-2">
              {r.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.previewUrl} alt={r.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
                  <FileText className="size-8" />
                </div>
              )}
            </div>
            <div className="border-t border-[var(--border)] p-2">
              <p className="truncate text-xs font-semibold text-[var(--foreground)]">{r.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{formatBytes(r.size)}</p>
              <button
                onClick={() => downloadBlob(r.blob, r.name)}
                className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[var(--brand)] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
              >
                <Download className="size-3" /> {t("result.download")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Rotate an image blob 90° clockwise via canvas. Returns a fresh PNG blob to preserve quality across rotations.
 */
async function rotateImageBlobCw(src: Blob): Promise<Blob> {
  const bitmap = await loadBitmap(src);
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = h;
  canvas.height = w;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Translate to the new center, rotate 90° CW, then draw centered.
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bitmap as CanvasImageSource, -w / 2, -h / 2, w, h);
  try {
    if (bitmap instanceof ImageBitmap) bitmap.close?.();
  } catch {
    // ignore
  }
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode rotated image"))),
      "image/png",
    );
  });
}

/** Load an image blob into either an ImageBitmap or an HTMLImageElement. */
async function loadBitmap(src: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(src);
    } catch {
      // fall through to <img> path
    }
  }
  const url = URL.createObjectURL(src);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image for rotation"));
      img.src = url;
    });
  } finally {
    // Revoke later (after drawImage in caller). Slight leak acceptable.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** Check if a blob URL points to a PDF by fetching its type. */
async function isPdfBlobUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return blob.type === "application/pdf";
  } catch {
    return false;
  }
}

/** Render the first page of a PDF (from a blob URL) to a data URL. */
async function renderPdfFirstPageToDataUrl(blobUrl: string): Promise<string> {
  const { loadPdfFromBlob, renderPdfPageToCanvas } = await import("@/lib/pdf/pdfjs");
  const resp = await fetch(blobUrl);
  const blob = await resp.blob();
  const doc = await loadPdfFromBlob(blob);
  const canvas = document.createElement("canvas");
  // Render at a reasonable scale for the compare slider
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await renderPdfPageToCanvas(doc, 1, canvas, 1.5);
  try { await (doc as any).cleanup?.(); } catch { /* ignore */ }
  return canvas.toDataURL("image/jpeg", 0.85);
}

function CompareSlider({
  beforeUrl,
  afterUrl,
  position,
  onPosition,
}: {
  beforeUrl: string;
  afterUrl: string;
  position: number;
  onPosition: (p: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [beforeImg, setBeforeImg] = useState<string | null>(null);
  const [afterImg, setAfterImg] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => setContainerWidth(containerRef.current?.clientWidth ?? null);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Convert blob URLs to renderable image URLs. If the blob is a PDF,
  // render the first page to a canvas and use the data URL. If it's already
  // an image, use the URL directly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const beforeIsPdf = await isPdfBlobUrl(beforeUrl);
        const afterIsPdf = await isPdfBlobUrl(afterUrl);
        const beforeImage = beforeIsPdf ? await renderPdfFirstPageToDataUrl(beforeUrl) : beforeUrl;
        const afterImage = afterIsPdf ? await renderPdfFirstPageToDataUrl(afterUrl) : afterUrl;
        if (!cancelled) {
          setBeforeImg(beforeImage);
          setAfterImg(afterImage);
        }
      } catch {
        // Fallback: use the URLs directly (will show broken img for PDFs, but at least doesn't crash)
        if (!cancelled) {
          setBeforeImg(beforeUrl);
          setAfterImg(afterUrl);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [beforeUrl, afterUrl]);

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] select-none overflow-hidden bg-[var(--background)]"
      onMouseMove={(e) => {
        if (e.buttons !== 1) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const p = ((e.clientX - rect.left) / rect.width) * 100;
        onPosition(Math.max(0, Math.min(100, p)));
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {afterImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={afterImg} alt="After" className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-[var(--muted-foreground)]">{t("result.loading")}</span>
        )}
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        {beforeImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={beforeImg} alt="Before" className="h-full w-full object-contain" style={{ width: containerWidth ?? "100%" }} />
        ) : null}
      </div>
      <div
        className="compare-handle absolute inset-y-0 w-1 cursor-ew-resize"
        style={{ left: `calc(${position}% - 2px)` }}
      >
        <div className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--card)] text-[var(--brand)] shadow-lg">
          <ChevronLeft className="size-4 -mr-1" />
          <ChevronLeft className="size-4 rotate-180" />
        </div>
      </div>
      <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{t("result.compare.before")}</div>
      <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{t("result.compare.after")}</div>
    </div>
  );
}

function SignatureOverlay({
  dataUrl,
  pos,
  onChange,
  onApply,
  onRemove,
  pageIndex,
}: {
  dataUrl: string;
  pos: { x: number; y: number; w: number; h: number; page: number };
  onChange: (p: { x: number; y: number; w: number; h: number; page: number }) => void;
  onApply: () => void;
  onRemove: () => void;
  pageIndex: number;
}) {
  const dragRef = useRef<{ kind: "move" | "resize"; startX: number; startY: number; start: typeof pos } | null>(null);
  const { t, tt } = useI18n();

  // The overlay is always rendered on the page currently shown by PdfPreview.
  // Sync pos.page so applySignature bakes onto the right page.
  useEffect(() => {
    if (pos.page !== pageIndex) {
      onChange({ ...pos, page: pageIndex });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="pointer-events-auto absolute select-none"
        style={{
          left: pos.x,
          top: pos.y,
          width: pos.w,
          height: pos.h,
          cursor: "move",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          dragRef.current = { kind: "move", startX: e.clientX, startY: e.clientY, start: { ...pos } };
          const move = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            onChange({
              ...dragRef.current.start,
              x: dragRef.current.start.x + dx,
              y: dragRef.current.start.y + dy,
              page: pageIndex,
            });
          };
          const up = () => {
            dragRef.current = null;
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="Signature" className="h-full w-full object-contain opacity-90" draggable={false} />
        <div
          className="absolute -right-1 -bottom-1 size-3 cursor-se-resize rounded-full border-2 border-[var(--brand)] bg-[var(--card)]"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current = { kind: "resize", startX: e.clientX, startY: e.clientY, start: { ...pos } };
            const move = (ev: MouseEvent) => {
              if (!dragRef.current) return;
              const dx = ev.clientX - dragRef.current.startX;
              const dy = ev.clientY - dragRef.current.startY;
              const ar = dragRef.current.start.w / Math.max(1, dragRef.current.start.h);
              const w = Math.max(40, dragRef.current.start.w + dx);
              const h = w / ar;
              onChange({ ...dragRef.current.start, w, h, page: pageIndex });
            };
            const up = () => {
              dragRef.current = null;
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
        />
        <div className="absolute -top-7 left-0 flex items-center gap-1 rounded-md bg-[var(--foreground)]/90 px-1.5 py-0.5 text-[10px] text-white">
          <button onClick={onApply} className="rounded bg-[var(--brand)] px-1.5 py-0.5 font-semibold">{t("result.applySignature")}</button>
          <button onClick={onRemove} className="px-1 hover:text-[var(--danger)]">{t("result.removeSignature")}</button>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--card)]/95 px-2 py-1 shadow-md">
        <span className="text-[10px] text-[var(--muted-foreground)]">{tt("result.onPage", { n: pageIndex + 1 })}</span>
      </div>
    </div>
  );
}
