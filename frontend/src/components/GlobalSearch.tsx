import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiPost } from '../services/api'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroInput,
  retroPanel,
  retroMuted,
} from './retroTheme'
import { formatNumberFa, toPersianDigits } from '../utils/num'

type SearchIndex = 'products' | 'persons' | 'invoices' | 'payments'

type FocusType = 'product' | 'person' | 'invoice' | 'payment'

interface SearchHit {
  [key: string]: unknown
}

type SearchResponse = Record<SearchIndex, { hits: SearchHit[] }>

interface GlobalSearchProps {
  onNavigate: (moduleId: string) => void
}

const INDEX_LABELS: Record<SearchIndex, string> = {
  products: 'کالاها',
  persons: 'طرف‌های حساب',
  invoices: 'فاکتورها',
  payments: 'اسناد دریافت/پرداخت',
}

const DEFAULT_INDEXES: SearchIndex[] = ['products', 'persons', 'invoices', 'payments']

const MODULE_TARGETS: Record<SearchIndex, { module: string; focus: FocusType | null }> = {
  products: { module: 'inventory', focus: 'product' },
  persons: { module: 'people', focus: 'person' },
  invoices: { module: 'sales', focus: 'invoice' },
  payments: { module: 'finance', focus: 'payment' },
}

function resolveHitId(index: SearchIndex, hit: SearchHit) {
  if (hit.id !== undefined && hit.id !== null) return hit.id
  if (index === 'invoices' && hit.invoice_id) return hit.invoice_id
  if (index === 'payments' && hit.payment_id) return hit.payment_id
  if (index === 'products' && hit.product_id) return hit.product_id
  if (index === 'persons' && hit.person_id) return hit.person_id
  return null
}

function extractPrimaryText(index: SearchIndex, hit: SearchHit): string {
  if (index === 'products') {
    return String(hit.name ?? hit.id ?? 'محصول ناشناخته')
  }
  if (index === 'persons') {
    return String(hit.name ?? hit.party_name ?? hit.id ?? 'مخاطب ناشناخته')
  }
  if (index === 'invoices') {
    const number = hit.invoice_number ?? hit.id
    const party = hit.party_name ?? hit.party_id ?? ''
    return `${number ?? 'فاکتور'} ${party ? `| ${party}` : ''}`.trim()
  }
  if (index === 'payments') {
    const number = hit.payment_number ?? hit.id
    const party = hit.party_name ?? hit.party_id ?? ''
    return `${number ?? 'سند'} ${party ? `| ${party}` : ''}`.trim()
  }
  return String(hit.id ?? 'رکورد')
}

function extractSecondaryText(index: SearchIndex, hit: SearchHit): string | null {
  if (index === 'products') {
    const unit = hit.unit ? `واحد: ${hit.unit}` : ''
    const group = hit.group ? `گروه: ${hit.group}` : ''
    return [unit, group].filter(Boolean).join(' | ') || null
  }
  if (index === 'invoices') {
    const total = hit.total ? `مبلغ: ${formatNumberFa(Number(hit.total))}` : ''
    const status = hit.status ? `وضعیت: ${hit.status}` : ''
    return [total, status].filter(Boolean).join(' | ') || null
  }
  if (index === 'payments') {
    const amount = hit.amount ? `مبلغ: ${formatNumberFa(Number(hit.amount))}` : ''
    const method = hit.method ? `روش: ${hit.method}` : ''
    return [amount, method].filter(Boolean).join(' | ') || null
  }
  return null
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setVisible(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalHits = useMemo(() => {
    if (!results) return 0
    return DEFAULT_INDEXES.reduce((acc, idx) => acc + (results[idx]?.hits?.length ?? 0), 0)
  }, [results])

  const runSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      setError('عبارت جستجو را وارد کنید.')
      setResults(null)
      setVisible(false)
      return
    }
    if (trimmed.length < 2) {
      setError('برای جستجو حداقل دو کاراکتر وارد کنید.')
      setResults(null)
      setVisible(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        q: trimmed,
        indexes: DEFAULT_INDEXES,
        limit: 5,
      }
      const res = await apiPost<SearchResponse>('/api/search', payload)
      setResults(res)
      setVisible(true)
    } catch (err) {
      console.error(err)
      setError('جستجو با خطا مواجه شد.')
      setResults(null)
      setVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateSearch = () => {
    if (query.trim()) {
      sessionStorage.setItem('hesabpak_global_search_query', query.trim())
    }
    onNavigate('search')
    setVisible(false)
  }

  const handleHitAction = (index: SearchIndex, hit: SearchHit) => {
    const mapping = MODULE_TARGETS[index]
    if (!mapping) return
    const hitId = resolveHitId(index, hit)
    if (mapping.focus && hitId !== null && hitId !== undefined) {
      try {
        sessionStorage.setItem(
          'hesabpak_global_focus',
          JSON.stringify({ type: mapping.focus, id: hitId }),
        )
      } catch (err) {
        console.warn('Cannot persist global focus', err)
      }
    }
    onNavigate(mapping.module)
    setVisible(false)
  }

  return (
    <div className="relative w-full max-w-lg" ref={containerRef}>
      <form onSubmit={runSearch} className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            className={`${retroInput} w-full pr-9`}
            placeholder="جستجوی سریع..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => {
              if (results) setVisible(true)
            }}
          />
          {loading && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#7a6b4f]">
              در حال جستجو...
            </span>
          )}
        </div>
        <button type="submit" className={`${retroButton} !bg-[#2d3b45]`}>
          جستجو
        </button>
      </form>
      {visible && (
        <div className={`${retroPanel} absolute right-0 mt-2 w-full z-30 space-y-3 p-3`}>
          <header className="flex items-center justify-between gap-2">
            <p className={`${retroHeading} text-[#1f2e3b]`}>نتایج سریع</p>
            <span className={`${retroBadge}`}>تعداد کل: {formatNumberFa(totalHits)}</span>
          </header>
          {error && <p className={`text-xs ${retroMuted}`}>{error}</p>}
          {!error && results && totalHits === 0 && (
            <p className={`text-xs ${retroMuted}`}>نتیجه‌ای یافت نشد.</p>
          )}
          {!error && results && totalHits > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {DEFAULT_INDEXES.map(idx => {
                const hits = results[idx]?.hits ?? []
                if (hits.length === 0) return null
                return (
                  <div key={idx} className="border border-[#c5bca5] bg-[#faf4de] px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={retroHeading}>{INDEX_LABELS[idx]}</span>
                      <span className={`${retroBadge} text-[10px]`}>
                        {formatNumberFa(hits.length)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-[#1f2e3b] leading-5">
                      {hits.map((hit, index) => (
                        <li
                          key={index}
                          className="border border-dashed border-[#bfb69f] px-2 py-1 bg-[#f6f1df] hover:border-[#1f2e3b] transition-colors"
                        >
                          <button
                            type="button"
                            className="w-full text-right space-y-1"
                            onClick={() => handleHitAction(idx, hit)}
                          >
                            <p className="font-semibold">
                              {toPersianDigits(extractPrimaryText(idx, hit))}
                            </p>
                            {extractSecondaryText(idx, hit) && (
                              <p className={`text-[11px] ${retroMuted}`}>
                                {toPersianDigits(extractSecondaryText(idx, hit) ?? '')}
                              </p>
                            )}
                            <p className="text-[10px] text-[#5b4a2f]">
                              مشاهده در ماژول {INDEX_LABELS[idx]}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap justify-between items-center gap-2 text-[11px]">
            <button
              type="button"
              className={`${retroButton} !bg-[#1f2e3b]`}
              onClick={handleNavigateSearch}
            >
              مشاهده نمای کامل
            </button>
            <button
              type="button"
              className={`${retroButton} !bg-[#5b4a2f]`}
              onClick={() => {
                setVisible(false)
                setResults(null)
                setError(null)
              }}
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
