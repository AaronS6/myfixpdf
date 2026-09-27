"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Trash2, Eraser, PenLine, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: { dataUrl: string; format: "drawn" | "typed"; color: string }) => void;
};

const PEN_COLORS = [
  { name: "Black", value: "#1D2733" },
  { name: "Blue", value: "#1AA8E0" },
  { name: "Red", value: "#F04438" },
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
  const [color, setColor] = useState("#1D2733");
  const [stroke, setStroke] = useState(2.5);
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState(TYPE_FONTS[0].value);

  // Initialize / re-initialize the signature pad whenever canvas mounts
  useEffect(() => {
    if (!open || mode !== "drawn" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    // High-DPI canvas
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    const pad = new SignaturePad(canvas, {
      penColor: color,
      minWidth: 0.8,
      maxWidth: stroke,
      backgroundColor: "#FFFFFF",
    });
    padRef.current = pad;
    return () => {
      pad.off();
      padRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Update pen color live
  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = color;
      padRef.current.minWidth = 0.6;
      padRef.current.maxWidth = stroke;
    }
  }, [color, stroke]);

  if (!open) return null;

  const clear = () => padRef.current?.clear();

  const produceDataUrl = async (): Promise<string> => {
    if (mode === "drawn") {
      if (!padRef.current || padRef.current.isEmpty()) {
        throw new Error("Please draw your signature first.");
      }
      // Composite onto a white background so it shows on white PDF pages
      const source = padRef.current.toDataURL("image/png");
      return await compositeWhite(source, color);
    } else {
      if (!typedName.trim()) throw new Error("Please type your name first.");
      // Render the typed name to a canvas with the chosen font
      const canvas = document.createElement("canvas");
      const fontSize = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      // wait for fonts to be ready
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
      // Re-set after resize
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
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B1220]/50 dark:bg-[#000000]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-[#111A2B] shadow-2xl animate-pop-in">
        <div className="border-b border-[#E4E9F0] dark:border-[#1E2A44] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#1D2733] dark:text-[#E6EDF6]">Add your signature</h3>
            <button onClick={onClose} className="text-2xl text-[#5B6B79] dark:text-[#93A4B6] hover:text-[#1D2733] dark:text-[#E6EDF6]">×</button>
          </div>
          <div className="mt-3 flex gap-1 rounded-lg bg-[#F7F9FC] dark:bg-[#0E1626] p-1">
            <button
              onClick={() => setMode("drawn")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "drawn" ? "bg-white dark:bg-[#111A2B] text-[#1AA8E0] dark:text-[#2FB2E4] shadow-sm" : "text-[#5B6B79] dark:text-[#93A4B6] hover:text-[#1D2733] dark:text-[#E6EDF6]",
              )}
            >
              <PenLine className="size-4" /> Draw
            </button>
            <button
              onClick={() => setMode("typed")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === "typed" ? "bg-white dark:bg-[#111A2B] text-[#1AA8E0] dark:text-[#2FB2E4] shadow-sm" : "text-[#5B6B79] dark:text-[#93A4B6] hover:text-[#1D2733] dark:text-[#E6EDF6]",
              )}
            >
              <Check className="size-4" /> Type
            </button>
          </div>
        </div>
        <div className="p-4">
          {mode === "drawn" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E4E9F0] dark:border-[#1E2A44] bg-[#FAFBFD] dark:bg-[#0E1626] p-2">
                <canvas ref={canvasRef} className="h-44 w-full rounded-md bg-white dark:bg-[#111A2B]" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5B6B79] dark:text-[#93A4B6]">Pen color:</span>
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "size-6 rounded-full border-2 transition-all",
                        color === c.value ? "border-[#1AA8E0] dark:border-[#2FB2E4] scale-110" : "border-[#E4E9F0] dark:border-[#1E2A44]",
                      )}
                      style={{ background: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5B6B79] dark:text-[#93A4B6]">Stroke:</span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={stroke}
                    onChange={(e) => setStroke(parseFloat(e.target.value))}
                    className="w-24 accent-[#1AA8E0]"
                  />
                </div>
                <button
                  onClick={clear}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[#E4E9F0] dark:border-[#1E2A44] px-3 py-1.5 text-sm text-[#5B6B79] dark:text-[#93A4B6] hover:bg-[#F7F9FC] dark:bg-[#0E1626]"
                >
                  <Eraser className="size-4" /> Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name"
                className="w-full rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] px-3 py-2 text-base text-[#1D2733] dark:text-[#E6EDF6] outline-none focus:border-[#1AA8E0] dark:border-[#2FB2E4]"
              />
              <div className="flex flex-wrap gap-2">
                {TYPE_FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTypedFont(f.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-base transition-all",
                      typedFont === f.value ? "border-[#1AA8E0] dark:border-[#2FB2E4] bg-[#EAF7FD] dark:bg-[#0d2330]" : "border-[#E4E9F0] dark:border-[#1E2A44] hover:bg-[#F7F9FC] dark:bg-[#0E1626]",
                    )}
                    style={{ fontFamily: f.value, color }}
                  >
                    {typedName || "Your Name"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5B6B79] dark:text-[#93A4B6]">Ink color:</span>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      color === c.value ? "border-[#1AA8E0] dark:border-[#2FB2E4] scale-110" : "border-[#E4E9F0] dark:border-[#1E2A44]",
                    )}
                    style={{ background: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#E4E9F0] dark:border-[#1E2A44] p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#5B6B79] dark:text-[#93A4B6] hover:bg-[#F7F9FC] dark:bg-[#0E1626]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#23A6D5] to-[#2FE0C6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Check className="size-4" /> Apply signature
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
  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}
