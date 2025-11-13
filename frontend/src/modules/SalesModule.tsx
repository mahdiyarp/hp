import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { formatNumberFa, isoToJalali, toPersianDigits, formatPrice, formatCurrencyFa } from '../utils/num'
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
}

type InvoiceDetail = Invoice & { items: InvoiceItemRow[] }

const emptyItem: InvoiceItemForm = { description: '', quantity: 1, unit: '', unit_price: 0 }

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
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
      const data = await apiGet<Invoice[]>('/api/invoices?limit=100')
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
        items: invoiceForm.items.map(item => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim() || undefined,
          unit_price: Number(item.unit_price),
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
      
      // نمایش دیالوگ شیک برای عملیات بعدی
      if (selectedType === 'sale' || selectedType === 'purchase') {
        setTimeout(() => {
          setNextActionModal({
            invoiceType: selectedType,
            invoiceData: {
              invoice_number: created.invoice_number,
              party_name: invoiceForm.party_name,
              total: created.total || 0,
              note: invoiceForm.note,
            }
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

              {invoiceForm.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 border border-dashed border-[#c5bca5] px-4 py-3 rounded-sm"
                >
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
                  </div>
                  <div className="space-y-2">
                    <label className={retroHeading}>تعداد *</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className={`${retroInput} w-full`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={retroHeading}>واحد</label>
                    <input
                      value={item.unit}
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                      className={`${retroInput} w-full`}
                      placeholder="عدد / بسته ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={retroHeading}>قیمت واحد *</label>
                    <input
                      type="number"
                      min={1}
                      value={item.unit_price}
                      onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                      className={`${retroInput} w-full`}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className={`${retroButton} !bg-[#c35c5c]`}
                      onClick={() => removeItem(idx)}
                      disabled={invoiceForm.items.length === 1}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
              جمع پیش‌فرض فاکتور: {formatPrice(computedSubtotal || 0, 'ریال')}
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
                <th className={retroTableHeader}>زمان‌ها</th>
                <th className={retroTableHeader}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {toPersianDigits(inv.invoice_number || `#${inv.id}`)}
                    <span className="block text-[10px] text-[#7a6b4f] mt-1">حالت: {inv.mode}</span>
                  </td>
                  <td className="px-3 py-2">{inv.invoice_type}</td>
                  <td className="px-3 py-2">{inv.party_name ?? 'نامشخص'}</td>
                  <td className="px-3 py-2 text-left">
                    {formatCurrencyFa(inv.total || 0, 'ریال', false).numeric} <span className="text-xs">ریال</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge}`}>{inv.status}</span>
                  </td>
                  <td className="px-3 py-2 text-left space-y-1">
                    <p>سرور: {inv.server_time ? isoToJalali(inv.server_time) : '-'}</p>
                    <p className="text-[11px] text-[#7a6b4f]">
                      کلاینت: {inv.client_time ? isoToJalali(inv.client_time) : '---'}
                    </p>
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
                    {(invoiceDetail.items ?? []).map(item => (
                      <tr key={item.id} className="border-b border-[#d9cfb6]">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-left">{formatNumberFa(item.quantity)}</td>
                        <td className="px-3 py-2 text-left">{item.unit ?? '-'}</td>
                        <td className="px-3 py-2 text-left">{formatCurrencyFa(item.unit_price, 'ریال', false).numeric}</td>
                        <td className="px-3 py-2 text-left">{formatCurrencyFa(item.total, 'ریال', false).numeric}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-sm text-[#2e2720] rounded-sm space-y-1">
                <p>جمع کل قبل از مالیات: {formatPrice(invoiceDetail.subtotal ?? 0, 'ریال')}</p>
                <p>مبلغ کل نهایی: {formatPrice(invoiceDetail.total ?? 0, 'ریال')}</p>
              </div>
            </>
          )}
        </section>
      )}

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
                    window.dispatchEvent(new CustomEvent('finance-prefill', {
                      detail: {
                        direction: nextActionModal.invoiceType === 'sale' ? 'in' : 'out',
                        party_name: data.party_name,
                        amount: data.total,
                        reference: data.invoice_number,
                        note: data.note || `بابت فاکتور ${data.invoice_number}`,
                      }
                    }))
                    setNextActionModal(null)
                    const event = new CustomEvent('switch-module', { detail: { module: 'finance' } })
                    window.dispatchEvent(event)
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
