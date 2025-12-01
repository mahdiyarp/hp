import React from 'react'
import ReportFilters from './ReportFilters'
import ReportViewer from './ReportViewer'

export default function ReportsModule() {
  return (
    <div className="space-y-6" dir="rtl">
      <header className="p-4 border-b">
        <h2 className="text-xl font-semibold">ط·آ¹ط¢آ¯ط·آ·ط¢آ²ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ´ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§</h2>
        <p className="text-sm text-[#7a6b4f]">ط·آ·ط¢آ¯ط·آ·ط¢آ§ط·آ·ط¢آ´ط·آ·ط¢آ¨ط·آ¸ط«â€ ط·آ·ط¢آ±ط·آ·ط¢آ¯ ط·آ¹ط¢آ¯ط·آ·ط¢آ²ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ´ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§ط·آ·ط¥â€™ ط·آ¸ط¸آ¾?ط·آ¸أ¢â‚¬â€چط·آ·ط¹آ¾ط·آ·ط¢آ±ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§ ط·آ¸ط«â€  ط·آ·ط¢آµط·آ·ط¢آ§ط·آ·ط¢آ¯ط·آ·ط¢آ±ط·آ·ط¢آ§ط·آ·ط¹آ¾</p>
      </header>
      <div className="p-4">
        <ReportFilters />
        <ReportViewer />
      </div>
    </div>
  )
}
