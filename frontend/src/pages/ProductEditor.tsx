import React from 'react'
import { apiGet, apiPost, apiPut } from '../services/api'

interface Props { mode: 'create' | 'edit' }

const ProductEditor: React.FC<Props> = ({ mode }) => {
  const [id, setId] = React.useState<number | null>(null)
  const [data, setData] = React.useState<any>({ name: '', sku: '', price: 0, stock: 0 })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(()=>{
    const raw = (window.location.hash||'').replace('#','')
    const parts = raw.split(':')
    if (parts[0] === 'product-edit' && parts[1]) {
      const pid = Number(parts[1]); if (Number.isFinite(pid)) setId(pid)
    }
  }, [])

  React.useEffect(()=>{
    const load = async () => {
      if (mode === 'edit' && id) {
        try { const p = await apiGet(`/api/products/${id}`); setData(p||{}); } catch(e:any){ setError(e?.message||'خطا در دریافت کالا') }
      }
    }
    load()
  }, [mode, id])

  const setField = (k:string, v:any) => { setData((d:any)=> ({...d, [k]: v})); bumpDirty() }
  const [dirty, setDirty] = React.useState(0)
  const bumpDirty = () => setDirty(n=>n+1)

  React.useEffect(()=>{
    const t = setTimeout(async ()=>{
      if (!dirty) return
      try {
        setSaving(true)
        if (mode==='create') { const created = await apiPost('/api/products', data); setData(created); setId(created?.id||null); if (created?.id) window.location.hash = `product-edit:${created.id}` }
        else if (mode==='edit' && id) { const updated = await apiPut(`/api/products/${id}`, data); setData(updated) }
      } catch(e:any){ setError(e?.message||'ذخیره ناموفق') } finally { setSaving(false) }
    }, 500)
    return ()=> clearTimeout(t)
  }, [dirty, data, mode, id])

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{mode==='create'?'ایجاد کالا':'ویرایش کالا'} {id?`#${id}`:''}</h2>
        <span className="text-xs">{saving?'در حال ذخیره...':'ذخیره خودکار'}</span>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">مشخصات</h3>
          <input className="hp-input w-full mb-2" placeholder="نام" value={data.name||''} onChange={e=>setField('name', e.target.value)} />
          <input className="hp-input w-full mb-2" placeholder="کد" value={data.sku||''} onChange={e=>setField('sku', e.target.value)} />
          <input className="hp-input w-full mb-2" type="number" placeholder="قیمت" value={data.price||0} onChange={e=>setField('price', Number(e.target.value))} />
          <input className="hp-input w-full mb-2" type="number" placeholder="موجودی" value={data.stock||0} onChange={e=>setField('stock', Number(e.target.value))} />
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">یادداشت/برچسب‌ها</h3>
          <div className="text-xs text-[var(--primary)]/70">به‌زودی: برچسب‌ها و یادداشت‌ها</div>
        </div>
      </div>
    </div>
  )
}

export default ProductEditor
