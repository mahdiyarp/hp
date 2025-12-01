import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../services/api'
import { formatNumberFa, isoToJalali, toPersianDigits } from '../utils/num'
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

type AttachmentPayload = {
  id?: number
  filename: string
  content_type?: string
  data_base64?: string
  path?: string
}

type InvoiceLine = {
  description: string
  quantity: number
  unit?: string
  unit_price: number
  discount: number
  product_id?: string
}

type Invoice = {
  id: number
  invoice_number: string | null
  invoice_type: string
  mode: string
  party_id?: string | null
  party_name: string | null
  status: string
  subtotal: number | null
  tax: number | null
  tax_rate?: number | null
  discount_total?: number | null
  total: number | null
  server_time: string
  client_time?: string | null
  due_date?: string | null
  tracking_code?: string | null
  note?: string | null
  items?: InvoiceLine[]
  attachments?: AttachmentPayload[]
}

type PersonOption = { id: string; name: string; kind?: string | null; mobile?: string | null }
type ProductOption = {
  id: string
  name: string
  unit?: string | null
  inventory?: number | null
  last_sale_price?: number | null
  avg_sale_price?: number | null
  last_purchase_price?: number | null
  avg_purchase_price?: number | null
}

type InvoiceForm = {
  invoice_type: 'sale' | 'purchase' | 'proforma'
  party_name: string
  party_id?: string | null
  invoice_number?: string
  tax_rate: number
  discount_total: number
  payment_terms_days: number
  issue_date: string
  due_date: string
  note: string
  items: InvoiceLine[]
  attachments: AttachmentPayload[]
}

type Filters = {
  q: string
  status: string
  invoice_type: string
  start: string
  end: string
  party: string
  sort: 'asc' | 'desc'
  page: number
  pageSize: number
}

type InvoiceSettings = {
  invoice_default_tax_rate: number
  invoice_prefix_template: string
  invoice_auto_sms: boolean
  invoice_numbering_mode: 'auto' | 'manual'
  invoice_default_payment_terms: number
}

const emptyLine = (): InvoiceLine => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  discount: 0,
  unit: '',
  product_id: undefined,
})

function calculateTotals(lines: InvoiceLine[], invoiceDiscount: number, taxRate: number) {
  const lineDiscountTotal = lines.reduce(
    (acc, line) => acc + Math.max(0, Math.min(line.discount || 0, line.quantity * line.unit_price)),
    0,
  )
  const subtotal = lines.reduce(
    (acc, line) => acc + Math.max(0, line.quantity * line.unit_price - (line.discount || 0)),
    0,
  )
  const invoiceLevelDiscount = Math.min(Math.max(invoiceDiscount || 0, 0), subtotal)
  const taxableBase = Math.max(0, subtotal - invoiceLevelDiscount)
  const taxAmount = Math.round(taxableBase * ((taxRate || 0) / 100))
  const total = taxableBase + taxAmount
  return { subtotal, lineDiscountTotal, invoiceLevelDiscount, taxAmount, total }
}

function statusTitle(status: string) {
  const clean = (status || '').toLowerCase()
  if (clean === 'final') return 'Finalized'
  if (clean === 'paid') return 'Paid'
  if (clean === 'overdue') return 'Overdue'
  if (clean === 'cancelled') return 'Cancelled'
  return 'Draft'
}

function addDaysToJalali(rawDate: string, days: number) {
  if (!rawDate || !days) return ''
  const parsed = parseJalaliInput(rawDate)
  if (!parsed) return ''
  const date = new Date(parsed.iso)
  date.setUTCDate(date.getUTCDate() + days)
  return isoToJalali(date.toISOString())
}

export default function SalesModule({ smartDate }: ModuleComponentProps) {
  const [filters, setFilters] = useState<Filters>({
    q: '',
    status: 'all',
    invoice_type: 'all',
    start: '',
    end: '',
    party: '',
    sort: 'desc',
    page: 1,
    pageSize: 10,
  })
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [attachmentsBusy, setAttachmentsBusy] = useState(false)

  const [form, setForm] = useState<InvoiceForm>({
    invoice_type: 'sale',
    party_name: '',
    invoice_number: '',
    tax_rate: 0,
    discount_total: 0,
    payment_terms_days: 0,
    issue_date: smartDate.jalali || '',
    due_date: '',
    note: '',
    items: [emptyLine()],
    attachments: [],
  })

  const totals = useMemo(
    () => calculateTotals(form.items, form.discount_total, form.tax_rate),
    [form.items, form.discount_total, form.tax_rate],
  )

  const pageOffset = (filters.page - 1) * filters.pageSize

  async function loadSettings() {
    try {
      const data = await apiGet<any>('/api/settings')
      if (data) {
        setSettings({
          invoice_default_tax_rate: Number(data.invoice_default_tax_rate || 0),
          invoice_prefix_template: data.invoice_prefix_template || 'INV-{{year}}-{{counter}}',
          invoice_auto_sms: Boolean(data.invoice_auto_sms),
          invoice_numbering_mode: (data.invoice_numbering_mode || 'auto') as 'auto' | 'manual',
          invoice_default_payment_terms: Number(data.invoice_default_payment_terms || 0),
        })
        setForm(prev => ({
          ...prev,
          tax_rate: Number(data.invoice_default_tax_rate || prev.tax_rate),
          payment_terms_days: Number(data.invoice_default_payment_terms || prev.payment_terms_days),
          issue_date: prev.issue_date || smartDate.jalali || '',
        }))
      }
    } catch {
      // ignore settings load error
    }
  }

  async function loadAux() {
    try {
      const [people, prods] = await Promise.all([
        apiGet<PersonOption[]>('/api/persons').catch(() => []),
        apiGet<ProductOption[]>('/api/products?limit=200').catch(() => []),
      ])
      setPersons(people || [])
      setProducts(prods || [])
    } catch {
      // ignore
    }
  }

  async function loadInvoices() {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.invoice_type !== 'all') params.set('invoice_type', filters.invoice_type)
      if (filters.party) params.set('party', filters.party)
      if (filters.start) params.set('start', filters.start)
      if (filters.end) params.set('end', filters.end)
      params.set('limit', String(filters.pageSize))
      params.set('offset', String(pageOffset))
      params.set('sort', filters.sort)
      const data = await apiGet<Invoice[]>(`/api/invoices?${params.toString()}`)
      setInvoices(data || [])
      if (data && data.length > 0) setSelected(data[0])
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Failed to load invoices' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    loadAux()
  }, [])

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.pageSize, filters.sort, filters.status, filters.invoice_type])

  useEffect(() => {
    if (smartDate.jalali && !editingId && !form.issue_date) {
      setForm(prev => ({ ...prev, issue_date: smartDate.jalali || '' }))
    }
  }, [smartDate.jalali, editingId, form.issue_date])

  useEffect(() => {
    if (form.issue_date && form.payment_terms_days > 0) {
      const due = addDaysToJalali(form.issue_date, form.payment_terms_days)
      if (due && due !== form.due_date) {
        setForm(prev => ({ ...prev, due_date: due }))
      }
    }
  }, [form.issue_date, form.payment_terms_days])

  const updateLine = (index: number, partial: Partial<InvoiceLine>) => {
    setForm(prev => {
      const next = [...prev.items]
      next[index] = { ...next[index], ...partial }
      return { ...prev, items: next }
    })
  }

  const addLine = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyLine()] }))
  const removeLine = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  const duplicateLine = (idx: number) => setForm(prev => ({ ...prev, items: [...prev.items, { ...prev.items[idx] }] }))

  const resetForm = () => {
    setForm({
      invoice_type: 'sale',
      party_name: '',
      invoice_number: '',
      tax_rate: settings?.invoice_default_tax_rate || 0,
      discount_total: 0,
      payment_terms_days: settings?.invoice_default_payment_terms || 0,
      issue_date: smartDate.jalali || '',
      due_date: '',
      note: '',
      items: [emptyLine()],
      attachments: [],
    })
    setEditingId(null)
    setSelected(null)
    setMessage(null)
  }

  const handleAttachment = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setAttachmentsBusy(true)
    const next: AttachmentPayload[] = []
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read error'))
        reader.readAsDataURL(file)
      })
      next.push({ filename: file.name, content_type: file.type, data_base64: base64 })
    }
    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...next] }))
    setAttachmentsBusy(false)
  }

  const pickProduct = (idx: number, name: string) => {
    const lower = name.toLowerCase()
    const match =
      products.find(p => p.name.toLowerCase() === lower) ||
      products.find(p => p.name.toLowerCase().includes(lower))
    if (!match) {
      updateLine(idx, { description: name })
      return
    }
    const priceChain =
      form.invoice_type === 'purchase'
        ? [match.last_purchase_price, match.avg_purchase_price, match.avg_sale_price, match.last_sale_price]
        : [match.last_sale_price, match.avg_sale_price, match.avg_purchase_price, match.last_purchase_price]
    const suggestedPrice = priceChain.find(v => typeof v === 'number' && (v as number) > 0) || 0
    updateLine(idx, { description: match.name, product_id: match.id, unit: match.unit || '', unit_price: suggestedPrice })
  }

  const pickPerson = (name: string) => {
    const lower = name.toLowerCase()
    const found = persons.find(p => p.name.toLowerCase() === lower) || persons.find(p => p.name.toLowerCase().includes(lower))
    if (found) {
      setForm(prev => ({ ...prev, party_name: found.name, party_id: found.id }))
    } else {
      setForm(prev => ({ ...prev, party_name: name, party_id: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.party_name.trim()) {
      setMessage({ ok: false, text: 'Customer name is required' })
      return
    }
    if (form.items.length === 0 || form.items.some(l => !l.description.trim())) {
      setMessage({ ok: false, text: 'Add at least one line item with description' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const issueParsed = form.issue_date ? parseJalaliInput(form.issue_date) : null
      const clientTime = issueParsed?.jalali || form.issue_date || smartDate.jalali || new Date().toISOString()
      const payload = {
        invoice_type: form.invoice_type,
        mode: 'manual',
        party_name: form.party_name.trim(),
        party_id: form.party_id,
        invoice_number: form.invoice_number || undefined,
        tax_rate: Number(form.tax_rate || 0),
        discount_total: Number(form.discount_total || 0),
        payment_terms_days: Number(form.payment_terms_days || 0),
        due_date: form.due_date || undefined,
        client_time: clientTime,
        client_calendar: 'jalali',
        items: form.items.map(l => ({
          description: l.description.trim(),
          quantity: Number(l.quantity || 0),
          unit: l.unit || undefined,
          unit_price: Number(l.unit_price || 0),
          discount: Number(l.discount || 0),
          product_id: l.product_id || undefined,
        })),
        note: form.note.trim() || undefined,
        attachments: form.attachments,
      }
      const created = editingId
        ? await apiPut<Invoice>(`/api/invoices/${editingId}`, payload)
        : await apiPost<Invoice>('/api/invoices/manual', payload)
      setMessage({ ok: true, text: editingId ? 'Invoice updated' : 'Invoice created' })
      setEditingId(created.id)
      setSelected(created)
      await loadInvoices()
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Failed to save invoice' })
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      const clone = await apiPost<Invoice>(`/api/invoices/${id}/duplicate`, {})
      setMessage({ ok: true, text: 'Invoice duplicated' })
      await loadInvoices()
      setSelected(clone)
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Duplicate failed' })
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await apiPatch<Invoice>(`/api/invoices/${id}/status`, { status })
      setSelected(updated)
      await loadInvoices()
      setMessage({ ok: true, text: `Status set to ${status}` })
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Status update failed' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete invoice?')) return
    try {
      await apiDelete(`/api/invoices/${id}`)
      setSelected(null)
      await loadInvoices()
      setMessage({ ok: true, text: 'Invoice deleted' })
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Delete failed' })
    }
  }

  const handleAttachmentRemove = (idx: number) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))
  }

  const selectInvoice = (inv: Invoice) => {
    setSelected(inv)
    setEditingId(inv.id)
    const issueDate = inv.client_time ? isoToJalali(inv.client_time) : smartDate.jalali || ''
    const dueDate = inv.due_date ? isoToJalali(inv.due_date) : ''
    setForm({
      invoice_type: inv.invoice_type as InvoiceForm['invoice_type'],
      party_name: inv.party_name || '',
      party_id: inv.party_id || undefined,
      invoice_number: inv.invoice_number || '',
      tax_rate: Number(inv.tax_rate || 0),
      discount_total: Number(inv.discount_total || 0),
      payment_terms_days: Number((inv as any).payment_terms_days || settings?.invoice_default_payment_terms || 0),
      issue_date: issueDate,
      due_date: dueDate,
      note: inv.note || '',
      items: (inv.items || []).map(it => ({ ...it, discount: (it as any).discount || 0 })),
      attachments: inv.attachments || [],
    })
  }

  const statusTone = (status: string) => {
    const clean = (status || '').toLowerCase()
    if (clean === 'final' || clean === 'paid') return `${retroBadge} success`
    if (clean === 'overdue') return `${retroBadge} warning`
    if (clean === 'cancelled') return `${retroBadge} error`
    return retroBadge
  }

  const pageInvoices = invoices
  const hasNextPage = pageInvoices.length === filters.pageSize

  return (
    <div className="space-y-6" dir="rtl">
      <header className={`${retroPanel} p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
        <div>
          <p className={retroHeading}>Invoice Workspace</p>
          <p className={`${retroMuted} text-sm`}>
            Create, search, and finalize invoices with Jalali dates, smart line suggestions, exports, and SMS notifications.
          </p>
          {message && <p className={`${message.ok ? 'text-[var(--success)]' : 'text-[var(--error)]'} text-sm mt-2`}>{message.text}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={retroButton} onClick={() => loadInvoices()} disabled={loading}>Refresh</button>
          <button className={`${retroButton} secondary`} onClick={() => resetForm()}>New invoice</button>
          <button className={`${retroButton} ghost`} disabled title="AI assistant coming soon">AI Autofill</button>
        </div>
      </header>

      <section className={`${retroPanelPadded} space-y-3`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <label className="space-y-1">
            <span className={retroHeading}>Search</span>
            <input className={retroInput} value={filters.q} onChange={e => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))} placeholder="Invoice no. or customer" />
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>Status</span>
            <select className={retroInput} value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}>
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>Type</span>
            <select className={retroInput} value={filters.invoice_type} onChange={e => setFilters(prev => ({ ...prev, invoice_type: e.target.value, page: 1 }))}>
              <option value="all">All</option>
              <option value="sale">Sale</option>
              <option value="purchase">Purchase</option>
              <option value="proforma">Proforma</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>Customer</span>
            <input className={retroInput} value={filters.party} onChange={e => setFilters(prev => ({ ...prev, party: e.target.value, page: 1 }))} placeholder="Name" />
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>Start (Jalali)</span>
            <input className={retroInput} value={filters.start} onChange={e => setFilters(prev => ({ ...prev, start: e.target.value, page: 1 }))} placeholder="1403/01/01" />
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>End (Jalali)</span>
            <input className={retroInput} value={filters.end} onChange={e => setFilters(prev => ({ ...prev, end: e.target.value, page: 1 }))} placeholder="1403/12/29" />
          </label>
          <label className="space-y-1">
            <span className={retroHeading}>Sort</span>
            <select className={retroInput} value={filters.sort} onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value as Filters['sort'] }))}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className={retroButton} onClick={() => loadInvoices()} disabled={loading}>Apply</button>
            <button className={`${retroButton} ghost`} onClick={() => setFilters({ ...filters, q: '', status: 'all', invoice_type: 'all', party: '', start: '', end: '', page: 1 })}>Reset</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>Invoice</th>
                <th className={retroTableHeader}>Customer</th>
                <th className={retroTableHeader}>Type</th>
                <th className={retroTableHeader}>Total</th>
                <th className={retroTableHeader}>Status</th>
                <th className={retroTableHeader}>Dates</th>
                <th className={retroTableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="px-3 py-4" colSpan={7}>Loading...</td></tr>
              )}
              {!loading && pageInvoices.length === 0 && (
                <tr><td className="px-3 py-4" colSpan={7}>No invoices.</td></tr>
              )}
              {pageInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-[var(--background)] cursor-pointer" onClick={() => selectInvoice(inv)}>
                  <td className="px-3 py-2 font-semibold">{toPersianDigits(inv.invoice_number || `#${inv.id}`)}</td>
                  <td className="px-3 py-2">{inv.party_name || '---'}</td>
                  <td className="px-3 py-2">{inv.invoice_type}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(inv.total || 0)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</td>
                  <td className="px-3 py-2"><span className={statusTone(inv.status)}>{statusTitle(inv.status)}</span></td>
                  <td className="px-3 py-2 text-left">
                    <div>{isoToJalali(inv.server_time)}</div>
                    <div className="text-[11px] text-[var(--primary)] opacity-70">{inv.due_date ? `ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¯: ${isoToJalali(inv.due_date)}` : ''}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button className={`${retroButton} text-[11px]`} onClick={e => { e.stopPropagation(); selectInvoice(inv); setEditingId(inv.id) }}>Edit</button>
                      <button className={`${retroButton} text-[11px] secondary`} onClick={e => { e.stopPropagation(); handleDuplicate(inv.id) }}>Duplicate</button>
                      <button className={`${retroButton} text-[11px]`} onClick={e => { e.stopPropagation(); window.open(`/api/invoices/${inv.id}/pdf`, '_blank') }}>PDF</button>
                      <button className={`${retroButton} text-[11px] ghost`} onClick={e => { e.stopPropagation(); window.open(`/api/prints/invoice/${inv.id}`, '_blank') }}>Print</button>
                      <button className={`${retroButton} text-[11px] ghost`} onClick={e => { e.stopPropagation(); apiPost(`/api/invoices/${inv.id}/notify-sms`, {}).then(() => setMessage({ ok: true, text: 'SMS sent' })).catch(() => setMessage({ ok: false, text: 'SMS failed' })) }}>SMS</button>
                      <button className={`${retroButton} text-[11px] ghost`} onClick={e => { e.stopPropagation(); handleDelete(inv.id) }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>{toPersianDigits(filters.page)} / {hasNextPage ? '>' : 'END'}</div>
          <div className="flex gap-2">
            <button className={retroButton} disabled={filters.page === 1} onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>Prev</button>
            <button className={retroButton} disabled={!hasNextPage} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>Next</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${retroPanelPadded} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={retroHeading}>Create / Edit Invoice</p>
              <p className={`${retroMuted} text-sm`}>Jalali issue date defaults to your dashboard date.</p>
            </div>
            <span className={retroBadge}>Fiscal: {smartDate.jalali || '---'}</span>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className={retroHeading}>Customer</span>
                <input list="invoice-persons" className={retroInput} value={form.party_name} onChange={e => pickPerson(e.target.value)} />
                <datalist id="invoice-persons">
                  {persons.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-1 text-sm">
                <span className={retroHeading}>Type</span>
                <select className={retroInput} value={form.invoice_type} onChange={e => setForm(prev => ({ ...prev, invoice_type: e.target.value as InvoiceForm['invoice_type'] }))}>
                  <option value="sale">Sale</option>
                  <option value="purchase">Purchase</option>
                  <option value="proforma">Proforma</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className={retroHeading}>Invoice number</span>
                <input className={retroInput} value={form.invoice_number || ''} onChange={e => setForm(prev => ({ ...prev, invoice_number: e.target.value }))} placeholder={settings?.invoice_prefix_template} disabled={settings?.invoice_numbering_mode === 'auto'} />
              </label>
              <label className="space-y-1 text-sm">
                <span className={retroHeading}>Issue date (Jalali)</span>
                <input className={retroInput} value={form.issue_date} onChange={e => setForm(prev => ({ ...prev, issue_date: e.target.value }))} placeholder="1403/02/10" />
              </label>
              <label className="space-y-1 text-sm">
                <span className={retroHeading}>Due date (Jalali)</span>
                <input className={retroInput} value={form.due_date} onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))} placeholder="Auto from terms" />
              </label>
            </div>

            <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-sm)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>Item</th>
                    <th className={retroTableHeader}>Qty</th>
                    <th className={retroTableHeader}>Unit</th>
                    <th className={retroTableHeader}>Price</th>
                    <th className={retroTableHeader}>Discount</th>
                    <th className={retroTableHeader}>Total</th>
                    <th className={retroTableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((line, idx) => {
                    const lineTotal = Math.max(0, line.quantity * line.unit_price - (line.discount || 0))
                    const productHints = line.description
                      ? products.filter(p => p.name.toLowerCase().includes(line.description.toLowerCase())).slice(0, 3)
                      : []
                    return (
                      <tr key={idx} className="border-b border-[var(--border)]">
                        <td className="px-2 py-1 min-w-[160px]">
                          <input
                            list={`products-${idx}`}
                            className={retroInput}
                            value={line.description}
                            onChange={e => pickProduct(idx, e.target.value)}
                            placeholder="Product/service"
                          />
                          <datalist id={`products-${idx}`}>
                            {products.map(p => (
                              <option key={p.id} value={p.name} />
                            ))}
                          </datalist>
                          {productHints.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                              {productHints.map(p => (
                                <button key={p.id} type="button" className={`${retroBadge} text-[10px]`} onClick={() => pickProduct(idx, p.name)}>
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 w-24">
                          <input type="number" className={retroInput} value={line.quantity} onChange={e => updateLine(idx, { quantity: Number(e.target.value || 0) })} />
                        </td>
                        <td className="px-2 py-1 w-24">
                          <input className={retroInput} value={line.unit || ''} onChange={e => updateLine(idx, { unit: e.target.value })} />
                        </td>
                        <td className="px-2 py-1 w-32">
                          <input type="number" className={retroInput} value={line.unit_price} onChange={e => updateLine(idx, { unit_price: Number(e.target.value || 0) })} />
                        </td>
                        <td className="px-2 py-1 w-28">
                          <input type="number" className={retroInput} value={line.discount} onChange={e => updateLine(idx, { discount: Number(e.target.value || 0) })} />
                        </td>
                        <td className="px-2 py-1 w-32 text-left">{formatNumberFa(lineTotal)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</td>
                        <td className="px-2 py-1 flex gap-2">
                          <button type="button" className={`${retroButton} text-[11px]`} onClick={() => duplicateLine(idx)}>Duplicate</button>
                          <button type="button" className={`${retroButton} ghost text-[11px]`} onClick={() => removeLine(idx)} disabled={form.items.length === 1}>Remove</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className={retroButton} onClick={addLine}>Add line</button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <label className="space-y-1">
                <span className={retroHeading}>Tax (%)</span>
                <input type="number" className={retroInput} value={form.tax_rate} onChange={e => setForm(prev => ({ ...prev, tax_rate: Number(e.target.value || 0) }))} />
              </label>
              <label className="space-y-1">
                <span className={retroHeading}>Invoice discount</span>
                <input type="number" className={retroInput} value={form.discount_total} onChange={e => setForm(prev => ({ ...prev, discount_total: Number(e.target.value || 0) }))} />
              </label>
              <label className="space-y-1">
                <span className={retroHeading}>Payment terms (days)</span>
                <input type="number" className={retroInput} value={form.payment_terms_days} onChange={e => setForm(prev => ({ ...prev, payment_terms_days: Number(e.target.value || 0) }))} />
              </label>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>Attachments</label>
              <input type="file" multiple onChange={e => handleAttachment(e.target.files)} disabled={attachmentsBusy} />
              {form.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {form.attachments.map((att, idx) => (
                    <span key={`${att.filename}-${idx}`} className={retroBadge}>
                      {att.filename}
                      <button type="button" className="ml-2" onClick={() => handleAttachmentRemove(idx)}>ط·آ·ط¢آ£ط£آ¢أ¢â€ڑآ¬أ¢â‚¬â€Œ</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>Notes</label>
              <textarea className={`${retroInput} h-24`} value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div className={`${retroPanel} p-4 space-y-2`}>
                <div className="flex items-center justify-between"><span>Subtotal</span><strong>{formatNumberFa(totals.subtotal)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</strong></div>
                <div className="flex items-center justify-between text-[var(--primary)] opacity-80"><span>Line discounts</span><span>{formatNumberFa(totals.lineDiscountTotal)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</span></div>
                <div className="flex items-center justify-between text-[var(--primary)] opacity-80"><span>Invoice discount</span><span>{formatNumberFa(totals.invoiceLevelDiscount)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</span></div>
                <div className="flex items-center justify-between"><span>Tax</span><span>{formatNumberFa(totals.taxAmount)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</span></div>
                <div className="flex items-center justify-between text-lg font-bold"><span>Total</span><span>{formatNumberFa(totals.total)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={retroButton} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update invoice' : 'Save invoice'}</button>
                <button type="button" className={`${retroButton} ghost`} onClick={resetForm}>Clear</button>
                {editingId && (
                  <>
                    <button type="button" className={`${retroButton} secondary`} onClick={() => handleStatusChange(editingId, 'final')}>Finalize</button>
                    <button type="button" className={`${retroButton} secondary`} onClick={() => handleStatusChange(editingId, 'paid')}>Mark paid</button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className={`${retroPanelPadded} space-y-3`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={retroHeading}>Invoice view</p>
              <p className={`${retroMuted} text-sm`}>Printable, exportable, branded layout.</p>
            </div>
            {selected && <span className={statusTone(selected.status)}>{statusTitle(selected.status)}</span>}
          </div>

          {selected ? (
            <div className="space-y-3">
              <div className="hp-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{toPersianDigits(selected.invoice_number || `#${selected.id}`)}</h3>
                    <p className={`${retroMuted} text-sm`}>{selected.party_name || '---'}</p>
                    <p className="text-xs text-[var(--primary)] opacity-70">Issue: {isoToJalali(selected.server_time)}</p>
                    {selected.due_date && <p className="text-xs text-[var(--warning)]">Due: {isoToJalali(selected.due_date)}</p>}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-16 h-16 border border-[var(--border)] rounded-[var(--radius-sm)] flex items-center justify-center text-[10px]">QR</div>
                    <div className="w-16 h-16 border border-[var(--border)] rounded-[var(--radius-sm)] flex items-center justify-center text-[10px]">BAR</div>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm">Total: {formatNumberFa(selected.total || 0)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</p>
                  {selected.tax !== null && <p className="text-xs text-[var(--primary)] opacity-70">Tax: {formatNumberFa(selected.tax || 0)}</p>}
                  {selected.discount_total !== null && <p className="text-xs text-[var(--primary)] opacity-70">Discount: {formatNumberFa(selected.discount_total || 0)}</p>}
                </div>
              </div>

              <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-sm)]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className={retroTableHeader}>Item</th>
                      <th className={retroTableHeader}>Qty</th>
                      <th className={retroTableHeader}>Unit price</th>
                      <th className={retroTableHeader}>Discount</th>
                      <th className={retroTableHeader}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-[var(--border)]">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-left">{formatNumberFa(item.quantity)}</td>
                        <td className="px-3 py-2 text-left">{formatNumberFa(item.unit_price)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</td>
                        <td className="px-3 py-2 text-left">{formatNumberFa((item as any).discount || 0)} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</td>
                        <td className="px-3 py-2 text-left">{formatNumberFa(item.quantity * item.unit_price - ((item as any).discount || 0))} ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="hp-card p-3 space-y-2">
                  <p className={retroHeading}>Attachments</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selected.attachments.map(att => (
                      <a key={att.id || att.filename} className={retroBadge} href={att.path || '#'} target="_blank" rel="noreferrer">
                        {att.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button className={retroButton} onClick={() => window.open(`/api/invoices/${selected.id}/export?format=pdf`, '_blank')}>PDF</button>
                <button className={retroButton} onClick={() => window.open(`/api/invoices/${selected.id}/export?format=json`, '_blank')}>JSON</button>
                <button className={retroButton} onClick={() => window.open(`/api/invoices/${selected.id}/export?format=xml`, '_blank')}>XML</button>
                <button className={retroButton} onClick={() => window.open(`/api/invoices/${selected.id}/export?format=ubl`, '_blank')}>UBL</button>
                <button className={`${retroButton} ghost`} onClick={() => window.open(`/api/prints/invoice/${selected.id}`, '_blank')}>Print</button>
                <button className={`${retroButton} secondary`} onClick={() => handleStatusChange(selected.id, 'paid')}>Mark paid</button>
              </div>
            </div>
          ) : (
            <div className={`${retroMuted} text-sm`}>Select an invoice to preview.</div>
          )}
        </div>
      </section>
    </div>
  )
}
