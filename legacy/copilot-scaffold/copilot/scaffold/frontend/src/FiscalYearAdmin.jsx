import React, { useEffect, useMemo, useState } from 'react'

const statusColors = {
  open: { bg: '#e6f9ef', text: '#0f5132', border: '#b6e2c5' },
  closed: { bg: '#fff2e0', text: '#b45309', border: '#f4d9b4' },
  locked: { bg: '#ffe5e5', text: '#b42318', border: '#f4c1c1' },
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail)
      detail = parsed.detail || parsed.message || detail
    } catch {
      // ignore json parse error
    }
    throw new Error(detail || 'خطای ناشناخته')
  }
  if (res.status === 204) return null
  return res.json()
}

function Badge({ label, variant = 'open' }) {
  const palette = statusColors[variant] || statusColors.open
  return (
    <span
      style={{
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}

export default function FiscalYearAdmin() {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageTone, setMessageTone] = useState('info')
  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    is_current: false,
  })

  const resetForm = () =>
    setForm({
      title: '',
      start_date: '',
      end_date: '',
      is_current: false,
    })

  const showMessage = (text, tone = 'info') => {
    setMessage(text)
    setMessageTone(tone)
    setTimeout(() => setMessage(null), 3500)
  }

  const loadYears = async () => {
    setLoading(true)
    try {
      const data = await api('GET', '/api/fiscal-years')
      setYears(data || [])
    } catch (err) {
      showMessage(err.message || 'خطا در دریافت سال‌های مالی', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadYears()
  }, [])

  const handleCreate = async e => {
    e.preventDefault()
    if (!form.title || !form.start_date || !form.end_date) {
      showMessage('همه فیلدها را تکمیل کنید.', 'error')
      return
    }
    try {
      await api('POST', '/api/fiscal-years', {
        title: form.title,
        start_date: form.start_date,
        end_date: form.end_date,
        is_current: form.is_current,
      })
      showMessage('سال مالی ایجاد شد.', 'success')
      resetForm()
      loadYears()
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  const performAction = async (id, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    const url = `/api/fiscal-years/${id}/${action}`
    try {
      await api('POST', url)
      const msgMap = {
        activate: 'سال مالی فعال شد.',
        close: 'سال مالی با موفقیت بسته شد.',
        lock: 'سال مالی قفل نهایی شد.',
      }
      showMessage(msgMap[action] || 'عملیات انجام شد.', 'success')
      await loadYears()
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  const currentYearId = useMemo(() => years.find(y => y.is_current)?.id, [years])

  return (
    <div className="fy-container" dir="rtl">
      <header className="fy-header">
        <div>
          <p className="fy-kicker">مدیریت سال مالی</p>
          <h1>کنترل سال‌های مالی</h1>
          <p className="fy-muted">
            سال مالی جاری را فعال کنید، قبل از بستن عملیات‌های لازم را بررسی کنید و در نهایت قفل نهایی بزنید.
          </p>
        </div>
        <div className="fy-highlight">
          <span className="fy-highlight-label">سال جاری</span>
          <strong>{years.find(y => y.is_current)?.title || 'تعریف نشده'}</strong>
        </div>
      </header>

      {message && (
        <div className={`fy-message ${messageTone === 'error' ? 'fy-message-error' : 'fy-message-success'}`}>
          {message}
        </div>
      )}

      <section className="fy-grid">
        <div className="fy-card">
          <h3>ایجاد سال مالی</h3>
          <p className="fy-helper">بعداً می‌توانید تاریخ‌های جلالی را با یک DatePicker جایگزین کنید. (TODO)</p>
          <form className="fy-form" onSubmit={handleCreate}>
            <label>
              عنوان سال
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="مثلاً ۱۴۰۳"
              />
            </label>
            <label>
              تاریخ شروع
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </label>
            <label>
              تاریخ پایان
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </label>
            <label className="fy-inline">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={e => setForm(prev => ({ ...prev, is_current: e.target.checked }))}
              />
              سال جاری شود
            </label>
            <div className="fy-actions">
              <button type="submit" className="fy-btn fy-btn-primary">
                ایجاد سال مالی
              </button>
              <button type="button" className="fy-btn" onClick={resetForm}>
                پاک کردن
              </button>
            </div>
          </form>
        </div>

        <div className="fy-card">
          <div className="fy-card-header">
            <h3>سال‌های مالی</h3>
            <button className="fy-btn fy-btn-ghost" onClick={loadYears} disabled={loading}>
              {loading ? 'در حال بروزرسانی...' : 'بارگذاری مجدد'}
            </button>
          </div>
          <div className="fy-table-wrapper">
            <table className="fy-table">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>تاریخ شروع</th>
                  <th>تاریخ پایان</th>
                  <th>وضعیت</th>
                  <th>سال جاری</th>
                  <th>اقدامات</th>
                </tr>
              </thead>
              <tbody>
                {years.length === 0 && (
                  <tr>
                    <td colSpan={6} className="fy-muted text-center">
                      سال مالی تعریف نشده است.
                    </td>
                  </tr>
                )}
                {years.map(y => {
                  const palette = statusColors[y.status] || statusColors.open
                  return (
                    <tr key={y.id} className={y.is_current ? 'fy-row-current' : ''}>
                      <td>
                        <div className="fy-row-title">
                          <span>{y.title}</span>
                          {y.is_current && <Badge label="فعال" variant="open" />}
                        </div>
                      </td>
                      <td>{y.start_date}</td>
                      <td>{y.end_date}</td>
                      <td>
                        <Badge
                          label={y.status === 'open' ? 'باز' : y.status === 'closed' ? 'بسته' : 'قفل نهایی'}
                          variant={y.status}
                        />
                      </td>
                      <td>{y.is_current ? 'بله' : 'خیر'}</td>
                      <td>
                        <div className="fy-actions-inline">
                          <button
                            className="fy-btn fy-btn-ghost"
                            disabled={y.is_current || y.status === 'locked'}
                            onClick={() => performAction(y.id, 'activate')}
                          >
                            فعال کردن
                          </button>
                          <button
                            className="fy-btn fy-btn-warning"
                            disabled={y.status !== 'open'}
                            onClick={() => performAction(y.id, 'close', 'از بستن سال مالی اطمینان دارید؟')}
                          >
                            بستن سال
                          </button>
                          <button
                            className="fy-btn fy-btn-danger"
                            disabled={y.status !== 'closed'}
                            onClick={() => performAction(y.id, 'lock', 'قفل نهایی اعمال شود؟')}
                          >
                            قفل نهایی
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
