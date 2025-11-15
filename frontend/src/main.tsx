import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'

// Ensure HTML lang/dir reflect Persian + RTL
document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
)
