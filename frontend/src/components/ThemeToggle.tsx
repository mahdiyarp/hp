import React from 'react'
import { useTheme, Theme } from '../context/theme'

const labels: Record<Theme, string> = { light: 'روشن', dark: 'تاریک', system: 'سیستم' }

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
  return (
    <button
      aria-label="Theme toggle"
      onClick={() => setTheme(next[theme])}
      className="px-2 py-1 rounded border text-sm bg-white/60 dark:bg-black/40"
      title={`تم: ${labels[theme]}`}
    >
      تم: {labels[theme]}
    </button>
  )
}
