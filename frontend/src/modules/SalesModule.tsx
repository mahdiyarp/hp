import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet } from '../services/api'
import { formatNumberFa, isoToJalali } from '../utils/num'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroInput,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'

interface Invoice {
  id: number
  invoice_number: string | null
  invoice_type: string
  party_name: string | null
  total: number | null
  status: string
  server_time: string
  mode: string
}

type StatusFilter = 'all' | 'draft' | 'final' | 'cancelled'
type TypeFilter = 'all' | 'sale' | 'purchase'

export default function SalesModule({ smartDate }: ModuleComponentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Invoice[]>('/api/invoices?limit=100')
      setInvoices(data)
    } catch (err) {
      console.error(err)
      setError('امکان دریافت فاکتورها وجود ندارد.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false
      if (search) {
        const q = search.trim()
        if (!q) return true
        const haystack = `${inv.invoice_number ?? ''} ${inv.party_name ?? ''}`.toLowerCase()
        if (!haystack.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [invoices, statusFilter, typeFilter, search])

  const totals = useMemo(() => {
    const all = invoices.reduce(
      (acc, inv) => {
        if (inv.invoice_type === 'sale') acc.sales += inv.total || 0
        if (inv.invoice_type === 'purchase') acc.purchases += inv.total || 0
        if (inv.status === 'final') acc.finalized += 1
        if (inv.status === 'draft') acc.drafts += 1
        return acc
      },
      { sales: 0, purchases: 0, finalized: 0, drafts: 0 },
    )
    return all
  }, [invoices])

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال دریافت فاکتورها...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
          {error}
        </div>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Sales Console</p>
            <h2 className="text-2xl font-semibold mt-2">مدیریت فاکتورها</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع جاری: {smartDate.jalali ?? 'تعیین نشده'} (ISO:{' '}
              {smartDate.isoDate ?? '---'})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={loadInvoices}>
              بروزرسانی فهرست
            </button>
            <button className={retroButton}>صدور فاکتور فروش</button>
            <button className={retroButton}>صدور فاکتور خرید</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>کل فروش</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.sales)} ریال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>کل خرید</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.purchases)} ریال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>فاکتورهای تأیید شده</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.finalized)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>پیش‌نویس‌ها</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.drafts)}</p>
          </div>
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="space-y-2">
            <label className={retroHeading}>فیلتر وضعیت</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              <option value="draft">پیش‌نویس</option>
              <option value="final">قطعی</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نوع سند</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              <option value="sale">فروش</option>
              <option value="purchase">خرید</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className={retroHeading}>جستجو</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="نام طرف حساب یا شماره فاکتور..."
            />
          </div>
        </div>

        <div className="border border-dashed border-[#c5bca5] p-3 text-xs text-[#7a6b4f] rounded-sm">
          {formatNumberFa(filtered.length)} فاکتور مطابق فیلترهای اعمال‌شده نمایش داده می‌شود.
        </div>

        {filtered.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>شماره</th>
                <th className={retroTableHeader}>نوع</th>
                <th className={retroTableHeader}>طرف حساب</th>
                <th className={retroTableHeader}>مبلغ</th>
                <th className={retroTableHeader}>وضعیت</th>
                <th className={retroTableHeader}>زمان</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {inv.invoice_number || `#${inv.id}`}
                    <span className="block text-[10px] text-[#7a6b4f] mt-1">حالت: {inv.mode}</span>
                  </td>
                  <td className="px-3 py-2">{inv.invoice_type}</td>
                  <td className="px-3 py-2">{inv.party_name ?? 'نامشخص'}</td>
                  <td className="px-3 py-2 text-left">
                    {formatNumberFa(inv.total || 0)} <span className="text-xs">ریال</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge}`}>{inv.status}</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {inv.server_time ? isoToJalali(inv.server_time) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">
            سندی با شرایط انتخابی یافت نشد. فیلترها را تغییر دهید یا سند جدیدی ثبت کنید.
          </div>
        )}
      </section>
    </div>
  )
}

