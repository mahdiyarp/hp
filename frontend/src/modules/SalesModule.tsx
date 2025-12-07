import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { formatNumberFa, isoToJalali, toPersianDigits, formatPrice, formatCurrencyFa, numberToPersianWords } from '../utils/num'
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
  direction: string
  party_name: string | null
  amount: number
  status: string
  server_time: string
}

function RelatedPayments({ invoiceId, invoiceNumber }: { invoiceId: number; invoiceNumber: string | null }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!invoiceId) return
    setLoading(true)
    apiGet<Payment[]>(`/api/invoices/${invoiceId}/payments`)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false))
  }, [invoiceId])

  if (loading) return <div className="text-xs text-[#7a6b4f] py-2">در حال بارگذاری پرداخت‌های مرتبط...</div>
  if (payments.length === 0) return null

  return (
    <div className="border-t border-[#c5bca5] pt-3 mt-3">
      <h4 className="text-sm font-semibold text-[#2e2720] mb-2">پرداخت‌های مرتبط با این فاکتور:</h4>
      <div className="space-y-2">
        {payments.map(p => (
          <div key={p.id} className="flex justify-between items-center text-xs bg-[#f8f5ee] px-3 py-2 rounded border border-[#e5ddc5]">
            <div>
              <span className="font-semibold">{toPersianDigits(p.payment_number || `#${p.id}`)}</span>
              {' • '}
              <span className={p.direction === 'in' ? 'text-green-700' : 'text-red-700'}>
                {p.direction === 'in' ? 'دریافت' : 'پرداخت'}
              </span>
            </div>
            <div className="text-left">
              <span className="font-semibold">{formatPrice(p.amount, 'ریال')}</span>
              {' • '}
              <span className="text-[#7a6b4f]">{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Invoice {
  id: number
  invoice_number: string | null
  invoice_type: string
  party_name: string | null
  party_id?: string | null
  total: number | null
  subtotal: number | null
  status: string
  server_time: string
  client_time: string | null
  mode: string
  note?: string | null
  items?: InvoiceItemRow[]
}

type StatusFilter = 'all' | 'draft' | 'final' | 'cancelled'
type TypeFilter = 'all' | 'sale' | 'purchase' | 'proforma'

interface InvoiceItemRow {
  id: number
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total: number
}

type InvoiceItemForm = {
  description: string
  quantity: number
  unit: string
  unit_price: number
  product_id?: string | null
}

type InvoiceFormState = {
  invoice_type: 'sale' | 'purchase' | 'proforma'
  party_name: string
  note: string
  items: InvoiceItemForm[]
}

interface PersonOption {
  id: string
  name: string
  kind?: string | null
}

interface ProductOption {
  id: string
  name: string
  unit?: string | null
  group?: string | null
  inventory?: number | null
  last_purchase_price?: number | null
  avg_purchase_price?: number | null
  last_sale_price?: number | null
  avg_sale_price?: number | null
}

type InvoiceDetail = Invoice & { items: InvoiceItemRow[] }

const emptyItem: InvoiceItemForm = { description: '', quantity: 1, unit: '', unit_price: 0, product_id: undefined }

function computeTimeDeltaSeconds(serverIso: string | null, clientIso: string | null | undefined) {
  if (!serverIso || !clientIso) return null
  const serverMs = Date.parse(serverIso)
  const clientMs = Date.parse(clientIso)
  if (Number.isNaN(serverMs) || Number.isNaN(clientMs)) return null
  return Math.round((clientMs - serverMs) / 1000)
}

export default function SalesModule({ smartDate, sync }: ModuleComponentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  const [invoiceListLimit, setInvoiceListLimit] = useState<number>(() => {
    const raw = localStorage.getItem('sales.pageSize')
    const n = raw ? parseInt(raw) : 5
    return [5,10,20,50].includes(n) ? n : 5
  }) // تعداد فاکتورهای نمایشی (دیفالت ۵)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'number'|'type'|'party'|'total'|'status'|'server_time'>(() => {
    const raw = localStorage.getItem('sales.sort.key')
    const allowed = ['number','type','party','total','status','server_time']
    return (raw && allowed.includes(raw)) ? (raw as any) : 'server_time'
  })
  const [sortDir, setSortDir] = useState<'asc'|'desc'>(() => {
    const raw = localStorage.getItem('sales.sort.dir')
    return raw === 'asc' || raw === 'desc' ? raw : 'desc'
  })
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [auxLoading, setAuxLoading] = useState(false)
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailSuccess, setDetailSuccess] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [recentlyViewedInvoiceId, setRecentlyViewedInvoiceId] = useState<number | null>(null)
  const [autoFinalize, setAutoFinalize] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editNote, setEditNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string | number; user?: string; time: string; changes?: any; note?: string }>>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>({
    invoice_type: 'sale',
    party_name: '',
    note: '',
    items: [{ ...emptyItem }],
  })
  const [nextActionModal, setNextActionModal] = useState<{
    invoiceType: 'sale' | 'purchase'
    invoiceData: {
      id: number
      invoice_number: string | null
      party_name: string
      total: number
      note: string
    }
  } | null>(null)
  const invoiceTypeTitles: Record<InvoiceFormState['invoice_type'], string> = {
    sale: 'فاکتور فروش',
    purchase: 'فاکتور خرید',
    proforma: 'پیش‌فاکتور',
  }

  const pickPriceCandidate = useCallback((candidates: Array<number | null | undefined>) => {
    for (const value of candidates) {
      if (typeof value === 'number' && value > 0) {
        return value
      }
    }
    return 0
  }, [])

  const getSuggestedPrice = useCallback(
    (product: ProductOption | undefined, invoiceType: InvoiceFormState['invoice_type']) => {
      if (!product) return 0
      if (invoiceType === 'purchase') {
        return pickPriceCandidate([
          product.last_purchase_price,
          product.avg_purchase_price,
          product.avg_sale_price,
          product.last_sale_price,
        ])
      }
      // sale & proforma default to sale chain
      return pickPriceCandidate([
        product.last_sale_price,
        product.avg_sale_price,
        product.avg_purchase_price,
        product.last_purchase_price,
      ])
    },
    [pickPriceCandidate],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ invoice_id: number }>
      if (custom.detail?.invoice_id) {
        openInvoiceDetail(custom.detail.invoice_id)
      }
    }
    window.addEventListener('open-invoice-detail', handler)
    return () => window.removeEventListener('open-invoice-detail', handler)
  }, [])

  useEffect(() => {
    loadInvoices()
    loadAuxData()
  }, [])

  async function loadAuxData() {
    setAuxLoading(true)
    try {
      const [personsRes, productsRes] = await Promise.all([
        apiGet<PersonOption[]>('/api/persons').catch(() => []),
        apiGet<ProductOption[]>('/api/products?limit=200').catch(() => []),
      ])
      setPersons(personsRes ?? [])
      setProducts(productsRes ?? [])
    } catch (err) {
      console.warn('Failed to load invoice aux data', err)
    } finally {
      setAuxLoading(false)
    }
  }

  async function loadInvoices(showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Invoice[]>('/api/invoices?limit=200')
      setInvoices(data)
    } catch (err) {
      console.error(err)
      setError('امکان دریافت فاکتورها وجود ندارد.')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const resetForm = (type: InvoiceFormState['invoice_type'] = invoiceForm.invoice_type) => {
    setInvoiceForm({
      invoice_type: type,
      party_name: '',
      note: '',
      items: [{ ...emptyItem }],
    })
    setAutoFinalize(type !== 'proforma')
    setFormError(null)
    setFormSuccess(null)
  }

  const launchForm = (type: InvoiceFormState['invoice_type']) => {
    resetForm(type)
    setShowForm(true)
  }

  const addItem = () => {
    setInvoiceForm(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))
  }

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string) => {
    setInvoiceForm(prev => {
      const items = prev.items.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]:
                field === 'quantity' || field === 'unit_price'
                  ? Number(value)
                  : value,
            }
          : item,
      )
      return { ...prev, items }
    })
  }

  const removeItem = (index: number) => {
    setInvoiceForm(prev => {
      if (prev.items.length === 1) return prev
      const items = prev.items.filter((_, idx) => idx !== index)
      return { ...prev, items }
    })
  }

  const filtered = useMemo(() => {
    const result = invoices
      .filter(inv => {
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
      .sort((a, b) => {
        if (recentlyViewedInvoiceId) {
          if (a.id === recentlyViewedInvoiceId) return -1
          if (b.id === recentlyViewedInvoiceId) return 1
        }
        const base = (() => {
          switch (sortKey) {
            case 'number': {
              const an = (a.invoice_number ?? a.id)?.toString()
              const bn = (b.invoice_number ?? b.id)?.toString()
              return an.localeCompare(bn, 'fa', { sensitivity: 'base' })
            }
            case 'type':
              return (a.invoice_type ?? '').localeCompare(b.invoice_type ?? '', 'fa', { sensitivity: 'base' })
            case 'party':
              return (a.party_name ?? '').localeCompare(b.party_name ?? '', 'fa', { sensitivity: 'base' })
            case 'total':
              return (a.total ?? 0) - (b.total ?? 0)
            case 'status':
              return (a.status ?? '').localeCompare(b.status ?? '', 'fa', { sensitivity: 'base' })
            case 'server_time':
            default: {
              const at = new Date(a.server_time).getTime()
              const bt = new Date(b.server_time).getTime()
              return at - bt
            }
          }
        })()
        return sortDir === 'asc' ? base : -base
      })
      .slice(0, invoiceListLimit)
    return result
  }, [invoices, statusFilter, typeFilter, search, invoiceListLimit, recentlyViewedInvoiceId, sortKey, sortDir])
  useEffect(() => {
    localStorage.setItem('sales.pageSize', String(invoiceListLimit))
  }, [invoiceListLimit])

  useEffect(() => {
    localStorage.setItem('sales.sort.key', sortKey)
    localStorage.setItem('sales.sort.dir', sortDir)
  }, [sortKey, sortDir])

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

  const statusFa: Record<string, string> = {
    draft: 'پیش‌نویس',
    final: 'قطعی',
    cancelled: 'لغو شده',
  }

  const computedSubtotal = useMemo(() => {
    return invoiceForm.items.reduce((acc, item) => {
      const qty = Number(item.quantity || 0)
      const price = Number(item.unit_price || 0)
      return acc + qty * price
    }, 0)
  }, [invoiceForm.items])

  const computeClientTimestamp = () => {
    const now = new Date()
    if (smartDate.isoDate) {
      const parts = smartDate.isoDate.split('-').map(Number)
      if (parts.length === 3 && parts.every(n => !Number.isNaN(n))) {
        const [year, month, day] = parts
        now.setFullYear(year, month - 1, day)
      }
    }
    return now.toISOString()
  }

  const detailTimeDelta = useMemo(
    () =>
      invoiceDetail
        ? computeTimeDeltaSeconds(invoiceDetail.server_time, invoiceDetail.client_time)
        : null,
    [invoiceDetail],
  )

  const openInvoiceDetail = useCallback(async (invoiceId: number) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetailSuccess(null)
    setDetailId(invoiceId)
    setRecentlyViewedInvoiceId(invoiceId)
    try {
      const detail = await apiGet<InvoiceDetail>(`/api/invoices/${invoiceId}`)
      setInvoiceDetail(detail)
      // try load history (optional endpoint)
      setHistoryLoading(true)
      try {
        const hist = await apiGet<Array<{ id: string | number; user?: string; time: string; changes?: any; note?: string }>>(`/api/invoices/${invoiceId}/history`).catch(() => [])
        setHistory(hist ?? [])
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    } catch (err) {
      console.error(err)
      setDetailError('جزئیات فاکتور در دسترس نیست.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeInvoiceDetail = () => {
    setInvoiceDetail(null)
    setDetailError(null)
    setDetailSuccess(null)
    setDetailId(null)
    setRecentlyViewedInvoiceId(null)
    setEditMode(false)
    setEditNote('')
  }

  useEffect(() => {
    const raw = sessionStorage.getItem('hesabpak_global_focus')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.type === 'invoice' && parsed.id !== undefined) {
        sessionStorage.removeItem('hesabpak_global_focus')
        const numericId = Number(parsed.id)
        if (!Number.isNaN(numericId)) {
          openInvoiceDetail(numericId)
        }
      }
    } catch (err) {
      console.warn('Invalid global focus payload', err)
    }
  }, [openInvoiceDetail])

  const finalizeInvoice = async () => {
    if (!invoiceDetail) return
    setFinalizing(true)
    setDetailError(null)
    setDetailSuccess(null)
    try {
      const clientIso = computeClientTimestamp()
      const updated = await apiPost<InvoiceDetail>(
        `/api/invoices/${invoiceDetail.id}/finalize`,
        { client_time: clientIso },
      )
      setInvoiceDetail(updated)
      await loadInvoices(false)
      setDetailSuccess('فاکتور با موفقیت قطعی شد.')
    } catch (err) {
      console.error(err)
      setDetailError('تأیید نهایی فاکتور انجام نشد.')
    } finally {
      setFinalizing(false)
    }
  }

  const exportInvoice = async (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!invoiceDetail) return
    setExporting(true)
    try {
      const res = await apiPost<{ download_url?: string }>(
        `/api/exports/invoice/${invoiceDetail.id}?format=${format}`,
        {},
      )
      if (res?.download_url) {
        window.open(res.download_url, '_blank', 'noopener')
      } else {
        setDetailError('لینک دانلود ایجاد نشد.')
      }
    } catch (err) {
      console.error(err)
      setDetailError('امکان ایجاد خروجی وجود ندارد.')
    } finally {
      setExporting(false)
    }
  }

  const openPrintPreview = () => {
    if (!invoiceDetail) return
    window.open(`/api/prints/invoice/${invoiceDetail.id}`, '_blank', 'noopener')
  }

  async function saveInvoiceEdits() {
    if (!invoiceDetail) return
    setEditing(true)
    setDetailError(null)
    setDetailSuccess(null)
    try {
      const payload: any = {
        invoice_type: invoiceDetail.invoice_type,
        party_name: invoiceDetail.party_name ?? undefined,
        note: invoiceDetail.note ?? undefined,
        items: (invoiceDetail.items ?? []).map(r => ({
          id: r.id,
          description: r.description,
          quantity: r.quantity,
          unit: r.unit ?? undefined,
          unit_price: r.unit_price,
        })),
        audit_note: editNote ? `[ویرایش سیستمی] ${editNote}` : undefined,
        previous_snapshot: invoiceDetail ? JSON.stringify({ id: invoiceDetail.id, party_name: invoiceDetail.party_name, invoice_type: invoiceDetail.invoice_type, note: invoiceDetail.note, items: (invoiceDetail.items ?? []).map(i => ({ id: i.id, description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price })) }) : undefined,
      }
      // Prefer PATCH, fallback to POST update
      let updated: InvoiceDetail | null = null
      try {
        updated = await apiPost<InvoiceDetail>(`/api/invoices/${invoiceDetail.id}`, payload)
      } catch (e1) {
        updated = await apiPost<InvoiceDetail>(`/api/invoices/${invoiceDetail.id}/update`, payload)
      }
      if (!updated) throw new Error('پاسخی از سرور دریافت نشد')
      setInvoiceDetail(updated)
      await loadInvoices(false)
      setDetailSuccess('تغییرات فاکتور ذخیره شد (ثبت سیستمی برای مدیر).')
      setEditMode(false)
      setEditNote('')
    } catch (err) {
      console.error(err)
      setDetailError('ذخیره تغییرات انجام نشد.')
    } finally {
      setEditing(false)
    }
  }

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.party_name.trim()) {
      setFormError('نام طرف حساب را وارد کنید.')
      return
    }
    if (invoiceForm.items.some(item => !item.description.trim())) {
      setFormError('توضیح هر ردیف کالا باید وارد شود.')
      return
    }
    if (invoiceForm.items.some(item => item.quantity <= 0 || item.unit_price <= 0)) {
      setFormError('مقدار و قیمت هر ردیف باید بزرگ‌تر از صفر باشد.')
      return
    }
    let forceShortage = false
    if (invoiceForm.invoice_type === 'sale') {
      const insufficient: string[] = []
      invoiceForm.items.forEach(item => {
        if (!item.product_id) return
        const product = products.find(p => p.id === item.product_id)
        if (!product || typeof product.inventory !== 'number') return
        if (item.quantity > product.inventory) {
          insufficient.push(
            `${product.name} (موجودی: ${formatNumberFa(product.inventory ?? 0)})`,
          )
        }
      })
      if (insufficient.length > 0) {
        const msg = `برای برخی اقلام موجودی کافی نیست:\n${insufficient.join('\n')}\n\nآیا ثبت فاکتور با کسری موجودی انجام شود؟`
        const ok = window.confirm(msg)
        if (!ok) {
          setFormError('ثبت لغو شد. ابتدا موجودی را اصلاح کنید یا مقدار را تغییر دهید.')
          return
        }
        forceShortage = true
      }
    }
    setCreating(true)
    setFormError(null)
    try {
      const clientIso = computeClientTimestamp()
      const payload = {
        invoice_type: invoiceForm.invoice_type,
        mode: forceShortage ? 'shortage' : 'manual',
        party_name: invoiceForm.party_name.trim(),
        note: (invoiceForm.note.trim() + (forceShortage ? ' [کسری موجودی]' : '')).trim() || undefined,
        client_time: clientIso,
        client_calendar: smartDate.jalali ? 'jalali' : 'gregorian',
        items: invoiceForm.items.map(item => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim() || undefined,
          unit_price: Number(item.unit_price),
          product_id: item.product_id || undefined,
        })),
      }
      const created = await apiPost<Invoice>('/api/invoices/manual', payload)
      const selectedType = invoiceForm.invoice_type
      let successMessage =
        selectedType === 'proforma' ? 'پیش‌فاکتور با موفقیت ثبت شد.' : 'فاکتور با موفقیت ثبت شد.'
      if (autoFinalize && selectedType !== 'proforma') {
        try {
          await apiPost<Invoice>(`/api/invoices/${created.id}/finalize`, {
            client_time: clientIso,
          })
          successMessage = 'فاکتور ثبت و قطعی شد.'
        } catch (finalErr) {
          console.error(finalErr)
          setFormError('فاکتور ثبت شد اما تأیید نهایی با خطا مواجه شد.')
        }
      }
      await loadInvoices(false)
      setFormSuccess(successMessage)
      setShowForm(false)
      // بدون ورود به فرایند پرداخت یا دیالوگ‌های بعدی
      resetForm(selectedType)
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('صدور فاکتور با خطا روبه‌رو شد.')
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
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={() => loadInvoices()}>
              بروزرسانی فهرست
            </button>
            <button
              className={retroButton}
              onClick={() => launchForm('sale')}
            >
              صدور فاکتور فروش
            </button>
            <button
              className={retroButton}
              onClick={() => launchForm('purchase')}
            >
              صدور فاکتور خرید
            </button>
            <button className={retroButton} onClick={() => launchForm('proforma')}>
              صدور پیش‌فاکتور
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
            <p className={retroHeading}>کل فروش</p>
            <p className="text-lg font-semibold">{formatPrice(totals.sales || 0, 'ریال')}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>کل خرید</p>
            <p className="text-lg font-semibold">{formatPrice(totals.purchases || 0, 'ریال')}</p>
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

      {showForm && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className={retroHeading}>فرم صدور فاکتور</p>
              <h3 className="text-lg font-semibold mt-2">
                {invoiceTypeTitles[invoiceForm.invoice_type]}
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

          <form className="space-y-4" onSubmit={submitInvoice}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>طرف حساب *</label>
                <input
                  value={invoiceForm.party_name}
                  onChange={e => {
                    const value = e.target.value
                    setInvoiceForm(prev => ({ ...prev, party_name: value }))
                  }}
                  className={`${retroInput} w-full`}
                  placeholder="نام مشتری یا تأمین‌کننده"
                  required
                  list="invoice-persons"
                />
                <datalist id="invoice-persons">
                  {persons.map(person => (
                    <option key={person.id} value={person.name}>
                      {person.kind ? `${person.name} (${person.kind})` : person.name}
                    </option>
                  ))}
                </datalist>
                {auxLoading && (
                  <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری لیست مخاطبین...</p>
                )}
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>نوع فاکتور</label>
                <select
                  value={invoiceForm.invoice_type}
                  onChange={e => {
                    const nextType = e.target.value as InvoiceFormState['invoice_type']
                    setInvoiceForm(prev => ({
                      ...prev,
                      invoice_type: nextType,
                    }))
                    if (nextType === 'proforma') {
                      setAutoFinalize(false)
                    }
                  }}
                  className={`${retroInput} w-full`}
                >
                  <option value="sale">فروش</option>
                  <option value="purchase">خرید</option>
                  <option value="proforma">پیش‌فاکتور</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                value={invoiceForm.note}
                onChange={e => setInvoiceForm(prev => ({ ...prev, note: e.target.value }))}
                className={`${retroInput} w-full h-24`}
                placeholder="یادداشت‌های فاکتور"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className={retroHeading}>ردیف‌های کالا</p>
                <button type="button" className={retroButton} onClick={addItem}>
                  افزودن ردیف
                </button>
              </div>

              {invoiceForm.items.map((item, idx) => {
                const itemSubtotal = item.quantity * item.unit_price
                const priceWords = item.unit_price > 0 ? numberToPersianWords(Math.trunc(item.unit_price)) : ''
                const subtotalWords = itemSubtotal > 0 ? numberToPersianWords(Math.trunc(itemSubtotal)) : ''
                const selectedProduct = item.product_id ? products.find(p => p.id === item.product_id) : undefined
                const hasInventoryValue = typeof selectedProduct?.inventory === 'number'
                const availableInventory = hasInventoryValue ? selectedProduct?.inventory ?? 0 : null
                const saleShortage =
                  invoiceForm.invoice_type === 'sale' &&
                  hasInventoryValue &&
                  typeof availableInventory === 'number' &&
                  availableInventory < item.quantity
                const projectedInventory =
                  typeof availableInventory === 'number'
                    ? invoiceForm.invoice_type === 'sale'
                      ? availableInventory - item.quantity
                      : availableInventory + item.quantity
                    : null
                const suggestedPrice = getSuggestedPrice(selectedProduct, invoiceForm.invoice_type)

                return (
                  <div
                    key={idx}
                    className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_0.8fr_1.2fr_1fr_0.8fr_0.8fr] gap-3 items-start">
                      <div className="space-y-2">
                        <label className={retroHeading}>شرح کالا *</label>
                        <input
                          value={item.description}
                          onChange={e => {
                            const value = e.target.value
                            updateItem(idx, 'description', value)
                            const matched = products.find(
                              prod => prod.name === value || prod.id === value,
                            )
                            if (matched) {
                              setInvoiceForm(prev => {
                                const items = prev.items.map((row, rowIndex) =>
                                  rowIndex === idx
                                    ? {
                                        ...row,
                                        unit: matched.unit || row.unit,
                                        product_id: matched.id || row.product_id,
                                        unit_price:
                                          row.unit_price && row.unit_price > 0
                                            ? row.unit_price
                                            : (() => {
                                                const suggestion = getSuggestedPrice(
                                                  matched,
                                                  prev.invoice_type,
                                                )
                                                return suggestion > 0 ? suggestion : row.unit_price
                                              })(),
                                      }
                                    : row,
                                )
                                return { ...prev, items }
                              })
                            }
                          }}
                          className={`${retroInput} w-full`}
                          placeholder="نام یا توضیح کالا"
                          required
                          list={`invoice-product-${idx}`}
                        />
                        <datalist id={`invoice-product-${idx}`}>
                          {products.map(prod => (
                            <option key={prod.id} value={prod.name}>
                              {prod.group ? `${prod.name} (${prod.group})` : prod.name}
                            </option>
                          ))}
                        </datalist>
                        {selectedProduct && (
                          <div className="text-[10px] space-y-2 bg-[#f6f1df] p-2 rounded border border-dashed border-[#c5bca5]">
                            <div className="space-y-1">
                              <div className="font-semibold text-[#154b5f] border-b border-dashed border-[#c5bca5] pb-1">
                                📦 وضعیت موجودی
                              </div>
                              <div>
                                موجودی فعلی:{' '}
                                <span className="font-semibold">
                                  {typeof availableInventory === 'number'
                                    ? formatNumberFa(availableInventory)
                                    : '---'}
                                </span>{' '}
                                {selectedProduct.unit || 'عدد'}
                              </div>
                              {typeof projectedInventory === 'number' && (
                                <div className="text-[#7a6b4f]">
                                  پس از قطعی تقریبی: {formatNumberFa(Math.max(projectedInventory, 0))}{' '}
                                  {selectedProduct.unit || 'عدد'}
                                </div>
                              )}
                              {invoiceForm.invoice_type === 'sale' && saleShortage && (
                                <div className="text-[#7a0000] font-semibold">
                                  موجودی ناکافی برای این ردیف است.
                                </div>
                              )}
                              {invoiceForm.invoice_type === 'sale' &&
                                !saleShortage &&
                                typeof availableInventory === 'number' &&
                                availableInventory <= 5 && (
                                  <div className="text-[#8a4d2c]">
                                    ⚠️ موجودی رو به اتمام است.
                                  </div>
                                )}
                            </div>
                            <div className="space-y-1">
                              <div className="font-semibold text-[#154b5f] border-b border-dashed border-[#c5bca5] pb-1">
                                💰 تاریخچه قیمت‌ها:
                              </div>
                              {selectedProduct.last_sale_price && (
                                <div>
                                  🔹 آخرین فروش:{' '}
                                  <span className="font-semibold">
                                    {formatNumberFa(selectedProduct.last_sale_price)}
                                  </span>{' '}
                                  ریال
                                </div>
                              )}
                              {selectedProduct.avg_sale_price && (
                                <div>
                                  📊 میانگین فروش:{' '}
                                  <span className="font-semibold">
                                    {formatNumberFa(selectedProduct.avg_sale_price)}
                                  </span>{' '}
                                  ریال
                                </div>
                              )}
                              {selectedProduct.last_purchase_price && (
                                <div>
                                  🔹 آخرین خرید:{' '}
                                  <span className="font-semibold">
                                    {formatNumberFa(selectedProduct.last_purchase_price)}
                                  </span>{' '}
                                  ریال
                                </div>
                              )}
                              {selectedProduct.avg_purchase_price && (
                                <div>
                                  📊 میانگین خرید:{' '}
                                  <span className="font-semibold">
                                    {formatNumberFa(selectedProduct.avg_purchase_price)}
                                  </span>{' '}
                                  ریال
                                </div>
                              )}
                              {!selectedProduct.last_sale_price &&
                                !selectedProduct.avg_sale_price &&
                                !selectedProduct.last_purchase_price &&
                                !selectedProduct.avg_purchase_price && (
                                  <div className="text-[#7a6b4f] italic">
                                    هنوز تاریخچه قیمتی ندارد
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>تعداد *</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className={`${retroInput} w-full h-10 text-center`}
                        />
                        {selectedProduct && typeof availableInventory === 'number' && (
                          <div
                            className={`text-[11px] ${
                              saleShortage ? 'text-[#7a0000]' : 'text-[#154b5f]'
                            }`}
                          >
                            {saleShortage
                              ? `نیاز ${formatNumberFa(item.quantity)} در برابر موجودی ${formatNumberFa(
                                  availableInventory,
                                )}`
                              : `موجودی: ${formatNumberFa(availableInventory)} ${selectedProduct.unit || 'عدد'}`}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>قیمت واحد (ریال) *</label>
                        <div className="space-y-1">
                          <input
                            type="number"
                            min={1}
                            value={item.unit_price}
                            onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                            className={`${retroInput} w-full h-10 font-[Yekan] text-center text-lg`}
                            style={{ fontFamily: 'Yekan' }}
                          />
                          <div className="text-xs text-[#7a6b4f] bg-[#f6f1df] px-2 py-1 rounded text-center">
                            {formatNumberFa(item.unit_price)}
                          </div>
                          {item.unit_price > 0 && (
                            <div className="text-[10px] text-[#7a6b4f] italic bg-[#faf4de] px-2 py-0.5 rounded border border-dashed border-[#c5bca5]">
                              {priceWords} ریال
                            </div>
                          )}
                          {selectedProduct && suggestedPrice > 0 && (
                            <div className="text-[10px] text-[#1f2e3b] bg-[#e2eef7] px-2 py-1 rounded border border-dashed border-[#154b5f]">
                              پیشنهاد بر اساس سوابق: {formatNumberFa(suggestedPrice)} ریال
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>کل (تعداد × قیمت)</label>
                        <div className="space-y-1">
                          <div className="border-2 border-[#154b5f] bg-[#e8f2f7] px-3 py-2 rounded font-bold text-center font-[Yekan]" style={{ fontFamily: 'Yekan' }}>
                            {formatNumberFa(itemSubtotal)}
                          </div>
                          {itemSubtotal > 0 && (
                            <div className="text-[10px] text-[#154b5f] italic bg-[#e8f2f7] px-2 py-0.5 rounded border border-dashed border-[#154b5f]">
                              {subtotalWords} ریال
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>واحد</label>
                        <input
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                          className={`${retroInput} w-full h-10 text-center`}
                          placeholder="عدد / بسته ..."
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className={`${retroButton} !bg-[#c35c5c] w-full`}
                          onClick={() => removeItem(idx)}
                          disabled={invoiceForm.items.length === 1}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-2 border-[#154b5f] bg-[#e2eef7] px-4 py-4 rounded text-center space-y-2 shadow-[4px_4px_0_#154b5f]">
              <p className={`${retroHeading} text-[#1f2e3b]`}>💰 جمع کل فاکتور</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="border border-[#b7cde2] bg-[#f4f9ff] px-3 py-2 rounded">
                  <div className="text-[#1f2e3b]">جمع ردیف‌ها</div>
                  <div className="font-bold font-[Yekan]" style={{ fontFamily: 'Yekan' }}>{formatNumberFa(computedSubtotal || 0)}</div>
                </div>
                <div className="border border-[#b7cde2] bg-[#f4f9ff] px-3 py-2 rounded">
                  <div className="text-[#1f2e3b]">تخفیف</div>
                  <div className="font-bold font-[Yekan]" style={{ fontFamily: 'Yekan' }}>{formatNumberFa(0)}</div>
                </div>
                <div className="border border-[#b7cde2] bg-[#f4f9ff] px-3 py-2 rounded">
                  <div className="text-[#1f2e3b]">مالیات</div>
                  <div className="font-bold font-[Yekan]" style={{ fontFamily: 'Yekan' }}>{formatNumberFa(0)}</div>
                </div>
              </div>
              <div className="border-2 border-[#1f2e3b] bg-[#cfe2f3] px-4 py-3 rounded text-center">
                <div className="text-[#1f2e3b]">مبلغ نهایی</div>
                <div className="text-2xl font-bold font-[Yekan]" style={{ fontFamily: 'Yekan' }}>{formatNumberFa(computedSubtotal || 0)}</div>
                <div className="text-[11px] text-[#1f2e3b] italic mt-1">
                  {computedSubtotal > 0 ? numberToPersianWords(Math.trunc(computedSubtotal)) + ' ریال' : ''}
                </div>
              </div>
            </div>

            <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
              توجه: این مبلغ قبل از اعمال هرگونه کسر یا افزایش‌های احتمالی است.
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>تنظیمات صدور</label>
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 rounded-sm text-sm space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoFinalize}
                    disabled={invoiceForm.invoice_type === 'proforma'}
                    onChange={e => setAutoFinalize(e.target.checked)}
                  />
                  <span>پس از ثبت، فاکتور قطعی شود</span>
                </label>
                {invoiceForm.invoice_type === 'proforma' && (
                  <p className="text-[11px] text-[#7a6b4f]">
                    پیش‌فاکتور به‌صورت پیش‌فرض قطعی نمی‌شود. برای قطعی‌سازی، پس از تایید مشتری از طریق جزئیات فاکتور اقدام کنید.
                  </p>
                )}
              </div>
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
                {creating ? 'در حال ثبت...' : 'ثبت فاکتور'}
              </button>
              <button
                type="button"
                className={`${retroButton} !bg-[#5b4a2f]`}
                onClick={() => resetForm()}
                disabled={creating}
              >
                پاک‌سازی فرم
              </button>
            </div>
          </form>
        </section>
      )}

      {!showForm && (detailLoading || invoiceDetail || detailError) && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className={retroHeading}>جزئیات فاکتور</p>
              {invoiceDetail ? (
                <>
                  <h3 className="text-lg font-semibold mt-1">
                    {toPersianDigits(invoiceDetail.invoice_number || `#${invoiceDetail.id}`)}
                  </h3>
                  <p className={`text-xs ${retroMuted} mt-2`}>
                    طرف حساب: {invoiceDetail.party_name ?? 'نامشخص'} | وضعیت: {statusFa[invoiceDetail.status] ?? invoiceDetail.status}
                  </p>
                </>
              ) : (
                <h3 className="text-lg font-semibold mt-1">در انتظار بارگذاری...</h3>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {invoiceDetail && (
                <>
                  {(invoiceDetail as any).tracking_code && (
                    <button
                      className={`${retroButton} !bg-purple-700 text-[11px]`}
                      onClick={() => {
                        const code = (invoiceDetail as any).tracking_code
                        window.open(`/trace/${code}`, '_blank')
                      }}
                    >
                      🔍 ردگیری
                    </button>
                  )}
                  {invoiceDetail.status !== 'final' && (
                    <button
                      className={`${retroButton} !bg-[#2d5b2d] text-[11px]`}
                      onClick={finalizeInvoice}
                      disabled={finalizing}
                    >
                      {finalizing ? 'در حال تأیید...' : 'تأیید نهایی'}
                    </button>
                  )}
                  <button
                    className={`${retroButton} !bg-[#1f2e3b] text-[11px]`}
                    onClick={openPrintPreview}
                  >
                    نسخه چاپی
                  </button>
                  <button
                    className={`${retroButton} text-[11px]`}
                    disabled={exporting}
                    onClick={() => exportInvoice('pdf')}
                  >
                    {exporting ? '...' : 'خروجی PDF'}
                  </button>
                  <button
                    className={`${retroButton} text-[11px]`}
                    disabled={exporting}
                    onClick={() => exportInvoice('xlsx')}
                  >
                    خروجی Excel
                  </button>
                </>
              )}
              <button className={`${retroButton} !bg-[#c35c5c] text-[11px]`} onClick={closeInvoiceDetail}>
                بستن
              </button>
            </div>
          </header>
          {detailLoading && !invoiceDetail && (
            <div className="text-center py-6 text-sm text-[#7a6b4f]">در حال دریافت جزئیات...</div>
          )}
          {detailError && (
            <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
              {detailError}
            </div>
          )}
          {detailSuccess && (
            <div className="border-2 border-[#4f704f] bg-[#e7f4e7] text-[#295329] px-3 py-2 shadow-[3px_3px_0_#4f704f] text-sm">
              {detailSuccess}
            </div>
          )}
          {invoiceDetail && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#2e2720]">
                <div className="border border-dashed border-[#c5bca5] px-3 py-2 rounded-sm">
                  <p className={retroHeading}>مهر زمانی سرور</p>
                  <p className="mt-1">{isoToJalali(invoiceDetail.server_time)}</p>
                  <p className={`text-[11px] ${retroMuted} mt-1`}>
                    UTC: {invoiceDetail.server_time.slice(0, 19).replace('T', ' ')}
                  </p>
                </div>
                <div className="border border-dashed border-[#c5bca5] px-3 py-2 rounded-sm">
                  <p className={retroHeading}>مهر زمانی کلاینت</p>
                  <p className="mt-1">
                    {invoiceDetail.client_time ? isoToJalali(invoiceDetail.client_time) : '---'}
                  </p>
                  <p className={`text-[11px] ${retroMuted} mt-1`}>
                    {invoiceDetail.client_time
                      ? `UTC: ${invoiceDetail.client_time.slice(0, 19).replace('T', ' ')}`
                      : '---'}
                  </p>
                  <p className={`text-[11px] ${retroMuted} mt-1`}>
                    اختلاف ثبت: {detailTimeDelta === null ? '---' : `${formatNumberFa(detailTimeDelta)} ثانیه`}
                  </p>
                </div>
              </div>
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 rounded-sm text-xs">
                <p className={retroHeading}>تاریخچه و امضاها</p>
                {historyLoading ? (
                  <p className="mt-1 text-[#7a6b4f]">در حال دریافت تاریخچه...</p>
                ) : history.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {history.map(h => (
                      <div key={h.id} className="bg-[#f8f5ee] px-2 py-2 rounded border border-[#e5ddc5]">
                        <div className="flex justify-between">
                          <span className="font-semibold">{h.user || 'کاربر'}</span>
                          <span className="text-[11px] text-[#7a6b4f]">{h.time ? isoToJalali(h.time) : ''}</span>
                        </div>
                        {h.note && (
                          <div className="text-[11px] text-[#5b4a2f] mt-1">یادداشت: {h.note}</div>
                        )}
                        {(h as any).audit_note && (
                          <div className="text-[11px] text-[#1f2e3b] font-semibold mt-1">توضیح سیستمی: {(h as any).audit_note}</div>
                        )}
                        {h.changes && (
                          <pre className="mt-2 text-[10px] bg-[#f6f1df] px-2 py-1 rounded overflow-x-auto">{JSON.stringify(h.changes, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[#7a6b4f]">تاریخچه‌ای ثبت نشده است.</p>
                )}
              </div>
              {invoiceDetail.note && (
                <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
                  یادداشت: {invoiceDetail.note}
                </div>
              )}
              <div className="overflow-x-auto">
                {!editMode ? (
                  <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                    <thead>
                      <tr>
                        <th className={retroTableHeader}>شرح</th>
                        <th className={retroTableHeader}>تعداد</th>
                        <th className={retroTableHeader}>واحد</th>
                        <th className={retroTableHeader}>قیمت واحد</th>
                        <th className={retroTableHeader}>مبلغ ردیف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoiceDetail.items ?? []).map(item => {
                        const itemTotal = (item.quantity ?? 0) * (item.unit_price ?? 0)
                        return (
                          <tr key={item.id} className="border-b border-[#d9cfb6]">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-left font-[Yekan]">{formatNumberFa(item.quantity)}</td>
                            <td className="px-3 py-2 text-left">{item.unit ?? '-'}</td>
                            <td className="px-3 py-2 text-left">
                              <div className="font-[Yekan]">{formatCurrencyFa(item.unit_price, 'ریال', false).numeric}</div>
                              {item.unit_price > 0 && (
                                <div className="text-[10px] text-[#7a6b4f] italic">{numberToPersianWords(Math.trunc(item.unit_price))} ریال</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-left">
                              <div className="font-bold font-[Yekan] text-[#154b5f]">{formatCurrencyFa(itemTotal, 'ریال', false).numeric}</div>
                              {itemTotal > 0 && (
                                <div className="text-[10px] text-[#154b5f] italic">{numberToPersianWords(Math.trunc(itemTotal))} ریال</div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={retroHeading}>طرف حساب</label>
                        <input
                          value={invoiceDetail.party_name ?? ''}
                          onChange={e => setInvoiceDetail(prev => prev ? { ...prev, party_name: e.target.value } : prev)}
                          className={`${retroInput} w-full`}
                          placeholder="نام مشتری/تأمین‌کننده"
                          list="edit-persons"
                        />
                        <datalist id="edit-persons">
                          {persons.map(person => (
                            <option key={person.id} value={person.name}>
                              {person.kind ? `${person.name} (${person.kind})` : person.name}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>یادداشت چاپی</label>
                        <input
                          value={invoiceDetail.note ?? ''}
                          onChange={e => setInvoiceDetail(prev => prev ? { ...prev, note: e.target.value } : prev)}
                          className={`${retroInput} w-full`}
                          placeholder="یادداشت فاکتور"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={retroHeading}>نوع فاکتور</label>
                        <select
                          value={invoiceDetail.invoice_type}
                          onChange={e => setInvoiceDetail(prev => prev ? { ...prev, invoice_type: e.target.value } as InvoiceDetail : prev)}
                          className={`${retroInput} w-full`}
                        >
                          <option value="sale">فروش</option>
                          <option value="purchase">خرید</option>
                          <option value="proforma">پیش‌فاکتور</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading}>افزودن ردیف</label>
                        <button className={retroButton} onClick={(e) => {
                          e.preventDefault()
                          setInvoiceDetail(prev => prev ? { ...prev, items: [...(prev.items ?? []), { id: Date.now(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 }] } : prev)
                        }}>افزودن ردیف کالا</button>
                      </div>
                    </div>
                    {(invoiceDetail.items ?? []).map((item, idx) => {
                      const itemTotal = (item.quantity ?? 0) * (item.unit_price ?? 0)
                      return (
                        <div key={item.id} className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_0.8fr_1fr_1fr] gap-3 items-start">
                            <div className="space-y-2">
                              <label className={retroHeading}>شرح</label>
                              <input
                                value={item.description}
                                onChange={e => setInvoiceDetail(prev => prev ? { ...prev, items: (prev.items ?? []).map(it => it.id === item.id ? { ...it, description: e.target.value } : it) } : prev)}
                                className={`${retroInput} w-full`}
                                list={`edit-product-${idx}`}
                              />
                              <datalist id={`edit-product-${idx}`}>
                                {products.map(prod => (
                                  <option key={prod.id} value={prod.name}>
                                    {prod.group ? `${prod.name} (${prod.group})` : prod.name}
                                  </option>
                                ))}
                              </datalist>
                            </div>
                            <div className="space-y-2">
                              <label className={retroHeading}>تعداد</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => setInvoiceDetail(prev => prev ? { ...prev, items: (prev.items ?? []).map(it => it.id === item.id ? { ...it, quantity: Number(e.target.value) } : it) } : prev)}
                                className={`${retroInput} w-full h-10 text-center`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={retroHeading}>واحد</label>
                              <input
                                value={item.unit ?? ''}
                                onChange={e => setInvoiceDetail(prev => prev ? { ...prev, items: (prev.items ?? []).map(it => it.id === item.id ? { ...it, unit: e.target.value } : it) } : prev)}
                                className={`${retroInput} w-full h-10 text-center`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={retroHeading}>قیمت واحد (ریال)</label>
                              <input
                                type="number"
                                min={1}
                                value={item.unit_price}
                                onChange={e => setInvoiceDetail(prev => prev ? { ...prev, items: (prev.items ?? []).map(it => it.id === item.id ? { ...it, unit_price: Number(e.target.value) } : it) } : prev)}
                                className={`${retroInput} w-full h-10 text-center`}
                              />
                              <div className="text-xs text-[#7a6b4f] bg-[#f6f1df] px-2 py-1 rounded text-center">
                                {formatNumberFa(itemTotal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="space-y-2">
                      <label className={retroHeading}>توضیح سیستمی برای مدیر (غیرچاپی)</label>
                      <textarea
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        className={`${retroInput} w-full h-20`}
                        placeholder="توضیح تغییرات؛ برای مدیر قابل مشاهده است و در چاپ نمی‌آید"
                      />
                      <div className="flex gap-2">
                        <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={saveInvoiceEdits} disabled={editing}>
                          {editing ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                        <button className={`${retroButton}`} onClick={() => { setEditMode(false); setEditNote('') }}>
                          انصراف از ویرایش
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!editMode && (
                <div className="flex justify-end">
                  <button className={`${retroButton}`} onClick={() => setEditMode(true)}>ویرایش فاکتور</button>
                </div>
              )}
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-sm text-[#2e2720] rounded-sm space-y-1">
                <p>جمع کل قبل از مالیات: {formatPrice(invoiceDetail.subtotal ?? 0, 'ریال')}</p>
                <p>مبلغ کل نهایی: {formatPrice(invoiceDetail.total ?? 0, 'ریال')}</p>
              </div>

              {invoiceDetail && (
                <RelatedPayments invoiceId={invoiceDetail.id} invoiceNumber={invoiceDetail.invoice_number} />
              )}
            </>
          )}
        </section>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
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
          <div className="space-y-2">
            <label className={retroHeading}>تعداد نمایشی</label>
            <select
              value={invoiceListLimit}
              onChange={e => setInvoiceListLimit(parseInt(e.target.value))}
              className={`${retroInput} w-full`}
            >
              <option value={5}>۵</option>
              <option value={10}>۱۰</option>
              <option value={20}>۲۰</option>
              <option value={50}>۵۰</option>
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
          {formatNumberFa(filtered.length)} فاکتور (جدیدترین {formatNumberFa(invoiceListLimit)} فاکتور از {formatNumberFa(invoices.length)}) نمایش داده می‌شود.
        </div>

        {filtered.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>
                  <button className="underline" onClick={() => { if (sortKey==='number') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('number') }}>
                    شماره {sortKey==='number' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className={retroTableHeader}>
                  <button className="underline" onClick={() => { if (sortKey==='type') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('type') }}>
                    نوع {sortKey==='type' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className={retroTableHeader}>
                  <button className="underline" onClick={() => { if (sortKey==='party') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('party') }}>
                    طرف حساب {sortKey==='party' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className={retroTableHeader}>
                  <button className="underline" onClick={() => { if (sortKey==='total') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('total') }}>
                    مبلغ {sortKey==='total' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className={retroTableHeader}>
                  <button className="underline" onClick={() => { if (sortKey==='status') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('status') }}>
                    وضعیت {sortKey==='status' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className={retroTableHeader}>
                  <div className="flex items-center gap-2">
                    <button className="underline" onClick={() => { if (sortKey==='server_time') setSortDir(d=> d==='asc'?'desc':'asc'); else setSortKey('server_time') }}>
                      زمان‌ها {sortKey==='server_time' ? (sortDir==='asc' ? '↑' : '↓') : ''}
                    </button>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="text-xs border border-[#c5bca5] rounded px-1 py-0.5">
                      <option value="asc">صعودی</option>
                      <option value="desc">نزولی</option>
                    </select>
                  </div>
                </th>
                <th className={retroTableHeader}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {toPersianDigits(inv.invoice_number || `#${inv.id}`)}
                    <span className="block text-[10px] text-[#7a6b4f] mt-1">حالت: {inv.mode}</span>
                    {(inv as any).tracking_code && (
                      <span className="block text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 mt-1 rounded w-fit">
                        📍 {(inv as any).tracking_code}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={
                      inv.invoice_type === 'sale'
                        ? 'text-green-700 font-semibold'
                        : inv.invoice_type === 'purchase'
                        ? 'text-blue-700 font-semibold'
                        : 'text-gray-600 italic'
                    }>
                      {invoiceTypeTitles[inv.invoice_type as InvoiceFormState['invoice_type']] || inv.invoice_type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{inv.party_name ?? 'نامشخص'}</td>
                  <td className="px-3 py-2 text-left">
                    {formatCurrencyFa(inv.total || 0, 'ریال', false).numeric} <span className="text-xs">ریال</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge}`}>{statusFa[inv.status] ?? inv.status}</span>
                  </td>
                  <td className="px-3 py-2 text-left space-y-1">
                    <p>سرور: {inv.server_time ? isoToJalali(inv.server_time) : '-'}</p>
                    <p className="text-[11px] text-[#7a6b4f]">کلاینت: {inv.client_time ? isoToJalali(inv.client_time) : '---'}</p>
                  </td>
                  <td className="px-3 py-2 text-left">
                    <button
                      className={`${retroButton} text-[11px]`}
                      onClick={() => openInvoiceDetail(inv.id)}
                    >
                      مشاهده
                    </button>
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

      {nextActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setNextActionModal(null)}>
          <div className={`${retroPanel} max-w-md w-full mx-4 p-6 space-y-4`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-[#2e2720]">فاکتور با موفقیت ثبت شد</h3>
              <p className="text-sm text-[#7a6b4f]">شماره فاکتور: {nextActionModal.invoiceData.invoice_number}</p>
            </div>
            <div className="border-t border-[#c5bca5] pt-4 space-y-3">
              <p className="text-sm text-[#2e2720] text-center">
                {nextActionModal.invoiceType === 'sale' 
                  ? 'آیا می‌خواهید سند دریافت ثبت کنید؟' 
                  : 'آیا می‌خواهید سند پرداخت ثبت کنید؟'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`${retroButton} !bg-[#2d5b2d] text-sm`}
                  onClick={() => {
                    const data = nextActionModal.invoiceData
                    setNextActionModal(null)
                    
                    // First switch to finance module
                    const switchEvent = new CustomEvent('switch-module', { detail: { module: 'finance' } })
                    window.dispatchEvent(switchEvent)
                    
                    // Then prefill the form after module is mounted (100ms delay)
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('finance-prefill', {
                        detail: {
                          invoice_id: data.id,
                          direction: nextActionModal.invoiceType === 'sale' ? 'in' : 'out',
                          party_name: data.party_name,
                          amount: data.total,
                          reference: data.invoice_number,
                          note: data.note || `بابت فاکتور ${data.invoice_number}`,
                        }
                      }))
                    }, 100)
                  }}
                >
                  {nextActionModal.invoiceType === 'sale' ? 'ثبت دریافت' : 'ثبت پرداخت'}
                </button>
                <button
                  className={`${retroButton} !bg-[#5b4a2f] text-sm`}
                  onClick={() => {
                    setNextActionModal(null)
                    resetForm(nextActionModal.invoiceType)
                  }}
                >
                  ادامه صدور فاکتور
                </button>
              </div>
              <button
                className="w-full text-xs text-[#7a6b4f] hover:text-[#2e2720] transition py-2"
                onClick={() => setNextActionModal(null)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
