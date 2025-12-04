import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/combined-persian-fonts.css'
import './styles/classic.css'
import './utils/persian-font-watcher.js' // runtime watcher for corrupted chars
// Append-only import for optional auto-fix CSS if present
try { require('./styles/persian-auto-fix.css'); } catch (e) { /* file may not exist; fine */ }
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nContext'

// Ensure HTML lang/dir reflect Persian + RTL
document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'
// Also set body dir to satisfy tests relying on body[dir="rtl"]
if (document.body) {
  document.body.dir = 'rtl'
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
)
