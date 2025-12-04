import React, { useEffect, useMemo, useState } from 'react'

// Clean minimal stub replacing corrupted legacy implementation.
// TODO: Rebuild full module (list, filters, kinds, ledger, export, a11y polish).

type Person = {
  id: string
  name: string
  phone?: string
  email?: string
  kind?: 'customer' | 'supplier' | 'employee' | 'other'
}

export function PeopleModule() {
  const [items, setItems] = useState<Person[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        // Minimal placeholder data; replace with real API integration.
        const demo: Person[] = [
          { id: '1', name: 'علی رضایی', phone: '0912...', kind: 'customer' },
          { id: '2', name: 'نگین کاظمی', email: 'negin@example.com', kind: 'supplier' },
          { id: '3', name: 'سینا مرادی', phone: '0935...', kind: 'employee' }
        ]
        if (!cancelled) setItems(demo)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter(p => (
      (p.name || '').toLowerCase().includes(term) ||
      (p.phone || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.kind || '').toLowerCase().includes(term)
    ))
  }, [items, q])

  return (
    <div className="p-4 space-y-3" dir="rtl" aria-label="People Module">
      <h1 className="text-xl font-bold">افراد</h1>

      <div className="flex items-center gap-2" role="search">
        <label htmlFor="q" className="text-sm">جستجو</label>
        <input
          id="q"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="نام، تلفن، ایمیل، نوع"
          aria-label="جستجوی افراد"
          className="border rounded px-2 py-1"
          type="text"
        />
        {loading && <span aria-live="polite" className="text-xs text-gray-500">در حال بارگذاری…</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="hp-table w-full" aria-label="لیست افراد">
          <thead>
            <tr>
              <th scope="col">نام</th>
              <th scope="col">تلفن</th>
              <th scope="col">ایمیل</th>
              <th scope="col">نوع</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.kind || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-sm text-gray-500">موردی یافت نشد</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PeopleModule



