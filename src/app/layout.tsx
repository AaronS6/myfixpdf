import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDF Toolkit — Every PDF tool you need, in one place",
  description:
    "Compress, convert, merge, split, edit and sign PDFs — all in your browser. No uploads to a server, no waiting. Just real, working PDF tools.",
  keywords: [
    "PDF",
    "compress PDF",
    "merge PDF",
    "split PDF",
    "PDF to Word",
    "Word to PDF",
    "PDF to JPG",
    "JPG to PDF",
    "edit PDF",
    "sign PDF",
  ],
  authors: [{ name: "PDF Toolkit" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PDF Toolkit",
    description: "Every PDF tool you need, in one place.",
    siteName: "PDF Toolkit",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
