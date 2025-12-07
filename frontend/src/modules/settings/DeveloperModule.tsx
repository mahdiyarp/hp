import React from 'react'
import type { ModuleComponentProps } from '../../components/layout/AppShell'
import { retroHeading, retroPanelPadded } from '../../components/retroTheme'

export default function DeveloperModule({ smartDate }: ModuleComponentProps) {
  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header>
        <p className={retroHeading}>Developer Tools</p>
        <h2 className="text-2xl font-semibold mt-2">ابزارهای توسعه‌دهنده</h2>
        <p className="text-xs text-[#7a6b4f] mt-2">فقط برای نقش Developer نمایش داده می‌شود</p>
        <p className="text-[11px] text-[#7a6b4f] mt-1">تاریخ مرجع: {smartDate.jalali ?? '—'} | {smartDate.isoDate ?? '—'}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
          <p className={retroHeading}>لاگ‌ها و دیباگ</p>
          <p className="text-xs text-[#7a6b4f]">در این نسخه فقط صفحه‌ی placeholder برای جلوگیری از تغییر تم.</p>
        </div>
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
          <p className={retroHeading}>اطلاعات سیستم</p>
          <p className="text-xs text-[#7a6b4f]">می‌توان بعداً ابزارهای تست API و snapshot اضافه کرد.</p>
        </div>
      </div>
    </section>
  )
}
