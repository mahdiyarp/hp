import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { fetchWithAuth, loginDeveloper } from '../services/auth'
import {
  retroButton,
  retroHeading,
  retroPanelPadded,
  retroPanel,
  retroMuted,
  retroTableHeader,
} from '../components/retroTheme'
import { formatNumberFa, isoToJalali } from '../utils/num'
import { toast } from '../utils/toast'

interface RoadmapChecklist {
  text: string
  done: boolean
}

interface RoadmapSection {
  title: string
  bodyText: string
  checklists: RoadmapChecklist[]
}

interface RoadmapResponse {
  title: string
  sections: RoadmapSection[]
  markdown?: string
  updated_at?: string
}

export default function RoadmapModule({ onNavigate }: ModuleComponentProps) {
  const [data, setData] = useState<RoadmapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadRoadmap()
  }, [])

  async function loadRoadmap() {
    setLoading(true)
    setError(null)
    try {
      let res = await fetchWithAuth('/api/roadmap', { method: 'GET' })
      if (res.status === 401 || res.status === 403) {
        await loginDeveloper()
        res = await fetchWithAuth('/api/roadmap', { method: 'GET' })
      }
      if (res.status === 404) {
        setHidden(true)
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = (await res.json()) as RoadmapResponse
      setData(data)
    } catch (err) {
      console.error(err)
      setError('نقشه راه در دسترس نیست. بعداً دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!data) return { total: 0, done: 0, percent: 0 }
    const checklist = data.sections.flatMap((section) => section.checklists || [])
    if (checklist.length === 0) return { total: 0, done: 0, percent: 0 }
    const done = checklist.filter((item) => item.done).length
    return { total: checklist.length, done, percent: Math.round((done / checklist.length) * 100) }
  }, [data])

  const updatedAt = useMemo(() => {
    if (!data?.updated_at) return null
    try {
      return isoToJalali(data.updated_at)
    } catch (e) {
      return data.updated_at
    }
  }, [data])

  const copyMarkdown = async () => {
    if (!data?.markdown) return
    try {
      await navigator.clipboard.writeText(data.markdown)
      toast.success('متن نقشه راه کپی شد')
    } catch (err) {
      toast.error('مرورگر اجازه کپی خودکار نداد')
    }
  }

  const downloadMarkdown = () => {
    if (!data?.markdown) return
    const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hesabpak-roadmap.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 text-center`}>
        <p className={`${retroHeading} tracking-[0.4em]`}>در حال بارگذاری نقشه راه...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${retroPanelPadded} space-y-4`}>
        <p className={`${retroHeading} text-[#7a1f1f]`}>{error}</p>
        <div className="flex gap-3 flex-wrap">
          <button className={retroButton} onClick={loadRoadmap}>
            تلاش مجدد
          </button>
          <button className={retroButton} onClick={() => onNavigate('dashboard')}>
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    )
  }

  if (hidden) return null
  if (!data) return null

  return (
    <div className="space-y-6">
      <section className={retroPanelPadded}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={retroHeading}>Planning Console</p>
            <h2 className="text-2xl font-semibold mt-1">{data.title}</h2>
            {updatedAt && (
              <p className={`text-[11px] ${retroMuted} mt-1`}>آخرین به‌روزرسانی: {updatedAt}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={retroButton} onClick={loadRoadmap}>
              بازخوانی
            </button>
            <button className={retroButton} onClick={copyMarkdown}>
              کپی Markdown
            </button>
            <button className={retroButton} onClick={downloadMarkdown}>
              دانلود
            </button>
            <button className={retroButton} onClick={() => onNavigate('dashboard')}>
              بازگشت به داشبورد
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
          <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner">
            <p className={retroHeading}>تسک‌ها</p>
            <p className="text-lg font-semibold">{formatNumberFa(stats.total)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner">
            <p className={retroHeading}>تکمیل‌شده</p>
            <p className="text-lg font-semibold text-green-700">{formatNumberFa(stats.done)}</p>
          </div>
          <div className="border border-[#bfb69f] bg-[#faf4de] px-4 py-3 shadow-inner">
            <p className={retroHeading}>درصد پیشرفت</p>
            <p className="text-lg font-semibold">{formatNumberFa(stats.percent)}٪</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-[#e0d8c1] rounded-full overflow-hidden border border-[#bfb69f]">
          <div
            className="h-full bg-[#154b5f] transition-all duration-500"
            style={{ width: `${stats.percent}%` }}
          ></div>
        </div>
      </section>

      <section className="space-y-4">
        {data.sections.map((section) => (
          <article key={section.title} className={retroPanelPadded}>
            <header className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className={retroHeading}>{section.title}</p>
                {section.bodyText && (
                  <p className="text-xs text-[#4b3d2d] mt-2 leading-6 whitespace-pre-line">
                    {section.bodyText}
                  </p>
                )}
              </div>
              {section.checklists.length > 0 && (
                <span className="text-[11px] px-2 py-1 rounded border border-[#bfb69f] bg-[#f6f1df]">
                  {formatNumberFa(
                    Math.round(
                      (section.checklists.filter((item) => item.done).length /
                        section.checklists.length) *
                        100,
                    ),
                  )}
                  ٪
                </span>
              )}
            </header>

            {section.checklists.length > 0 && (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm mt-3">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>وضعیت</th>
                    <th className={retroTableHeader}>شرح</th>
                  </tr>
                </thead>
                <tbody>
                  {section.checklists.map((item, idx) => (
                    <tr key={`${section.title}-${idx}`} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[11px] ${
                            item.done ? 'bg-green-700 text-white' : 'bg-yellow-500 text-[#1f2e3b]'
                          }`}
                        >
                          {item.done ? 'انجام‌شده' : 'در انتظار'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{item.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
