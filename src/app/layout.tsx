import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/pdf-toolkit/shared/ThemeProvider";
import { I18nProvider } from "@/components/pdf-toolkit/shared/I18nProvider";

export const metadata: Metadata = {
  title: "myfixpdf — Every PDF tool you need, in one place",
  description:
    "Compress, convert, merge, split, edit and sign PDFs — all in your browser. No uploads, no waiting. Just real, working PDF tools.",
  keywords: [
    "PDF",
    "compress PDF",
    "merge PDF",
    "split PDF",
    "PDF to Word",
    "Word to PDF",
    "PDF to JPG",
    "convert to PDF",
    "edit PDF",
    "sign PDF",
  ],
  authors: [{ name: "Aaron Shan" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "myfixpdf",
    description: "Every PDF tool you need, in one place.",
    siteName: "myfixpdf",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Satoshi font from Fontshare (Indian Type Foundry) — premium geometric sans */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=Satoshi-300,400,500,700,900&display=swap"
        />
        {/*
          Google Fonts loaded via <link> tags (runtime) instead of next/font/google
          (build-time). next/font/google fetches font files at build time to generate
          an internal CSS module — on Vercel's build sandbox this fetch can fail and
          produce a `module-not-found` error for `[next]/internal/font/google/*.module.css`.
          Loading via <link> sidesteps the build-time fetch entirely and is the most
          reliable approach for Vercel deploys. The matching CSS variables
          (--font-inter, --font-geist-mono) are defined in globals.css :root.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Geist+Mono:wght@400;500;600;700&family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Pacifico&display=swap"
        />
      </head>
      <body className="antialiased font-sans bg-background text-foreground">
        <ThemeProvider>
          <I18nProvider>
            {children}
            <Toaster />
            <SonnerToaster position="bottom-right" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
