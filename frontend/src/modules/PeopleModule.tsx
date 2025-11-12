import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet } from '../services/api'
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
            <button className={retroButton}>افزودن مخاطب جدید</button>
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
