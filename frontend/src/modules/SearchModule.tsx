import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet, apiPost } from '../services/api'
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
import { formatNumberFaSpaced, isoToJalali, toPersianDigits } from '../utils/num'

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
  const [personBalances, setPersonBalances] = useState<Record<string, number>>({})
  const [ledgerModal, setLedgerModal] = useState<null | { productId: string; loading: boolean; items: Array<Record<string, any>> }>(null)

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
      // Preload person balances if persons present
      try {
        if (res && res.persons && Array.isArray(res.persons.hits) && res.persons.hits.length) {
          const bal = await apiGet<{ balances: Record<string, number> }>('/api/persons/balances')
          if (bal && bal.balances) setPersonBalances(bal.balances)
        } else {
          setPersonBalances({})
        }
      } catch {
        // ignore balance fetch errors
      }
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
                    {idx === 'products' && (
                      <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                        <thead>
                          <tr>
                            <th className={retroTableHeader}>کالا</th>
                            <th className={retroTableHeader}>گروه/واحد</th>
                            <th className={retroTableHeader}>موجودی</th>
                            <th className={retroTableHeader}>اقدامات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((h: any, i) => {
                            const inv = Number(h.inventory || 0)
                            return (
                              <tr key={i} className="border-b border-[#d9cfb6]">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge}`}>{toPersianDigits(h.id)}</span>
                                    <div>
                                      <div className="font-semibold text-[#1f2e3b]">{h.name}</div>
                                      {h.code && <div className="text-xs text-[#7a6b4f]">کد: {toPersianDigits(h.code)}</div>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-left">
                                  <div className="text-xs text-[#5b4a2f]">{h.group || '-'}</div>
                                  <div className="text-[11px] text-[#7a6b4f]">واحد: {h.unit || '-'}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`${retroBadge} ${inv < 0 ? '!bg-[#c35c5c]' : inv === 0 ? '!bg-[#bfb69f]' : '!bg-[#3a7d44]'}`}>{formatNumberFaSpaced(inv)}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    className={`${retroButton} text-[11px]`}
                                    onClick={async () => {
                                      setLedgerModal({ productId: String(h.id), loading: true, items: [] })
                                      try {
                                        const data = await apiGet<any>(`/api/ledger/product/${h.id}`)
                                        setLedgerModal({ productId: String(h.id), loading: false, items: Array.isArray(data?.entries) ? data.entries : [] })
                                      } catch {
                                        setLedgerModal({ productId: String(h.id), loading: false, items: [] })
                                      }
                                    }}
                                  >
                                    گردش کالا
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                    {idx === 'persons' && (
                      <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                        <thead>
                          <tr>
                            <th className={retroTableHeader}>طرف حساب</th>
                            <th className={retroTableHeader}>نوع</th>
                            <th className={retroTableHeader}>مانده</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((h: any, i) => {
                            const bal = personBalances?.[String(h.id)] ?? 0
                            const badgeCls = bal > 0 ? '!bg-[#3a7d44]' : bal < 0 ? '!bg-[#c35c5c]' : '!bg-[#bfb69f]'
                            const balLabel = bal > 0 ? 'بدهکار' : bal < 0 ? 'بستانکار' : 'بی‌تراز'
                            return (
                              <tr key={i} className="border-b border-[#d9cfb6]">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-[#1f2e3b]">{h.name}</div>
                                  <div className="text-xs text-[#7a6b4f]">{h.mobile || '-'}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`${retroBadge}`}>{h.kind || 'other'}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge} ${badgeCls}`}>{balLabel}</span>
                                    <span className="text-[#1f2e3b]">{formatNumberFaSpaced(Math.abs(bal))}</span>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                    {idx === 'invoices' && (
                      <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                        <thead>
                          <tr>
                            <th className={retroTableHeader}>شماره/طرف</th>
                            <th className={retroTableHeader}>مبلغ/وضعیت</th>
                            <th className={retroTableHeader}>تاریخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((h: any, i) => {
                            const amt = Number(h.total || 0)
                            const type = String(h.invoice_type || '')
                            const status = String(h.status || '-')
                            const statusCls = status === 'paid' ? '!bg-[#3a7d44]' : status === 'cancelled' ? '!bg-[#c35c5c]' : '!bg-[#1f2e3b]'
                            return (
                              <tr key={i} className="border-b border-[#d9cfb6]">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge}`}>{toPersianDigits(h.invoice_number || h.id)}</span>
                                    <div>
                                      <div className="font-semibold text-[#1f2e3b]">{h.party_name || '-'}</div>
                                      <div className="text-[11px] text-[#7a6b4f]">نوع: {type === 'sale' ? 'فروش' : type === 'purchase' ? 'خرید' : '-'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge} ${amt >= 0 ? '!bg-[#3a7d44]' : '!bg-[#c35c5c]'}`}>{formatNumberFaSpaced(Math.abs(amt))}</span>
                                    <span className={`${retroBadge} ${statusCls}`}>{status}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-xs text-[#5b4a2f]">{h.server_time ? isoToJalali(h.server_time) : '-'}</div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                    {idx === 'payments' && (
                      <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                        <thead>
                          <tr>
                            <th className={retroTableHeader}>شماره/طرف</th>
                            <th className={retroTableHeader}>مبلغ/جهت</th>
                            <th className={retroTableHeader}>روش/وضعیت</th>
                            <th className={retroTableHeader}>تاریخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((h: any, i) => {
                            const amt = Number(h.amount || 0)
                            const dir = String(h.direction || '')
                            const dirCls = dir === 'in' ? '!bg-[#3a7d44]' : dir === 'out' ? '!bg-[#c35c5c]' : '!bg-[#1f2e3b]'
                            const status = String(h.status || '-')
                            return (
                              <tr key={i} className="border-b border-[#d9cfb6]">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge}`}>{toPersianDigits(h.payment_number || h.id)}</span>
                                    <div>
                                      <div className="font-semibold text-[#1f2e3b]">{h.party_name || '-'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge} ${dirCls}`}>{dir === 'in' ? 'دریافت' : dir === 'out' ? 'پرداخت' : '-'}</span>
                                    <span className={`${retroBadge}`}>{formatNumberFaSpaced(Math.abs(amt))}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`${retroBadge}`}>{h.method || '-'}</span>
                                    <span className={`${retroBadge}`}>{status}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-xs text-[#5b4a2f]">{h.server_time ? isoToJalali(h.server_time) : '-'}</div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
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

      {ledgerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setLedgerModal(null)}>
          <div className="w-[720px] max-w-[95vw] bg-[#faf4de] border-2 border-[#c5bca5] shadow-[6px_6px_0_#c5bca5] p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-[#1f2e3b]">گردش کالا #{toPersianDigits(ledgerModal.productId)}</h4>
              <button className={`${retroButton}`} onClick={()=> setLedgerModal(null)}>بستن</button>
            </div>
            {ledgerModal.loading ? (
              <div className="text-xs text-[#7a6b4f]">در حال دریافت گردش...</div>
            ) : ledgerModal.items.length ? (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full border border-[#c5bca5] bg-[#faf4de] text-xs">
                  <thead>
                    <tr>
                      <th className={retroTableHeader}>تاریخ</th>
                      <th className={retroTableHeader}>نوع</th>
                      <th className={retroTableHeader}>مقدار</th>
                      <th className={retroTableHeader}>مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerModal.items.map((it:any, idx:number) => (
                      <tr key={idx} className="border-b border-[#d9cfb6]">
                        <td className="px-3 py-2">{it.time ? isoToJalali(it.time) : '-'}</td>
                        <td className="px-3 py-2">{it.kind || '-'}</td>
                        <td className="px-3 py-2">{formatNumberFaSpaced(it.qty || 0)}</td>
                        <td className="px-3 py-2">{formatNumberFaSpaced(it.balance || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-[#7a6b4f]">رکوردی یافت نشد.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

