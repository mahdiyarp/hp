import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'
import { ThemeProvider } from './context/theme'
import { getAccessToken, loginDeveloper } from './services/auth'

// بارگذاری تنبل JalaliDatePicker از CDN (جلوگیری از شکست بیلد در صورت نصب نبودن پکیج)
const JDP_CSS_ID = 'jalali-datepicker-css'
const JDP_SCRIPT_ID = 'jalali-datepicker-script'
const JDP_CSS_SRC = 'https://cdn.jsdelivr.net/npm/@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css'
const JDP_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@majidh1/jalalidatepicker/dist/jalalidatepicker.min.js'

function ensureJalaliAssets() {
  if (!document.getElementById(JDP_CSS_ID)) {
    const link = document.createElement('link')
    link.id = JDP_CSS_ID
    link.rel = 'stylesheet'
    link.href = JDP_CSS_SRC
    link.crossOrigin = 'anonymous'
    document.head?.appendChild(link)
  }

  const hasScript = document.getElementById(JDP_SCRIPT_ID)
  if (!hasScript) {
    const script = document.createElement('script')
    script.id = JDP_SCRIPT_ID
    script.src = JDP_SCRIPT_SRC
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.onload = () => initJDP()
    document.body.appendChild(script)
  }
}

// Ensure HTML lang/dir reflect Persian + RTL
document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'

ensureJalaliAssets()

// راه‌اندازی دیت‌پیکر شمسی برای تمام input های دارای data-jdp
declare global { interface Window { jalaliDatepicker?: any } }
const initJDP = () => {
  try {
    if (window.jalaliDatepicker?.startWatch) {
      window.jalaliDatepicker.startWatch({
        selector: 'input[data-jdp]',
        autoShow: true,
        autoHide: true,
        hideAfterChange: true,
        persianDigits: true,
        autoReadOnlyInput: false,
        zIndex: 2000,
      })
    }
  } catch (e) {
    console.warn('JalaliDatePicker init warning', e)
  }
}

window.addEventListener('load', () => {
  ensureJalaliAssets()
  initJDP()
})
document.addEventListener('DOMContentLoaded', () => {
  ensureJalaliAssets()
  initJDP()
})

// Attempt silent developer login only if explicitly enabled via env
try {
  const autoDev = (import.meta as any)?.env?.VITE_DEV_AUTOLOGIN === 'true'
  if (autoDev && !getAccessToken()) {
    loginDeveloper()
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
)
