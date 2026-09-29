"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/*
 * Premium toast styling — clean, modern, professional.
 * Instead of sonner's default `richColors` (heavy full-color backgrounds),
 * these toasts are clean white cards with:
 *   - a colored ICON CHIP on the left (success/error/info/loading)
 *   - a subtle colored LEFT-EDGE ACCENT bar matching the toast type
 *   - refined layered shadow + border + top-edge highlight (from the design system)
 *   - smooth slide-in-from-right entrance
 * The icon chips use the brand palette + the success/danger/warning tokens
 * already defined in globals.css, so they theme correctly in light/dark.
 */
const toastClassNames = {
  toast:
    "group toast-premium !rounded-xl !border !border-[var(--border)] !bg-[var(--card)] !text-[var(--foreground)] !shadow-[var(--shadow-lg)] !p-0 !pr-4 !pl-2 !py-2 !gap-3 !items-start",
  title: "!text-sm !font-semibold !leading-snug !text-[var(--foreground)]",
  description: "!text-xs !font-normal !leading-snug !text-[var(--muted-foreground)]",
  success: "toast-success",
  error: "toast-error",
  warning: "toast-warning",
  info: "toast-info",
  loading: "toast-loading",
  closeButton: "!border-[var(--border)] !bg-[var(--card)] !text-[var(--muted-foreground)] hover:!bg-[var(--muted)]",
} as const

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: toastClassNames,
        // Custom icon chips per toast type — clean colored circle + lucide icon.
        // These REPLACE sonner's default emoji-ish icons.
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          // Bottom-right is more professional than top-right (less likely to
          // cover nav/header; matches macOS notification style).
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
