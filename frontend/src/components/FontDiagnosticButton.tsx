import React from 'react';

export default function FontDiagnosticButton() {
  async function runDiag() {
    try {
      const results = {
        fonts: new Set<string>(),
        rtl: true,
        corruption: false
      };
      // pick key areas
      const sel = ['aside', 'h1', 'table'];
      for (const s of sel) {
        const el = document.querySelector(s);
        if (!el) continue;
        const ff = window.getComputedStyle(el).fontFamily || '';
        ff.split(',').map(x=>x.trim()).forEach(f=>results.fonts.add(f.replace(/\W/g,'')));
        const txt = (el.textContent||'');
        if (/?|ط·آ·ط¢آ¸ط·آ¸أ¢â€ڑآ¬|ط·آ·ط¢آ·ط·آ¸أ¢â€ڑآ¬|\ufffd/.test(txt)) results.corruption = true;
        const dir = (el as HTMLElement).dir || window.getComputedStyle(el).direction;
        if (!dir || dir.toLowerCase() !== 'rtl') results.rtl = false;
      }
      const fonts = Array.from(results.fonts).join(', ');
      let color = 'green';
      if (results.corruption) color = 'red';
      else if (!/Vazirmatn|Yekan|IRANSansX/i.test(fonts)) color = 'yellow';
      const statusEl = document.getElementById('font-diag-status');
      if (statusEl) {
        statusEl.textContent = `ط·آ¸ط¸آ¾ط·آ¸ط«â€ ط·آ¸أ¢â‚¬آ ط·آ·ط¹آ¾: ${fonts} | RTL: ${results.rtl ? 'OK' : 'MISSING'} | corruption: ${results.corruption}`;
        statusEl.style.background = color;
        statusEl.style.color = '#fff';
        statusEl.style.padding = '6px 8px';
        statusEl.style.borderRadius = '4px';
      }
    } catch (e) {
      console.error('diag fail', e);
    }
  }

  return (
    <div style={{display:'inline-block', marginLeft: 8}}>
      <button onClick={runDiag} style={{padding:'6px 10px'}}>?? ط·آ·ط¹آ¾ط·آ·ط¢آ³ط·آ·ط¹آ¾ ط·آ¸ط¸آ¾ط·آ¸ط«â€ ط·آ¸أ¢â‚¬آ ط·آ·ط¹آ¾ ط·آ¸ط«â€  ط·آ¹أ¢â‚¬آ ط·آ·ط¢آ§ط·آ¸ط¢آ¾</button>
      <span id="font-diag-status" style={{marginLeft:8}}></span>
    </div>
  );
}
