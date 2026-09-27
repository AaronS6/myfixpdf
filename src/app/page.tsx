"use client";

import { useEffect, useRef } from "react";
import { useDocumentSession } from "@/store/document-session";
import { Header } from "@/components/pdf-toolkit/shared/Header";
import { Footer } from "@/components/pdf-toolkit/shared/Footer";
import { ProgressOverlay } from "@/components/pdf-toolkit/shared/ProgressOverlay";
import { HomeView } from "@/components/pdf-toolkit/HomeView";
import { ResultScreen } from "@/components/pdf-toolkit/shared/ResultScreen";
import { CompressPdf } from "@/components/pdf-toolkit/tools/CompressPdf";
import { CompressPng } from "@/components/pdf-toolkit/tools/CompressPng";
import { PdfToWord } from "@/components/pdf-toolkit/tools/PdfToWord";
import { WordToPdf } from "@/components/pdf-toolkit/tools/WordToPdf";
import { PdfToJpg } from "@/components/pdf-toolkit/tools/PdfToJpg";
import { PdfToPng } from "@/components/pdf-toolkit/tools/PdfToPng";
import { ConvertToPdf } from "@/components/pdf-toolkit/tools/ConvertToPdf";
import { SplitPdf } from "@/components/pdf-toolkit/tools/SplitPdf";
import { MergePdf } from "@/components/pdf-toolkit/tools/MergePdf";
import { EditPdf } from "@/components/pdf-toolkit/tools/EditPdf";
import { WatermarkPdf } from "@/components/pdf-toolkit/tools/WatermarkPdf";
import { ReorderPdf } from "@/components/pdf-toolkit/tools/ReorderPdf";
import { ExtractText } from "@/components/pdf-toolkit/tools/ExtractText";
import { PageNumbers } from "@/components/pdf-toolkit/tools/PageNumbers";
import { RotatePdf } from "@/components/pdf-toolkit/tools/RotatePdf";
import { DeletePages } from "@/components/pdf-toolkit/tools/DeletePages";
import { CropPdf } from "@/components/pdf-toolkit/tools/CropPdf";
import { RedactPdf } from "@/components/pdf-toolkit/tools/RedactPdf";
import { EditPng } from "@/components/pdf-toolkit/tools/EditPng";

export default function Page() {
  const view = useDocumentSession((s) => s.view);
  const setView = useDocumentSession((s) => s.setView);
  // Track whether we've honored the incoming URL hash on first mount — guards
  // against the sync effect clobbering the user's #compress-pdf deep-link.
  const initializedRef = useRef(false);

  // On mount (and on hashchange): read URL hash → view
  useEffect(() => {
    if (typeof window === "undefined") return;
    const readHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      const valid: string[] = [
        "home",
        "compress-pdf",
        "compress-png",
        "pdf-to-word",
        "word-to-pdf",
        "pdf-to-jpg",
        "pdf-to-png",
        "convert-to-pdf",
        "split-pdf",
        "merge-pdf",
        "edit-pdf",
        "watermark-pdf",
        "reorder-pdf",
        "extract-text",
        "page-numbers",
        "rotate-pdf",
        "delete-pages",
        "crop-pdf",
        "redact-pdf",
        "edit-png",
        "result",
      ];
      if (h && valid.includes(h)) {
        const current = useDocumentSession.getState().view;
        if (current !== h) setView(h as never);
      }
    };
    readHash();
    initializedRef.current = true;
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [setView]);

  // Sync view → URL hash (only after we've honored the incoming hash)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initializedRef.current) return; // wait for mount-effect to read incoming hash first
    const hash = `#${view}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [view]);

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Solid base background (z-0) + blurred colored blobs (z-0, above base) */}
      <div className="page-blobs" aria-hidden="true">
        <div className="page-bg" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>
      {/* All real content sits above the background blobs */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 relative">
        {view === "home" && <HomeView />}
        {view === "compress-pdf" && <CompressPdf />}
        {view === "compress-png" && <CompressPng />}
        {view === "pdf-to-word" && <PdfToWord />}
        {view === "word-to-pdf" && <WordToPdf />}
        {view === "pdf-to-jpg" && <PdfToJpg />}
        {view === "pdf-to-png" && <PdfToPng />}
        {view === "convert-to-pdf" && <ConvertToPdf />}
        {view === "split-pdf" && <SplitPdf />}
        {view === "merge-pdf" && <MergePdf />}
        {view === "edit-pdf" && <EditPdf />}
        {view === "watermark-pdf" && <WatermarkPdf />}
        {view === "reorder-pdf" && <ReorderPdf />}
        {view === "extract-text" && <ExtractText />}
        {view === "page-numbers" && <PageNumbers />}
        {view === "rotate-pdf" && <RotatePdf />}
        {view === "delete-pages" && <DeletePages />}
        {view === "crop-pdf" && <CropPdf />}
        {view === "redact-pdf" && <RedactPdf />}
        {view === "edit-png" && <EditPng />}
        {view === "result" && <ResultScreen />}
        </main>
        <Footer />
        <ProgressOverlay />
      </div>
    </div>
  );
}
