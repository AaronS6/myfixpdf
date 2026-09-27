"use client";

import { useState } from "react";
import { ToolPageShell } from "../ToolPageShell";
import { getTool } from "./registry";
import { useDocumentSession } from "@/store/document-session";
import { addTextWatermark, addImageWatermark, type WatermarkOptions } from "@/lib/pdf/pdf-ops";
import { makePreviewUrl, withExt } from "@/lib/pdf/file-helpers";
import { toast } from "sonner";
import { Droplets, Type, Image as ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const tool = getTool("watermark-pdf")!;

const COLOR_PRESETS = [
  { name: "Dark Gray", rgb: [0.4, 0.4, 0.4] as [number, number, number] },
  { name: "Red", rgb: [0.94, 0.27, 0.22] as [number, number, number] },
  { name: "Blue", rgb: [0.1, 0.66, 0.88] as [number, number, number] },
  { name: "Green", rgb: [0.12, 0.71, 0.36] as [number, number, number] },
  { name: "Orange", rgb: [1, 0.54, 0] as [number, number, number] },
];

const POSITIONS: Array<{ id: WatermarkOptions["position"]; label: string }> = [
  { id: "center", label: "Center" },
  { id: "tile", label: "Tile (3×3)" },
  { id: "top-left", label: "Top Left" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-right", label: "Bottom Right" },
];

const TARGETS: Array<{ id: WatermarkOptions["target"]; label: string }> = [
  { id: "all", label: "All pages" },
  { id: "first", label: "First page only" },
  { id: "last", label: "Last page only" },
];

export function WatermarkPdf() {
  const { sourceFiles, setResult, setView, startProgress, updateProgress, stopProgress } = useDocumentSession();
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState<[number, number, number]>(COLOR_PRESETS[0].rgb);
  const [position, setPosition] = useState<WatermarkOptions["position"]>("tile");
  const [target, setTarget] = useState<WatermarkOptions["target"]>("all");
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [imageFormat, setImageFormat] = useState<"png" | "jpg">("png");
  const [imageScale, setImageScale] = useState(0.3);

  const target0 = sourceFiles.find((f) => f.included) ?? sourceFiles[0];

  const run = async () => {
    if (!target0) {
      toast.error("Please add a PDF first.");
      return;
    }
    try {
      startProgress("Applying watermark…", "determinate", 0);
      const beforeUrl = makePreviewUrl(target0.file);
      let bytes: Uint8Array;
      if (mode === "text") {
        if (!text.trim()) {
          stopProgress();
          toast.error("Please enter watermark text.");
          return;
        }
        bytes = await addTextWatermark(target0.file, {
          text, fontSize, opacity, rotation, color, position, target,
        }, (pct, msg) => updateProgress(msg, pct));
      } else {
        if (!imageBytes) {
          stopProgress();
          toast.error("Please upload a watermark image first.");
          return;
        }
        bytes = await addImageWatermark(target0.file, imageBytes, imageFormat, {
          opacity, scale: imageScale, position, target,
        }, (pct, msg) => updateProgress(msg, pct));
      }
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        blob,
        name: withExt(target0.name, "-watermarked.pdf"),
        type: "application/pdf",
        ext: ".pdf",
        size: blob.size,
        beforeSize: target0.size,
        beforePreviewUrl: beforeUrl,
      });
      stopProgress();
      setView("result");
      toast.success("Watermark applied");
    } catch (e) {
      stopProgress();
      toast.error(e instanceof Error ? e.message : "Watermark failed");
    }
  };

  return (
    <ToolPageShell tool={tool} ctaLabel="Apply Watermark" ctaColor="var(--cat-edit)" onCtaClick={run}>
      {target0 ? (
        <div className="mt-5 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 rounded-lg bg-[var(--muted)] p-1">
            <button
              onClick={() => setMode("text")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "text" ? "bg-[var(--card)] text-[#FF4B6E] shadow-sm" : "text-[var(--muted-foreground)]",
              )}
            >
              <Type className="size-4" /> Text watermark
            </button>
            <button
              onClick={() => setMode("image")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "image" ? "bg-[var(--card)] text-[#FF4B6E] shadow-sm" : "text-[var(--muted-foreground)]",
              )}
            >
              <ImageIcon className="size-4" /> Image watermark
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: controls */}
            <div className="space-y-4">
              {mode === "text" ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-[var(--foreground)]">Watermark text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="CONFIDENTIAL"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-semibold text-[var(--foreground)]">Font size</label>
                        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{fontSize}pt</span>
                      </div>
                      <input type="range" min="12" max="120" step="2" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-full accent-[#FF4B6E]" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-semibold text-[var(--foreground)]">Rotation</label>
                        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{rotation}°</span>
                      </div>
                      <input type="range" min="0" max="360" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value, 10))} className="w-full accent-[#FF4B6E]" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-semibold text-[var(--foreground)]">Watermark image</label>
                    <label className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)] py-6 text-sm font-medium text-[var(--muted-foreground)] hover:border-[#FF4B6E] hover:text-[#FF4B6E]">
                      <Upload className="size-4" /> {imageBytes ? "Image loaded — click to replace" : "Upload PNG or JPG"}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const buf = await f.arrayBuffer();
                          setImageBytes(new Uint8Array(buf));
                          setImageFormat(f.type === "image/png" || /\.png$/i.test(f.name) ? "png" : "jpg");
                          toast.success(`Loaded ${f.name}`);
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm font-semibold text-[var(--foreground)]">Image scale</label>
                      <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{Math.round(imageScale * 100)}%</span>
                    </div>
                    <input type="range" min="0.05" max="1" step="0.05" value={imageScale} onChange={(e) => setImageScale(parseFloat(e.target.value))} className="w-full accent-[#FF4B6E]" />
                  </div>
                </>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Opacity</label>
                  <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-bold text-[var(--foreground)]">{Math.round(opacity * 100)}%</span>
                </div>
                <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-[#FF4B6E]" />
              </div>

              {mode === "text" && (
                <div>
                  <label className="text-sm font-semibold text-[var(--foreground)]">Color</label>
                  <div className="mt-1 flex gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.rgb)}
                        className={cn(
                          "size-8 rounded-full border-2 transition-all",
                          color === c.rgb ? "border-[var(--brand)] scale-110" : "border-[var(--border)]",
                        )}
                        style={{ background: `rgb(${c.rgb.map((v) => Math.round(v * 255)).join(",")})` }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-[var(--foreground)]">Position</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPosition(p.id)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                        position === p.id ? "border-[#FF4B6E] bg-[var(--cat-edit)]/10 text-[#FF4B6E]" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] dark:hover:bg-[#0E1626]",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--foreground)]">Apply to</label>
                <div className="mt-1 flex gap-2">
                  {TARGETS.map((t) => (
                    <button
                      key={String(t.id)}
                      onClick={() => setTarget(t.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        target === t.id ? "border-[#FF4B6E] bg-[var(--cat-edit)]/10 text-[#FF4B6E]" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] dark:hover:bg-[#0E1626]",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: live preview mockup */}
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Preview</p>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-24 rounded-lg bg-gradient-to-br from-[#23A6D5]/20 to-[#2FE0C6]/20" />
                  <div className="absolute bottom-6 left-6 h-2 w-20 rounded bg-[#E4E9F0] dark:bg-[#1E2A44]" />
                  <div className="absolute bottom-3 left-6 h-2 w-32 rounded bg-[#E4E9F0] dark:bg-[#1E2A44]" />
                </div>
                {/* Watermark preview */}
                {mode === "text" && text.trim() && (
                  <>
                    {position === "tile" ? (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-center overflow-hidden">
                            <span
                              className="select-none font-bold text-[var(--foreground)]"
                              style={{
                                fontSize: Math.min(fontSize, 24),
                                opacity,
                                color: `rgb(${color.map((v) => Math.round(v * 255)).join(",")})`,
                                transform: `rotate(${-rotation}deg)`,
                              }}
                            >
                              {text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : position === "center" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="select-none font-bold"
                          style={{
                            fontSize: Math.min(fontSize, 32),
                            opacity,
                            color: `rgb(${color.map((v) => Math.round(v * 255)).join(",")})`,
                            transform: `rotate(${-rotation}deg)`,
                          }}
                        >
                          {text}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="absolute"
                        style={{
                          left: position.includes("left") ? "16px" : position.includes("right") ? "auto" : "50%",
                          right: position.includes("right") ? "16px" : "auto",
                          top: position.includes("top") ? "16px" : "auto",
                          bottom: position.includes("bottom") ? "16px" : "auto",
                          transform: `rotate(${-rotation}deg)`,
                        }}
                      >
                        <span
                          className="select-none font-bold"
                          style={{
                            fontSize: Math.min(fontSize, 24),
                            opacity,
                            color: `rgb(${color.map((v) => Math.round(v * 255)).join(",")})`,
                          }}
                        >
                          {text}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {mode === "image" && imageBytes && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="overflow-hidden rounded"
                      style={{
                        width: `${imageScale * 100}%`,
                        opacity,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(new Blob([imageBytes as unknown as BlobPart], { type: imageFormat === "png" ? "image/png" : "image/jpeg" }))} alt="watermark" className="h-full w-full object-contain" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded bg-[var(--foreground)]/70 px-1.5 py-0.5 text-[10px] text-white">page preview</div>
              </div>
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
                <Droplets className="size-4 shrink-0 text-[#FF4B6E]" />
                <p>Live preview is a mockup. The actual watermark will be baked into your PDF with exact coordinates using pdf-lib.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          Drop a PDF above to add a watermark.
        </div>
      )}
    </ToolPageShell>
  );
}
