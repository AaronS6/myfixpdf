import type { Metadata } from "next";
import { Inter, Geist_Mono, Dancing_Script, Pacifico, Great_Vibes, Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/pdf-toolkit/shared/ThemeProvider";
import { I18nProvider } from "@/components/pdf-toolkit/shared/I18nProvider";

// Inter — the single UI font for all headings, body, buttons, labels.
// Tightened tracking on headings (via globals.css) gives it a premium SaaS feel.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Cursive fonts — used ONLY inside the signature pad modal for typed signatures.
// Never referenced in body/heading text.
const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

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
      <body
        className={`${inter.variable} ${geistMono.variable} ${dancingScript.variable} ${pacifico.variable} ${greatVibes.variable} ${caveat.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <I18nProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
