(function(){
  function containsCorruption(text){ if(!text) return false; return /?|ÙÜ|ØÜ/.test(text); }
  function scanDOM(){ try{ const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT,null,false); let node; const affected=new Set(); while((node=walker.nextNode())){ if(containsCorruption(node.nodeValue)){ if(node.parentElement) affected.add(node.parentElement) } } if(affected.size>0){ console.warn('[persian-font-watcher] corruption detected', affected); injectFallback(); } }catch(e){ console.error('[persian-font-watcher] scan failed', e) } }
  function injectFallback(){ if(document.getElementById('persian-fallback-layer')) return; const style=document.createElement('style'); style.id='persian-fallback-layer'; style.innerHTML='body * { font-family: "Vazirmatn", "IRANSansX", "Yekan", sans-serif !important; }'; document.head.appendChild(style); console.info('[persian-font-watcher] fallback layer injected') }
  setTimeout(()=>{ scanDOM(); window.__persian_font_watcher_interval = setInterval(scanDOM,10000)},2000)
  window.persianFontWatcher={scan:scanDOM, injectFallback}
})()
