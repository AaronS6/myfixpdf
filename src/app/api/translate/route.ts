import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// Force Node.js runtime so the server-side SDK works (it must NOT run in
// edge runtime / client). Per the project rule, z-ai-web-dev-sdk is server-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslateBody = {
  text: string;
  targetLang: string; // e.g. "Chinese", "Spanish", or ISO code like "zh"
  sourceLang?: string;
};

// Accept a friendly label or ISO code; we just hand the language name to the
// LLM so it picks the right target language.
const LANG_ALIASES: Record<string, string> = {
  zh: "Chinese (Simplified)",
  "zh-cn": "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  hi: "Hindi",
  en: "English",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
};

function resolveLanguageName(input: string): string {
  const key = input.trim().toLowerCase();
  if (LANG_ALIASES[key]) return LANG_ALIASES[key];
  // If user passed a full name like "Chinese", just use it.
  return input.trim();
}

export async function POST(req: Request) {
  let body: TranslateBody;
  try {
    body = (await req.json()) as TranslateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (body?.text ?? "").trim();
  const targetLang = resolveLanguageName(String(body?.targetLang ?? "Chinese"));

  if (!text) {
    return NextResponse.json({ error: "Missing `text` field." }, { status: 400 });
  }
  if (!targetLang) {
    return NextResponse.json({ error: "Missing `targetLang` field." }, { status: 400 });
  }

  // Cap input length to keep responses snappy and avoid token blow-ups.
  // ~10000 chars is roughly 2500 tokens — comfortable for one-shot translation.
  const MAX_CHARS = 12000;
  const truncated = text.length > MAX_CHARS;
  const sourceText = truncated ? text.slice(0, MAX_CHARS) : text;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are a professional translator. Translate the user's text into the requested target language. " +
            "Preserve paragraph breaks (\\n) and tone. " +
            "Return ONLY the translated text — no preamble, no markdown fences, no explanations.",
        },
        {
          role: "user",
          content: `Translate the following text to ${targetLang}.\n\nReturn only the translation.\n\n--- BEGIN TEXT ---\n${sourceText}\n--- END TEXT ---`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const translated = completion?.choices?.[0]?.message?.content ?? "";
    if (!translated.trim()) {
      return NextResponse.json(
        { error: "Translation came back empty. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      translated,
      truncated,
      originalLength: text.length,
      returnedLength: sourceText.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Translation failed: ${msg}` },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/translate",
    body: { text: "string", targetLang: "string" },
  });
}
