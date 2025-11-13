import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
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

interface PersonOption {
  id: string
  name: string
  kind: string | null
}

interface PaymentFormState {
  direction: 'in' | 'out'
  method: string
  party_name: string
  amount: string
  reference: string
  due_date: string
  note: string
}

export default function FinanceModule({ smartDate }: ModuleComponentProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [checksDue, setChecksDue] = useState<CheckDue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const emptyForm: PaymentFormState = {
    direction: 'in',
    method: 'cash',
    party_name: '',
    amount: '',
    reference: '',
    due_date: '',
    note: '',
  }
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyForm)

  useEffect(() => {
    loadData()
    loadPersons()
    
    // Listen for prefill events from invoice module
    const handlePrefill = (e: Event) => {
      const customEvent = e as CustomEvent
      const { direction, party_name, amount, reference, note } = customEvent.detail
      setPaymentForm({
        direction: direction || 'in',
        method: 'cash',
        party_name: party_name || '',
        amount: String(amount || ''),
        reference: reference || '',
        due_date: '',
        note: note || '',
      })
      setShowForm(true)
      setFormError(null)
      setFormSuccess(null)
    }
    
    window.addEventListener('finance-prefill', handlePrefill)
    return () => window.removeEventListener('finance-prefill', handlePrefill)
  }, [])

  async function loadData(showSpinner = true) {
    if (showSpinner) setLoading(true)
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
      if (showSpinner) setLoading(false)
    }
  }

  async function loadPersons() {
    try {
      setPeopleLoading(true)
      const data = await apiGet<PersonOption[]>('/api/persons').catch(() => [])
      setPersons(data ?? [])
    } catch (err) {
      console.warn('Failed to load persons', err)
    } finally {
      setPeopleLoading(false)
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

  const handleFormChange = (field: keyof PaymentFormState, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setPaymentForm({ ...emptyForm, direction: paymentForm.direction })
    setFormError(null)
    setFormSuccess(null)
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.party_name.trim()) {
      setFormError('نام طرف حساب را وارد کنید.')
      return
    }
    const amountValue = Number(paymentForm.amount.replace(/,/g, ''))
    if (!amountValue || amountValue <= 0) {
      setFormError('مبلغ معتبر نیست.')
      return
    }
    setCreating(true)
    setFormError(null)
    try {
      const clientTime = smartDate.isoDate
        ? new Date(`${smartDate.isoDate}T12:00:00Z`).toISOString()
        : new Date().toISOString()
      const due =
        paymentForm.due_date.trim() !== ''
          ? new Date(`${paymentForm.due_date}T12:00:00Z`).toISOString()
          : undefined
      const payload = {
        direction: paymentForm.direction,
        mode: 'manual',
        party_name: paymentForm.party_name.trim(),
        method: paymentForm.method.trim() || undefined,
        amount: amountValue,
        reference: paymentForm.reference.trim() || undefined,
        note: paymentForm.note.trim() || undefined,
        due_date: due,
        client_time: clientTime,
      }
      await apiPost<Payment>('/api/payments/manual', payload)
      await loadData(false)
      resetForm()
      setFormSuccess('تراکنش با موفقیت ثبت شد.')
      setShowForm(false)
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('ثبت تراکنش موفق نبود.')
      }
    } finally {
      setCreating(false)
    }
  }

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
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={() => loadData()}>
              بروزرسانی
            </button>
            <button
              className={retroButton}
              onClick={() => {
                setPaymentForm({ ...emptyForm, direction: 'in', method: 'cash' })
                setFormError(null)
                setFormSuccess(null)
                setShowForm(true)
              }}
            >
              ثبت دریافت جدید
            </button>
            <button
              className={retroButton}
              onClick={() => {
                setPaymentForm({ ...emptyForm, direction: 'out', method: 'cash' })
                setFormError(null)
                setFormSuccess(null)
                setShowForm(true)
              }}
            >
              ثبت پرداخت جدید
            </button>
          </div>
        </header>

        {(formError || formSuccess) && !showForm && (
          <div
            className={`px-3 py-2 text-sm border-2 shadow-[3px_3px_0_rgba(0,0,0,0.12)] ${
              formError
                ? 'border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f]'
                : 'border-[#4f704f] bg-[#e7f4e7] text-[#295329]'
            }`}
          >
            {formError ?? formSuccess}
          </div>
        )}

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

      {showForm && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className={retroHeading}>فرم ثبت تراکنش</p>
              <h3 className="text-lg font-semibold mt-2">
                {paymentForm.direction === 'in' ? 'ثبت دریافت نقدی' : 'ثبت پرداخت نقدی'}
              </h3>
            </div>
            <button
              className={retroButton}
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
            >
              بستن فرم
            </button>
          </header>
          <form className="space-y-4" onSubmit={submitPayment}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>طرف حساب *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={paymentForm.party_name}
                  onChange={e => handleFormChange('party_name', e.target.value)}
                  placeholder="نام طرف حساب"
                  required
                  list="payment-persons"
                />
                <datalist id="payment-persons">
                  {persons.map(person => (
                    <option key={person.id} value={person.name}>
                      {person.kind ? `${person.name} (${person.kind})` : person.name}
                    </option>
                  ))}
                </datalist>
                {peopleLoading && (
                  <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری طرف‌های حساب...</p>
                )}
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>مبلغ *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={paymentForm.amount}
                  onChange={e => handleFormChange('amount', e.target.value)}
                  placeholder="مثلاً 1500000"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>روش پرداخت</label>
                <select
                  value={paymentForm.method}
                  onChange={e => handleFormChange('method', e.target.value)}
                  className={`${retroInput} w-full`}
                >
                  <option value="cash">نقدی</option>
                  <option value="bank">بانکی</option>
                  <option value="pos">دستگاه کارت‌خوان</option>
                  <option value="cheque">چک</option>
                  <option value="other">سایر</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>تاریخ سررسید</label>
                <input
                  type="date"
                  value={paymentForm.due_date}
                  onChange={e => handleFormChange('due_date', e.target.value)}
                  className={`${retroInput} w-full`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شماره مرجع</label>
                <input
                  className={`${retroInput} w-full`}
                  value={paymentForm.reference}
                  onChange={e => handleFormChange('reference', e.target.value)}
                  placeholder="شماره سند، چک یا رسید"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>نوع تراکنش</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${retroButton} ${
                      paymentForm.direction === 'in' ? '' : 'opacity-50'
                    }`}
                    onClick={() => handleFormChange('direction', 'in')}
                  >
                    دریافت
                  </button>
                  <button
                    type="button"
                    className={`${retroButton} ${
                      paymentForm.direction === 'out' ? '' : 'opacity-50'
                    }`}
                    onClick={() => handleFormChange('direction', 'out')}
                  >
                    پرداخت
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                className={`${retroInput} w-full h-24`}
                value={paymentForm.note}
                onChange={e => handleFormChange('note', e.target.value)}
                placeholder="جزئیات یا توضیح تکمیلی"
              />
            </div>

            {formError && (
              <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="border-2 border-[#4f704f] bg-[#e7f4e7] text-[#295329] px-3 py-2 shadow-[3px_3px_0_#4f704f] text-sm">
                {formSuccess}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button className={`${retroButton} !bg-[#1f2e3b]`} disabled={creating} type="submit">
                {creating ? 'در حال ثبت...' : 'ثبت تراکنش'}
              </button>
              <button
                type="button"
                className={`${retroButton} !bg-[#5b4a2f]`}
                onClick={resetForm}
                disabled={creating}
              >
                پاک‌سازی فرم
              </button>
            </div>
          </form>
        </section>
      )}

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
