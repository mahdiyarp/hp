// وارد کردن استایل دیت‌پیکر از بسته npm
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css'
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'

// Ensure HTML lang/dir reflect Persian + RTL
document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'

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

window.addEventListener('load', initJDP)
document.addEventListener('DOMContentLoaded', initJDP)

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
)
