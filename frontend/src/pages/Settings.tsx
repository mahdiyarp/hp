import React from 'react'
import { apiGet, apiPut } from '../services/api'

const Settings: React.FC = () => {
  const [data, setData] = React.useState<any>({
    locale: 'fa-IR', rtl: true,
    invoices: { default_tax: 0, default_discount: 0, auto_numbering: true },
    contacts: { duplicate_check: true },
    security: { otp_enabled: false, allow_guest: false }
  })
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  const expand = (src:any) => {
    if (!src || typeof src !== 'object') return data
    return {
      locale: src.locale ?? 'fa-IR',
      rtl: !!src.rtl,
      invoices: {
        default_tax: Number(src.default_tax ?? (src.invoices?.default_tax ?? 0)),
        default_discount: Number(src.default_discount ?? (src.invoices?.default_discount ?? 0)),
        auto_numbering: !!(src.auto_numbering ?? src.invoices?.auto_numbering ?? true)
      },
      contacts: {
        duplicate_check: !!(src.duplicate_check ?? src.contacts?.duplicate_check ?? true)
      },
      security: {
        otp_enabled: !!(src.otp_enabled ?? src.security?.otp_enabled ?? false),
        allow_guest: !!(src.allow_guest ?? src.security?.allow_guest ?? false)
      }
    }
  }
  const flatten = (src:any) => ({
    locale: src?.locale,
    rtl: !!src?.rtl,
    default_tax: Number(src?.invoices?.default_tax ?? 0),
    default_discount: Number(src?.invoices?.default_discount ?? 0),
    auto_numbering: !!src?.invoices?.auto_numbering,
    duplicate_check: !!src?.contacts?.duplicate_check,
    otp_enabled: !!src?.security?.otp_enabled,
    allow_guest: !!src?.security?.allow_guest,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/settings')
      if (res) setData(expand(res))
    } finally { setLoading(false) }
  }
  React.useEffect(()=>{ load() }, [])

  const setField = (path: string, value: any) => {
    setData((d:any)=>{
      const parts = path.split('.')
      const nd = { ...d }
      let cur:any = nd
      for (let i=0;i<parts.length-1;i++) { const k = parts[i]; cur[k] = { ...(cur[k]||{}) }; cur = cur[k] }
      cur[parts[parts.length-1]] = value
      return nd
    })
  }
  const save = async () => {
    setSaving(true); setMsg(null)
    try { await apiPut('/api/settings', flatten(data)); setMsg('ذخیره شد') } catch(e:any){ setMsg(e?.message||'خطا در ذخیره') } finally { setSaving(false) }
  }

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">تنظیمات</h2>
        <button className="hp-button" onClick={save} disabled={saving}>{saving?'...':'ذخیره تغییرات'}</button>
      </div>
      {msg && <div className="hp-badge mt-2">{msg}</div>}
      <div className="mt-3 text-sm text-[var(--primary)]/75">
        {loading ? 'در حال بارگذاری...' : 'پیکربندی برنامه و دسترسی‌ها را می‌توانید از این بخش مدیریت کنید.'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">عمومی</h3>
          <label className="block text-xs mb-1">زبان</label>
          <select className="hp-input w-full mb-2" value={data.locale||'fa-IR'} onChange={e=>setField('locale', e.target.value)}>
            <option value="fa-IR">فارسی (ایران)</option>
            <option value="en-US">English (US)</option>
          </select>
          <label className="block text-xs mb-1">چیدمان راست‌به‌چپ</label>
          <input type="checkbox" checked={!!data.rtl} onChange={e=>setField('rtl', e.target.checked)} />
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">فاکتور</h3>
          <label className="block text-xs mb-1">مالیات پیش‌فرض (%)</label>
          <input className="hp-input w-full mb-2" type="number" value={data.invoices?.default_tax||0} onChange={e=>setField('invoices.default_tax', Number(e.target.value))} />
          <label className="block text-xs mb-1">تخفیف پیش‌فرض (%)</label>
          <input className="hp-input w-full mb-2" type="number" value={data.invoices?.default_discount||0} onChange={e=>setField('invoices.default_discount', Number(e.target.value))} />
          <label className="block text-xs mb-1">شماره‌گذاری خودکار</label>
          <input type="checkbox" checked={!!data.invoices?.auto_numbering} onChange={e=>setField('invoices.auto_numbering', e.target.checked)} />
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">مخاطبین</h3>
          <label className="block text-xs mb-1">بررسی خودکار دوبلیکیت</label>
          <input type="checkbox" checked={!!data.contacts?.duplicate_check} onChange={e=>setField('contacts.duplicate_check', e.target.checked)} />
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">امنیت</h3>
          <label className="block text-xs mb-1">فعال‌سازی OTP</label>
          <input type="checkbox" checked={!!data.security?.otp_enabled} onChange={e=>setField('security.otp_enabled', e.target.checked)} />
          <label className="block text-xs mb-1 mt-2">اجازه دسترسی مهمان</label>
          <input type="checkbox" checked={!!data.security?.allow_guest} onChange={e=>setField('security.allow_guest', e.target.checked)} />
        </div>
      </div>
    </div>
  )
}

export default Settings
