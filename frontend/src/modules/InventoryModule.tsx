import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
import { formatNumberFa } from '../utils/num'
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

interface Product {
  id: string
  name: string
  group: string | null
  unit: string | null
  inventory: number | null | undefined
  description?: string | null
}

type ProductFormState = {
  name: string
  unit: string
  group: string
  code: string
  description: string
}

export default function InventoryModule({ smartDate }: ModuleComponentProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const emptyForm: ProductFormState = {
    name: '',
    unit: '',
    group: '',
    code: '',
    description: '',
  }
  const [productForm, setProductForm] = useState<ProductFormState>(emptyForm)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Product[]>('/api/products?limit=200')
      setProducts(data)
    } catch (err) {
      console.error(err)
      setError('امکان دریافت فهرست محصولات وجود ندارد.')
    } finally {
      setLoading(false)
    }
  }

  const handleProductChange = (field: keyof ProductFormState, value: string) => {
    setProductForm(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setProductForm(emptyForm)
    setFormError(null)
    setFormSuccess(null)
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.name.trim()) {
      setFormError('نام کالا را وارد کنید.')
      return
    }
    setCreating(true)
    setFormError(null)
    try {
      const payload = {
        name: productForm.name.trim(),
        unit: productForm.unit.trim() || undefined,
        group: productForm.group.trim() || undefined,
        description: productForm.description.trim() || undefined,
        code: productForm.code.trim() || undefined,
      }
      const created = await apiPost<Product>('/api/products', payload)
      const normalized: Product = {
        ...created,
        inventory: (created as Product).inventory ?? 0,
      }
      setProducts(prev => [normalized, ...prev])
      setProductForm(emptyForm)
      setFormSuccess('کالا با موفقیت ثبت شد.')
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('ثبت کالا با خطا مواجه شد.')
      }
    } finally {
      setCreating(false)
    }
  }

  const groups = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.group) set.add(p.group)
    })
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(prod => {
      if (groupFilter !== 'all' && (prod.group ?? 'other') !== groupFilter) return false
      if (search) {
        const hay = `${prod.name} ${prod.group ?? ''}`.toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [products, groupFilter, search])

  const totals = useMemo(() => {
    const totalInventory = products.reduce((acc, prod) => acc + (prod.inventory ?? 0), 0)
    const uniqueGroups = groups.length
    return { totalInventory, uniqueGroups }
  }, [products, groups])

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال دریافت موجودی...</p>
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
            <p className={retroHeading}>Inventory Board</p>
            <h2 className="text-2xl font-semibold mt-2">مدیریت موجودی کالا</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع: {smartDate.jalali ?? 'نامشخص'} | {smartDate.isoDate ?? 'ISO TBD'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={loadProducts}>
              بروزرسانی موجودی
            </button>
            <button
              className={retroButton}
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
            >
              افزودن کالای جدید
            </button>
            <button className={retroButton}>ورود انبار</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>تعداد کالاها</p>
            <p className="text-lg font-semibold">{formatNumberFa(products.length)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>جمع موجودی</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.totalInventory)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>گروه‌ها</p>
            <p className="text-lg font-semibold">{formatNumberFa(totals.uniqueGroups)}</p>
          </div>
        </div>
      </section>

      {showForm && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className={retroHeading}>فرم ثبت کالا</p>
              <h3 className="text-lg font-semibold mt-2">افزودن کالای جدید به سیستم</h3>
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

          <form className="space-y-4" onSubmit={submitProduct}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>نام کالا *</label>
                <input
                  value={productForm.name}
                  onChange={e => handleProductChange('name', e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="مانند: لپ‌تاپ مدل X"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>کد کالا</label>
                <input
                  value={productForm.code}
                  onChange={e => handleProductChange('code', e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="اختیاری"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>واحد اندازه‌گیری</label>
                <input
                  value={productForm.unit}
                  onChange={e => handleProductChange('unit', e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="عدد / کیلو / بسته..."
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>گروه کالا</label>
                <input
                  value={productForm.group}
                  onChange={e => handleProductChange('group', e.target.value)}
                  className={`${retroInput} w-full`}
                  placeholder="مثلاً: الکترونیک"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                value={productForm.description}
                onChange={e => handleProductChange('description', e.target.value)}
                className={`${retroInput} w-full h-24`}
                placeholder="ویژگی‌ها یا یادداشت‌های مهم"
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
                {creating ? 'در حال ثبت...' : 'ثبت کالا'}
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
          <div className="lg:col-span-2 space-y-2">
            <label className={retroHeading}>جستجو</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="نام کالا یا گروه..."
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>گروه کالا</label>
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className={`${retroInput} w-full`}
            >
              <option value="all">همه گروه‌ها</option>
              {groups.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نمایش</label>
            <div className="border border-dashed border-[#c5bca5] px-3 py-2 text-xs text-[#7a6b4f] rounded-sm">
              {formatNumberFa(filtered.length)} کالا مطابق فیلترها نمایش داده شده است.
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>نام کالا</th>
                <th className={retroTableHeader}>گروه</th>
                <th className={retroTableHeader}>واحد</th>
                <th className={retroTableHeader}>موجودی</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(prod => (
                <tr key={prod.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {prod.name}
                    {prod.description && (
                      <span className="block text-[10px] text-[#7a6b4f] mt-1">
                        {prod.description}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{prod.group ?? 'بدون گروه'}</td>
                  <td className="px-3 py-2">{prod.unit ?? 'عدد'}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(prod.inventory ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">کالایی با شرایط فعلی یافت نشد.</div>
        )}
      </section>
    </div>
  )
}
