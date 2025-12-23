import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import {
  listSaleOrders,
  finalizeSaleOrder,
  createSaleOrder,
  exportSaleOrder,
  type SaleOrder,
} from '../services/saleOrders'
import DocumentRow, { DocumentTableHeader } from '../components/DocumentRow'
import {
  formatNumberFa,
  isoToJalali,
  toPersianDigits,
  formatPrice,
  formatCurrencyFa,
  numberToPersianWords,
} from '../utils/num'
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
import '../styles/sales-dashboard.css'
import { toast } from '../utils/toast'

interface Payment {
  id: number
  payment_number: string | null
  direction: string
  party_name: string | null
  amount: number
  status: string
  server_time: string
}

function RelatedPayments({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: number
  invoiceNumber: string | null
}) {
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

  if (loading)
    return <div className="text-xs text-[#7a6b4f] py-2">در حال بارگذاری پرداخت‌های مرتبط...</div>
  if (payments.length === 0) return null

  return (
    <div className="border-t border-[#c5bca5] pt-3 mt-3">
      <h4 className="text-sm font-semibold text-[#2e2720] mb-2">پرداخت‌های مرتبط با این فاکتور:</h4>
      <div className="space-y-2">
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center text-xs bg-[#f8f5ee] px-3 py-2 rounded border border-[#e5ddc5]"
          >
            <div>
              <span className="font-semibold">
                {toPersianDigits(p.payment_number || `#${p.id}`)}
              </span>
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

const emptyItem: InvoiceItemForm = {
  description: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  product_id: undefined,
}

function computeTimeDeltaSeconds(serverIso: string | null, clientIso: string | null | undefined) {
  if (!serverIso || !clientIso) return null
  const serverMs = Date.parse(serverIso)
  const clientMs = Date.parse(clientIso)
  if (Number.isNaN(serverMs) || Number.isNaN(clientMs)) return null
  return Math.round((clientMs - serverMs) / 1000)
}

export default function SalesModule({ smartDate, sync, onNavigate }: ModuleComponentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceListLimit, setInvoiceListLimit] = useState(5) // تعداد فاکتورهای نمایشی (دیفالت 5)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'invoices' | 'saleOrders'>('invoices')
  const [showSaleOrderForm, setShowSaleOrderForm] = useState(false)
  const [creatingSaleOrder, setCreatingSaleOrder] = useState(false)
  const [saleOrderAutoFinalize, setSaleOrderAutoFinalize] = useState(true)
  const [saleOrderFormError, setSaleOrderFormError] = useState<string | null>(null)
  const [saleOrderFormSuccess, setSaleOrderFormSuccess] = useState<string | null>(null)
  const emptySoItem = {
    description: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    product_id: null as string | null,
  }
  const [saleOrderItems, setSaleOrderItems] = useState<Array<typeof emptySoItem>>([
    { ...emptySoItem },
  ])
  const [saleOrderPartyName, setSaleOrderPartyName] = useState('')
  const [saleOrderNote, setSaleOrderNote] = useState('')
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([])
  const [salesSummary, setSalesSummary] = useState<any | null>(null)
  const [topCustomers, setTopCustomers] = useState<
    Array<{ party_id: string; party_name: string | null; total: number }>
  >([])
  const [salesTrendSeries, setSalesTrendSeries] = useState<Array<{ day: string; total: number }>>(
    [],
  )
  const salesTrendMax = useMemo(() => {
    if (!salesTrendSeries.length) return 0
    return salesTrendSeries.reduce((maxValue, point) => Math.max(maxValue, point.total), 0)
  }, [salesTrendSeries])
  const getTrendHeightClass = (value: number) => {
    if (salesTrendMax <= 0 || value <= 0) return 'sales-trend-bar-height-0'
    const bucket = Math.min(10, Math.max(1, Math.round((value / salesTrendMax) * 10)))
    return `sales-trend-bar-height-${bucket}`
  }
  const [salesKpiLoading, setSalesKpiLoading] = useState(false)
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

  function PartySelectorInline({
    onSelect,
  }: {
    onSelect: (p: { id: string; name: string; mobile?: string }) => void
  }) {
    const [q, setQ] = useState('')
    const [items, setItems] = useState<Array<{ id: string; name: string; mobile?: string }>>([])
    const [loading, setLoading] = useState(false)
    const [quickCreateOpen, setQuickCreateOpen] = useState(false)
    const [quickName, setQuickName] = useState('')
    const [quickMobile, setQuickMobile] = useState('')
    const [quickBusy, setQuickBusy] = useState(false)
    const [quickError, setQuickError] = useState<string | null>(null)
    async function search(s: string) {
      setLoading(true)
      try {
        const res = await apiGet<Array<any>>(`/api/people/search?q=${encodeURIComponent(s)}`)
        setItems(res as any)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    useEffect(() => {
      search('')
    }, [])

    const submitQuickCreate = async () => {
      const trimmedName = quickName.trim()
      if (!trimmedName) {
        setQuickError('نام طرف حساب لازم است')
        return
      }
      setQuickBusy(true)
      setQuickError(null)
      try {
        const payload = {
          name: trimmedName,
          mobile: quickMobile.trim() || undefined,
          kind: 'customer',
        }
        const p = await apiPost('/api/people/quick-create', payload)
        onSelect(p as any)
        toast.success('طرف‌حساب جدید ساخته شد')
        setQuickName('')
        setQuickMobile('')
        setQuickCreateOpen(false)
      } catch (err: any) {
        const message = err?.message || 'ایجاد سریع ناموفق بود'
        setQuickError(message)
        toast.error(message)
      } finally {
        setQuickBusy(false)
      }
    }
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className={`${retroInput} flex-1`}
            placeholder="جستجوی طرف‌حساب"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              search(e.target.value)
            }}
          />
          <button
            className={retroButton}
            onClick={async () => {
              try {
                const p = await apiPost('/api/people/from-user', {})
                onSelect(p as any)
              } catch {}
            }}
          >
            از کاربر
          </button>
          <button
            className={retroButton}
            type="button"
            onClick={() => {
              setQuickCreateOpen((prev) => !prev)
              setQuickError(null)
            }}
          >
            ایجاد سریع
          </button>
          <button
            className={retroButton}
            onClick={async () => {
              setLoading(true)
              try {
                const res = await apiGet<Array<any>>(
                  `/api/public/counterparties?q=${encodeURIComponent(q)}`,
                )
                setItems(res as any)
              } catch {
                setItems([])
              } finally {
                setLoading(false)
              }
            }}
          >
            نمایه‌های پابلیک
          </button>
        </div>
        {quickCreateOpen && (
          <div className="border border-dashed border-[#c5bca5] bg-[#fdfaf1] rounded p-3 space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={`${retroMuted} text-[11px]`}>نام طرف حساب *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="مثلاً فروشگاه یاس"
                  autoFocus
                />
              </div>
              <div>
                <label className={`${retroMuted} text-[11px]`}>شماره موبایل (اختیاری)</label>
                <input
                  className={`${retroInput} w-full`}
                  value={quickMobile}
                  onChange={(e) => setQuickMobile(e.target.value)}
                  placeholder="0912xxxxxxx"
                  inputMode="tel"
                />
              </div>
            </div>
            {quickError && <p className="text-xs text-red-700">{quickError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className={`${retroButton} ${quickBusy ? 'opacity-60' : ''}`}
                onClick={submitQuickCreate}
                disabled={quickBusy}
              >
                {quickBusy ? 'در حال ایجاد...' : 'ثبت سریع'}
              </button>
              <button
                type="button"
                className={`${retroButton} !bg-[#bfb69f] text-[#2e2720]`}
                onClick={() => {
                  setQuickCreateOpen(false)
                  setQuickName('')
                  setQuickMobile('')
                  setQuickError(null)
                }}
                disabled={quickBusy}
              >
                انصراف
              </button>
            </div>
          </div>
        )}
        <div className="border rounded p-2 max-h-40 overflow-auto">
          {loading ? (
            <div className="text-xs">در حال جستجو…</div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex justify-between py-1">
                <span className="text-sm">
                  {i.name} {i.mobile ? `— ${i.mobile}` : ''}
                </span>
                <button className={retroButton} onClick={() => onSelect(i)}>
                  انتخاب
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const addItem = () => {
    setInvoiceForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))
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
    loadSaleOrders()
  }, [])

  useEffect(() => {
    if (viewMode === 'saleOrders') {
      void loadSalesKpis()
    }
  }, [viewMode])

  async function loadSalesKpis() {
    setSalesKpiLoading(true)
    try {
      const summary = await apiGet<any>('/api/reports/sales/summary').catch(() => null)
      setSalesSummary(summary)
      const customers = await apiGet<
        Array<{ party_id: string; party_name: string | null; total: number }>
      >('/api/reports/sales/top-customers?limit=5').catch(() => [])
      setTopCustomers(customers)
      const trends = await apiGet<{ days: number; series: Array<{ day: string; total: number }> }>(
        '/api/reports/sales/trends?days=14',
      ).catch(() => ({ days: 0, series: [] }))
      setSalesTrendSeries(trends.series || [])
    } catch (err) {
      console.warn('Failed loading sales KPIs', err)
    } finally {
      setSalesKpiLoading(false)
    }
  }

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

  async function loadSaleOrders(showSpinner = false) {
    if (showSpinner) setLoading(true)
    try {
      const orders = await listSaleOrders(200)
      setSaleOrders(orders || [])
    } catch (err) {
      console.warn('Failed to load sale orders', err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string) => {
    setInvoiceForm((prev) => {
      const items = prev.items.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value,
            }
          : item,
      )
      return { ...prev, items }
    })
  }

  const removeItem = (index: number) => {
    setInvoiceForm((prev) => {
      if (prev.items.length === 1) return prev
      const items = prev.items.filter((_, idx) => idx !== index)
      return { ...prev, items }
    })
  }

  const filtered = useMemo(() => {
    if (viewMode === 'saleOrders') {
      const filteredOrders = saleOrders
        .filter((o) => {
          if (statusFilter !== 'all' && o.status !== statusFilter) return false
          if (search) {
            const q = search.trim().toLowerCase()
            if (!q) return true
            const haystack = `${o.order_number ?? ''} ${o.party_name ?? ''}`.toLowerCase()
            if (!haystack.includes(q)) return false
          }
          return true
        })
        .sort((a, b) => new Date(b.server_time).getTime() - new Date(a.server_time).getTime())
        .slice(0, invoiceListLimit)
      return filteredOrders as any[]
    }
    const result = invoices
      .filter((inv) => {
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
        const aTime = new Date(a.server_time).getTime()
        const bTime = new Date(b.server_time).getTime()
        return bTime - aTime
      })
      .slice(0, invoiceListLimit)
    return result
  }, [invoices, statusFilter, typeFilter, search, invoiceListLimit, recentlyViewedInvoiceId])

  const totals = useMemo(() => {
    if (viewMode === 'saleOrders') {
      const allOrders = saleOrders.reduce(
        (acc, o) => {
          if (o.status === 'final') acc.finalized += 1
          if (o.status === 'draft') acc.drafts += 1
          acc.sales += o.total || 0
          return acc
        },
        { sales: 0, purchases: 0, finalized: 0, drafts: 0 },
      )
      return allOrders
    }
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

  const saleOrderSubtotal = useMemo(() => {
    return saleOrderItems.reduce((acc, it) => {
      const qty = Number(it.quantity || 0)
      const price = Number(it.unit_price || 0)
      return acc + qty * price
    }, 0)
  }, [saleOrderItems])

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
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
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
      const updated = await apiPost<InvoiceDetail>(`/api/invoices/${invoiceDetail.id}/finalize`, {
        client_time: clientIso,
      })
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

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.party_name.trim()) {
      setFormError('نام طرف حساب را وارد کنید.')
      return
    }
    if (invoiceForm.items.some((item) => !item.description.trim())) {
      setFormError('توضیح هر ردیف کالا باید وارد شود.')
      return
    }
    if (invoiceForm.items.some((item) => item.quantity <= 0 || item.unit_price <= 0)) {
      setFormError('مقدار و قیمت هر ردیف باید بزرگ‌تر از صفر باشد.')
      return
    }
    if (invoiceForm.invoice_type === 'sale') {
      const insufficient: string[] = []
      invoiceForm.items.forEach((item) => {
        if (!item.product_id) return
        const product = products.find((p) => p.id === item.product_id)
        if (!product || typeof product.inventory !== 'number') return
        if (item.quantity > product.inventory) {
          insufficient.push(`${product.name} (موجودی: ${formatNumberFa(product.inventory ?? 0)})`)
        }
      })
      if (insufficient.length > 0) {
        setFormError(`موجودی کافی برای این کالاها وجود ندارد: ${insufficient.join('، ')}`)
        return
      }
    }
    setCreating(true)
    setFormError(null)
    try {
      const clientIso = computeClientTimestamp()
      const payload = {
        invoice_type: invoiceForm.invoice_type,
        mode: 'manual',
        party_name: invoiceForm.party_name.trim(),
        note: invoiceForm.note.trim() || undefined,
        client_time: clientIso,
        client_calendar: smartDate.jalali ? 'jalali' : 'gregorian',
        items: invoiceForm.items.map((item) => ({
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
      if (selectedType === 'sale' || selectedType === 'purchase') {
        setTimeout(() => {
          setNextActionModal({
            invoiceType: selectedType,
            invoiceData: {
              id: created.id,
              invoice_number: created.invoice_number,
              party_name: invoiceForm.party_name,
              total: created.total || 0,
              note: invoiceForm.note,
            },
          })
        }, 100)
      } else {
        resetForm(selectedType)
      }
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

  function resetSaleOrderForm() {
    setSaleOrderItems([{ ...emptySoItem }])
    setSaleOrderPartyName('')
    setSaleOrderNote('')
    setSaleOrderFormError(null)
    setSaleOrderFormSuccess(null)
    setSaleOrderAutoFinalize(true)
  }

  function addSaleOrderItem() {
    setSaleOrderItems((prev) => [...prev, { ...emptySoItem }])
  }

  function updateSaleOrderItem(
    index: number,
    field: keyof typeof emptySoItem,
    value: string,
  ) {
    setSaleOrderItems((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value,
            }
          : row,
      ),
    )
  }

  function removeSaleOrderItem(index: number) {
    setSaleOrderItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, idx) => idx !== index)
    })
  }

  async function submitSaleOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!saleOrderPartyName.trim()) {
      setSaleOrderFormError('نام طرف حساب را وارد کنید.')
      return
    }
    if (saleOrderItems.some((it) => !it.description.trim())) {
      setSaleOrderFormError('شرح هر ردیف باید وارد شود.')
      return
    }
    if (saleOrderItems.some((it) => Number(it.quantity) <= 0 || Number(it.unit_price) <= 0)) {
      setSaleOrderFormError('تعداد و قیمت هر ردیف باید بزرگ‌تر از صفر باشد.')
      return
    }
    setCreatingSaleOrder(true)
    setSaleOrderFormError(null)
    try {
      const clientIso = computeClientTimestamp()
      const payload = {
        party_name: saleOrderPartyName.trim(),
        note: saleOrderNote.trim() || undefined,
        client_time: clientIso,
        client_calendar: smartDate.jalali ? 'jalali' : 'gregorian',
        items: saleOrderItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit: (it.unit || '').trim() || undefined,
          unit_price: Number(it.unit_price),
          product_id: it.product_id || undefined,
        })),
      } as const
      const created = await createSaleOrder(payload)
      let successMessage = 'سفارش با موفقیت ثبت شد.'
      if (saleOrderAutoFinalize) {
        try {
          await finalizeSaleOrder(created.id, clientIso)
          successMessage = 'سفارش ثبت و قطعی شد.'
        } catch (finalErr) {
          console.error(finalErr)
          setSaleOrderFormError('سفارش ثبت شد اما تأیید نهایی با خطا مواجه شد.')
        }
      }
      await loadSaleOrders(false)
      setSaleOrderFormSuccess(successMessage)
      setShowSaleOrderForm(false)
      resetSaleOrderForm()
    } catch (err) {
      if (err instanceof Error) {
        setSaleOrderFormError(err.message)
      } else {
        setSaleOrderFormError('ثبت سفارش با خطا روبه‌رو شد.')
      }
    } finally {
      setCreatingSaleOrder(false)
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
        <section className={`${retroPanelPadded} space-y-4`}>
          <p className={`${retroHeading} text-[#7a1f1f]`}>{error}</p>
          <p className="text-xs text-[#4b3d2d]">اگر منبع در دسترس نیست یا دسترسی محدود است، از بخش کاربران در تنظیمات بررسی کنید یا بعداً دوباره تلاش کنید.</p>
          <div className="flex flex-wrap gap-2">
            <button className={retroButton} onClick={() => loadInvoices(true)}>
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

      {(detailLoading || invoiceDetail || detailError) && (
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
                    طرف حساب: {invoiceDetail.party_name ?? 'نامشخص'} | وضعیت: {invoiceDetail.status}
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
              <button
                className={`${retroButton} !bg-[#c35c5c] text-[11px]`}
                onClick={closeInvoiceDetail}
              >
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
                    اختلاف ثبت:{' '}
                    {detailTimeDelta === null ? '---' : `${formatNumberFa(detailTimeDelta)} ثانیه`}
                  </p>
                </div>
              </div>
              {invoiceDetail.note && (
                <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
                  یادداشت: {invoiceDetail.note}
                </div>
              )}
              <div className="overflow-x-auto">
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
                    {(invoiceDetail.items ?? []).map((item) => {
                      const itemTotal = (item.quantity ?? 0) * (item.unit_price ?? 0)
                      return (
                        <tr key={item.id} className="border-b border-[#d9cfb6]">
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-left font-[Yekan]">
                            {formatNumberFa(item.quantity)}
                          </td>
                          <td className="px-3 py-2 text-left">{item.unit ?? '-'}</td>
                          <td className="px-3 py-2 text-left">
                            <div className="font-[Yekan]">
                              {formatCurrencyFa(item.unit_price, 'ریال', false).numeric}
                            </div>
                            {item.unit_price > 0 && (
                              <div className="text-[10px] text-[#7a6b4f] italic">
                                {numberToPersianWords(Math.trunc(item.unit_price))} ریال
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-left">
                            <div className="font-bold font-[Yekan] text-[#154b5f]">
                              {formatCurrencyFa(itemTotal, 'ریال', false).numeric}
                            </div>
                            {itemTotal > 0 && (
                              <div className="text-[10px] text-[#154b5f] italic">
                                {numberToPersianWords(Math.trunc(itemTotal))} ریال
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-sm text-[#2e2720] rounded-sm space-y-1">
                <p>جمع کل قبل از مالیات: {formatPrice(invoiceDetail.subtotal ?? 0, 'ریال')}</p>
                <p>مبلغ کل نهایی: {formatPrice(invoiceDetail.total ?? 0, 'ریال')}</p>
              </div>

              {invoiceDetail && (
                <RelatedPayments
                  invoiceId={invoiceDetail.id}
                  invoiceNumber={invoiceDetail.invoice_number}
                />
              )}
            </>
          )}
        </section>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Sales Console</p>
            <h2 className="text-2xl font-semibold mt-2">
              {viewMode === 'invoices' ? 'مدیریت فاکتورها' : 'سفارش‌های فروش'}
            </h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع جاری: {smartDate.jalali ?? 'تعیین نشده'} (ISO: {smartDate.isoDate ?? '---'}
              )
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                className={`${retroButton} ${viewMode === 'invoices' ? '!bg-[#1f2e3b]' : ''}`}
                onClick={() => setViewMode('invoices')}
              >
                فاکتورها
              </button>
              <button
                className={`${retroButton} ${viewMode === 'saleOrders' ? '!bg-[#1f2e3b]' : ''}`}
                onClick={() => setViewMode('saleOrders')}
              >
                سفارش‌ها
              </button>
            </div>
            {viewMode === 'invoices' ? (
              <button className={`${retroButton}`} onClick={() => loadInvoices()}>
                بروزرسانی فهرست
              </button>
            ) : (
              <button className={`${retroButton}`} onClick={() => loadSaleOrders(true)}>
                بروزرسانی سفارش‌ها
              </button>
            )}
            {viewMode === 'saleOrders' && (
              <button
                className={retroButton}
                onClick={() => {
                  resetSaleOrderForm()
                  setShowSaleOrderForm(true)
                }}
              >
                ایجاد سفارش فروش
              </button>
            )}
            <button className={retroButton} onClick={() => launchForm('sale')}>
              صدور فاکتور فروش
            </button>
            <button className={retroButton} onClick={() => launchForm('purchase')}>
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
        {viewMode === 'saleOrders' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>تعداد سفارش‌ها</p>
                <p className="text-lg font-semibold">
                  {salesKpiLoading ? '...' : formatNumberFa(salesSummary?.count || 0)}
                </p>
              </div>
              <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>مجموع فروش سفارش‌ها</p>
                <p className="text-lg font-semibold">
                  {salesKpiLoading ? '...' : formatPrice(salesSummary?.total || 0, 'ریال')}
                </p>
              </div>
              <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>میانگین</p>
                <p className="text-lg font-semibold">
                  {salesKpiLoading ? '...' : formatPrice(salesSummary?.average || 0, 'ریال')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm">
                <p className={retroHeading}>مشتریان برتر (۱۴ روز اخیر)</p>
                {salesKpiLoading && topCustomers.length === 0 ? (
                  <p className="text-xs text-[#7a6b4f] mt-2">در حال بارگذاری...</p>
                ) : topCustomers.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {topCustomers.map((c) => (
                      <li key={c.party_id} className="flex justify-between">
                        <span>{c.party_name || c.party_id}</span>
                        <span className="font-semibold">{formatNumberFa(c.total)} ریال</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#7a6b4f] mt-2">داده‌ای موجود نیست.</p>
                )}
              </div>
              <div className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm">
                <p className={retroHeading}>روند فروش (۱۴ روز)</p>
                {salesTrendSeries.length > 0 ? (
                  <div className="flex items-end gap-1 mt-3 h-24">
                    {salesTrendSeries.map((pt) => {
                      const heightClass = getTrendHeightClass(pt.total)
                      return (
                        <div key={pt.day} className="sales-trend-bar flex flex-col items-center">
                          <div
                            className={`sales-trend-bar-fill ${heightClass}`}
                            title={`${pt.day}: ${formatNumberFa(pt.total)}`}
                          ></div>
                          <div className="text-[8px] mt-1 rotate-[-45deg] origin-top-left text-[#7a6b4f]">
                            {pt.day.slice(5)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : salesKpiLoading ? (
                  <p className="text-xs text-[#7a6b4f] mt-2">در حال بارگذاری...</p>
                ) : (
                  <p className="text-xs text-[#7a6b4f] mt-2">داده‌ای موجود نیست.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {viewMode === 'saleOrders' && showSaleOrderForm && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex items-center justify-between">
            <div>
              <p className={retroHeading}>فرم سفارش فروش</p>
              <h3 className="text-lg font-semibold mt-2">ایجاد سفارش جدید</h3>
            </div>
            <button
              className={retroButton}
              onClick={() => {
                setShowSaleOrderForm(false)
                resetSaleOrderForm()
              }}
            >
              بستن فرم
            </button>
          </header>
          <form className="space-y-4" onSubmit={submitSaleOrder}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>طرف حساب *</label>
                <input
                  value={saleOrderPartyName}
                  onChange={(e) => setSaleOrderPartyName(e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="نام مشتری"
                  required
                  list="sale-order-persons"
                />
                <datalist id="sale-order-persons">
                  {persons.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.kind ? `${p.name} (${p.kind})` : p.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>یادداشت</label>
                <input
                  value={saleOrderNote}
                  onChange={(e) => setSaleOrderNote(e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="یادداشت سفارش"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={retroHeading}>ردیف‌های سفارش</p>
                <button type="button" className={retroButton} onClick={addSaleOrderItem}>
                  افزودن ردیف
                </button>
              </div>
              {saleOrderItems.map((it, idx) => {
                const rowSubtotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
                const rowIdBase = `sale-order-item-${idx}`
                const descriptionId = `${rowIdBase}-description`
                const quantityId = `${rowIdBase}-quantity`
                const unitId = `${rowIdBase}-unit`
                const unitPriceId = `${rowIdBase}-unit-price`
                return (
                  <div
                    key={idx}
                    className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={descriptionId}>
                          شرح *
                        </label>
                        <input
                          id={descriptionId}
                          value={it.description}
                          onChange={(e) => updateSaleOrderItem(idx, 'description', e.target.value)}
                          className={`${retroInput} w-full`}
                          placeholder="کالا یا خدمت"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={quantityId}>
                          تعداد *
                        </label>
                        <input
                          id={quantityId}
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateSaleOrderItem(idx, 'quantity', e.target.value)}
                          className={`${retroInput} w-full`}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={unitId}>
                          واحد
                        </label>
                        <input
                          id={unitId}
                          value={it.unit}
                          onChange={(e) => updateSaleOrderItem(idx, 'unit', e.target.value)}
                          className={`${retroInput} w-full`}
                          placeholder="عدد / بسته"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={unitPriceId}>
                          قیمت واحد (ریال) *
                        </label>
                        <input
                          id={unitPriceId}
                          type="number"
                          min={1}
                          value={it.unit_price}
                          onChange={(e) => updateSaleOrderItem(idx, 'unit_price', e.target.value)}
                          className={`${retroInput} w-full`}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#7a6b4f]">
                        مبلغ ردیف: {formatNumberFa(rowSubtotal)} ریال
                      </div>
                      <button
                        type="button"
                        className={`${retroButton} !bg-[#c35c5c] text-[11px]`}
                        onClick={() => removeSaleOrderItem(idx)}
                        disabled={saleOrderItems.length === 1}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-2 border-[#154b5f] bg-[#e8f2f7] px-4 py-3 rounded text-center space-y-1">
              <p className={retroHeading}>جمع تقریبی سفارش</p>
              <p className="text-2xl font-bold font-[Yekan]">
                {formatNumberFa(saleOrderSubtotal)}
              </p>
            </div>
            <div className="border border-dashed border-[#c5bca5] px-3 py-2 rounded-sm text-sm space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saleOrderAutoFinalize}
                  onChange={(e) => setSaleOrderAutoFinalize(e.target.checked)}
                />
                <span>پس از ثبت، سفارش قطعی شود</span>
              </label>
            </div>
            {saleOrderFormError && (
              <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
                {saleOrderFormError}
              </div>
            )}
            {saleOrderFormSuccess && (
              <div className="border-2 border-[#4f704f] bg-[#e7f4e7] text-[#295329] px-3 py-2 shadow-[3px_3px_0_#4f704f] text-sm">
                {saleOrderFormSuccess}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={`${retroButton} !bg-[#1f2e3b]`}
                disabled={creatingSaleOrder}
              >
                {creatingSaleOrder ? 'در حال ثبت...' : 'ثبت سفارش'}
              </button>
              <button
                type="button"
                className={`${retroButton} !bg-[#5b4a2f]`}
                disabled={creatingSaleOrder}
                onClick={resetSaleOrderForm}
              >
                پاک‌سازی فرم
              </button>
            </div>
          </form>
        </section>
      )}

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
                <label className={retroHeading} htmlFor="invoice_party_name">
                  طرف حساب *
                </label>
                <input
                  id="invoice_party_name"
                  value={invoiceForm.party_name}
                  onChange={(e) => {
                    const value = e.target.value
                    setInvoiceForm((prev) => ({ ...prev, party_name: value }))
                  }}
                  className={`${retroInput} w-full`}
                  placeholder="نام مشتری یا تأمین‌کننده"
                  required
                  list="invoice-persons"
                />
                <datalist id="invoice-persons">
                  {persons.map((person) => (
                    <option key={person.id} value={person.name}>
                      {person.kind ? `${person.name} (${person.kind})` : person.name}
                    </option>
                  ))}
                </datalist>
                {auxLoading && (
                  <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری لیست مخاطبین...</p>
                )}
                <div className="mt-2">
                  <PartySelectorInline
                    onSelect={(p) => setInvoiceForm((f) => ({ ...f, party_name: p.name }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={retroHeading} htmlFor="invoice_type_select">
                  نوع فاکتور
                </label>
                <select
                  id="invoice_type_select"
                  value={invoiceForm.invoice_type}
                  onChange={(e) => {
                    const nextType = e.target.value as InvoiceFormState['invoice_type']
                    setInvoiceForm((prev) => ({
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

            {/* توضیحات منتقل شد به پایین، قبل از دکمه‌ها */}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className={retroHeading}>ردیف‌های کالا</p>
                <button type="button" className={retroButton} onClick={addItem}>
                  افزودن ردیف
                </button>
              </div>

              {invoiceForm.items.map((item, idx) => {
                const itemSubtotal = item.quantity * item.unit_price
                const priceWords =
                  item.unit_price > 0 ? numberToPersianWords(Math.trunc(item.unit_price)) : ''
                const subtotalWords =
                  itemSubtotal > 0 ? numberToPersianWords(Math.trunc(itemSubtotal)) : ''
                const selectedProduct = item.product_id
                  ? products.find((p) => p.id === item.product_id)
                  : undefined
                const hasInventoryValue = typeof selectedProduct?.inventory === 'number'
                const availableInventory = hasInventoryValue
                  ? (selectedProduct?.inventory ?? 0)
                  : null
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
                const rowIdBase = `invoice-item-${idx}`
                const descriptionId = `${rowIdBase}-description`
                const quantityId = `${rowIdBase}-quantity`
                const unitId = `${rowIdBase}-unit`
                const unitPriceId = `${rowIdBase}-unit-price`

                return (
                  <div
                    key={idx}
                    className="border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_0.7fr_0.8fr_1fr_1fr_auto] gap-3 items-end">
                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={descriptionId}>
                          شرح کالا *
                        </label>
                        <input
                          id={descriptionId}
                          value={item.description}
                          onChange={(e) => {
                            const value = e.target.value
                            updateItem(idx, 'description', value)
                            const matched = products.find(
                              (prod) => prod.name === value || prod.id === value,
                            )
                            if (matched) {
                              setInvoiceForm((prev) => {
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
                          {products.map((prod) => (
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
                                  پس از قطعی تقریبی:{' '}
                                  {formatNumberFa(Math.max(projectedInventory, 0))}{' '}
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
                                  <div className="text-[#8a4d2c]">⚠️ موجودی رو به اتمام است.</div>
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
                        <label className={retroHeading} htmlFor={quantityId}>
                          تعداد *
                        </label>
                        <input
                          id={quantityId}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className={`${retroInput} w-full`}
                        />
                        {selectedProduct && typeof availableInventory === 'number' && (
                          <div
                            className={`text-[11px] ${saleShortage ? 'text-[#7a0000]' : 'text-[#154b5f]'}`}
                          >
                            {saleShortage
                              ? `نیاز ${formatNumberFa(item.quantity)} در برابر موجودی ${formatNumberFa(availableInventory)}`
                              : `موجودی: ${formatNumberFa(availableInventory)} ${selectedProduct.unit || 'عدد'}`}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={unitId}>
                          واحد
                        </label>
                        <input
                          id={unitId}
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className={`${retroInput} w-full`}
                          placeholder="عدد / بسته ..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className={retroHeading} htmlFor={unitPriceId}>
                          قیمت واحد (ریال) *
                        </label>
                        <div className="space-y-1">
                          <input
                            id={unitPriceId}
                            type="number"
                            min={1}
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                            className={`${retroInput} w-full font-[Yekan] text-center text-lg`}
                          />
                          {item.unit_price > 0 && (
                            <div className="text-xs text-[#7a6b4f] bg-[#f6f1df] px-2 py-1 rounded text-center">
                              {formatNumberFa(item.unit_price)}
                            </div>
                          )}
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
                          <div
                            className="border-2 border-[#1f2e3b] bg-[#f6f1df] px-3 py-2 rounded font-bold text-center font-[Yekan]"
                          >
                            {formatNumberFa(itemSubtotal)}
                          </div>
                          {itemSubtotal > 0 && (
                            <div className="text-[10px] text-[#1f2e3b] italic bg-[#f6f1df] px-2 py-0.5 rounded border border-dashed border-[#1f2e3b]">
                              {subtotalWords} ریال
                            </div>
                          )}
                        </div>
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

            <div className="border-2 border-[#1f2e3b] bg-[#f6f1df] px-4 py-3 rounded text-center space-y-1">
              <p className={retroHeading}>جمع کل فاکتور</p>
              <p className="text-2xl font-bold font-[Yekan]">
                {formatNumberFa(computedSubtotal || 0)}
              </p>
              <p className="text-xs text-[#1f2e3b] italic">
                {computedSubtotal > 0
                  ? numberToPersianWords(Math.trunc(computedSubtotal)) + ' ریال'
                  : ''}
              </p>
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
                    onChange={(e) => setAutoFinalize(e.target.checked)}
                  />
                  <span>پس از ثبت، فاکتور قطعی شود</span>
                </label>
                {invoiceForm.invoice_type === 'proforma' && (
                  <p className="text-[11px] text-[#7a6b4f]">
                    پیش‌فاکتور به‌صورت پیش‌فرض قطعی نمی‌شود. برای قطعی‌سازی، پس از تایید مشتری از
                    طریق جزئیات فاکتور اقدام کنید.
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

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                value={invoiceForm.note}
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, note: e.target.value }))}
                className={`${retroInput} w-full h-24`}
                placeholder="یادداشت‌های فاکتور"
              />
            </div>

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

      <section className={`${retroPanelPadded} space-y-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="space-y-2">
            <label className={retroHeading}>فیلتر وضعیت</label>
            <select
              aria-label="فیلتر وضعیت فاکتور"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
              aria-label="نوع سند فاکتور"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
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
              aria-label="تعداد فاکتورهای نمایشی"
              value={invoiceListLimit}
              onChange={(e) => setInvoiceListLimit(parseInt(e.target.value))}
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
              onChange={(e) => setSearch(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="نام طرف حساب یا شماره فاکتور..."
            />
          </div>
        </div>

        <div className="border border-dashed border-[#c5bca5] p-3 text-xs text-[#7a6b4f] rounded-sm">
          {viewMode === 'invoices'
            ? `${formatNumberFa(filtered.length)} فاکتور (جدیدترین ${invoiceListLimit} فاکتور از ${formatNumberFa(invoices.length)}) نمایش داده می‌شود.`
            : `${formatNumberFa(filtered.length)} سفارش فروش (نمایش ${invoiceListLimit} مورد از ${formatNumberFa(saleOrders.length)})`}
        </div>

        {filtered.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <DocumentTableHeader type={viewMode === 'invoices' ? 'invoice' : 'saleOrder'} />
            </thead>
            <tbody>
              {viewMode === 'invoices'
                ? filtered.map((inv: any) => (
                    <DocumentRow
                      key={inv.id}
                      kind="invoice"
                      id={inv.id}
                      number={inv.invoice_number}
                      party_name={inv.party_name}
                      total={inv.total}
                      status={inv.status}
                      server_time={inv.server_time}
                      client_time={inv.client_time}
                      tracking_code={inv.tracking_code}
                      invoice_type={inv.invoice_type}
                      mode={inv.mode}
                      titleMap={invoiceTypeTitles}
                      onView={openInvoiceDetail}
                    />
                  ))
                : filtered.map((so: any) => (
                    <DocumentRow
                      key={so.id}
                      kind="saleOrder"
                      id={so.id}
                      number={so.order_number}
                      party_name={so.party_name}
                      total={so.total}
                      status={so.status}
                      server_time={so.server_time}
                      client_time={so.client_time}
                      tracking_code={so.tracking_code}
                      invoice_id={so.invoice_id}
                      onFinalize={async (id) => {
                        try {
                          const updated = await finalizeSaleOrder(id, new Date().toISOString())
                          setSaleOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
                        } catch (err) {
                          console.error('Finalize sale order failed', err)
                        }
                      }}
                      onViewInvoice={openInvoiceDetail}
                      onExport={async (id, format) => {
                        try {
                          const res = await exportSaleOrder(id, format)
                          if (res?.download_url) {
                            window.open(res.download_url, '_blank', 'noopener')
                          }
                        } catch (err) {
                          console.error('Sale order export failed', err)
                        }
                      }}
                    />
                  ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">
            {viewMode === 'invoices'
              ? 'سندی با شرایط انتخابی یافت نشد. فیلترها را تغییر دهید یا سند جدیدی ثبت کنید.'
              : 'سفارشی یافت نشد. سفارش جدیدی ایجاد کنید یا فیلترها را تغییر دهید.'}
          </div>
        )}
      </section>
      {(detailLoading || invoiceDetail || detailError) && (
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
                    طرف حساب: {invoiceDetail.party_name ?? 'نامشخص'} | وضعیت: {invoiceDetail.status}
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
              <button
                className={`${retroButton} !bg-[#c35c5c] text-[11px]`}
                onClick={closeInvoiceDetail}
              >
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
                    اختلاف ثبت:{' '}
                    {detailTimeDelta === null ? '---' : `${formatNumberFa(detailTimeDelta)} ثانیه`}
                  </p>
                </div>
              </div>
              {invoiceDetail.note && (
                <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
                  یادداشت: {invoiceDetail.note}
                </div>
              )}
              <div className="overflow-x-auto">
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
                    {(invoiceDetail.items ?? []).map((item) => {
                      const itemTotal = (item.quantity ?? 0) * (item.unit_price ?? 0)
                      return (
                        <tr key={item.id} className="border-b border-[#d9cfb6]">
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-left font-[Yekan]">
                            {formatNumberFa(item.quantity)}
                          </td>
                          <td className="px-3 py-2 text-left">{item.unit ?? '-'}</td>
                          <td className="px-3 py-2 text-left">
                            <div className="font-[Yekan]">
                              {formatCurrencyFa(item.unit_price, 'ریال', false).numeric}
                            </div>
                            {item.unit_price > 0 && (
                              <div className="text-[10px] text-[#7a6b4f] italic">
                                {numberToPersianWords(Math.trunc(item.unit_price))} ریال
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-left">
                            <div className="font-bold font-[Yekan] text-[#154b5f]">
                              {formatCurrencyFa(itemTotal, 'ریال', false).numeric}
                            </div>
                            {itemTotal > 0 && (
                              <div className="text-[10px] text-[#154b5f] italic">
                                {numberToPersianWords(Math.trunc(itemTotal))} ریال
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-sm text-[#2e2720] rounded-sm space-y-1">
                <p>جمع کل قبل از مالیات: {formatPrice(invoiceDetail.subtotal ?? 0, 'ریال')}</p>
                <p>مبلغ کل نهایی: {formatPrice(invoiceDetail.total ?? 0, 'ریال')}</p>
              </div>

              {invoiceDetail && (
                <RelatedPayments
                  invoiceId={invoiceDetail.id}
                  invoiceNumber={invoiceDetail.invoice_number}
                />
              )}
            </>
          )}
        </section>
      )}

      {nextActionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setNextActionModal(null)}
        >
          <div
            className={`${retroPanel} max-w-md w-full mx-4 p-6 space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-[#2e2720]">فاکتور با موفقیت ثبت شد</h3>
              <p className="text-sm text-[#7a6b4f]">
                شماره فاکتور: {nextActionModal.invoiceData.invoice_number}
              </p>
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
                    const switchEvent = new CustomEvent('switch-module', {
                      detail: { module: 'finance' },
                    })
                    window.dispatchEvent(switchEvent)

                    // Then prefill the form after module is mounted (100ms delay)
                    setTimeout(() => {
                      window.dispatchEvent(
                        new CustomEvent('finance-prefill', {
                          detail: {
                            invoice_id: data.id,
                            direction: nextActionModal.invoiceType === 'sale' ? 'in' : 'out',
                            party_name: data.party_name,
                            amount: data.total,
                            reference: data.invoice_number,
                            note: data.note || `بابت فاکتور ${data.invoice_number}`,
                          },
                        }),
                      )
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
