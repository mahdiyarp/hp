import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react'
import { translations, type LanguageCode, type TranslationKey } from './translations'
import { getAccessToken } from '../services/auth'

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

  // Load preference from localStorage or fetch from server
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // First check localStorage
        const stored = localStorage.getItem('hesabpak_language') as LanguageCode | null
        if (stored && (stored === 'fa' || stored === 'en' || stored === 'ar' || stored === 'ku')) {
          setLanguageState(stored)
          setIsLoading(false)
          return
        }

        // Then try to fetch from server
        const token = getAccessToken()
        if (token) {
          try {
            const resp = await fetch('/api/users/preferences', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (resp.ok) {
              const data = await resp.json()
              const serverLang = data.language as LanguageCode
              if (serverLang && (serverLang === 'fa' || serverLang === 'en' || serverLang === 'ar' || serverLang === 'ku')) {
                setLanguageState(serverLang)
              }
            }
          } catch (e) {
            console.debug('Could not fetch language preference from server')
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadLanguage()
  }, [])

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem('hesabpak_language', lang)

    // Try to save to server
    try {
      const token = getAccessToken()
      if (token) {
        await fetch('/api/users/preferences', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language: lang })
        })
      }
    } catch (e) {
      console.debug('Could not save language preference to server')
    }
  }

  const t = (key: TranslationKey, defaultValue?: string): string => {
    const dict = translations[language]
    const value = dict[key]
    return typeof value === 'string' ? value : (defaultValue || key)
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
