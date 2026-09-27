"use client";

import { FileStack, Github, Twitter, Linkedin } from "lucide-react";
import { useDocumentSession, type ToolId } from "@/store/document-session";

type Link = { label: string; tool?: ToolId; href?: string };

const COLS: Array<{ title: string; links: Link[] }> = [
  {
    title: "Product",
    links: [
      { label: "PDF Compressor", tool: "compress-pdf" },
      { label: "PNG Compressor", tool: "compress-png" },
      { label: "Merge PDF", tool: "merge-pdf" },
      { label: "Split PDF", tool: "split-pdf" },
    ],
  },
  {
    title: "Convert",
    links: [
      { label: "PDF to Word", tool: "pdf-to-word" },
      { label: "Word to PDF", tool: "word-to-pdf" },
      { label: "PDF to JPG", tool: "pdf-to-jpg" },
      { label: "JPG to PDF", tool: "jpg-to-pdf" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "GDPR", href: "#" },
    ],
  },
];

export function Footer() {
  const setView = useDocumentSession((s) => s.setView);
  return (
    <footer className="mt-auto border-t border-[#E4E9F0] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#23A6D5] to-[#2FE0C6] text-white shadow-md">
                <FileStack className="size-5" />
              </span>
              <span className="text-lg font-bold text-[#1D2733]">
                PDF <span className="brand-gradient-text">Toolkit</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-[#5B6B79]">
              Every PDF tool you need, in one place. Processed entirely in your browser — your files never leave your device.
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border border-[#E4E9F0] text-[#5B6B79] transition-colors hover:border-[#1AA8E0] hover:text-[#1AA8E0]"
                  aria-label="Social link"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1D2733]">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.tool ? (
                      <button
                        onClick={() => setView(l.tool!)}
                        className="text-sm text-[#5B6B79] transition-colors hover:text-[#1AA8E0]"
                      >
                        {l.label}
                      </button>
                    ) : (
                      <a href={l.href} className="text-sm text-[#5B6B79] transition-colors hover:text-[#1AA8E0]">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#E4E9F0] pt-6 sm:flex-row">
          <p className="text-xs text-[#5B6B79]">
            © {new Date().getFullYear()} PDF Toolkit. Built client-side — no uploads.
          </p>
          <p className="text-xs text-[#5B6B79]">
            Made with <span className="text-[#FF4B6E]">♥</span> using pdf-lib, pdf.js, and your browser.
          </p>
        </div>
      </div>
    </footer>
  );
}
