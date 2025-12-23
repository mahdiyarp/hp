import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react'
import { translations, type LanguageCode, type TranslationKey } from './translations'
import { apiGet, apiPut } from '../services/api'

interface I18nContextType {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => Promise<void>
  t: (key: TranslationKey, defaultValue?: string) => string
  dir: 'rtl' | 'ltr'
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fa')
  const [isLoading, setIsLoading] = useState(true)

  // Load preference from localStorage and fetch from server only after auth is ready
  useEffect(() => {
    let mounted = true
    let timer: number | undefined

    const loadFromLocal = () => {
      const stored = localStorage.getItem('hesabpak_language') as LanguageCode | null
      if (stored && (stored === 'fa' || stored === 'en' || stored === 'ar' || stored === 'ku')) {
        setLanguageState(stored)
      }
    }

    const fetchFromServer = async () => {
      try {
        const hasToken = !!localStorage.getItem('hesabpak_access_token')
        if (!hasToken) return
        const data = await apiGet<{ language?: LanguageCode }>('/api/users/preferences')
        if (!mounted) return
        const serverLang = data?.language as LanguageCode
        if (
          serverLang &&
          (serverLang === 'fa' || serverLang === 'en' || serverLang === 'ar' || serverLang === 'ku')
        ) {
          setLanguageState(serverLang)
        }
      } catch {
        // swallow to reduce noise
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    const scheduleFetch = () => {
      if (timer) window.clearTimeout(timer)
      // short delay to ensure tokens stored and backend ready
      timer = window.setTimeout(fetchFromServer, 1000)
    }

    loadFromLocal()

    // If already authenticated, schedule fetch immediately
    if (localStorage.getItem('hesabpak_access_token')) {
      scheduleFetch()
    }

    const onAuthUpdated = () => scheduleFetch()
    window.addEventListener('auth-updated', onAuthUpdated)

    // Ensure loading spinner doesn't hang indefinitely
    if (!localStorage.getItem('hesabpak_access_token')) {
      // stop loading after local preference applied
      setIsLoading(false)
    }

    return () => {
      mounted = false
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('auth-updated', onAuthUpdated)
    }
  }, [])

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem('hesabpak_language', lang)

    // Try to save to server
    try {
      await apiPut('/api/users/preferences', { language: lang })
    } catch (e) {
      console.debug('Could not save language preference to server')
    }
  }

  const t = (key: TranslationKey, defaultValue?: string): string => {
    const dict = translations[language] as Record<TranslationKey, string>
    const value = dict[key]
    return typeof value === 'string' ? value : defaultValue || key
  }

  const dir = language === 'ar' || language === 'ku' || language === 'fa' ? 'rtl' : 'ltr'

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
