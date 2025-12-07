// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { listSaleOrders, finalizeSaleOrder, createSaleOrder, exportSaleOrder, type SaleOrder } from '../services/saleOrders'
import DocumentRow, { DocumentTableHeader } from '../components/DocumentRow'
import { formatNumberFa, isoToJalali, toPersianDigits, formatPrice, formatCurrencyFa, numberToPersianWords } from '../utils/num'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroPanelPadded,
} from '../components/retroTheme'

interface PersonOption {
  id: string
  name: string
  kind?: string | null
}

const emptySoItem = { description: '', quantity: 1, unit: '', unit_price: 0, product_id: undefined as string | null }

export default function SalesModule({ smartDate, sync }: ModuleComponentProps) {
  const [loading, setLoading] = useState(true)
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final' | 'cancelled'>('all')
  const [search, setSearch] = useState('')
  const [showSaleOrderForm, setShowSaleOrderForm] = useState(false)
  const [creatingSaleOrder, setCreatingSaleOrder] = useState(false)
  const [saleOrderAutoFinalize, setSaleOrderAutoFinalize] = useState(true)
  const [saleOrderFormError, setSaleOrderFormError] = useState<string | null>(null)
  const [saleOrderFormSuccess, setSaleOrderFormSuccess] = useState<string | null>(null)
  const [saleOrderItems, setSaleOrderItems] = useState<Array<typeof emptySoItem>>([{ ...emptySoItem }])
  const [saleOrderPartyName, setSaleOrderPartyName] = useState('')
  const [saleOrderNote, setSaleOrderNote] = useState('')
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [auxLoading, setAuxLoading] = useState(false)

  useEffect(() => {
    loadSaleOrders()
    loadAuxData()
  }, [])

  async function loadAuxData() {
    setAuxLoading(true)
    try {
      const [personsRes] = await Promise.all([
        apiGet<PersonOption[]>('/api/persons').catch(() => []),
      ])
      setPersons(personsRes ?? [])
    } catch (err) {
      console.warn('Failed to load sale order aux data', err)
    } finally {
      setAuxLoading(false)
    }
  }

  async function loadSaleOrders(showSpinner = true) {
    if (showSpinner) setLoading(true)
    try {
      const data = await listSaleOrders(200)
      setSaleOrders(data)
    } catch (err) {
      console.warn('Failed to load sale orders', err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const resetSaleOrderForm = () => {
    setSaleOrderItems([{ ...emptySoItem }])
    setSaleOrderPartyName('')
    setSaleOrderNote('')
    setSaleOrderAutoFinalize(true)
    setSaleOrderFormError(null)
    setSaleOrderFormSuccess(null)
  }

  const addSaleOrderItem = () => {
    setSaleOrderItems(prev => [...prev, { ...emptySoItem }])
  }

  const updateSaleOrderItem = (index: number, field: 'description' | 'quantity' | 'unit' | 'unit_price', value: string) => {
    setSaleOrderItems(prev => prev.map((it, idx) => (idx === index ? { ...it, [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value } : it)))
  }

  const removeSaleOrderItem = (index: number) => {
    setSaleOrderItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const saleOrderSubtotal = useMemo(() => saleOrderItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0), [saleOrderItems])

  const submitSaleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleOrderPartyName.trim()) {
      setSaleOrderFormError('نام طرف حساب را وارد کنید.')
      return
    }
    if (saleOrderItems.some(i => !i.description.trim())) {
      setSaleOrderFormError('شرح هر ردیف باید وارد شود.')
      return
    }
    if (saleOrderItems.some(i => i.quantity <= 0 || i.unit_price <= 0)) {
      setSaleOrderFormError('تعداد و قیمت واحد باید بزرگ‌تر از صفر باشند.')
      return
    }
    setCreatingSaleOrder(true)
    setSaleOrderFormError(null)
    try {
      const clientIso = new Date().toISOString()
      const payload = {
        party_name: saleOrderPartyName.trim(),
        client_time: clientIso,
        client_calendar: smartDate.jalali ? 'jalali' : 'gregorian',
        note: saleOrderNote.trim() || undefined,
        items: saleOrderItems.map(it => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit: it.unit.trim() || undefined,
          unit_price: Number(it.unit_price),
          product_id: it.product_id || undefined,
        })),
      }
      const created = await createSaleOrder(payload)
      let successMsg = 'سفارش فروش ثبت شد.'
      if (saleOrderAutoFinalize) {
        try {
          const finalized = await finalizeSaleOrder(created.id, clientIso)
          successMsg = 'سفارش ثبت و قطعی شد.'
          setSaleOrders(prev => [finalized, ...prev])
        } catch (fErr) {
          console.error(fErr)
          successMsg = 'سفارش ثبت شد اما قطعی‌سازی با خطا مواجه شد.'
        }
      } else {
        setSaleOrders(prev => [created, ...prev])
      }
      setSaleOrderFormSuccess(successMsg)
      setShowSaleOrderForm(false)
      resetSaleOrderForm()
    } catch (err) {
      setSaleOrderFormError(err instanceof Error ? err.message : 'ثبت سفارش با خطا روبه‌رو شد.')
    } finally {
      setCreatingSaleOrder(false)
    }
  }

  const filtered = useMemo(() => {
    const filteredOrders = saleOrders
      .filter(o => {
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
    return filteredOrders
  }, [saleOrders, statusFilter, search])

  if (loading) {
    return (
      <div className={`${retroPanelPadded} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال دریافت سفارش‌ها...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
        {/* The rest of the component will be filled in later */}
    </div>
  )
}
