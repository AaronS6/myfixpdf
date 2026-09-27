"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTS, TOOL_NAMES, type Lang, type StringKey } from "./i18n-strings";

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
  /** Get tool display info for current language. */
  tTool: (toolId: string) => { name: string; short: string; desc: string };
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage on mount — defer setState to a microtask so it
  // doesn't run synchronously inside the effect body.
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem("pdf-toolkit-lang") as Lang | null;
        if (stored === "en" || stored === "zh") {
          setLangState(stored);
        } else if (navigator.language?.toLowerCase().startsWith("zh")) {
          setLangState("zh");
        }
      } catch {
        // ignore
      }
    });
  }, []);

  // Update <html lang="...">
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pdf-toolkit-lang", l);
    } catch {
      // ignore
    }
  };

  const t = (key: StringKey) => DICTS[lang][key] ?? DICTS.en[key] ?? String(key);
  const tTool = (toolId: string) => {
    const dict = TOOL_NAMES[lang][toolId] ?? TOOL_NAMES.en[toolId];
    return dict ?? { name: toolId, short: toolId, desc: "" };
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tTool }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components used outside provider (shouldn't happen in practice)
    return {
      lang: "en" as Lang,
      setLang: () => {},
      t: (k: StringKey) => DICTS.en[k] ?? String(k),
      tTool: (id: string) => TOOL_NAMES.en[id] ?? { name: id, short: id, desc: "" },
    };
  }
  return ctx;
}
