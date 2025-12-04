import React from 'react'
import { apiGet } from '../services/api'

type Product = {
  id: number
  name?: string
  sku?: string
  price?: number
  stock?: number
}

const Products: React.FC = () => {
  const [items, setItems] = React.useState<Product[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [sortKey, setSortKey] = React.useState<keyof Product | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (debounced) params.set('q', debounced)
      const res = await apiGet(`/api/products?${params.toString()}`)
      const arr = Array.isArray(res) ? res : (res?.items || [])
      setItems(arr)
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت کالاها')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(id)
  }, [query])

  const filtered = React.useMemo(() => {
    const q = debounced
    const list = items || []
    const res = q
      ? list.filter((p) =>
          [p.name, p.sku]
            .filter(Boolean)
            .some((v) => String(v).includes(q)),
        )
      : list
    if (sortKey) {
      res.sort((a, b) => {
        const va = (a[sortKey!] ?? '') as any
        const vb = (b[sortKey!] ?? '') as any
        const ca = typeof va === 'number' ? va : String(va)
        const cb = typeof vb === 'number' ? vb : String(vb)
        if (ca < cb) return sortDir === 'asc' ? -1 : 1
        if (ca > cb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return res.slice(start, end)
  }, [items, debounced, page, pageSize])
  const toggleSort = (key: keyof Product) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="hp-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">کالاها</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="hp-button" onClick={load} disabled={loading}>{loading ? '...' : 'بارگذاری'}</button>
          <button type="button" className="hp-button" onClick={()=>{ window.location.hash = 'product-new' }}>افزودن کالا</button>
        </div>
      </div>

      {error && <div className="hp-badge error mt-3">{error}</div>}

      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <input className="hp-input w-56" placeholder="جستجو" value={query} onChange={(e)=>{setQuery(e.target.value); setPage(1)}} />
          <select aria-label="تعداد در صفحه" className="hp-input w-24" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1)}}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="hp-table min-w-full text-sm">
          <thead>
            <tr className="text-right">
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggleSort('name')}>نام</th>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggleSort('sku')}>کد</th>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggleSort('price')}>قیمت</th>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggleSort('stock')}>موجودی</th>
              <th className="px-3 py-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered && filtered.length > 0 ? (
              filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.name || '-'}</td>
                  <td className="px-3 py-2">{p.sku || '-'}</td>
                  <td className="px-3 py-2">{p.price ?? 0}</td>
                  <td className="px-3 py-2">{p.stock ?? 0}</td>
                  <td className="px-3 py-2"><button type="button" className="hp-button secondary" onClick={()=>{ window.location.hash = `product-edit:${p.id}` }}>ویرایش</button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={5}>
                  {loading ? 'در حال بارگذاری...' : 'موردی یافت نشد'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3">
          <button type="button" className="hp-button" onClick={()=> setPage(Math.max(1, page-1))} disabled={page===1}>قبلی</button>
          <span className="text-xs">صفحه {page}</span>
          <button type="button" className="hp-button" onClick={()=> setPage(page+1)} disabled={(items||[]).length <= page*pageSize}>بعدی</button>
        </div>
      </div>
    </div>
  )
}

export default Products
