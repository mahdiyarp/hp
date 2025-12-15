import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../services/api'
import { retroButton, retroHeading, retroInput, retroPanelPadded, retroTableHeader } from '../../components/retroTheme'

interface Bank { code?: string; name: string }
interface Branch { bank_code?: string; bank_name?: string; name: string; city?: string; code?: string }

export default function BanksModule() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredBanks = useMemo(() => {
    if (!q) return banks
    const s = q.trim().toLowerCase()
    return banks.filter(b => (b.name || '').toLowerCase().includes(s) || (b.code || '').toLowerCase().includes(s))
  }, [banks, q])

  const filteredBranches = useMemo(() => {
    if (!q) return branches.slice(0, 100)
    const s = q.trim().toLowerCase()
    return branches.filter(br =>
      (br.name || '').toLowerCase().includes(s) ||
      (br.city || '').toLowerCase().includes(s) ||
      (br.bank_name || '').toLowerCase().includes(s) ||
      (br.code || '').toLowerCase().includes(s)
    ).slice(0, 200)
  }, [branches, q])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<{ banks: Bank[]; branches: Branch[] }>('\/api\/integrations\/iran-banks')
      setBanks(Array.isArray(data?.banks) ? data.banks : [])
      setBranches(Array.isArray(data?.branches) ? data.branches : [])
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت بانک‌ها')
    } finally {
      setLoading(false)
    }
  }

  async function updateFromSources() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiPost<{ success: boolean; banks_count: number; branches_count: number }>('\/api\/integrations\/iran-banks\/update', {})
      await load()
      alert(`به‌روزرسانی انجام شد (بانک‌ها: ${res.banks_count}، شعب: ${res.branches_count})`)
    } catch (e: any) {
      setError(e?.message || 'به‌روزرسانی ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={retroHeading}>بانک‌ها و شعب ایران</div>
          <div className="text-xs text-[#7a6b4f]">جستجو و بروزرسانی خودکار از منابع تنظیمات سیستم</div>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو بانک/شعبه/شهر" className={`${retroInput} w-64`} />
          <button type="button" className={`${retroButton}`} onClick={updateFromSources} disabled={loading}>به‌روزرسانی</button>
          <button type="button" className={`${retroButton}`} onClick={load} disabled={loading}>بارگذاری</button>
        </div>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-sm text-[#7a6b4f]">{filteredBanks.length} بانک از {banks.length}</div>
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>کد</th>
                <th className={retroTableHeader}>نام بانک</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanks.map((b, i) => (
                <tr key={(b.code||'')+i} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{b.code || '-'}</td>
                  <td className="px-3 py-2">{b.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-2 text-sm text-[#7a6b4f]">{filteredBranches.length} شعبه از {branches.length}</div>
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>بانک</th>
                <th className={retroTableHeader}>نام شعبه</th>
                <th className={retroTableHeader}>شهر</th>
                <th className={retroTableHeader}>کد</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((br, i) => (
                <tr key={(br.code||'')+i} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{br.bank_name || br.bank_code || '-'}</td>
                  <td className="px-3 py-2">{br.name}</td>
                  <td className="px-3 py-2">{br.city || '-'}</td>
                  <td className="px-3 py-2">{br.code || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
