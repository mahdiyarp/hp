// وارد کردن استایل دیت‌پیکر از بسته npm
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css'
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/combined-persian-fonts.css'
import './styles/classic.css'
import './utils/persian-font-watcher.js' // runtime watcher for corrupted chars
// Append-only import for optional auto-fix CSS if present
try {
  require('./styles/persian-auto-fix.css')
} catch (e) {
  /* file may not exist; fine */
}
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'
import { ThemeProvider } from './context/theme'
import { ConfirmDialogProvider } from './context/ConfirmDialogContext'
import { getAccessToken, loginDeveloper } from './services/auth'
// Backward-compat global shims to avoid legacy bundle errors
import * as authMod from './services/auth'
;(window as any).login = authMod.login
;(window as any).auth = authMod

// Ensure HTML lang/dir reflect Persian + RTL
document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'

// راه‌اندازی دیت‌پیکر شمسی برای تمام input های دارای data-jdp
declare global {
  interface Window {
    jalaliDatepicker?: any
  }
}
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

window.addEventListener('load', initJDP)
document.addEventListener('DOMContentLoaded', initJDP)

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
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>,
)
