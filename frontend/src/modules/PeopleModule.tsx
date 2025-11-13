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

interface Person {
  id: string
  name: string
  kind: string | null
  mobile: string | null
  code: string | null
  description: string | null
  created_at: string
}

type KindFilter = 'all' | 'customer' | 'supplier' | 'other'

export default function PeopleModule({ smartDate }: ModuleComponentProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
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

  const filtered = useMemo(() => {
    return people.filter(p => {
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
  }, [people, kindFilter, search])

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
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={loadPeople}>
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
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>نام</th>
                <th className={retroTableHeader}>نوع</th>
                <th className={retroTableHeader}>کد</th>
                <th className={retroTableHeader}>موبایل</th>
                <th className={retroTableHeader}>توضیح</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(person => (
                <tr key={person.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">
                    {person.name}
                    <span className="block text-[10px] text-[#7a6b4f] mt-1">
                      ثبت: {new Date(person.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  </td>
                  <td className="px-3 py-2">{person.kind ?? 'سایر'}</td>
                  <td className="px-3 py-2">{person.code ?? '-'}</td>
                  <td className="px-3 py-2">{person.mobile ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-[#7a6b4f]">
                    {person.description ?? '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-[#7a6b4f]">مخاطبی با شرایط فعلی یافت نشد.</div>
        )}
      </section>
    </div>
  )
}
