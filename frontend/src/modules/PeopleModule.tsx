import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost, apiDelete, apiPut } from '../services/api'
import { formatNumberFa } from '../utils/num'
import { useAuth } from '../context/AuthContext'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import { toast } from '../utils/toast'
import { useConfirmDialog } from '../context/ConfirmDialogContext'

type KindFilter = 'all' | 'customer' | 'supplier' | 'other'
type SortField = 'name' | 'debit' | 'credit' | 'balance' | 'created_at'
type SortOrder = 'asc' | 'desc'

interface Person {
  id: string
  name: string
  kind: string | null
  mobile: string | null
  code: string | null
  description: string | null
  tax_id?: string | null
  national_id?: string | null
  address?: string | null
  payment_terms?: string | null
  credit_limit?: number | null
  created_at: string
}

interface PersonBalance {
  person_id: string
  debit: number
  credit: number
  balance: number
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

interface InvoiceSummary {
  id: number
  invoice_number: string | null
}

interface PaymentSummary {
  method: string
  reference?: string | null
}

interface LedgerEntry {
  id: number
  entry_date: string
  description: string
  amount: number
  debit_account?: string | null
  credit_account?: string | null
  running_balance: number
  invoice?: InvoiceSummary | null
  payment?: PaymentSummary | null
}

type PersonWithBalance = Person & {
  debit: number
  credit: number
  balance: number
}

const GROUP_FILTER_KEYS = {
  l1: 'hp_people_group_l1',
  l2: 'hp_people_group_l2',
  l3: 'hp_people_group_l3',
} as const

const UNGROUPED_KEY = '__ungrouped__'

function readFilterFromStorage(key: string) {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export default function PeopleModule({ smartDate, onNavigate }: ModuleComponentProps) {
  const { user } = useAuth()
  const confirmDialog = useConfirmDialog()
  const canEdit = !!user && ['Admin', 'Accountant', 'Manager'].includes(user.role)
  const [people, setPeople] = useState<Person[]>([])
  const [balances, setBalances] = useState<PersonBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [sortField, setSortField] = useState<SortField>(() => {
    const raw = localStorage.getItem('people.sort.field')
    const allowed: SortField[] = ['name', 'debit', 'credit', 'balance', 'created_at']
    return raw && (allowed as any).includes(raw) ? (raw as SortField) : 'name'
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const raw = localStorage.getItem('people.sort.order')
    return raw === 'asc' || raw === 'desc' ? raw : 'asc'
  })
  const [pageSize, setPageSize] = useState<number>(() => {
    const raw = localStorage.getItem('people.pageSize')
    const n = raw ? parseInt(raw) : 10
    return [5, 10, 20, 50, 100].includes(n) ? n : 10
  })
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonWithBalance | null>(null)
  const [editingPerson, setEditingPerson] = useState<PersonWithBalance | null>(null)
  const [ledgerData, setLedgerData] = useState<PersonLedger | null>(null)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [activities, setActivities] = useState<
    | Array<{
        id: number
        person_id: string
        kind?: string | null
        content: string
        created_at: string
        created_by?: number | null
        next_action_at?: string | null
      }>
    | null
  >(null)
  const [actError, setActError] = useState<string | null>(null)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [newActivityKind, setNewActivityKind] = useState<'note' | 'call' | 'sms' | 'task'>('note')
  const [newActivity, setNewActivity] = useState('')
  const [kindOptions, setKindOptions] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('hp_kind_options')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return ['customer', 'supplier', 'other']
  })
  const [newKind, setNewKind] = useState('')
  const [historyOpen, setHistoryOpen] = useState<{
    personId: string
    items: Array<{ id: string | number; user?: string; time: string; note?: string; changes?: any }>
  } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  // Hierarchical person groups (L1/L2/L3), stored locally and used for filtering/assignment
  const [personGroups, setPersonGroups] = useState<
    Record<string, { l1?: string; l2?: string; l3?: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('hp_person_groups_v1')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const [groupL1Filter, setGroupL1Filter] = useState<string>(() => readFilterFromStorage(GROUP_FILTER_KEYS.l1))
  const [groupL2Filter, setGroupL2Filter] = useState<string>(() => readFilterFromStorage(GROUP_FILTER_KEYS.l2))
  const [groupL3Filter, setGroupL3Filter] = useState<string>(() => readFilterFromStorage(GROUP_FILTER_KEYS.l3))
  const emptyForm = {
    name: '',
    kind: 'customer',
    mobile: '',
    code: '',
    description: '',
    tax_id: '',
    national_id: '',
    address: '',
    payment_terms: '',
    credit_limit: '',
  }
  const [personForm, setPersonForm] = useState<typeof emptyForm>(emptyForm)
  const [auditNote, setAuditNote] = useState('')
  // form group states (hierarchical person grouping only set in create/edit)
  const [formGroupL1, setFormGroupL1] = useState('')
  const [formGroupL2, setFormGroupL2] = useState('')
  const [formGroupL3, setFormGroupL3] = useState('')
  // live suggestions for name field
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; name: string; mobile?: string; source?: 'local' | 'public' }>
  >([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState('')
  const fetchSuggestions = async (q: string) => {
    const term = (q || '').trim()
    if (!term) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    setSuggestionsLoading(true)
    // debounce
    const current = term
    setTimeout(async () => {
      if ((suggestionQuery || '').trim() !== current) return
      try {
        const [local, pub] = await Promise.all([
          apiGet<Array<any>>(`/api/people/search?q=${encodeURIComponent(current)}`).catch(() => []),
          apiGet<Array<any>>(`/api/public/counterparties?q=${encodeURIComponent(current)}`).catch(
            () => [],
          ),
        ])
        const mapLocal = (local || []).map((x: any) => ({
          id: String(x.id || x.name),
          name: x.name,
          mobile: x.mobile,
          source: 'local' as const,
        }))
        const mapPub = (pub || []).map((x: any) => ({
          id: String(x.id || x.name),
          name: x.name,
          mobile: x.mobile,
          source: 'public' as const,
        }))
        const merged = [...mapLocal, ...mapPub]
        setSuggestions(merged)
        setSuggestionsOpen(true)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)
  }

  useEffect(() => {
    loadPeople()
    loadBalances()
  }, [])

  // Listener moved below to use peopleWithBalances safely

  useEffect(() => {
    try {
      localStorage.setItem('hp_kind_options', JSON.stringify(kindOptions))
    } catch {}
  }, [kindOptions])

  // persist person groups map
  useEffect(() => {
    try {
      localStorage.setItem('hp_person_groups_v1', JSON.stringify(personGroups))
    } catch {}
  }, [personGroups])

  async function loadPeople() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Person[]>('/api/persons')
      setPeople(data)
    } catch (err) {
      console.error(err)
      setError('امکان دریافت طرف‌های حساب وجود ندارد.')
      toast.error('امکان دریافت طرف‌های حساب وجود ندارد')
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
      toast.error('دریافت مانده طرف‌های حساب ناموفق بود')
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

  const openPersonHistory = async (p: PersonWithBalance) => {
    setHistoryOpen({ personId: p.id, items: [] })
    setHistoryLoading(true)
    try {
      const items = await apiGet<
        Array<{ id: string | number; user?: string; time: string; note?: string; changes?: any }>
      >(`/api/persons/${p.id}/history`).catch(() => [])
      setHistoryOpen({ personId: p.id, items: items || [] })
    } catch {
      setHistoryOpen({ personId: p.id, items: [] })
      toast.error('امکان دریافت تاریخچه وجود ندارد')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem('people.sort.field', sortField)
      localStorage.setItem('people.sort.order', sortOrder)
    } catch {}
  }, [sortField, sortOrder])

  useEffect(() => {
    try {
      localStorage.setItem('people.pageSize', String(pageSize))
    } catch {}
  }, [pageSize])

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_FILTER_KEYS.l1, groupL1Filter)
    } catch {}
  }, [groupL1Filter])

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_FILTER_KEYS.l2, groupL2Filter)
    } catch {}
  }, [groupL2Filter])

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_FILTER_KEYS.l3, groupL3Filter)
    } catch {}
  }, [groupL3Filter])

  const loadPersonLedger = async (person: PersonWithBalance) => {
    setSelectedPerson(person)
    setLoadingLedger(true)
    setLedgerData(null)
    setActivities(null)
    setActError(null)
    setLoadingActivities(true)
    try {
      const data = await apiGet<PersonLedger>(`/api/ledger/party/${person.id}`)
      setLedgerData(data)
    } catch (err) {
      console.error('Failed to load ledger:', err)
      setError('خطا در دریافت گردش حساب')
      toast.error('خطا در دریافت گردش حساب')
    } finally {
      setLoadingLedger(false)
    }
    try {
      const acts = await apiGet<
        Array<{
          id: number
          person_id: string
          kind?: string | null
          content: string
          created_at: string
          created_by?: number | null
          next_action_at?: string | null
        }>
      >(`/api/persons/${person.id}/activities?limit=50`)
      setActivities(acts)
    } catch (e) {
      console.error('Failed to load activities', e)
      setActError('بارگذاری یادداشت‌ها ممکن نشد')
      toast.error('بارگذاری یادداشت‌ها ممکن نشد')
    } finally {
      setLoadingActivities(false)
    }
  }

  const exportLedger = () => {
    if (!ledgerData) return

    const csv = [
      ['تاریخ', 'شرح', 'بدهکار', 'بستانکار', 'مانده', 'فاکتور', 'پرداخت'].join('\t'),
      ...ledgerData.entries.map((e) =>
        [
          new Date(e.entry_date).toLocaleDateString('fa-IR'),
          e.description,
          e.debit_account === 'AccountsReceivable' ? e.amount : '',
          e.credit_account === 'AccountsReceivable' ? e.amount : '',
          e.running_balance,
          e.invoice ? e.invoice.invoice_number : '',
          e.payment ? e.payment.reference || e.payment.method : '',
        ].join('\t'),
      ),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `گردش-حساب-${ledgerData.person.name}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('فایل گردش حساب آماده شد')
  }

  const handleFormChange = (field: keyof typeof emptyForm, value: string) => {
    setPersonForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setPersonForm(emptyForm)
    setFormError(null)
    setFormSuccess(null)
    setAuditNote('')
    setFormGroupL1('')
    setFormGroupL2('')
    setFormGroupL3('')
  }

  const submitPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personForm.name.trim()) {
      setFormError('نام مخاطب را وارد کنید.')
      return
    }
    if (personForm.mobile && !/^0\d{10}$/.test(personForm.mobile)) {
      setFormError('فرمت شماره همراه صحیح نیست (مانند 09xxxxxxxxx).')
      return
    }
    if (personForm.national_id && !/^\d{10}$/.test(personForm.national_id)) {
      setFormError('کد ملی باید 10 رقم باشد.')
      return
    }
    setCreating(true)
    setFormError(null)
    try {
      const computedKind = (
        formGroupL1 ||
        (editingPerson?.kind ?? personForm.kind) ||
        'other'
      ).trim()
      const payload = {
        name: personForm.name.trim(),
        kind: computedKind || undefined,
        mobile: personForm.mobile.trim() || undefined,
        code: personForm.code.trim() || undefined,
        description: personForm.description.trim() || undefined,
        tax_id: personForm.tax_id.trim() || undefined,
        national_id: personForm.national_id.trim() || undefined,
        address: personForm.address.trim() || undefined,
        payment_terms: personForm.payment_terms.trim() || undefined,
        credit_limit: personForm.credit_limit ? Number(personForm.credit_limit) : undefined,
        audit_note: auditNote.trim() || undefined,
      }
      if (editingPerson) {
        const updated = await apiPut<Person>(`/api/persons/${editingPerson.id}`, payload)
        setPeople((prev) => prev.map((p) => (p.id === editingPerson.id ? { ...p, ...updated } : p)))
        // update local hierarchical groups for this person
        setPersonGroups((prev) => ({
          ...prev,
          [editingPerson.id]: {
            l1: formGroupL1 || undefined,
            l2: formGroupL2 || undefined,
            l3: formGroupL3 || undefined,
          },
        }))
        setEditingPerson(null)
        setFormSuccess('مخاطب با موفقیت ویرایش شد.')
        toast.success('مخاطب بروزرسانی شد')
      } else {
        const created = await apiPost<Person>('/api/persons', payload)
        setPeople((prev) => [created, ...prev])
        // set hierarchical groups for new person locally
        setPersonGroups((prev) => ({
          ...prev,
          [created.id]: {
            l1: formGroupL1 || undefined,
            l2: formGroupL2 || undefined,
            l3: formGroupL3 || undefined,
          },
        }))
        setFormSuccess('مخاطب با موفقیت ثبت شد.')
        toast.success('مخاطب ثبت شد')
      }
      setPersonForm(emptyForm)
      setAuditNote('')
      setFormGroupL1('')
      setFormGroupL2('')
      setFormGroupL3('')
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('ثبت مخاطب با خطا همراه بود.')
      }
      toast.error('ذخیره مخاطب ناموفق بود')
    } finally {
      setCreating(false)
    }
  }

  const peopleWithBalances = useMemo(() => {
    return people.map((p) => {
      const balance = balances.find((b) => b.person_id === p.id)
      return {
        ...p,
        debit: balance?.debit ?? 0,
        credit: balance?.credit ?? 0,
        balance: balance?.balance ?? 0,
      } as PersonWithBalance
    })
  }, [people, balances])

  // Listen for cross-module deep link to open a person's history (after memo)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ person_id: string }>
        const pid = ce.detail?.person_id
        if (!pid) return
        const p = peopleWithBalances.find((x) => String(x.id) === String(pid)) || null
        if (p) openPersonHistory(p)
      } catch {}
    }
    window.addEventListener('open-person-history', handler as EventListener)
    return () => window.removeEventListener('open-person-history', handler as EventListener)
  }, [peopleWithBalances])

  const filtered = useMemo(() => {
    const result = peopleWithBalances.filter((p) => {
      // hierarchical person-group filters
      if (groupL1Filter || groupL2Filter || groupL3Filter) {
        const g = personGroups[p.id] || {}
        const normalizedL1 = (g.l1 || '').trim()
        if (groupL1Filter) {
          if (groupL1Filter === UNGROUPED_KEY) {
            if (normalizedL1) return false
          } else if (normalizedL1 !== groupL1Filter) {
            return false
          }
        }
        if (groupL1Filter !== UNGROUPED_KEY) {
          if (groupL2Filter && (g.l2 || '').trim() !== groupL2Filter) return false
          if (groupL3Filter && (g.l3 || '').trim() !== groupL3Filter) return false
        }
      }
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

    return result.slice(0, pageSize)
  }, [peopleWithBalances, kindFilter, search, sortField, sortOrder, pageSize])

  // build hierarchical group suggestions from assigned person groups
  const groupLevels = useMemo(() => {
    const l1 = new Set<string>()
    const l2 = new Map<string, Set<string>>()
    const l3 = new Map<string, Set<string>>()
    Object.values(personGroups).forEach((g) => {
      const a = (g.l1 || '').trim()
      const b = (g.l2 || '').trim()
      const c = (g.l3 || '').trim()
      if (a) {
        l1.add(a)
        if (!l2.has(a)) l2.set(a, new Set<string>())
      }
      if (a && b) {
        l2.get(a)!.add(b)
        const key = `${a}/${b}`
        if (!l3.has(key)) l3.set(key, new Set<string>())
      }
      if (a && b && c) {
        const key = `${a}/${b}`
        l3.get(key)!.add(c)
      }
    })
    return {
      l1: Array.from(l1).sort(),
      l2map: Array.from(l2.entries()).reduce<Record<string, string[]>>((acc, [k, v]) => {
        acc[k] = Array.from(v).sort()
        return acc
      }, {}),
      l3map: Array.from(l3.entries()).reduce<Record<string, string[]>>((acc, [k, v]) => {
        acc[k] = Array.from(v).sort()
        return acc
      }, {}),
    }
  }, [personGroups])

  const balanceTotals = useMemo(() => {
    return peopleWithBalances.reduce(
      (acc, person) => {
        const debit = Number(person.debit) || 0
        const credit = Number(person.credit) || 0
        const balance = Number(person.balance) || 0
        acc.totalDebit += debit
        acc.totalCredit += credit
        if (balance > 0) acc.totalReceivable += balance
        if (balance < 0) acc.totalPayable += Math.abs(balance)
        acc.netBalance += balance
        return acc
      },
      {
        totalDebit: 0,
        totalCredit: 0,
        totalReceivable: 0,
        totalPayable: 0,
        netBalance: 0,
      },
    )
  }, [peopleWithBalances])

  const storeStats = useMemo(() => {
    const agg = new Map<
      string,
      { label: string; count: number; receivable: number; payable: number; net: number }
    >()
    peopleWithBalances.forEach((person) => {
      const rawKey = (personGroups[person.id]?.l1 || '').trim()
      const key = rawKey || UNGROUPED_KEY
      if (!agg.has(key)) {
        agg.set(key, {
          label: rawKey || 'بدون برچسب',
          count: 0,
          receivable: 0,
          payable: 0,
          net: 0,
        })
      }
      const slot = agg.get(key)!
      slot.count += 1
      const balance = Number(person.balance) || 0
      if (balance > 0) slot.receivable += balance
      if (balance < 0) slot.payable += Math.abs(balance)
      slot.net += balance
    })
    return Array.from(agg.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.receivable - a.receivable
      })
  }, [peopleWithBalances, personGroups])

  const hasUngroupedStore = useMemo(
    () => storeStats.some((s) => s.key === UNGROUPED_KEY),
    [storeStats],
  )

  const childL1ForOptions = groupL1Filter === UNGROUPED_KEY ? '' : groupL1Filter
  const selectedPathLabel =
    groupL1Filter === UNGROUPED_KEY
      ? 'بدون برچسب'
      : [groupL1Filter, groupL2Filter, groupL3Filter].filter(Boolean).join('/') || '—'

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
        <section className={`${retroPanelPadded} space-y-4`}>
          <p className={`${retroHeading} text-[#7a1f1f]`}>{error}</p>
          <p className="text-xs text-[#4b3d2d]">اگر دسترسی ندارید یا مسیر پیدا نشد، لطفاً از بخش کاربران در تنظیمات بررسی کنید یا بعداً دوباره تلاش کنید.</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={retroButton}
              onClick={() => {
                loadPeople()
                loadBalances()
              }}
            >
              تلاش مجدد
            </button>
            {onNavigate && (
              <button className={retroButton} onClick={() => onNavigate('settings-users')}>
                کاربران (Settings)
              </button>
            )}
          </div>
        </section>
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
            <button
              className={`${retroButton} !bg-[#1f2e3b]`}
              onClick={() => {
                loadPeople()
                loadBalances()
              }}
            >
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
            {editingPerson && (
              <button
                className={`${retroButton} !bg-[#5b4a2f]`}
                onClick={() => {
                  setEditingPerson(null)
                  resetForm()
                }}
              >
                لغو ویرایش
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تعداد طرف حساب</p>
            <p className="text-lg font-semibold">{formatNumberFa(people.length)}</p>
            <p className="text-[11px] text-[#7a6b4f]">در دیتابیس فعال</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>گروه‌های سطح ۱ یکتا</p>
            <p className="text-lg font-semibold">
              {formatNumberFa(
                Object.values(personGroups).reduce((acc, g) => {
                  if (g.l1) acc.add(g.l1)
                  return acc
                }, new Set<string>()).size,
              )}
            </p>
            <p className="text-[11px] text-[#7a6b4f]">برچسب فروشگاه یا واحد</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>دارای گروه</p>
            <p className="text-lg font-semibold">
              {formatNumberFa(
                Object.values(personGroups).filter((g) => g.l1 || g.l2 || g.l3).length,
              )}
            </p>
            <p className="text-[11px] text-[#7a6b4f]">بر اساس سه سطح سلسله‌مراتب</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#fff1e1] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>مانده‌های بدهکار</p>
            <p className="text-lg font-semibold text-red-700">
              {formatNumberFa(balanceTotals.totalReceivable || 0)}
            </p>
            <p className="text-[11px] text-[#7a2f2f]">نیاز به وصول</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#e9f6e1] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>مانده‌های بستانکار</p>
            <p className="text-lg font-semibold text-green-700">
              {formatNumberFa(balanceTotals.totalPayable || 0)}
            </p>
            <p className="text-[11px] text-[#2f5b2f]">قابل پرداخت / پیش‌دریافت</p>
          </div>
        </div>

        {storeStats.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={`${retroHeading} text-[#1f2e3b]`}>نمای فروشگاه / گروه سطح ۱</p>
              <span className="text-[11px] text-[#7a6b4f]">با کلیک هر کارت، فهرست فیلتر می‌شود.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {storeStats.map((store) => {
                const isActive = groupL1Filter === store.key
                const receivableBadge = formatNumberFa(store.receivable || 0)
                const payableBadge = formatNumberFa(store.payable || 0)
                const netBadge = formatNumberFa(Math.abs(store.net) || 0)
                return (
                  <button
                    type="button"
                    key={store.key}
                    className={`text-right border-2 px-4 py-3 rounded-sm shadow-[3px_3px_0_var(--retro-border)] transition-colors ${
                      isActive ? 'bg-[#1f2e3b] text-[#f5f1e6]' : 'bg-[#f6f1df] text-[#1f1207]'
                    }`}
                    onClick={() => {
                      if (isActive) {
                        setGroupL1Filter('')
                        setGroupL2Filter('')
                        setGroupL3Filter('')
                      } else {
                        setGroupL1Filter(store.key)
                        setGroupL2Filter('')
                        setGroupL3Filter('')
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{store.label}</p>
                        <p className="text-[11px] text-inherit">
                          {formatNumberFa(store.count)} مخاطب | خالص {store.net >= 0 ? 'بده' : 'بستان'}{' '}
                          {netBadge}
                        </p>
                      </div>
                      <span className="text-[10px] border px-2 py-1 rounded-sm">
                        {isActive ? 'فعال' : 'نمایش'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-[#7a6b4f]">بدهکار</p>
                        <p className="font-semibold text-red-700">{receivableBadge}</p>
                      </div>
                      <div>
                        <p className="text-[#7a6b4f]">بستانکار</p>
                        <p className="font-semibold text-green-700">{payableBadge}</p>
                      </div>
                      <div>
                        <p className="text-[#7a6b4f]">Net</p>
                        <p className={`font-semibold ${store.net >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {store.net === 0 ? '۰' : `${store.net > 0 ? '+' : '-'}${netBadge}`}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
                  onChange={async (e) => {
                    const v = e.target.value
                    handleFormChange('name', v)
                    setSuggestionQuery(v)
                    await fetchSuggestions(v)
                  }}
                  placeholder="مانند: شرکت الف"
                  required
                />
                {suggestionsOpen && (
                  <div className="border border-[#c5bca5] bg-[#faf4de] mt-1 rounded shadow-[3px_3px_0_#c5bca5] max-h-40 overflow-auto">
                    {suggestionsLoading ? (
                      <div className="text-xs text-[#7a6b4f] px-3 py-2">در حال جستجو...</div>
                    ) : suggestions.length ? (
                      suggestions.map((s) => (
                        <div
                          key={`${s.source}-${s.id}`}
                          className="px-3 py-2 text-sm flex items-center justify-between hover:bg-[#f6f1df] cursor-pointer"
                          onClick={() => {
                            setPersonForm((prev) => ({
                              ...prev,
                              name: s.name,
                              mobile: s.mobile || prev.mobile,
                            }))
                            setSuggestionsOpen(false)
                          }}
                        >
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            {(s.mobile || s.source) && (
                              <div className="text-[11px] text-[#7a6b4f]">
                                {s.mobile ? s.mobile : ''} {s.source ? `• ${s.source}` : ''}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`${retroButton} text-[11px]`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPersonForm((prev) => ({
                                ...prev,
                                name: s.name,
                                mobile: s.mobile || prev.mobile,
                              }))
                              setSuggestionsOpen(false)
                            }}
                          >
                            انتخاب
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#7a6b4f] px-3 py-2">موردی یافت نشد.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hierarchical grouping fields (set only in create/edit) */}
            <div className="space-y-2">
              <label className={retroHeading}>گروه‌بندی مخاطب (سلسله‌مراتبی)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <input
                    className={`${retroInput} w-full`}
                    placeholder="سطح ۱"
                    value={formGroupL1}
                    onChange={(e) => {
                      setFormGroupL1(e.target.value)
                      if (!e.target.value) {
                        setFormGroupL2('')
                        setFormGroupL3('')
                      }
                    }}
                    list="form-pg-l1"
                  />
                  <datalist id="form-pg-l1">
                    {groupLevels.l1.map((g) => (
                      <option key={`fl1-${g}`} value={g} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <input
                    className={`${retroInput} w-full`}
                    placeholder="سطح ۲"
                    value={formGroupL2}
                    onChange={(e) => {
                      setFormGroupL2(e.target.value)
                      if (!e.target.value) {
                        setFormGroupL3('')
                      }
                    }}
                    list="form-pg-l2"
                    disabled={!formGroupL1}
                  />
                  <datalist id="form-pg-l2">
                    {(groupLevels.l2map[formGroupL1 || ''] || []).map((g) => (
                      <option key={`fl2-${g}`} value={g} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <input
                    className={`${retroInput} w-full`}
                    placeholder="سطح ۳"
                    value={formGroupL3}
                    onChange={(e) => setFormGroupL3(e.target.value)}
                    list="form-pg-l3"
                    disabled={!formGroupL1 || !formGroupL2}
                  />
                  <datalist id="form-pg-l3">
                    {(groupLevels.l3map[`${formGroupL1}/${formGroupL2}`] || []).map((g) => (
                      <option key={`fl3-${g}`} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="text-[11px] text-[#7a6b4f]">
                مسیر انتخاب‌شده:{' '}
                {[formGroupL1, formGroupL2, formGroupL3].filter(Boolean).join('/') || '—'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شماره همراه</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.mobile}
                  onChange={(e) => handleFormChange('mobile', e.target.value)}
                  placeholder="مثلاً 09xxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>کد طرف حساب</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.code}
                  onChange={(e) => handleFormChange('code', e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شناسه مالیاتی</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.tax_id}
                  onChange={(e) => handleFormChange('tax_id', e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>شناسه/کد ملی</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.national_id}
                  onChange={(e) => handleFormChange('national_id', e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شرایط پرداخت</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.payment_terms}
                  onChange={(e) => handleFormChange('payment_terms', e.target.value)}
                  placeholder="مانند: Net 30"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>سقف اعتبار (ریال)</label>
                <input
                  className={`${retroInput} w-full`}
                  value={personForm.credit_limit}
                  onChange={(e) => handleFormChange('credit_limit', e.target.value)}
                  placeholder="مثلاً 10000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>آدرس</label>
              <textarea
                className={`${retroInput} w-full h-20`}
                value={personForm.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                placeholder="نشانی کامل مخاطب"
              />
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                className={`${retroInput} w-full h-24`}
                value={personForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="یادداشت مرتبط با این مخاطب"
              />
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیح سیستمی برای مدیر (غیرچاپی)</label>
              <textarea
                className={`${retroInput} w-full h-16`}
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="برای ثبت در تاریخچه؛ در چاپ نمی‌آید"
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
              onChange={(e) => setSearch(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="نام، موبایل یا کد مخاطب..."
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نتیجه</label>
            <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
              {formatNumberFa(filtered.length)} مخاطب نمایش داده می‌شود (حداکثر{' '}
              {formatNumberFa(pageSize)}).
            </div>
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>تعداد نمایشی</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className={`${retroInput} w-full`}
            >
              <option value={5}>۵</option>
              <option value={10}>۱۰</option>
              <option value={20}>۲۰</option>
              <option value={50}>۵۰</option>
              <option value={100}>۱۰۰</option>
            </select>
          </div>
        </div>

        {/* Hierarchical group filters for persons */}
        <div className="space-y-2">
          <label className={retroHeading}>گروه‌بندی مخاطب (فیلتر سلسله‌مراتبی)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <select
                value={groupL1Filter}
                onChange={(e) => {
                  setGroupL1Filter(e.target.value)
                  setGroupL2Filter('')
                  setGroupL3Filter('')
                }}
                className={`${retroInput} w-full`}
              >
                <option value="">سطح ۱: همه</option>
                {hasUngroupedStore && (
                  <option value={UNGROUPED_KEY}>بدون برچسب</option>
                )}
                {groupLevels.l1.map((g) => (
                  <option key={`pl1-${g}`} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={groupL2Filter}
                onChange={(e) => {
                  setGroupL2Filter(e.target.value)
                  setGroupL3Filter('')
                }}
                className={`${retroInput} w-full`}
                disabled={!childL1ForOptions}
              >
                <option value="">سطح ۲: همه</option>
                {(groupLevels.l2map[childL1ForOptions || ''] || []).map((g) => (
                  <option key={`pl2-${g}`} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={groupL3Filter}
                onChange={(e) => setGroupL3Filter(e.target.value)}
                className={`${retroInput} w-full`}
                disabled={!childL1ForOptions || !groupL2Filter}
              >
                <option value="">سطح ۳: همه</option>
                {(groupLevels.l3map[`${childL1ForOptions}/${groupL2Filter}`] || []).map((g) => (
                  <option key={`pl3-${g}`} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-[11px] text-[#7a6b4f]">
            مسیر انتخاب‌شده: {selectedPathLabel}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
              <thead>
                <tr>
                  <th
                    className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`}
                    onClick={() => handleSort('name')}
                  >
                    نام {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={retroTableHeader}>گروه</th>
                  <th
                    className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`}
                    onClick={() => handleSort('debit')}
                  >
                    بدهکار {sortField === 'debit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`}
                    onClick={() => handleSort('credit')}
                  >
                    بستانکار {sortField === 'credit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`}
                    onClick={() => handleSort('balance')}
                  >
                    مانده {sortField === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={retroTableHeader}>کد</th>
                  <th className={retroTableHeader}>موبایل</th>
                  <th className={retroTableHeader}>سقف اعتبار</th>
                  <th className={retroTableHeader}>شرایط پرداخت</th>
                  <th
                    className={`${retroTableHeader} cursor-pointer hover:bg-[#c5bca5]`}
                    onClick={() => handleSort('created_at')}
                  >
                    تاریخ ثبت {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-[#d9cfb6] hover:bg-[#f6f1df] cursor-pointer"
                    onClick={() => loadPersonLedger(person)}
                  >
                    <td className="px-3 py-2 font-semibold">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{person.name}</span>
                        <span className="text-[10px] px-2 py-[2px] border border-[#c5bca5] bg-[#faf4de] rounded">
                          بدهکار: {formatNumberFa(person.debit || 0)}
                        </span>
                        <span className="text-[10px] px-2 py-[2px] border border-[#c5bca5] bg-[#faf4de] rounded">
                          بستانکار: {formatNumberFa(person.credit || 0)}
                        </span>
                        <span className="text-[10px] px-2 py-[2px] border border-[#c5bca5] bg-[#faf4de] rounded">
                          مانده: {formatNumberFa(Math.abs(person.balance || 0))}
                          {(person.balance || 0) > 0 ? ' بده' : ''}
                          {(person.balance || 0) < 0 ? ' بستان' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {[
                        personGroups[person.id]?.l1 || '',
                        personGroups[person.id]?.l2 || '',
                        personGroups[person.id]?.l3 || '',
                      ]
                        .filter(Boolean)
                        .join('/') || '—'}
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
                    <td className="px-3 py-2 text-xs font-mono">
                      {person.credit_limit != null ? formatNumberFa(person.credit_limit) : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs">{(person as any).payment_terms ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-[#7a6b4f]">
                      {new Date(person.created_at).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex gap-2">
                        <button
                          className="underline text-[var(--retro-heading-text)] hover:text-[var(--retro-button-bg)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPerson(person)
                            setPersonForm({
                              name: person.name,
                              kind: person.kind ?? 'other',
                              mobile: person.mobile ?? '',
                              code: person.code ?? '',
                              description: person.description ?? '',
                              tax_id: (person as any).tax_id ?? '',
                              national_id: (person as any).national_id ?? '',
                              address: (person as any).address ?? '',
                              payment_terms: (person as any).payment_terms ?? '',
                              credit_limit: (person as any).credit_limit
                                ? String((person as any).credit_limit)
                                : '',
                            })
                            const pg = personGroups[person.id] || {}
                            setFormGroupL1(pg.l1 || person.kind || '')
                            setFormGroupL2(pg.l2 || '')
                            setFormGroupL3(pg.l3 || '')
                            setShowForm(true)
                          }}
                        >
                          ویرایش
                        </button>
                        <button
                          className="underline text-red-700 hover:text-red-900"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const confirmed = await confirmDialog({
                              message: 'حذف این مخاطب؟',
                              confirmText: 'حذف',
                              tone: 'danger',
                            })
                            if (!confirmed) return
                            try {
                              await apiDelete(`/api/persons/${person.id}`)
                              setPeople((prev) => prev.filter((p) => p.id !== person.id))
                              toast.success('مخاطب حذف شد')
                            } catch (err) {
                              console.error('Failed to delete person', err)
                              toast.error('حذف مخاطب انجام نشد')
                            }
                          }}
                        >
                          حذف
                        </button>
                        <button
                          className="underline text-[#1f2e3b] hover:text-[#5b4a2f]"
                          onClick={(e) => {
                            e.stopPropagation()
                            openPersonHistory(person)
                          }}
                        >
                          تاریخچه
                        </button>
                      </div>
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

      {historyOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setHistoryOpen(null)}
        >
          <div
            className="w-[520px] max-w-[90vw] bg-[#faf4de] border-2 border-[#c5bca5] shadow-[6px_6px_0_#c5bca5] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-[#1f2e3b]">تاریخچه مخاطب #{historyOpen.personId}</h4>
              <button className={`${retroButton}`} onClick={() => setHistoryOpen(null)}>
                بستن
              </button>
            </div>
            {historyLoading ? (
              <div className="text-xs text-[#7a6b4f]">در حال دریافت تاریخچه...</div>
            ) : historyOpen.items.length ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {historyOpen.items.map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#f8f5ee] px-3 py-2 rounded border border-[#e5ddc5] text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold">{h.user || 'کاربر'}</span>
                      <span className="text-[11px] text-[#7a6b4f]">
                        {h.time ? new Date(h.time).toLocaleDateString('fa-IR') : ''}
                      </span>
                    </div>
                    {h.note && <div className="mt-1 text-[#5b4a2f]">یادداشت: {h.note}</div>}
                    {(h as any).audit_note && (
                      <div className="mt-1 text-[#1f2e3b] font-semibold">
                        توضیح سیستمی: {(h as any).audit_note}
                      </div>
                    )}
                    {h.changes && (
                      <pre className="mt-2 text-[10px] bg-[#f6f1df] px-2 py-1 rounded overflow-x-auto">
                        {JSON.stringify(h.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#7a6b4f]">تاریخچه‌ای ثبت نشده است.</div>
            )}
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${retroPanelPadded} w-full max-h-[90vh] overflow-y-auto space-y-4`}>
            <header className="flex items-center justify-between gap-3 sticky top-0 bg-[#fdf7e6] pb-3 border-b border-[#c5bca5]">
              <div>
                <p className={retroHeading}>گردش حساب</p>
                <h3 className="text-xl font-semibold mt-2">{selectedPerson.name}</h3>
                <p className="text-xs text-[#7a6b4f] mt-1">
                  {(() => {
                    const g = personGroups[selectedPerson.id] || {}
                    const path = [g.l1, g.l2, g.l3].filter(Boolean).join('/')
                    if (path) return `گروه: ${path}`
                    if (selectedPerson.kind) return `نوع: ${selectedPerson.kind}`
                    return ''
                  })()}
                  {selectedPerson.mobile && ` | ${selectedPerson.mobile}`}
                  {selectedPerson.code && ` | کد: ${selectedPerson.code}`}
                  {(selectedPerson as any).tax_id &&
                    ` | کد اقتصادی: ${(selectedPerson as any).tax_id}`}
                  {(selectedPerson as any).national_id &&
                    ` | کد ملی: ${(selectedPerson as any).national_id}`}
                  {(selectedPerson as any).payment_terms &&
                    ` | شرایط پرداخت: ${(selectedPerson as any).payment_terms}`}
                  {(selectedPerson as any).credit_limit != null &&
                    ` | سقف اعتبار: ${formatNumberFa((selectedPerson as any).credit_limit)} ریال`}
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
                    <p
                      className={`text-lg font-semibold ${ledgerData.net_balance > 0 ? 'text-red-700' : ledgerData.net_balance < 0 ? 'text-green-700' : 'text-[#7a6b4f]'}`}
                    >
                      {ledgerData.net_balance === 0
                        ? 'تسویه شده'
                        : `${formatNumberFa(Math.abs(ledgerData.net_balance))} ریال ${ledgerData.net_balance > 0 ? '(بده)' : '(بستان)'}`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
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
                            {ledgerData.entries.map((entry) => (
                              <tr
                                key={entry.id}
                                className="border-b border-[#d9cfb6] hover:bg-[#f6f1df]"
                              >
                                <td className="px-3 py-2 text-xs">
                                  {new Date(entry.entry_date).toLocaleDateString('fa-IR')}
                                </td>
                                <td className="px-3 py-2">
                                  {entry.description}
                                  {entry.invoice && (
                                    <span className="block text-[10px] text-[var(--retro-heading-text)] mt-1">
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
                                    <span className="text-red-700">
                                      {formatNumberFa(entry.amount)}
                                    </span>
                                  ) : (
                                    <span className="text-[#7a6b4f]">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-left font-mono">
                                  {entry.credit_account === 'AccountsReceivable' ? (
                                    <span className="text-green-700">
                                      {formatNumberFa(entry.amount)}
                                    </span>
                                  ) : (
                                    <span className="text-[#7a6b4f]">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-left font-mono font-semibold">
                                  <span
                                    className={
                                      entry.running_balance > 0
                                        ? 'text-red-700'
                                        : entry.running_balance < 0
                                          ? 'text-green-700'
                                          : 'text-[#7a6b4f]'
                                    }
                                  >
                                    {formatNumberFa(Math.abs(entry.running_balance))}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {entry.invoice && (
                                    <button
                                      className="text-[var(--retro-heading-text)] underline hover:text-[var(--retro-button-bg)]"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          const resp = await apiPost<{
                                            token: string
                                            download_url: string
                                            expires_at?: string
                                          }>(`/api/exports/invoice/${entry.invoice!.id}?format=pdf`)
                                          if (resp && resp.download_url) {
                                            window.open(resp.download_url, '_blank')
                                            toast.success('فاکتور در پنجره جدید باز شد')
                                          }
                                        } catch (err) {
                                          console.error('Failed to export invoice', err)
                                          toast.error('صدور فایل فاکتور ممکن نشد')
                                        }
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
                  </div>
                  <div className="space-y-3">
                    <div className="border border-[#bfb69f] bg-[#f6f1df] px-3 py-2">
                      <p className={retroHeading}>یادداشت‌ها / فعالیت‌ها</p>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={newActivityKind}
                          onChange={(e) => setNewActivityKind(e.target.value as any)}
                          className={`${retroInput}`}
                        >
                          <option value="note">یادداشت</option>
                          <option value="call">تماس</option>
                          <option value="sms">پیامک</option>
                          <option value="task">وظیفه</option>
                        </select>
                        <div className="col-span-2">
                          <button
                            className={`${retroButton} w-full`}
                            onClick={async () => {
                              if (!selectedPerson || !newActivity.trim()) return
                              try {
                                const created = await apiPost(
                                  `/api/persons/${selectedPerson.id}/activities`,
                                  {
                                    content: newActivity.trim(),
                                    kind: newActivityKind,
                                  },
                                )
                                setActivities((prev) =>
                                  prev ? [created as any, ...prev] : [created as any],
                                )
                                setNewActivity('')
                                toast.success('فعالیت ثبت شد')
                              } catch (e) {
                                toast.error('ثبت یادداشت ممکن نشد')
                              }
                            }}
                          >
                            ثبت فعالیت
                          </button>
                        </div>
                      </div>
                      <textarea
                        className={`${retroInput} w-full h-24`}
                        placeholder="متن یادداشت..."
                        value={newActivity}
                        onChange={(e) => setNewActivity(e.target.value)}
                      />
                    </div>
                    {loadingActivities ? (
                      <div className="text-xs text-[#7a6b4f]">در حال بارگذاری...</div>
                    ) : actError ? (
                      <div className="text-xs text-red-700">{actError}</div>
                    ) : activities && activities.length > 0 ? (
                      <div className="space-y-2">
                        {activities.map((a) => (
                          <div
                            key={a.id}
                            className="border border-[#c5bca5] bg-[#faf4de] p-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{a.kind || 'یادداشت'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[#7a6b4f]">
                                  {new Date(a.created_at).toLocaleString('fa-IR')}
                                </span>
                                <button
                                  className="text-red-700 hover:text-red-900"
                                  onClick={async () => {
                                    if (!selectedPerson) return
                                    const confirmed = await confirmDialog({
                                      message: 'حذف این یادداشت؟',
                                      confirmText: 'حذف',
                                      tone: 'danger',
                                    })
                                    if (!confirmed) return
                                    try {
                                      await apiDelete(
                                        `/api/persons/${selectedPerson.id}/activities/${a.id}`,
                                      )
                                      setActivities((prev) =>
                                        prev ? prev.filter((x) => x.id !== a.id) : prev,
                                      )
                                      toast.success('یادداشت حذف شد')
                                    } catch (e) {
                                      toast.error('حذف ممکن نشد')
                                    }
                                  }}
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap leading-6">{a.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#7a6b4f]">یادداشتی ثبت نشده است.</div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
