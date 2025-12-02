import React from 'react'
import { apiGet, apiPost, apiPut } from '../services/api'

interface EditorProps {
  mode: 'create' | 'edit'
}

const InvoiceEditor: React.FC<EditorProps> = ({ mode }) => {
  const [id, setId] = React.useState<number | null>(null)
  const [payments, setPayments] = React.useState<any[]>([])
  const [summary, setSummary] = React.useState<{paid:number, remaining:number, total:number, count:number} | null>(null)
  const [data, setData] = React.useState<any>({
    status: 'draft',
    customer_id: null,
    customer_name: '',
    code: '',
    issue_date: '',
    due_date: '',
    reference: '',
    items: [],
    tax_rate: 0,
    discount_rate: 0,
    notes: '',
    terms: '',
    payments: [],
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [payError, setPayError] = React.useState<string | null>(null)
  const [actionBusy, setActionBusy] = React.useState<{[id:number]: boolean}>({})

  // Parse hash for edit id: #invoice-edit:123
  React.useEffect(() => {
    const raw = (window.location.hash || '').replace('#', '')
    const parts = raw.split(':')
    if (parts[0] === 'invoice-edit' && parts[1]) {
      const pid = Number(parts[1])
      if (Number.isFinite(pid)) setId(pid)
    }
  }, [])

  // Load existing invoice if edit
  const reloadPayments = React.useCallback(async (invoiceId: number) => {
    try {
      const ps = await apiGet(`/api/payments?invoice_id=${invoiceId}`)
      setPayments(ps||[])
      const s = await apiGet(`/api/invoices/${invoiceId}/payments/summary`)
      setSummary({ paid: Number(s.paid||0), remaining: Number(s.remaining||0), total: Number(s.total||0), count: Number(s.count||0) })
    } catch {}
  }, [])

  React.useEffect(() => {
    const load = async () => {
      if (mode === 'edit' && id) {
        try {
          const inv = await apiGet(`/api/invoices/${id}`)
          setData(inv || {})
          await reloadPayments(id)
        } catch (e: any) {
          setError(e?.message || 'خطا در دریافت فاکتور')
        }
      }
    }
    load()
  }, [mode, id, reloadPayments])

  React.useEffect(() => {
    const onHash = () => {
      const raw = (window.location.hash || '')
      if (!raw.startsWith('#payment') && id) {
        reloadPayments(id)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [id, reloadPayments])

  // Autosave draft while typing (debounced)
  const [dirty, setDirty] = React.useState(0)
  React.useEffect(() => {
    if (data?.status !== 'draft') return
    const t = setTimeout(async () => {
      if (dirty === 0) return
      try {
        setSaving(true)
        if (mode === 'create') {
          const created = await apiPost('/api/invoices', data)
          setData(created)
          setId(created?.id || null)
          // switch URL to edit mode for persistence
          if (created?.id) {
            window.location.hash = `invoice-edit:${created.id}`
          }
        } else if (mode === 'edit' && id) {
          const updated = await apiPut(`/api/invoices/${id}`, data)
          setData(updated)
        }
      } catch (e: any) {
        setError(e?.message || 'ذخیره خودکار ناموفق بود')
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [dirty, data, mode, id])

  // Simple layout scaffolding (RTL)
  const setField = (k: string, v: any) => {
    setData((d: any) => ({ ...d, [k]: v }))
    setDirty((n) => n + 1)
  }

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ویرایش فاکتور {id ? `#${id}` : ''}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs">{saving ? 'در حال ذخیره...' : 'ذخیره خودکار'}</span>
        </div>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      {/* Sections (draggable placeholder wrappers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Customer */}
        <section className="hp-card p-3" draggable>
          <h3 className="font-semibold mb-2">مشتری</h3>
          <input className="hp-input w-full" placeholder="نام مشتری" value={data.customer_name || ''} onChange={(e)=>setField('customer_name', e.target.value)} />
        </section>

        {/* Metadata */}
        <section className="hp-card p-3" draggable>
          <h3 className="font-semibold mb-2">شناسه و تاریخ‌ها</h3>
          <div className="grid grid-cols-2 gap-2">
            <input className="hp-input" placeholder="کد" value={data.code || ''} onChange={(e)=>setField('code', e.target.value)} />
            <input type="date" className="hp-input" placeholder="تاریخ صدور" value={data.issue_date || ''} onChange={(e)=>setField('issue_date', e.target.value)} />
            <input type="date" className="hp-input" placeholder="سررسید" value={data.due_date || ''} onChange={(e)=>setField('due_date', e.target.value)} />
            <input className="hp-input" placeholder="ارجاع" value={data.reference || ''} onChange={(e)=>setField('reference', e.target.value)} />
          </div>
        </section>

        {/* Items */}
        <section className="hp-card p-3 col-span-1 lg:col-span-2" draggable>
          <h3 className="font-semibold mb-2">آیتم‌ها</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right">
                <th className="px-3 py-2">شناسه</th>
                <th className="px-2 py-1">تعداد</th>
                <th className="px-2 py-1">فی</th>
                <th className="px-2 py-1">تخفیف%</th>
                <th className="px-2 py-1">مالیات%</th>
                <th className="px-2 py-1">جمع خط</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((it: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1"><input className="hp-input w-full" value={it.description || ''} onChange={(e)=>{
                    const v = e.target.value; const next = [...data.items]; next[idx] = { ...next[idx], description: v }; setField('items', next)
                  }} /></td>
                  <td className="px-2 py-1"><input type="number" className="hp-input w-24" value={it.qty || 0} onChange={(e)=>{
                    const v = Number(e.target.value)||0; const next = [...data.items]; next[idx] = { ...next[idx], qty: v }; setField('items', next)
                  }} /></td>
                  <td className="px-2 py-1"><input type="number" className="hp-input w-24" value={it.unit_price || 0} onChange={(e)=>{
                    const v = Number(e.target.value)||0; const next = [...data.items]; next[idx] = { ...next[idx], unit_price: v }; setField('items', next)
                  }} /></td>
                  <td className="px-2 py-1"><input type="number" className="hp-input w-20" value={it.discount_rate || 0} onChange={(e)=>{
                    const v = Number(e.target.value)||0; const next = [...data.items]; next[idx] = { ...next[idx], discount_rate: v }; setField('items', next)
                  }} /></td>
                  <td className="px-2 py-1"><input type="number" className="hp-input w-20" value={it.tax_rate || 0} onChange={(e)=>{
                    const v = Number(e.target.value)||0; const next = [...data.items]; next[idx] = { ...next[idx], tax_rate: v }; setField('items', next)
                  }} /></td>
                  <td className="px-2 py-1">{new Intl.NumberFormat('fa-IR').format(((it.qty||0)*(it.unit_price||0)) - (((it.qty||0)*(it.unit_price||0))*(Number(it.discount_rate||0)/100)) + ((((it.qty||0)*(it.unit_price||0)) - (((it.qty||0)*(it.unit_price||0))*(Number(it.discount_rate||0)/100))) * (Number(it.tax_rate||0)/100)))}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="px-2 py-2">
                  <button className="hp-button" onClick={()=> setField('items', [...(data.items||[]), { description: '', qty: 1, unit_price: 0, discount_rate: 0, tax_rate: 0 }])}>+ افزودن آیتم</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Taxes & Discounts */}
        <section className="hp-card p-3" draggable>
          <h3 className="font-semibold mb-2">مالیات و تخفیف</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">مالیات کل%<input type="number" className="hp-input" value={data.tax_rate || 0} onChange={(e)=>setField('tax_rate', Number(e.target.value)||0)} /></label>
            <label className="text-xs">تخفیف کل%<input type="number" className="hp-input" value={data.discount_rate || 0} onChange={(e)=>setField('discount_rate', Number(e.target.value)||0)} /></label>
          </div>
        </section>

        {/* Payments */}
        <section className="hp-card p-3" draggable>
          <h3 className="font-semibold mb-2">پرداخت‌ها</h3>
          <div className="overflow-auto rounded border mb-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-right">
                  <th className="px-2 py-1">شناسه</th>
                  <th className="px-2 py-1">روش</th>
                  <th className="px-2 py-1">مبلغ</th>
                  <th className="px-2 py-1">وضعیت</th>
                  <th className="px-2 py-1">اقدام</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p:any)=>(
                  <tr key={p.id} className="border-t">
                    <td className="px-2 py-1">{p.id}</td>
                    <td className="px-2 py-1">{p.method||'-'}</td>
                    <td className="px-2 py-1">{new Intl.NumberFormat('fa-IR').format(Number(p.amount||0))}</td>
                    <td className="px-2 py-1">{p.status}</td>
                    <td className="px-2 py-1 space-x-1 rtl:space-x-reverse">
                      <button disabled={!!actionBusy[p.id]} className="hp-button ghost disabled:opacity-50" onClick={async()=>{ setPayError(null); setActionBusy(s=>({...s,[p.id]:true})); const r = await fetch(`/api/payments/${p.id}/status/posted`, { method: 'POST' }); if(!r.ok){ try{ const j = await r.json(); setPayError(j?.detail||'خطا در تغییر وضعیت'); }catch{ setPayError('خطا در تغییر وضعیت') } } if(id) await reloadPayments(id); setActionBusy(s=>({...s,[p.id]:false})) }}>ثبت</button>
                      <button disabled={!!actionBusy[p.id]} className="hp-button ghost disabled:opacity-50" onClick={async()=>{ setPayError(null); setActionBusy(s=>({...s,[p.id]:true})); const r = await fetch(`/api/payments/${p.id}/status/reconciled`, { method: 'POST' }); if(!r.ok){ try{ const j = await r.json(); setPayError(j?.detail||'خطا در تغییر وضعیت'); }catch{ setPayError('خطا در تغییر وضعیت') } } if(id) await reloadPayments(id); setActionBusy(s=>({...s,[p.id]:false})) }}>تسویه</button>
                      <button disabled={!!actionBusy[p.id]} className="hp-button ghost disabled:opacity-50" onClick={async()=>{ setPayError(null); setActionBusy(s=>({...s,[p.id]:true})); const r = await fetch(`/api/payments/${p.id}/status/void`, { method: 'POST' }); if(!r.ok){ try{ const j = await r.json(); setPayError(j?.detail||'خطا در تغییر وضعیت'); }catch{ setPayError('خطا در تغییر وضعیت') } } if(id) await reloadPayments(id); setActionBusy(s=>({...s,[p.id]:false})) }}>باطل</button>
                    </td>
                  </tr>
                ))}
                {payments.length===0 && (
                  <tr><td className="px-2 py-2 text-[var(--primary)]/60" colSpan={4}>پرداختی ثبت نشده</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {payError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-2">{payError}</div>}
          <div className="flex items-center justify-between text-sm mb-2">
            <span>مجموع پرداخت: {new Intl.NumberFormat('fa-IR').format(summary?.paid ?? payments.reduce((s:number,x:any)=>s+Number(x.amount||0),0))}</span>
            <span>باقیمانده: {new Intl.NumberFormat('fa-IR').format(summary?.remaining ?? Math.max(0, Number(data.total||0) - payments.reduce((s:number,x:any)=>s+Number(x.amount||0),0)))}</span>
          </div>
          <button
            className="hp-button disabled:opacity-50"
            disabled={(summary?.remaining ?? 0) <= 0}
            onClick={() => {
              // Prefill payment with this invoice id and amount suggestion
              const remaining = (summary?.remaining != null ? summary.remaining : Math.max(0, Number(data.total||0) - payments.reduce((s:number,x:any)=>s+Number(x.amount||0),0)))
              const prefill = { invoice_id: id || undefined, direction: 'in', method: 'cash', amount: remaining };
              try { localStorage.setItem('hp.prefill.payment', JSON.stringify(prefill)); } catch {}
              window.location.hash = '#payment/new'
            }}
          >
            + ثبت پرداخت
          </button>
          {(summary?.remaining ?? 0) <= 0 && <div className="text-xs text-green-700 mt-2">این فاکتور تسویه شده است.</div>}
        </section>

        {/* Notes & Terms */}
        <section className="hp-card p-3 col-span-1 lg:col-span-2" draggable>
          <h3 className="font-semibold mb-2">یادداشت‌ها و شرایط</h3>
          <textarea className="hp-input w-full" rows={3} placeholder="یادداشت" value={data.notes || ''} onChange={(e)=>setField('notes', e.target.value)} />
          <textarea className="hp-input w-full mt-2" rows={3} placeholder="شرایط" value={data.terms || ''} onChange={(e)=>setField('terms', e.target.value)} />
        </section>
      </div>
    </div>
  )
}

export default InvoiceEditor
