"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Eraser, PenLine, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: { dataUrl: string; format: "drawn" | "typed"; color: string }) => void;
};

const PEN_COLORS = [
  { name: "Black", value: "#1A1A1A" },
  { name: "Blue", value: "#1A5FB4" },
  { name: "Red", value: "#C8242A" },
];

const TYPE_FONTS = [
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Great Vibes", value: "'Great Vibes', cursive" },
  { name: "Caveat", value: "'Caveat', cursive" },
];

export function SignaturePadModal({ open, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [mode, setMode] = useState<"drawn" | "typed">("drawn");
  const [color, setColor] = useState("#1A1A1A");
  const [stroke, setStroke] = useState(2.5);
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState(TYPE_FONTS[0].value);
  const { lang } = useI18n();

  // Initialize the signature pad using requestAnimationFrame to ensure the
  // modal animation has finished and the canvas has its final dimensions.
  useEffect(() => {
    if (!open || mode !== "drawn") return;
    let cancelled = false;
    let pad: SignaturePad | null = null;
    const raf = requestAnimationFrame(() => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      // Read dimensions after the modal is laid out
      const w = canvas.offsetWidth || 320;
      const h = canvas.offsetHeight || 160;
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      // White background so the saved PNG shows on white pages
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      try {
        pad = new SignaturePad(canvas, {
          penColor: color,
          minWidth: 0.8,
          maxWidth: stroke,
          backgroundColor: "#FFFFFF",
        });
        padRef.current = pad;
      } catch (e) {
        // signature_pad can throw if canvas context unavailable — fail silently
        console.warn("SignaturePad init failed:", e);
      }
    });
    return () => {
      cancelled = true;
      if (pad) {
        try { pad.off(); } catch { /* ignore */ }
      }
      padRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = color;
      padRef.current.minWidth = 0.6;
      padRef.current.maxWidth = stroke;
    }
  }, [color, stroke]);

  if (!open) return null;

  const clear = () => {
    if (padRef.current) {
      try { padRef.current.clear(); } catch { /* ignore */ }
    }
  };

  const produceDataUrl = async (): Promise<string> => {
    if (mode === "drawn") {
      if (!padRef.current || padRef.current.isEmpty()) {
        throw new Error(lang === "zh" ? "请先绘制签名" : "Please draw your signature first.");
      }
      const source = padRef.current.toDataURL("image/png");
      return await compositeWhite(source, color);
    } else {
      if (!typedName.trim()) throw new Error(lang === "zh" ? "请输入你的姓名" : "Please type your name first.");
      const canvas = document.createElement("canvas");
      const fontSize = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      } catch {
        // ignore
      }
      ctx.font = `${fontSize}px ${typedFont}`;
      const metrics = ctx.measureText(typedName);
      const w = Math.ceil(metrics.width) + 40;
      const h = Math.ceil(fontSize * 1.5) + 20;
      canvas.width = w;
      canvas.height = h;
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) throw new Error("Canvas 2D context unavailable");
      ctx2.fillStyle = "#FFFFFF";
      ctx2.fillRect(0, 0, w, h);
      ctx2.fillStyle = color;
      ctx2.font = `${fontSize}px ${typedFont}`;
      ctx2.textBaseline = "middle";
      ctx2.textAlign = "center";
      ctx2.fillText(typedName, w / 2, h / 2);
      return canvas.toDataURL("image/png");
    }
  };

  const onConfirmClick = async () => {
    try {
      const dataUrl = await produceDataUrl();
      onConfirm({ dataUrl, format: mode, color });
    } catch (e) {
      // Use a non-blocking alert-replacement
      const msg = e instanceof Error ? e.message : String(e);
      import("sonner").then(({ toast }) => toast.error(msg));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--foreground)]/40 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl animate-pop-in">
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {lang === "zh" ? "添加你的签名" : "Add your signature"}
            </h3>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex gap-1 rounded-lg bg-[var(--muted)] p-1">
            <button
              onClick={() => setMode("drawn")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "drawn" ? "bg-[var(--card)] text-[var(--brand)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <PenLine className="size-4" /> {lang === "zh" ? "手绘" : "Draw"}
            </button>
            <button
              onClick={() => setMode("typed")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "typed" ? "bg-[var(--card)] text-[var(--brand)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <Check className="size-4" /> {lang === "zh" ? "输入" : "Type"}
            </button>
          </div>
        </div>
        <div className="p-4">
          {mode === "drawn" ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] p-2">
                <canvas
                  ref={canvasRef}
                  className="h-44 w-full rounded-md bg-white"
                  style={{ touchAction: "none" }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {lang === "zh" ? "笔色：" : "Pen color:"}
                  </span>
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "size-6 rounded-full border-2 transition-all",
                        color === c.value ? "scale-110 border-[var(--brand)]" : "border-[var(--border)]",
                      )}
                      style={{ background: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {lang === "zh" ? "粗细：" : "Stroke:"}
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={stroke}
                    onChange={(e) => setStroke(parseFloat(e.target.value))}
                    className="w-24 accent-[var(--brand)]"
                  />
                </div>
                <button
                  onClick={clear}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                >
                  <Eraser className="size-4" /> {lang === "zh" ? "清除" : "Clear"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={lang === "zh" ? "输入你的姓名" : "Type your full name"}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-base text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
              <div className="flex flex-wrap gap-2">
                {TYPE_FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTypedFont(f.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-base transition-all",
                      typedFont === f.value
                        ? "border-[var(--brand)] bg-[var(--brand)]/8"
                        : "border-[var(--border)] hover:bg-[var(--muted)]",
                    )}
                    style={{ fontFamily: f.value, color }}
                  >
                    {typedName || (lang === "zh" ? "你的姓名" : "Your Name")}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {lang === "zh" ? "墨色：" : "Ink color:"}
                </span>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      color === c.value ? "scale-110 border-[var(--brand)]" : "border-[var(--border)]",
                    )}
                    style={{ background: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
          <button
            onClick={onConfirmClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#60A5FA] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Check className="size-4" /> {lang === "zh" ? "应用签名" : "Apply signature"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function compositeWhite(sourceDataUrl: string, inkColor: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Failed to load signature"));
    im.src = sourceDataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}
