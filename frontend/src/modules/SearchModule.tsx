import React, { useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiPost } from '../services/api'
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

type SearchIndex = 'products' | 'persons' | 'invoices' | 'payments'

interface SearchResponse {
  [index: string]: {
    hits: Array<Record<string, unknown>>
  }
}

const INDEX_LABELS: Record<SearchIndex, string> = {
  products: 'کالاها',
  persons: 'طرف‌های حساب',
  invoices: 'فاکتورها',
  payments: 'دریافت/پرداخت',
}

export default function SearchModule({ smartDate }: ModuleComponentProps) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(10)
  const [selectedIndexes, setSelectedIndexes] = useState<SearchIndex[]>([
    'products',
    'persons',
    'invoices',
    'payments',
  ])
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeIndexes = useMemo(() => selectedIndexes.length > 0 ? selectedIndexes : (['products', 'persons', 'invoices', 'payments'] as SearchIndex[]), [selectedIndexes])

  const toggleIndex = (idx: SearchIndex) => {
    setSelectedIndexes(prev =>
      prev.includes(idx) ? prev.filter(item => item !== idx) : [...prev, idx],
    )
  }

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) {
      setError('متن جستجو را وارد کنید.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        q: query,
        indexes: activeIndexes,
        limit,
        filters: undefined,
      }
      const res = await apiPost<SearchResponse>('/api/search', payload)
      setResults(res)
    } catch (err) {
      console.error(err)
      setError('اجرای جستجو با خطا مواجه شد.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className={`${retroPanelPadded} space-y-5`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Universal Search</p>
            <h2 className="text-2xl font-semibold mt-2">جستجوی هوشمند در رکوردها</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ مرجع: {smartDate.jalali ?? 'نامشخص'} | {smartDate.isoDate ?? 'ISO TBD'}
            </p>
          </div>
          <div className={`${retroPanel} px-4 py-3 text-xs`}>
            <p className={`${retroHeading} text-[#7a6b4f]`}>راهنما</p>
            <p className="mt-1 leading-6 text-[#7a6b4f]">
              متنی را وارد کنید تا در کالاها، طرف حساب‌ها، فاکتورها و پرداخت‌ها جستجو شود. انتخاب
              نمایه‌ها را می‌توانید محدود کنید تا نتایج دقیق‌تری بگیرید.
            </p>
          </div>
        </header>

        <form onSubmit={runSearch} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3">
            <div className="space-y-2">
              <label className={retroHeading}>عبارت جستجو</label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="نام محصول، شماره فاکتور، طرف حساب..."
              />
            </div>
            <div className="space-y-2">
              <label className={retroHeading}>حداکثر نتایج هر بخش</label>
              <input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className={`${retroInput} w-full`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={retroHeading}>نمایه‌های فعال</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {(Object.keys(INDEX_LABELS) as SearchIndex[]).map(idx => {
                const active = selectedIndexes.includes(idx)
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleIndex(idx)}
                    className={`${retroButton} ${active ? '' : 'opacity-50'} text-[11px]`}
                  >
                    {INDEX_LABELS[idx]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={`${retroButton} !bg-[#1f2e3b]`}>
              اجرای جستجو
            </button>
            <button
              type="button"
              className={`${retroButton} !bg-[#5b4a2f]`}
              onClick={() => {
                setQuery('')
                setResults(null)
              }}
            >
              پاک‌سازی
            </button>
          </div>
        </form>

        {error && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className={`${retroPanel} p-6 text-center`}>
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} mt-3 text-[#1f2e3b]`}>در حال پردازش جستجو...</p>
        </div>
      )}

      {results && !loading && (
        <section className="space-y-6">
          {(activeIndexes as string[]).map(idx => {
            const hitPack = results[idx]
            const hits = hitPack?.hits ?? []
            return (
              <div key={idx} className={`${retroPanelPadded} space-y-3`}>
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <p className={retroHeading}>نتایج</p>
                    <h3 className="text-lg font-semibold mt-1">{INDEX_LABELS[idx as SearchIndex]}</h3>
                  </div>
                  <span className={retroBadge}>تعداد: {hits.length}</span>
                </header>
                {hits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                      <thead>
                        <tr>
                          <th className={retroTableHeader}>شناسه</th>
                          <th className={retroTableHeader}>مقدارهای کلیدی</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hits.map((hit, index) => (
                          <tr key={index} className="border-b border-[#d9cfb6] text-left">
                            <td className="px-3 py-2">
                              <span className={`${retroBadge} text-left`}>
                                {(hit.id as string) ?? `#${index + 1}`}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <pre className="text-xs whitespace-pre-wrap leading-5 text-[#2e2720] bg-[#f6f1df] border border-[#bfb69f] p-2 rounded-sm">
                                {JSON.stringify(hit, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={`text-xs ${retroMuted}`}>
                    نتیجه‌ای برای این بخش یافت نشد یا سرویس ایندکس غیرفعال است.
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

