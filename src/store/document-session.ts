"use client";

import { create } from "zustand";

/** A single uploaded file with derived metadata. */
export type ToolkitFile = {
  id: string;
  file: File;
  name: string;
  type: string; // mime
  ext: string; // e.g. ".pdf"
  size: number; // bytes
  thumbnail?: string; // dataURL
  pageCount?: number; // for PDFs
  /** For PDFs expanded in merge view — per-page items. */
  expandedPages?: Array<{
    index: number;
    thumbnail: string;
    included: boolean;
  }>;
  included: boolean; // whether this file is included in the merge/batch output
};

/** A produced result file after an operation. */
export type ResultFile = {
  blob: Blob;
  name: string;
  type: string; // mime
  ext: string;
  size: number;
  /** Optional "before" snapshot for compare slider / size delta. */
  beforeSize?: number;
  beforePreviewUrl?: string;
  /** Multi-result (batch / split groups / pdf-to-jpg gallery). */
  results?: Array<{
    blob: Blob;
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
  }>;
};

export type ToolId =
  | "home"
  | "compress-pdf"
  | "compress-png"
  | "pdf-to-word"
  | "word-to-pdf"
  | "pdf-to-jpg"
  | "pdf-to-png"
  | "convert-to-pdf"
  | "image-converter"
  | "image-to-text"
  | "split-pdf"
  | "merge-pdf"
  | "edit-pdf"
  | "watermark-pdf"
  | "reorder-pdf"
  | "extract-text"
  | "page-numbers"
  | "redact-pdf"
  | "rotate-pdf"
  | "delete-pages"
  | "crop-pdf"
  | "edit-png"
  | "result";

type ProgressState = {
  active: boolean;
  message: string;
  percent?: number; // 0–100
  variant: "indeterminate" | "determinate";
};

/** A single operation applied to a file — for the "what you've done" history. */
export type FileOperation = {
  id: string;
  tool: ToolId;
  toolName: string;     // human-readable: "Compressed PDF", "Merged files", etc.
  description: string;  // "Reduced from 12.4 MB to 3.1 MB (−75%)"
  icon: string;         // emoji or SVG key: "compress", "merge", "split", etc.
  color: string;        // CSS var: "var(--cat-compress)", etc.
  timestamp: number;
  beforeSize?: number;
  afterSize?: number;
};

type DocumentSessionState = {
  view: ToolId;
  sourceFiles: ToolkitFile[];
  resultFile: ResultFile | null;
  history: Array<{ view: ToolId; sourceFiles: ToolkitFile[]; resultFile: ResultFile | null }>;
  progress: ProgressState;
  pendingChainTool?: ToolId;
  /** Operations applied to the current file — persists across tool chains. */
  operations: FileOperation[];

  setView: (v: ToolId) => void;
  setSourceFiles: (files: ToolkitFile[]) => void;
  addSourceFiles: (files: ToolkitFile[]) => void;
  removeSourceFile: (id: string) => void;
  updateSourceFile: (id: string, patch: Partial<ToolkitFile>) => void;
  clearSourceFiles: () => void;
  setResult: (r: ResultFile | null) => void;
  /** Record an operation to the file history. */
  addOperation: (op: Omit<FileOperation, "id" | "timestamp">) => void;
  pushHistory: () => void;
  popHistory: () => void;
  startProgress: (message: string, variant?: "indeterminate" | "determinate", percent?: number) => void;
  updateProgress: (message?: string, percent?: number) => void;
  stopProgress: () => void;
  chainTo: (tool: ToolId) => void;
  reset: () => void;
};

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

export const useDocumentSession = create<DocumentSessionState>((set, get) => ({
  view: "home",
  sourceFiles: [],
  resultFile: null,
  history: [],
  progress: { active: false, message: "", variant: "indeterminate" },
  pendingChainTool: undefined,
  operations: [],

  setView: (v) => {
    // Scroll is handled by a useEffect in page.tsx AFTER the view renders.
    // Calling scrollTo here (before render) doesn't work on mobile — the new
    // content hasn't laid out yet, so the browser keeps the old scroll position.
    set({ view: v });
  },
  setSourceFiles: (files) => set({ sourceFiles: files }),
  addSourceFiles: (files) =>
    set((s) => ({ sourceFiles: [...s.sourceFiles, ...files] })),
  removeSourceFile: (id) =>
    set((s) => ({ sourceFiles: s.sourceFiles.filter((f) => f.id !== id) })),
  updateSourceFile: (id, patch) =>
    set((s) => ({
      sourceFiles: s.sourceFiles.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),
  clearSourceFiles: () => set({ sourceFiles: [] }),
  setResult: (r) => set({ resultFile: r }),
  addOperation: (op) =>
    set((s) => ({
      operations: [
        ...s.operations,
        { ...op, id: uid(), timestamp: Date.now() },
      ],
    })),
  pushHistory: () =>
    set((s) => ({
      history: [
        ...s.history,
        { view: s.view, sourceFiles: s.sourceFiles, resultFile: s.resultFile },
      ].slice(-10),
    })),
  popHistory: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const last = s.history[s.history.length - 1];
      return {
        view: last.view,
        sourceFiles: last.sourceFiles,
        resultFile: last.resultFile,
        history: s.history.slice(0, -1),
      };
    }),
  startProgress: (message, variant = "indeterminate", percent) =>
    set({ progress: { active: true, message, variant, percent } }),
  updateProgress: (message, percent) =>
    set((s) => ({
      progress: {
        ...s.progress,
        ...(message ? { message } : {}),
        ...(typeof percent === "number" ? { percent, variant: "determinate" } : {}),
      },
    })),
  stopProgress: () =>
    set({ progress: { active: false, message: "", variant: "indeterminate" } }),
  chainTo: (tool) =>
    set((s) => {
      // When chaining from a result, set the current result as the only source file
      // for the next tool, then navigate to it. Operations persist across chains.
      if (s.resultFile) {
        const f = new File([s.resultFile.blob], s.resultFile.name, { type: s.resultFile.type });
        const newSource: ToolkitFile = {
          id: uid(),
          file: f,
          name: s.resultFile.name,
          type: s.resultFile.type,
          ext: s.resultFile.ext,
          size: s.resultFile.size,
          included: true,
        };
        return {
          view: tool,
          sourceFiles: [newSource],
          resultFile: null,
          pendingChainTool: undefined,
          // operations are NOT cleared — they follow the file across tools
        };
      }
      return { view: tool, pendingChainTool: tool };
    }),
  reset: () =>
    set({
      view: "home",
      sourceFiles: [],
      resultFile: null,
      history: [],
      progress: { active: false, message: "", variant: "indeterminate" },
      pendingChainTool: undefined,
      operations: [],
    }),
}));

/** Convenience helper exported for components. */
export const newFileId = uid;
