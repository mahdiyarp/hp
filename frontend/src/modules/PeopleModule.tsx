import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { formatNumberFa } from '../utils/num'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import { requestInvoiceExport } from '../utils/export'

interface Person {
  id: string
  name: string
  kind: string | null
  mobile: string | null
  code: string | null
  description: string | null
  created_at: string
}

interface PersonBalance {
  person_id: string
  debit: number
  credit: number
  balance: number
}

interface PersonWithBalance extends Person {
  debit: number
  credit: number
  balance: number
}

type KindFilter = 'all' | 'customer' | 'supplier' | 'other'
type SortField = 'name' | 'debit' | 'credit' | 'balance' | 'created_at'
type SortOrder = 'asc' | 'desc'

interface LedgerEntry {
  id: string
  description: string
  debit_account: string
  credit_account: string
  amount: number
  entry_date: string
  ref_type: string | null
  ref_id: string | null
  running_balance: number
  invoice: {
    id: number
    invoice_number: string
    issue_date: string
    total_amount: number
    status: string
  } | null
  payment: {
    id: number
    amount: number
    payment_date: string
    method: string
    reference: string | null
  } | null
}

interface PersonLedger {
  party_id: string
  person: {
    id: string
    name: string
    kind: string | null
    mobile: string | null
    code: string | null
  }
  entries: LedgerEntry[]
  debit_total: number
  credit_total: number
  net_balance: number
}

export default function PeopleModule({ smartDate }: ModuleComponentProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [balances, setBalances] = useState<PersonBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonWithBalance | null>(null)
  const [ledgerData, setLedgerData] = useState<PersonLedger | null>(null)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const emptyForm = {
    name: '',
    kind: 'customer',
    mobile: '',
    code: '',
    description: '',
  }
  const [personForm, setPersonForm] = useState<typeof emptyForm>(emptyForm)

  useEffect(() => {
    loadPeople()
    loadBalances()
  }, [])

  async function loadPeople() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Person[]>('/api/persons')
      setPeople(data)
    } catch (err) {
      console.error(err)
      setError('امکان دریافت طرف‌های حساب وجود ندارد.')
    } finally {
      setLoading(false)
    }
  }

  async function loadBalances() {
    try {
      const data = await apiGet<{ balances: PersonBalance[] }>('/api/persons/balances')
      setBalances(data.balances)
    } catch (err) {
      console.error('Failed to load balances:', err)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const loadPersonLedger = async (person: PersonWithBalance) => {
    setSelectedPerson(person)
    setLoadingLedger(true)
    setLedgerData(null)
    try {
      const data = await apiGet<PersonLedger>(`/api/ledger/party/${person.id}`)
      setLedgerData(data)
    } catch (err) {
      console.error('Failed to load ledger:', err)
      setError('خطا در دریافت گردش حساب')
    } finally {
      setLoadingLedger(false)
    }
  }

  const openInvoiceDocument = async (invoiceId: number) => {
    try {
      const downloadUrl = await requestInvoiceExport(invoiceId, 'pdf')
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener')
      } else {
        setError('امکان دریافت فایل فاکتور وجود ندارد.')
      }
    } catch (err) {
      console.error('Failed to export invoice:', err)
      setError('امکان دریافت فایل فاکتور وجود ندارد.')
    }
  }

  const exportLedger = () => {
    if (!ledgerData) return
    
    const csv = [
      ['تاریخ', 'شرح', 'بدهکار', 'بستانکار', 'مانده', 'فاکتور', 'پرداخت'].join('\t'),
      ...ledgerData.entries.map(e => [
        new Date(e.entry_date).toLocaleDateString('fa-IR'),
        e.description,
        e.debit_account === 'AccountsReceivable' ? e.amount : '',
        e.credit_account === 'AccountsReceivable' ? e.amount : '',
        e.running_balance,
        e.invoice ? e.invoice.invoice_number : '',
        e.payment ? e.payment.reference || e.payment.method : '',
      ].join('\t'))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `گردش-حساب-${ledgerData.person.name}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFormChange = (field: keyof typeof emptyForm, value: string) => {
    setPersonForm(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setPersonForm(emptyForm)
    setFormError(null)
    setFormSuccess(null)
  }

  const submitPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personForm.name.trim()) {
      setFormError('نام مخاطب را وارد کنید.')
      return
    }
    setCreating(true)
    setFormError(null)
    try {
      const payload = {
        name: personForm.name.trim(),
        kind: personForm.kind.trim() || undefined,
        mobile: personForm.mobile.trim() || undefined,
        code: personForm.code.trim() || undefined,
        description: personForm.description.trim() || undefined,
      }
      const created = await apiPost<Person>('/api/persons', payload)
      setPeople(prev => [created, ...prev])
      setPersonForm(emptyForm)
      setFormSuccess('مخاطب با موفقیت ثبت شد.')
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('ثبت مخاطب با خطا همراه بود.')
      }
    } finally {
      setCreating(false)
    }
  }

  const peopleWithBalances = useMemo(() => {
    return people.map(p => {
      const balance = balances.find(b => b.person_id === p.id)
      return {
        ...p,
        debit: balance?.debit ?? 0,
        credit: balance?.credit ?? 0,
        balance: balance?.balance ?? 0,
      } as PersonWithBalance
    })
  }, [people, balances])

  const filtered = useMemo(() => {
    let result = peopleWithBalances.filter(p => {
      if (kindFilter !== 'all') {
        const kind = p.kind ?? 'other'
        if (kind !== kindFilter) return false
      }
      if (search) {
        const hay = `${p.name} ${p.mobile ?? ''} ${p.code ?? ''}`.toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // Handle null values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // For numeric fields
      if (sortField === 'debit' || sortField === 'credit' || sortField === 'balance') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      }

      // For date fields
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [peopleWithBalances, kindFilter, search, sortField, sortOrder])

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال دریافت مخاطبین...</p>
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
            <p className={retroHeading}>Relations Hub</p>
            <h2 className="text-2xl font-semibold mt-2">مدیریت طرف‌های حساب</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع: {smartDate.jalali ?? 'نامشخص'} | {smartDate.isoDate ?? 'ISO TBD'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={() => { loadPeople(); loadBalances(); }}>
              بروزرسانی فهرست
            </button>
            <button
              className={retroButton}
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
            >
              افزودن مخاطب جدید
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تعداد طرف حساب</p>
            <p className="text-lg font-semibold">{formatNumberFa(people.length)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>مشتریان</p>
            <p className="text-lg font-semibold">
              {formatNumberFa(people.filter(p => p.kind === 'customer').length)}
            </p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تأمین‌کنندگان</p>
            <p className="text-lg font-semibold">
              {formatNumberFa(people.filter(p => p.kind === 'supplier').length)}
            </p>
          </div>
        </div>
      </section>

      {showForm && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className={retroHeading}>فرم ثبت مخاطب</p>
              <h3 className="text-lg font-semibold mt-2">افزودن طرف حساب جدید</h3>
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

          <form className="space-y-4" onSubmit={submitPerson}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>نام مخاطب *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  placeholder="مانند: شرکت الف"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>نوع</label>
                <select
                  value={personForm.kind}
                  onChange={e => handleFormChange('kind', e.target.value)}
                  className={`${retroInput} w-full`}
                >
                  <option value="customer">مشتری</option>
                  <option value="supplier">تأمین‌کننده</option>
                  <option value="other">سایر</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شماره همراه</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.mobile}
                  onChange={e => handleFormChange('mobile', e.target.value)}
                  placeholder="مثلاً 09xxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>کد طرف حساب</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.code}
                  onChange={e => handleFormChange('code', e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                className={`${retroInput} w-full h-24`}
                value={personForm.description}
                onChange={e => handleFormChange('description', e.target.value)}
                placeholder="یادداشت مرتبط با این مخاطب"
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
                {creating ? 'در حال ثبت...' : 'ثبت مخاطب'}
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
          <div className="space-y-2 lg:col-span-2">
            <label className={retroHeading}>جستجو</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="نام، موبایل یا کد مخاطب..."
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نوع مخاطب</label>
            <select
              value={kindFilter}
              onChange={e => setKindFilter(e.target.value as KindFilter)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه</option>
              <option value="customer">مشتری</option>
              <option value="supplier">تأمین‌کننده</option>
              <option value="other">سایر</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نتیجه</label>
            <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
              {formatNumberFa(filtered.length)} مخاطب نمایش داده می‌شود.
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
              <thead>
                <tr>
                  <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => handleSort('name')}>
                    نام {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={retroTableHeader}>نوع</th>
                  <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => handleSort('debit')}>
                    بدهکار {sortField === 'debit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => handleSort('credit')}>
                    بستانکار {sortField === 'credit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => handleSort('balance')}>
                    مانده {sortField === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={retroTableHeader}>کد</th>
                  <th className={retroTableHeader}>موبایل</th>
                  <th className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`} onClick={() => handleSort('created_at')}>
                    تاریخ ثبت {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(person => (
                  <tr 
                    key={person.id} 
                    className="border-b border-[#d9cfb6] hover:bg-[#f6f1df] cursor-pointer"
                    onClick={() => loadPersonLedger(person)}
                  >
                    <td className="px-3 py-2 font-semibold">
                      {person.name}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {person.kind === 'customer' ? 'مشتری' : person.kind === 'supplier' ? 'تأمین‌کننده' : 'سایر'}
                    </td>
                    <td className="px-3 py-2 text-left font-mono">
                      {person.debit > 0 ? (
                        <span className="text-red-700">{formatNumberFa(person.debit)}</span>
                      ) : (
                        <span className="text-[#7a6b4f]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-left font-mono">
                      {person.credit > 0 ? (
                        <span className="text-green-700">{formatNumberFa(person.credit)}</span>
                      ) : (
                        <span className="text-[#7a6b4f]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-left font-mono font-semibold">
                      {person.balance !== 0 ? (
                        <span className={person.balance > 0 ? 'text-red-700' : 'text-green-700'}>
                          {formatNumberFa(Math.abs(person.balance))}
                          {person.balance > 0 ? ' (بده)' : ' (بستان)'}
                        </span>
                      ) : (
                        <span className="text-[#7a6b4f]">تسویه</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{person.code ?? '-'}</td>
                    <td className="px-3 py-2 text-xs">{person.mobile ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-[#7a6b4f]">
                      {new Date(person.created_at).toLocaleDateString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-[#7a6b4f]">مخاطبی با شرایط فعلی یافت نشد.</div>
        )}
      </section>

      {/* Ledger Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${retroPanelPadded} max-w-6xl w-full max-h-[90vh] overflow-y-auto space-y-4`}>
            <header className="flex items-center justify-between gap-3 sticky top-0 bg-[#fdf7e6] pb-3 border-b border-[#c5bca5]">
              <div>
                <p className={retroHeading}>گردش حساب</p>
                <h3 className="text-xl font-semibold mt-2">{selectedPerson.name}</h3>
                <p className="text-xs text-[#7a6b4f] mt-1">
                  {selectedPerson.kind === 'customer' ? 'مشتری' : selectedPerson.kind === 'supplier' ? 'تأمین‌کننده' : 'سایر'}
                  {selectedPerson.mobile && ` | ${selectedPerson.mobile}`}
                  {selectedPerson.code && ` | کد: ${selectedPerson.code}`}
                </p>
              </div>
              <div className="flex gap-2">
                {ledgerData && (
                  <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={exportLedger}>
                    خروجی CSV
                  </button>
                )}
                <button
                  className={`${retroButton} !bg-[#5b4a2f]`}
                  onClick={() => {
                    setSelectedPerson(null)
                    setLedgerData(null)
                  }}
                >
                  بستن
                </button>
              </div>
            </header>

            {loadingLedger ? (
              <div className="flex items-center justify-center py-12">
                <div className="space-y-3 text-center">
                  <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
                  <p className={`${retroHeading} text-[#1f2e3b]`}>در حال بارگذاری گردش حساب...</p>
                </div>
              </div>
            ) : ledgerData ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                    <p className={retroHeading}>کل بدهکار</p>
                    <p className="text-lg font-semibold text-red-700">
                      {formatNumberFa(ledgerData.debit_total)} ریال
                    </p>
                  </div>
                  <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                    <p className={retroHeading}>کل بستانکار</p>
                    <p className="text-lg font-semibold text-green-700">
                      {formatNumberFa(ledgerData.credit_total)} ریال
                    </p>
                  </div>
                  <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                    <p className={retroHeading}>مانده نهایی</p>
                    <p className={`text-lg font-semibold ${ledgerData.net_balance > 0 ? 'text-red-700' : ledgerData.net_balance < 0 ? 'text-green-700' : 'text-[#7a6b4f]'}`}>
                      {ledgerData.net_balance === 0 
                        ? 'تسویه شده'
                        : `${formatNumberFa(Math.abs(ledgerData.net_balance))} ریال ${ledgerData.net_balance > 0 ? '(بده)' : '(بستان)'}`
                      }
                    </p>
                  </div>
                </div>

                {ledgerData.entries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                      <thead>
                        <tr>
                          <th className={retroTableHeader}>تاریخ</th>
                          <th className={retroTableHeader}>شرح</th>
                          <th className={retroTableHeader}>بدهکار</th>
                          <th className={retroTableHeader}>بستانکار</th>
                          <th className={retroTableHeader}>مانده</th>
                          <th className={retroTableHeader}>سند</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerData.entries.map(entry => (
                          <tr key={entry.id} className="border-b border-[#d9cfb6] hover:bg-[#f6f1df]">
                            <td className="px-3 py-2 text-xs">
                              {new Date(entry.entry_date).toLocaleDateString('fa-IR')}
                            </td>
                            <td className="px-3 py-2">
                              {entry.description}
                              {entry.invoice && (
                                <span className="block text-[10px] text-blue-700 mt-1">
                                  فاکتور: {entry.invoice.invoice_number}
                                </span>
                              )}
                              {entry.payment && (
                                <span className="block text-[10px] text-green-700 mt-1">
                                  پرداخت: {entry.payment.method}
                                  {entry.payment.reference && ` - ${entry.payment.reference}`}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-left font-mono">
                              {entry.debit_account === 'AccountsReceivable' ? (
                                <span className="text-red-700">{formatNumberFa(entry.amount)}</span>
                              ) : (
                                <span className="text-[#7a6b4f]">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-left font-mono">
                              {entry.credit_account === 'AccountsReceivable' ? (
                                <span className="text-green-700">{formatNumberFa(entry.amount)}</span>
                              ) : (
                                <span className="text-[#7a6b4f]">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-left font-mono font-semibold">
                              <span className={entry.running_balance > 0 ? 'text-red-700' : entry.running_balance < 0 ? 'text-green-700' : 'text-[#7a6b4f]'}>
                                {formatNumberFa(Math.abs(entry.running_balance))}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {entry.invoice && (
                                <button
                                  className="text-blue-700 underline hover:text-blue-900"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openInvoiceDocument(entry.invoice!.id)
                                  }}
                                >
                                  مشاهده فاکتور
                                </button>
                              )}
                              {entry.payment && !entry.invoice && (
                                <span className="text-green-700">رسید پرداخت</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-[#7a6b4f] py-8">
                    هیچ تراکنشی برای این طرف حساب ثبت نشده است.
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
