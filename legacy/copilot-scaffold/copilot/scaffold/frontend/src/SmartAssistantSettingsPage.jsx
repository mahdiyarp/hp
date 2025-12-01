import React, { useEffect, useState } from 'react'

export default function SmartAssistantSettingsPage() {
  const [settings, setSettings] = useState({
    provider: 'openai',
    base_url: '',
    model_name: 'gpt-4.1',
    language: 'fa',
    enable_doc_understanding: true,
    enable_journal_suggestions: true,
    enable_alerts: false,
    temperature: 3,
    enabled: false,
    api_key_masked: '',
  })
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState('')
  const [health, setHealth] = useState(null)
  const [lastCheck, setLastCheck] = useState(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [testFile, setTestFile] = useState(null)

  const load = async () => {
    const res = await fetch('/api/assistant/settings')
    if (res.ok) setSettings(await res.json())
  }
  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    await fetch('/api/assistant/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    load()
  }

  const saveKey = async () => {
    await fetch('/api/assistant/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, api_key: newKey }),
    })
    setShowKeyModal(false)
    setNewKey('')
    load()
  }

  const checkHealth = async () => {
    const res = await fetch('/api/assistant/health')
    if (res.ok) {
      setHealth(await res.json())
      setLastCheck(new Date().toLocaleTimeString('fa-IR'))
    }
  }

  const sendTest = async () => {
    const body = new FormData()
    body.append('message', question || 'سلام')
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question || 'سلام', mode: 'general' }),
    })
    if (res.ok) {
      const data = await res.json()
      setReply(data.reply)
    }
    if (testFile) {
      const form = new FormData()
      form.append('file', testFile)
      await fetch('/api/assistant/document/analyze', { method: 'POST', body: form })
    }
  }

  const badge = status => {
    const ok = status === 'ok'
    return (
      <span
        style={{
          background: ok ? '#e6f9ef' : '#ffe6e6',
          border: `1px solid ${ok ? '#9ac8a5' : '#f2b1b1'}`,
          color: ok ? '#0f5132' : '#8b1d1d',
          padding: '4px 10px',
          borderRadius: 999,
        }}
      >
        {ok ? 'سالم' : 'خطا'}
      </span>
    )
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', padding: 24, background: '#f7f2e7', borderRadius: 16 }}>
      <h2>دستیار هوشمند حسابداری</h2>
      <p style={{ color: '#4b4339' }}>پیکربندی و آزمایش دستیار برای تحلیل اسناد و پاسخ به سوالات مالی</p>

      <section style={{ background: '#fff', border: '1px solid #eadfcb', padding: 16, borderRadius: 12, marginTop: 12 }}>
        <h4>تنظیمات ارائه‌دهنده</h4>
        <div className="grid" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          <label className="block">
            ارائه‌دهنده
            <select value={settings.provider} onChange={e => setSettings({ ...settings, provider: e.target.value })} style={{ width: '100%' }}>
              <option value="openai">OpenAI / GPT</option>
              <option value="azure" disabled>
                Azure (غیرفعال)
              </option>
              <option value="local" disabled>
                Local (غیرفعال)
              </option>
            </select>
          </label>
          <label className="block">
            Base URL
            <input value={settings.base_url || ''} onChange={e => setSettings({ ...settings, base_url: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label className="block">
            مدل
            <input value={settings.model_name || ''} onChange={e => setSettings({ ...settings, model_name: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label className="block">
            زبان
            <select value={settings.language} onChange={e => setSettings({ ...settings, language: e.target.value })} style={{ width: '100%' }}>
              <option value="fa">فارسی</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <div>API Key: {settings.api_key_masked || '********'}</div>
          <button onClick={() => setShowKeyModal(true)} style={{ marginTop: 6 }}>
            تغییر
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>
            فعال سازی تحلیل سند
            <input type="checkbox" checked={settings.enable_doc_understanding} onChange={e => setSettings({ ...settings, enable_doc_understanding: e.target.checked })} />
          </label>
          <label style={{ marginRight: 10 }}>
            فعال سازی پیشنهاد ثبت سند حسابداری
            <input type="checkbox" checked={settings.enable_journal_suggestions} onChange={e => setSettings({ ...settings, enable_journal_suggestions: e.target.checked })} />
          </label>
          <label style={{ marginRight: 10 }}>
            فعال سازی هشدارهای هوشمند
            <input type="checkbox" checked={settings.enable_alerts} onChange={e => setSettings({ ...settings, enable_alerts: e.target.checked })} />
          </label>
          <div style={{ marginTop: 8 }}>
            دما (temperature):
            <input
              type="range"
              min={0}
              max={10}
              value={settings.temperature || 0}
              onChange={e => setSettings({ ...settings, temperature: Number(e.target.value) })}
            />{' '}
            {settings.temperature}
          </div>
          <label style={{ marginTop: 8, display: 'block' }}>
            فعال
            <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} />
          </label>
        </div>
        <button onClick={save} style={{ marginTop: 8, padding: '8px 12px' }}>
          ذخیره
        </button>
      </section>

      <section style={{ background: '#fff', border: '1px solid #eadfcb', padding: 16, borderRadius: 12, marginTop: 12 }}>
        <h4>سلامت سرویس</h4>
        <button onClick={checkHealth}>بررسی</button>
        {health && (
          <div style={{ marginTop: 8 }}>
            وضعیت: {badge(health.status)} {health.message && `- ${health.message}`}
            {lastCheck && <div>آخرین بررسی: {lastCheck}</div>}
          </div>
        )}
      </section>

      <section style={{ background: '#fff', border: '1px solid #eadfcb', padding: 16, borderRadius: 12, marginTop: 12 }}>
        <h4>بخش تست</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          <input placeholder="سوال خود را بپرسید…" value={question} onChange={e => setQuestion(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
          <input type="file" onChange={e => setTestFile(e.target.files?.[0] || null)} />
          <button onClick={sendTest}>ارسال به دستیار</button>
          {reply && <div style={{ marginTop: 8, background: '#f0f0f0', padding: 8, borderRadius: 8 }}>{reply}</div>}
        </div>
      </section>

      {showKeyModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowKeyModal(false)}
        >
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, width: 360 }} onClick={e => e.stopPropagation()}>
            <h4>تغییر API Key</h4>
            <input value={newKey} onChange={e => setNewKey(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8 }} />
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={saveKey}>ذخیره کلید</button>
              <button onClick={() => setShowKeyModal(false)}>بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
