import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  isDark: boolean
}

const Ctx = createContext<ThemeCtx | null>(null)

function applyTheme(t: Theme) {
  const root = document.documentElement
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = t === 'dark' || (t === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'system',
  )
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme])
  const isDark = useMemo(() => {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return theme === 'dark' || (theme === 'system' && prefersDark)
  }, [theme])
  return <Ctx.Provider value={{ theme, setTheme, isDark }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme must be used within ThemeProvider')
  return v
}
