import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost, apiPatch } from '../services/api'
import { formatNumberFa, isoToJalali } from '../utils/num'
import { parseJalaliInput } from '../utils/date'
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
import Alert from '../components/Alert'

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
  bank_name?: string
  party_name: string
  amount: string
  reference: string
  // Dual-date storage: store Jalali for display, ISO for API
  due_date: string // ISO YYYY-MM-DD (for compatibility)
  due_date_jalali?: string // e.g., 1404/09/10
  note: string
  invoice_id?: number
}


export default function FinanceModule({ smartDate }: ModuleComponentProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [checksDue, setChecksDue] = useState<CheckDue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentListLimit, setPaymentListLimit] = useState<number>(()=>{
    const raw = localStorage.getItem('finance.pageSize')
    const n = raw ? parseInt(raw) : 5
    return [5,10,20,50].includes(n) ? n : 5
  })
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [openInvoices, setOpenInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  
  const emptyForm: PaymentFormState = {
    direction: 'in',
    method: 'cash',
    party_name: '',
    amount: '',
    reference: '',
    due_date: '',
    due_date_jalali: '',
    note: '',
  }
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyForm)
  const [auditNote, setAuditNote] = useState('')
  const [showLedger, setShowLedger] = useState(false)
  const [ledgerPayments, setLedgerPayments] = useState<Payment[]>([] as any)
  const [ledgerParty, setLedgerParty] = useState<string>('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(()=>{
    try {
      const raw = localStorage.getItem('hesabpak_payment_methods')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) return arr
      }
    } catch {}
    return ['cash','bank','pos','cheque','other']
  })
  const [showMethodMgr, setShowMethodMgr] = useState(false)
  const [availableBanks, setAvailableBanks] = useState<string[]>(()=>{
    try {
      const raw = localStorage.getItem('hesabpak_banks_selected')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return arr
      }
    } catch {}
    return []
  })
  const [personBanks, setPersonBanks] = useState<Record<string,string[]>>(()=>{
    try { const raw = localStorage.getItem('hesabpak_person_banks'); return raw? JSON.parse(raw): {} } catch { return {} }
  })
  const [historyOpen, setHistoryOpen] = useState<{ paymentId: number, items: Array<{ id: string|number; user?: string; time: string; note?: string; changes?: any }> } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sortKey, setSortKey] = useState<'number'|'direction'|'method'|'party'|'amount'|'status'|'server_time'|'due_date'>(()=>{
    const raw = localStorage.getItem('finance.sort.key')
    const allowed = ['number','direction','method','party','amount','status','server_time','due_date']
    return (raw && allowed.includes(raw)) ? (raw as any) : 'server_time'
  })
  const [sortDir, setSortDir] = useState<'asc'|'desc'>(()=>{
    const raw = localStorage.getItem('finance.sort.dir')
    return raw === 'asc' || raw === 'desc' ? raw : 'desc'
  })

  function PartySelectorInline({ onSelect }: { onSelect: (p: {id:string, name:string, mobile?:string})=>void }) {
    const [q, setQ] = useState('')
    const [items, setItems] = useState<Array<{id:string,name:string,mobile?:string}>>([])
    const [loading, setLoading] = useState(false)
    async function search(s: string) {
      setLoading(true)
      try { const res = await apiGet<Array<any>>(`/api/people/search?q=${encodeURIComponent(s)}`); setItems(res as any) } catch { setItems([]) } finally { setLoading(false) }
    }
    useEffect(()=>{ search('') },[])
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input className={`${retroInput} flex-1`} placeholder="جستجوی طرف‌حساب" value={q} onChange={e=>{ setQ(e.target.value); search(e.target.value) }} />
          <button className={retroButton} onClick={async()=>{ try { const p = await apiPost('/api/people/from-user', {}); onSelect(p as any) } catch {} }}>از کاربر</button>
          <button className={retroButton} onClick={async()=>{
            const name = prompt('نام طرف‌حساب؟'); if (!name) return
            const mobile = prompt('شماره موبایل (اختیاری)؟') || undefined
            try { const p = await apiPost('/api/people/quick-create', { name, mobile, kind:'customer' }); onSelect(p as any) } catch {}
          }}>ایجاد سریع</button>
          <button className={retroButton} onClick={async()=>{ setLoading(true); try { const res = await apiGet<Array<any>>(`/api/public/counterparties?q=${encodeURIComponent(q)}`); setItems(res as any) } catch { setItems([]) } finally { setLoading(false) } }}>نمایه‌های پابلیک</button>
        </div>
        <div className="border rounded p-2 max-h-32 overflow-auto">
          {loading? <div className="text-xs">در حال جستجو…</div>: items.map((i)=> (
            <div key={i.id} className="flex justify-between py-1">
              <span className="text-sm">{i.name} {i.mobile? `— ${i.mobile}`: ''}</span>
              <button className={retroButton} onClick={()=>onSelect(i)}>انتخاب</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadData()
    loadPersons()
    loadOpenInvoices()
    // تلاش برای بارگذاری روش‌های پرداخت از تنظیمات سیستم
    ;(async ()=>{
      try {
        const settings = await apiGet<any[]>('/api/admin/settings')
        const pm = Array.isArray(settings) ? settings.find((s:any)=>s.key==='payment_methods') : null
        if (pm && pm.value) {
          const arr = JSON.parse(pm.value)
          if (Array.isArray(arr) && arr.length) {
            setPaymentMethods(arr)
            try { localStorage.setItem('hesabpak_payment_methods', JSON.stringify(arr)) } catch {}
          }
        }
        // banks from integration (optional)
        try {
          const data = await apiGet<{banks: Array<{name:string}>}>('/api/integrations/iran-banks')
          const names = Array.isArray(data?.banks) ? data.banks.map(b=>b.name).filter(Boolean) : []
          if (names.length) setAvailableBanks(prev=> prev.length? prev: names.slice(0, 200))
        } catch {}
      } catch {}
    })()
    
    // Listen for prefill events from invoice module
    const handlePrefill = (e: Event) => {
      const customEvent = e as CustomEvent
      const { invoice_id, direction, party_name, amount, reference, note } = customEvent.detail
      setPaymentForm({
        direction: direction || 'in',
        method: 'cash',
        party_name: party_name || '',
        amount: String(amount || ''),
        reference: reference || '',
        due_date: '',
        due_date_jalali: '',
        note: note || '',
        invoice_id: invoice_id,
      })
      setShowForm(true)
      setFormError(null)
      setFormSuccess(null)
    }
    
    window.addEventListener('finance-prefill', handlePrefill)
    return () => window.removeEventListener('finance-prefill', handlePrefill)
  }, [])

  

  const openPartyLedger = (party: string) => {
    const related = payments.filter(p => p.party_name === party)
    setLedgerPayments(related as any)
    setLedgerParty(party)
    setShowLedger(true)
  }

  const openInvoiceFromPayment = async (pay: any) => {
    try {
      let invoiceId = pay.invoice_id
      if (!invoiceId && pay.reference) {
        // attempt lookup by reference (invoice_number)
        const all = await apiGet<any[]>(`/api/invoices?q=${encodeURIComponent(pay.reference)}`)
        const match = all.find(inv => inv.invoice_number === pay.reference)
        if (match) invoiceId = match.id
      }
      if (invoiceId) {
        const ev = new CustomEvent('open-invoice-detail', { detail: { invoice_id: invoiceId } })
        window.dispatchEvent(new CustomEvent('switch-module', { detail: { module: 'sales' } }))
        setTimeout(() => window.dispatchEvent(ev), 150)
      }
    } catch (e) {
      console.error('Failed to open invoice from payment', e)
    }
  }

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

  async function loadOpenInvoices() {
    try {
      setInvoicesLoading(true)
      const data = await apiGet<any[]>('/api/invoices/open-for-payment').catch(() => [])
      setOpenInvoices(data ?? [])
    } catch (err) {
      console.warn('Failed to load invoices', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  const openPaymentHistory = async (pay: Payment) => {
    setHistoryOpen({ paymentId: pay.id, items: [] })
    setHistoryLoading(true)
    try {
      const items = await apiGet<Array<{ id: string|number; user?: string; time: string; note?: string; changes?: any }>>(`/api/payments/${pay.id}/history`).catch(()=>[])
      setHistoryOpen({ paymentId: pay.id, items: items || [] })
    } catch {
      setHistoryOpen({ paymentId: pay.id, items: [] })
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (directionFilter !== 'all' && p.direction !== directionFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (methodFilter !== 'all' && (p.method ?? 'other') !== methodFilter) return false
      if (search.trim()) {
        const searchTerm = search.trim().replace(/,/g, '')
        // Search by payment number, party name, or amount
        const paymentNumber = (p.payment_number ?? `#${p.id}`).toLowerCase()
        const partyName = (p.party_name ?? '').toLowerCase()
        const amount = String(p.amount).toLowerCase()
        const searchLower = searchTerm.toLowerCase()
        if (!paymentNumber.includes(searchLower) && !partyName.includes(searchLower) && !amount.includes(searchLower)) {
          return false
        }
      }
      return true
    })
    .sort((a,b)=>{
      const base = (()=>{
        switch (sortKey) {
          case 'number': {
            const an = (a.payment_number ?? a.id)?.toString()
            const bn = (b.payment_number ?? b.id)?.toString()
            return an.localeCompare(bn, 'fa', { sensitivity: 'base' })
          }
          case 'direction':
            return a.direction.localeCompare(b.direction, 'fa', { sensitivity: 'base' })
          case 'method':
            return (a.method ?? '').localeCompare(b.method ?? '', 'fa', { sensitivity: 'base' })
          case 'party':
            return (a.party_name ?? '').localeCompare(b.party_name ?? '', 'fa', { sensitivity: 'base' })
          case 'amount':
            return (a.amount ?? 0) - (b.amount ?? 0)
          case 'status':
            return (a.status ?? '').localeCompare(b.status ?? '', 'fa', { sensitivity: 'base' })
          case 'due_date': {
            const ad = a.due_date ? Date.parse(a.due_date) : 0
            const bd = b.due_date ? Date.parse(b.due_date) : 0
            return ad - bd
          }
          case 'server_time':
          default: {
            const at = a.server_time ? Date.parse(a.server_time) : 0
            const bt = b.server_time ? Date.parse(b.server_time) : 0
            return at - bt
          }
        }
      })()
      return sortDir === 'asc' ? base : -base
    })
    .slice(0, paymentListLimit)
  }, [payments, directionFilter, statusFilter, methodFilter, search, sortKey, sortDir, paymentListLimit])

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

  const handleDueJalaliChange = (value: string) => {
    // Accept flexible Jalali input and map to ISO date (YYYY-MM-DD)
    const parsed = parseJalaliInput(value)
    if (parsed) {
      const isoDate = parsed.iso.slice(0, 10)
      setPaymentForm(prev => ({ ...prev, due_date: isoDate, due_date_jalali: parsed.jalali }))
    } else {
      // Keep raw input for user; clear ISO if invalid
      setPaymentForm(prev => ({ ...prev, due_date: '', due_date_jalali: value }))
    }
  }

  const resetForm = () => {
    setPaymentForm({ ...emptyForm, direction: paymentForm.direction })
    setFormError(null)
    setFormSuccess(null)
  }

  useEffect(()=>{
    try {
      localStorage.setItem('finance.pageSize', String(paymentListLimit))
      localStorage.setItem('finance.sort.key', sortKey)
      localStorage.setItem('finance.sort.dir', sortDir)
    } catch {}
  }, [paymentListLimit, sortKey, sortDir])

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
      let due: string | undefined = undefined
      if (paymentForm.due_date.trim() !== '') {
        if (paymentForm.due_date.includes('/')) {
          const parsed = parseJalaliInput(paymentForm.due_date.trim())
          due = parsed?.iso
        } else {
          due = new Date(`${paymentForm.due_date}T12:00:00Z`).toISOString()
        }
      }
      const payload = {
        direction: paymentForm.direction,
        mode: 'manual',
        party_name: paymentForm.party_name.trim(),
        method: paymentForm.method.trim() || undefined,
        amount: amountValue,
        reference: paymentForm.reference.trim() || undefined,
        note: paymentForm.note.trim() || undefined,
        audit_note: auditNote.trim() || undefined,
        due_date: due,
        client_time: clientTime,
        invoice_id: paymentForm.invoice_id,
      }
      await apiPost<Payment>('/api/payments/manual', payload)
      await loadData(false)
      resetForm()
      setAuditNote('')
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
      {error && <Alert variant="error">{error}</Alert>}

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
          <Alert variant={formError ? 'error' : 'success'}>
            {formError ?? formSuccess}
          </Alert>
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
                <div className="mt-2">
                  <PartySelectorInline onSelect={(p)=> setPaymentForm(prev=> ({ ...prev, party_name: p.name }))} />
                </div>
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
                <div className="flex gap-2">
                  <select
                    value={paymentForm.method}
                    onChange={e => handleFormChange('method', e.target.value)}
                    className={`${retroInput} w-full`}
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button type="button" className={`${retroButton}`} onClick={() => setShowMethodMgr(true)}>مدیریت</button>
                </div>
                {(paymentForm.method === 'bank' || paymentForm.method === 'pos') && (
                  <div className="mt-2">
                    <label className={`${retroMuted} text-[11px]`}>بانک مرتبط</label>
                    <select
                      value={paymentForm.bank_name || ''}
                      onChange={e => setPaymentForm(prev=> ({...prev, bank_name: e.target.value}))}
                      className={`${retroInput} w-full`}
                    >
                      <option value="">-- انتخاب کنید --</option>
                      {((personBanks[paymentForm.party_name||'']||[]).length? personBanks[paymentForm.party_name||''] : availableBanks).map(b=>(
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>تاریخ سررسید</label>
                <input
                  data-jdp
                  data-jdp-only-date
                  data-jdp-dir="rtl"
                  placeholder="تاریخ شمسی"
                  value={paymentForm.due_date}
                  onFocus={e=>{ try{ (window as any).jalaliDatepicker?.show(e.target) }catch{} }}
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

            <div className="space-y-2">
              <label className={retroHeading}>توضیح سیستمی برای مدیر (غیرچاپی)</label>
              <textarea
                className={`${retroInput} w-full h-16`}
                value={auditNote}
                onChange={e => setAuditNote(e.target.value)}
                placeholder="برای ثبت در تاریخچه؛ در چاپ نمی‌آید"
              />
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>فاکتور مرتبط (اختیاری)</label>
              <select
                value={paymentForm.invoice_id || ''}
                onChange={e => {
                  const val = e.target.value
                  const invId = val ? Number(val) : undefined
                  const inv = openInvoices.find(i => i.id === invId)
                  setPaymentForm(prev => ({
                    ...prev,
                    invoice_id: invId,
                    party_name: inv?.party_name ?? prev.party_name,
                    amount: inv?.total ? String(inv.total) : prev.amount,
                    reference: inv?.invoice_number ? String(inv.invoice_number) : prev.reference,
                    note: prev.note || (inv ? (inv.invoice_type === 'sale' ? 'پرداخت مرتبط با فاکتور فروش' : 'پرداخت مرتبط با فاکتور خرید') : '')
                  }))
                }}
                className={`${retroInput} w-full`}
              >
                <option value="">-- انتخاب نکن --</option>
                {openInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_type === 'sale' ? '📤 فروش' : inv.invoice_type === 'purchase' ? '📥 خرید' : '📋'}
                    {' '}
                    {inv.invoice_number} ({inv.party_name}) - {inv.total ? `${formatNumberFa(inv.total)} ریال` : '---'}
                  </option>
                ))}
              </select>
              {invoicesLoading && (
                <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری فاکتورها...</p>
              )}
            </div>

            {formError && <Alert variant="error">{formError}</Alert>}
            {formSuccess && <Alert variant="success">{formSuccess}</Alert>}

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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <label className={retroHeading}>جستجو (شماره / طرف / مبلغ)</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="شماره تراکنش، نام طرف یا مبلغ را جستجو کنید"
              className={`${retroInput} w-full`}
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>تعداد نمایشی</label>
            <select
              value={paymentListLimit}
              onChange={e => setPaymentListLimit(parseInt(e.target.value))}
              className={`${retroInput} w-full`}
            >
              <option value={5}>۵</option>
              <option value={10}>۱۰</option>
              <option value={20}>۲۰</option>
              <option value={50}>۵۰</option>
            </select>
          </div>
        </div>
        <div className="border border-dashed border-[#c5bca5] p-3 text-xs text-[#7a6b4f] rounded-sm">
          {filteredPayments.length} تراکنش از {payments.length} تراکنش کلی نمایش داده می‌شود (حداکثر {paymentListLimit})
        </div>

        {filteredPayments.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='number') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('number') }}>شماره {sortKey==='number' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='direction') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('direction') }}>جهت {sortKey==='direction' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='method') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('method') }}>روش {sortKey==='method' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='party') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('party') }}>طرف حساب {sortKey==='party' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='amount') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('amount') }}>مبلغ {sortKey==='amount' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}><button className="underline" onClick={()=> { if (sortKey==='status') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('status') }}>وضعیت {sortKey==='status' ? (sortDir==='asc'?'↑':'↓') : ''}</button></th>
                <th className={retroTableHeader}>
                  <div className="flex items-center gap-2">
                    <button className="underline" onClick={()=> { if (sortKey==='server_time') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('server_time') }}>تاریخ {sortKey==='server_time' ? (sortDir==='asc'?'↑':'↓') : ''}</button>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="text-xs border border-[#c5bca5] rounded px-1 py-0.5">
                      <option value="asc">صعودی</option>
                      <option value="desc">نزولی</option>
                    </select>
                  </div>
                </th>
                <th className={retroTableHeader}>لینک</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {pay.payment_number ?? `#${pay.id}`}
                    {(pay as any).tracking_code && (
                      <span className="block text-[8px] bg-yellow-100 text-yellow-800 px-1 py-0.5 mt-1 rounded truncate">
                        📍 {(pay as any).tracking_code}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge} ${pay.direction === 'in' ? '!bg-green-700' : '!bg-red-700'}`}>{pay.direction === 'in' ? 'دریافتی' : 'پرداختی'}</span>
                  </td>
                  <td className="px-3 py-2">{pay.method ?? 'نامشخص'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{pay.party_name ?? 'نامشخص'}</span>
                      <span
                        className={`${retroBadge} text-[10px] ${pay.direction === 'in' ? '!border-green-700 !text-green-800' : '!border-red-700 !text-red-800'}`}
                        title={pay.direction === 'in' ? 'دریافت از طرف حساب (کاهش طلب)' : 'پرداخت به طرف حساب (کاهش بدهی)'}
                      >
                        {pay.direction === 'in' ? 'دریافت از' : 'پرداخت به'}
                      </span>
                      {pay.party_name && (
                        <button
                          onClick={() => openPartyLedger(pay.party_name!)}
                          className="ml-1 text-[10px] underline text-[#1f2e3b] hover:text-[#5b4a2f]"
                        >گردش</button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-left">
                    <span className={`${pay.direction === 'in' ? 'text-green-700' : 'text-red-700'} font-[Yekan]`}>
                      {formatNumberFa(pay.amount)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge} text-[10px] ${pay.status === 'posted' ? '!border-green-700 !text-green-800' : pay.status === 'draft' ? '!border-gray-600 !text-gray-700' : ''}`}>{pay.status}</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {isoToJalali(pay.server_time)}
                    {pay.due_date && (
                      <span className="block text-[10px] text-[#7a6b4f] mt-1">
                        سررسید: {isoToJalali(pay.due_date)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-left space-x-1">
                    {(pay as any).tracking_code && (
                      <button
                        onClick={() => window.open(`/trace/${(pay as any).tracking_code}`, '_blank')}
                        className="text-[11px] px-2 py-1 border border-purple-700 bg-purple-100 hover:bg-purple-200 transition"
                      >🔍</button>
                    )}
                    {(pay as any).invoice_id || pay.reference ? (
                      <button
                        onClick={() => openInvoiceFromPayment(pay)}
                        className="text-[11px] px-2 py-1 border border-[#c5bca5] bg-[#ece5d1] hover:bg-[#e0d6bc] transition"
                      >فاکتور</button>
                    ) : (
                      <span className="text-[10px] text-[#7a6b4f]">---</span>
                    )}
                    <button
                      onClick={() => openPaymentHistory(pay)}
                      className="text-[11px] px-2 py-1 border border-[#c5bca5] bg-[#faf4de] hover:bg-[#f1e8c9] transition ml-1"
                    >تاریخچه</button>
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

      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHistoryOpen(null)}>
          <div className="w-[520px] max-w-[90vw] bg-[#faf4de] border-2 border-[#c5bca5] shadow-[6px_6px_0_#c5bca5] p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-[#1f2e3b]">تاریخچه پرداخت #{historyOpen.paymentId}</h4>
              <button className={`${retroButton}`} onClick={()=> setHistoryOpen(null)}>بستن</button>
            </div>
            {historyLoading ? (
              <div className="text-xs text-[#7a6b4f]">در حال دریافت تاریخچه...</div>
            ) : historyOpen.items.length ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {historyOpen.items.map(h => (
                  <div key={h.id} className="bg-[#f8f5ee] px-3 py-2 rounded border border-[#e5ddc5] text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold">{h.user || 'کاربر'}</span>
                      <span className="text-[11px] text-[#7a6b4f]">{h.time ? isoToJalali(h.time) : ''}</span>
                    </div>
                    {h.note && <div className="mt-1 text-[#5b4a2f]">یادداشت: {h.note}</div>}
                    {(h as any).audit_note && (
                      <div className="mt-1 text-[#1f2e3b] font-semibold">توضیح سیستمی: {(h as any).audit_note}</div>
                    )}
                    {h.changes && <pre className="mt-2 text-[10px] bg-[#f6f1df] px-2 py-1 rounded overflow-x-auto">{JSON.stringify(h.changes, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#7a6b4f]">تاریخچه‌ای ثبت نشده است.</div>
            )}
          </div>
        </div>
      )}

      {showMethodMgr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-[480px] max-w-[90vw] bg-[#faf4de] border-2 border-[#c5bca5] shadow-[6px_6px_0_#c5bca5] p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#1f2e3b]">مدیریت روش‌های پرداخت</h4>
              <button className={`${retroButton}`} onClick={() => setShowMethodMgr(false)}>بستن</button>
            </div>
            <div className="space-y-3">
              <div className="border border-dashed border-[#c5bca5] p-3">
                <div className="font-semibold mb-2">بانک‌ها (برای انتخاب سریع در پرداخت بانکی)</div>
                <div className="flex gap-2 mb-2">
                  <input id="newBankInput" className={`${retroInput} flex-1`} placeholder="نام بانک" />
                  <button type="button" className={`${retroButton}`} onClick={()=>{
                    const el = document.getElementById('newBankInput') as HTMLInputElement | null
                    const v = (el?.value||'').trim()
                    if (!v) return
                    if (!availableBanks.includes(v)) {
                      const next = [...availableBanks, v]
                      setAvailableBanks(next)
                      try { localStorage.setItem('hesabpak_banks_selected', JSON.stringify(next)) } catch {}
                    }
                    if (el) el.value = ''
                  }}>افزودن بانک</button>
                </div>
                <ul className="space-y-2">
                  {availableBanks.map(b=> (
                    <li key={b} className="flex items-center gap-2">
                      <input defaultValue={b} className={`${retroInput} flex-1`} onBlur={(e)=>{
                        const nv = e.target.value.trim(); if (!nv || nv===b) return;
                        const next = availableBanks.map(x=> x===b? nv: x)
                        setAvailableBanks(next)
                        try { localStorage.setItem('hesabpak_banks_selected', JSON.stringify(next)) } catch {}
                      }} />
                      <button type="button" className={`${retroButton} !bg-[#7a1f1f]`} onClick={()=>{
                        const next = availableBanks.filter(x=> x!==b)
                        setAvailableBanks(next)
                        try { localStorage.setItem('hesabpak_banks_selected', JSON.stringify(next)) } catch {}
                      }}>حذف</button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <div className="text-xs text-[#7a6b4f]">می‌توانید بانک‌های اختصاصی برای هر طرف‌حساب تعریف کنید:</div>
                  <div className="flex gap-2 mt-2">
                    <input id="personBankPerson" className={`${retroInput} w-48`} placeholder="نام طرف‌حساب" />
                    <select id="personBankBank" className={`${retroInput} w-64`}>
                      <option value="">-- انتخاب بانک --</option>
                      {availableBanks.map(b=> <option key={b} value={b}>{b}</option>)}
                    </select>
                    <button type="button" className={`${retroButton}`} onClick={()=>{
                      const pEl = document.getElementById('personBankPerson') as HTMLInputElement | null
                      const bEl = document.getElementById('personBankBank') as HTMLSelectElement | null
                      const p = (pEl?.value||'').trim(); const b = (bEl?.value||'').trim()
                      if (!p || !b) return
                      const list = personBanks[p] || []
                      if (!list.includes(b)) {
                        const nextMap = { ...personBanks, [p]: [...list, b] }
                        setPersonBanks(nextMap)
                        try { localStorage.setItem('hesabpak_person_banks', JSON.stringify(nextMap)) } catch {}
                      }
                    }}>افزودن بانک برای طرف‌حساب</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={`${retroButton}`} onClick={async()=>{
                  try {
                    await apiPatch(`/api/admin/settings/payment_methods`, { value: JSON.stringify(paymentMethods) })
                    alert('روش‌ها در تنظیمات سیستم ذخیره شد')
                  } catch (e) {
                    try {
                      await apiPost(`/api/admin/settings`, { key: 'payment_methods', value: JSON.stringify(paymentMethods) })
                      alert('روش‌ها به‌عنوان تنظیم جدید ذخیره شد')
                    } catch {
                      alert('ذخیره در تنظیمات سیستم ناموفق بود')
                    }
                  }
                }}>ذخیره در تنظیمات سیستم</button>
                <button type="button" className={`${retroButton}`} onClick={async()=>{
                  try {
                    const settings = await apiGet<any[]>('/api/admin/settings')
                    const pm = Array.isArray(settings) ? settings.find((s:any)=>s.key==='payment_methods') : null
                    if (pm && pm.value) {
                      const arr = JSON.parse(pm.value)
                      if (Array.isArray(arr) && arr.length) {
                        setPaymentMethods(arr)
                        try { localStorage.setItem('hesabpak_payment_methods', JSON.stringify(arr)) } catch {}
                        alert('روش‌ها از تنظیمات سیستم بارگذاری شد')
                      }
                    }
                  } catch {
                    alert('بارگذاری از تنظیمات سیستم ناموفق بود')
                  }
                }}>بارگذاری از تنظیمات سیستم</button>
              </div>
              <div className="flex gap-2">
                <input id="newMethodInput" className={`${retroInput} flex-1`} placeholder="روش جدید (مثلاً: کارت، حواله)" />
                <button className={`${retroButton}`} onClick={() => {
                  const el = document.getElementById('newMethodInput') as HTMLInputElement | null
                  const v = (el?.value || '').trim()
                  if (!v) return
                  if (!paymentMethods.includes(v)) {
                    const next = [...paymentMethods, v]
                    setPaymentMethods(next)
                    try { localStorage.setItem('hesabpak_payment_methods', JSON.stringify(next)) } catch {}
                    if (!paymentForm.method) handleFormChange('method', v)
                  }
                  if (el) el.value = ''
                }}>افزودن</button>
              </div>
              <ul className="space-y-2">
                {paymentMethods.map(m => (
                  <li key={m} className="flex items-center gap-2">
                    <input defaultValue={m} className={`${retroInput} flex-1`} onBlur={(e)=>{
                      const nv = e.target.value.trim()
                      if (!nv) return
                      if (nv === m) return
                      const next = paymentMethods.map(x => x === m ? nv : x)
                      setPaymentMethods(next)
                      try { localStorage.setItem('hesabpak_payment_methods', JSON.stringify(next)) } catch {}
                      if (paymentForm.method === m) handleFormChange('method', nv)
                    }} />
                    <button className={`${retroButton} !bg-[#7a1f1f]`} onClick={()=>{
                      const next = paymentMethods.filter(x => x !== m)
                      setPaymentMethods(next)
                      try { localStorage.setItem('hesabpak_payment_methods', JSON.stringify(next)) } catch {}
                      if (paymentForm.method === m) handleFormChange('method', next[0] || '')
                    }}>حذف</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
      {showLedger && ledgerPayments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLedger(false)}>
          <div className={`${retroPanel} max-w-lg w-full mx-4 p-5 space-y-4`} onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold">گردش حساب: {ledgerParty}</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ledgerPayments.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs bg-[#f8f5ee] px-3 py-2 rounded border border-[#e5ddc5]">
                  <div>
                    <span className="font-semibold">{p.payment_number || `#${p.id}`}</span>
                    {' • '}
                    <span className={p.direction === 'in' ? 'text-green-700' : 'text-red-700'}>
                      {p.direction === 'in' ? 'دریافت' : 'پرداخت'}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold">{formatNumberFa(p.amount)}</span>
                    {' • '}
                    <span className="text-[#7a6b4f]">{isoToJalali(p.server_time)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button className={`${retroButton} text-[11px]`} onClick={() => setShowLedger(false)}>بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
