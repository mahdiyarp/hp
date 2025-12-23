import React, { useState } from 'react'

import { apiPost } from '../services/api'

import { retroBadge, retroButton, retroHeading, retroInput, retroPanel } from './retroTheme'

type AnalysisResult = {
  doc_type?: string

  party?: { name?: string; role?: string }

  totals?: { grand_total?: number; tax?: number; subtotal?: number }

  suggested_journal?: { account_code: string; debit: number; credit: number; reason: string }[]
}

export default function SmartAssistantWidget() {
  const [message, setMessage] = useState('')

  const [reply, setReply] = useState('')

  const [file, setFile] = useState<File | null>(null)

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  const [busy, setBusy] = useState(false)

  const sendChat = async () => {
    if (!message.trim()) return

    setBusy(true)

    try {
      const res = await apiPost<{ reply: string }>('/api/assistant/chat', {
        message,
        mode: 'general',
      })

      setReply(res?.reply || '')
    } catch (err: any) {
      setReply(err?.message || 'ارسال پیام با خطا مواجه شد. لطفاً دوباره تلاش کنید.')
    } finally {
      setBusy(false)
    }
  }

  const uploadDoc = async () => {
    if (!file) return

    setBusy(true)

    try {
      const form = new FormData()

      form.append('file', file)

      const res = await apiPost<AnalysisResult>('/api/assistant/document/analyze', form, {
        headers: {},
      } as any)

      setAnalysis(res || null)
    } catch (err: any) {
      setReply(err?.message || 'بارگذاری یا تحلیل سند انجام نشد. لطفاً دوباره تلاش کنید.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={`${retroPanel} bg-[#f7f2e7] border border-[#e0d4b8] shadow-[6px_6px_0_rgba(0,0,0,0.08)]`}
      dir="rtl"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <p className={retroHeading}>
          دستیار هوشمند حساب‌پاک آماده است تا پرسش‌های حسابداری و درخواست‌های ثبت سند را پاسخ
          دهد. می‌توانید پیام خود را بنویسید یا در ادامه فایل دلخواه را برای تحلیل ارسال کنید.
        </p>

        {reply && <span className={retroBadge}>پاسخ جدید از دستیار دریافت شد</span>}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input
            className={retroInput}
            placeholder="سؤال یا دستور خود را بنویسید (مثلاً خلاصه فاکتور یا نحوه ثبت سند)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          />

          <button className={retroButton} onClick={sendChat} disabled={busy}>
            ارسال پیام
          </button>
        </div>

        {reply && (
          <div className={`${retroBadge} bg-white text-[#2f281f] border-[#e0d4b8]`}>{reply}</div>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <button className={retroButton} onClick={uploadDoc} disabled={busy || !file}>
            بارگذاری و تحلیل سند
          </button>
        </div>

        {analysis && (
          <div className="bg-white border border-[#e0d4b8] p-3 rounded-lg space-y-2 text-sm text-[#2f281f]">
            <div className="flex gap-2 flex-wrap">
              <span className={retroBadge}>نوع سند تشخیص داده‌شده: {analysis.doc_type || '-'}</span>

              <span className={retroBadge}>طرف حساب / مشتری: {analysis.party?.name || '-'}</span>

              <span className={retroBadge}>جمع کل گزارش‌شده: {analysis.totals?.grand_total ?? 0}</span>
            </div>

            {analysis.suggested_journal && analysis.suggested_journal.length > 0 && (
              <table className="w-full text-xs border border-[#e0d4b8]">
                <thead className="bg-[#efe8d8]">
                  <tr>
                    <th className="px-2 py-1 text-right">حساب پیشنهادی</th>

                    <th className="px-2 py-1 text-right">مبلغ بدهکار</th>

                    <th className="px-2 py-1 text-right">مبلغ بستانکار</th>

                    <th className="px-2 py-1 text-right">دلیل ثبت</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.suggested_journal.map((row, idx) => (
                    <tr key={idx} className="border-t border-[#e0d4b8]">
                      <td className="px-2 py-1">{row.account_code}</td>

                      <td className="px-2 py-1">{row.debit}</td>

                      <td className="px-2 py-1">{row.credit}</td>

                      <td className="px-2 py-1">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
