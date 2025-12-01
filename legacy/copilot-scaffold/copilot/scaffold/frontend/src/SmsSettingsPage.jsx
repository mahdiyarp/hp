import React, { useEffect, useState } from 'react'

const badge = (status) => {
  const cls =
    status === 'ok'
      ? { bg: '#e6f9ef', color: '#0f5132', border: '#9ac8a5' }
      : { bg: '#ffe6e6', color: '#8b1d1d', border: '#f2b1b1' }
  return (
    <span style={{ background: cls.bg, color: cls.color, border: `1px solid ${cls.border}`, padding: '4px 10px', borderRadius: 999 }}>
      {status === 'ok' ? 'سالم' : 'خطا'}
    </span>
  )
}

export default function SmsSettingsPage() {
  const [settings, setSettings] = useState({
    provider: 'ippanel',
    base_url: 'https://edge.ippanel.com/v1',
    default_sender: '',
    enabled: false,
    low_credit_threshold: 0,
    api_key_masked: '',
  })
  const [templates, setTemplates] = useState([])
  const [toast, setToast] = useState('')
  const [health, setHealth] = useState(null)
  const [testPhone, setTestPhone] = useState('')
  const [testText, setTestText] = useState('پیام تست')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const load = async () => {
    try {
      const res = await fetch('/api/settings/sms')
      if (res.ok) {
        setSettings(await res.json())
      }
      const tm = await fetch('/api/settings/sms/templates')
      if (tm.ok) setTemplates(await tm.json())
    } catch (e) {
      showToast('خطا در بارگذاری')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    await fetch('/api/settings/sms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    showToast('ذخیره شد')
  }

  const checkHealth = async () => {
    const res = await fetch('/api/sms/health')
    if (res.ok) {
      setHealth(await res.json())
    }
  }

  const sendTest = async () => {
    const res = await fetch('/api/settings/sms/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testPhone, message: testText }),
    })
    showToast(res.ok ? 'ارسال شد' : 'خطا در ارسال')
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'Vazirmatn, sans-serif' }}>
      <h2 style={{ marginBottom: 8 }}>تنظیمات پیامک (IPPanel)</h2>
      {toast && <div style={{ background: '#e6f9ef', border: '1px solid #9ac8a5', padding: 8 }}>{toast}</div>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ background: '#fffdf8', border: '1px solid #eadfcb', padding: 16, borderRadius: 12 }}>
          <h4>پیکربندی</h4>
          <label className="block">
            کلید فرستنده
            <input value={settings.default_sender || ''} onChange={(e) => setSettings({ ...settings, default_sender: e.target.value })} className="retro-input" />
          </label>
          <label className="block">
            Base URL
            <input value={settings.base_url} onChange={(e) => setSettings({ ...settings, base_url: e.target.value })} className="retro-input" />
          </label>
          <label className="block">
            فعال
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
          </label>
          <label className="block">
            آستانه اعتبار
            <input type="number" value={settings.low_credit_threshold || 0} onChange={(e) => setSettings({ ...settings, low_credit_threshold: Number(e.target.value) })} />
          </label>
          <button onClick={save}>ذخیره</button>
        </div>
        <div style={{ background: '#fffdf8', border: '1px solid #eadfcb', padding: 16, borderRadius: 12 }}>
          <h4>سلامت و تست</h4>
          <div>وضعیت: {health ? badge(health.status) : '---'}</div>
          <button onClick={checkHealth} style={{ marginTop: 8 }}>
            بررسی سلامت
          </button>
          <div style={{ marginTop: 12 }}>
            <input placeholder="شماره تست" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            <input placeholder="متن تست" value={testText} onChange={(e) => setTestText(e.target.value)} />
            <button onClick={sendTest}>ارسال تست</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, background: '#f7f2e7', border: '1px solid #eadfcb', padding: 16, borderRadius: 12 }}>
        <h4>قالب‌ها</h4>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>کد</th>
              <th>الگو</th>
              <th>فعال</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td>{t.code}</td>
                <td>{t.pattern_id || '-'}</td>
                <td>{t.is_active ? 'بله' : 'خیر'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
