"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/*
 * Premium toast styling. The card base (rounded-2xl, border, layered shadow,
 * padding), the colored icon chip, and the left-edge accent are all styled
 * via [data-sonner-toast] rules in globals.css. Here we only set the position
 * (top-right, per user request) + light per-element classNames for typography
 * hierarchy + a clean close button.
 */
const toastClassNames = {
  title: "!text-sm !font-semibold !leading-snug !text-[var(--foreground)]",
  description: "!text-xs !font-normal !leading-snug !text-[var(--muted-foreground)] mt-0.5",
  closeButton: "!border-[var(--border)] !bg-[var(--card)] !text-[var(--muted-foreground)] hover:!bg-[var(--muted)]",
} as const

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: toastClassNames,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
