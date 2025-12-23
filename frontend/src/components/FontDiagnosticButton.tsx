import React from 'react'

export default function FontDiagnosticButton() {
  async function runDiag() {
    try {
      const results = {
        fonts: new Set<string>(),

        rtl: true,

        corruption: false,
      }

      // pick key areas

      const sel = ['aside', 'h1', 'table']

      for (const s of sel) {
        const el = document.querySelector(s)

        if (!el) continue

        const ff = window.getComputedStyle(el).fontFamily || ''

        ff.split(',')
          .map((x) => x.trim())
          .forEach((f) => results.fonts.add(f.replace(/\W/g, '')))

        const txt = el.textContent || ''

  // Detect common mojibake/replacement-char patterns without flagging normal Persian text.
  if (/(\ufffd|أ¢â€|â‚¬آ|ط·آ|طآ)/.test(txt)) results.corruption = true

        const dir = (el as HTMLElement).dir || window.getComputedStyle(el).direction

        if (!dir || dir.toLowerCase() !== 'rtl') results.rtl = false
      }

      const fonts = Array.from(results.fonts).join(', ')

      const statusEl = document.getElementById('font-diag-status')

      if (statusEl) {
        statusEl.textContent = `فونت‌ها: ${fonts || '(نامشخص)'} | RTL: ${results.rtl ? 'OK' : 'MISSING'} | خرابی متن: ${results.corruption ? 'YES' : 'NO'}`
      }
    } catch (e) {
      console.error('diag fail', e)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" onClick={runDiag} className="hp-btn">
        بررسی فونت و RTL
      </button>

      <span id="font-diag-status" className="text-xs text-[var(--retro-muted-text)]"></span>
    </div>
  )
}
