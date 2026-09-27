"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Defer setState to a microtask so it doesn't run synchronously in the effect body
    queueMicrotask(() => setMounted(true));
  }, []);

  const current = mounted ? resolvedTheme ?? theme : "light";
  const isDark = current === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative inline-flex size-9 items-center justify-center overflow-hidden rounded-lg border border-[#E4E9F0] dark:border-[#1E2A44] bg-white dark:bg-[#111A2B] text-[#1D2733] dark:text-[#E6EDF6] transition-all hover:border-[#1AA8E0] dark:hover:border-[#2FB2E4] hover:shadow-sm",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={cn(
          "absolute size-4 transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}
