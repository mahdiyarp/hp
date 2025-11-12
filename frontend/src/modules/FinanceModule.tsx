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

interface Payment {
  id: number
  payment_number: string | null
  direction: 'in' | 'out'
  method: string | null
  party_name: string | null
  amount: number
  status: string
  server_time: string
  due_date: string | null
  note?: string | null
}

interface CheckDue {
  id: number
  payment_number: string | null
  party_name: string | null
  amount: number
  due_date: string | null
  status: string
}

type DirectionFilter = 'all' | 'in' | 'out'
type StatusFilter = 'all' | 'draft' | 'posted'

export default function FinanceModule({ smartDate }: ModuleComponentProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [checksDue, setChecksDue] = useState<CheckDue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [methodFilter, setMethodFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [paymentsData, checksData] = await Promise.all([
        apiGet<Payment[]>('/api/payments?limit=100'),
        apiGet<CheckDue[]>('/api/dashboard/checks-due?within_days=45').catch(() => []),
      ])
      setPayments(paymentsData)
      setChecksDue(checksData)
    } catch (err) {
      console.error(err)
      setError('امکان بارگذاری پرداخت‌ها وجود ندارد.')
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (directionFilter !== 'all' && p.direction !== directionFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (methodFilter !== 'all' && (p.method ?? 'other') !== methodFilter) return false
      return true
    })
  }, [payments, directionFilter, statusFilter, methodFilter])

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        if (p.direction === 'in') acc.receipts += p.amount
        if (p.direction === 'out') acc.payments += p.amount
        acc.methods[p.method ?? 'other'] = (acc.methods[p.method ?? 'other'] || 0) + p.amount
        return acc
      },
      { receipts: 0, payments: 0, methods: {} as Record<string, number> },
    )
  }, [payments])

  const netBalance = totals.receipts - totals.payments

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال دریافت پرداخت‌ها...</p>
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
            <p className={retroHeading}>Treasury Desk</p>
            <h2 className="text-2xl font-semibold mt-2">دریافت و پرداخت‌ها</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع: {smartDate.jalali ?? 'نامشخص'} | {smartDate.isoDate ?? 'ISO TBD'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={loadData}>
              بروزرسانی
            </button>
            <button className={retroButton}>ثبت دریافت جدید</button>
            <button className={retroButton}>ثبت پرداخت جدید</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>جمع دریافتی</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.receipts)} ریال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>جمع پرداختی</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.payments)} ریال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تراز نقدی</p>
            <p className="text-lg font-semibold">{formatNumberFa(netBalance)} ریال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تعداد اسناد</p>
            <p className="text-lg font-semibold">{formatNumberFa(payments.length)}</p>
          </div>
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="space-y-2">
            <label className={retroHeading}>جهت تراکنش</label>
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value as DirectionFilter)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              <option value="in">دریافتی</option>
              <option value="out">پرداختی</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>وضعیت</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              <option value="draft">پیش‌نویس</option>
              <option value="posted">ثبت شده</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className={retroHeading}>روش پرداخت</label>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              {Object.keys(totals.methods).map(method => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border border-dashed border-[#c5bca5] p-3 text-xs text-[#7a6b4f] rounded-sm">
          {formatNumberFa(filteredPayments.length)} تراکنش مطابق فیلترهای فعلی نمایش داده می‌شود.
        </div>

        {filteredPayments.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>شماره</th>
                <th className={retroTableHeader}>جهت</th>
                <th className={retroTableHeader}>روش</th>
                <th className={retroTableHeader}>طرف حساب</th>
                <th className={retroTableHeader}>مبلغ</th>
                <th className={retroTableHeader}>وضعیت</th>
                <th className={retroTableHeader}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{pay.payment_number ?? `#${pay.id}`}</td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge}`}>{pay.direction === 'in' ? 'دریافتی' : 'پرداختی'}</span>
                  </td>
                  <td className="px-3 py-2">{pay.method ?? 'نامشخص'}</td>
                  <td className="px-3 py-2">{pay.party_name ?? 'نامشخص'}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(pay.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge}`}>{pay.status}</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {isoToJalali(pay.server_time)}
                    {pay.due_date && (
                      <span className="block text-[10px] text-[#7a6b4f] mt-1">
                        سررسید: {isoToJalali(pay.due_date)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">
            تراکنشی با شرایط فعلی یافت نشد. فیلترها را تغییر دهید.
          </div>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className={retroHeading}>Checks Watch</p>
            <h3 className="text-lg font-semibold mt-2">چک‌های در شرف سررسید</h3>
          </div>
          <button className={`${retroButton} text-[11px]`} onClick={loadData}>
            بروزرسانی
          </button>
        </header>
        {checksDue.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>شماره</th>
                <th className={retroTableHeader}>طرف حساب</th>
                <th className={retroTableHeader}>مبلغ</th>
                <th className={retroTableHeader}>سررسید</th>
                <th className={retroTableHeader}>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {checksDue.map(check => (
                <tr key={check.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{check.payment_number ?? `#${check.id}`}</td>
                  <td className="px-3 py-2">{check.party_name ?? 'نامشخص'}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(check.amount)}</td>
                  <td className="px-3 py-2 text-left">
                    {check.due_date ? isoToJalali(check.due_date) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={retroBadge}>{check.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">چکی در بازه انتخابی یافت نشد.</div>
        )}
      </section>
    </div>
  )
}

