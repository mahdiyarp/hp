import React, { useMemo } from 'react'
import { retroHeading, retroPanelPadded } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'

interface TrendPoint {
  date: string
  total: number
}

interface SalesTrendWidgetProps {
  trend: TrendPoint[]
  onRefresh: () => void
}

export default function SalesTrendWidget({ trend, onRefresh }: SalesTrendWidgetProps) {
  const maxTrend = useMemo(() => trend.reduce((acc, cur) => Math.max(acc, cur.total), 0), [trend])

  return (
    <div className={retroPanelPadded}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={retroHeading}>روند فروش</p>
          <h3 className="text-lg font-semibold mt-2">روند فروش ۳۰ روز اخیر</h3>
        </div>
        <button className="px-3 py-1 border-2 border-[#c5bca5] bg-[#faf4de] text-[#1f2e3b] hover:bg-white text-[11px]" onClick={onRefresh}>
          به‌روزرسانی
        </button>
      </header>
      {trend.length > 0 ? (
        <div className="h-48 flex items-end gap-1">
          {trend.map(point => {
            const ratio = maxTrend > 0 ? point.total / maxTrend : 0
            const barHeight = Math.max(6, ratio * 100)
            return (
              <div key={point.date} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-[#154b5f] transition-all duration-300"
                  style={{ height: `${barHeight}%` }}
                  title={`${point.date} : ${formatNumberFa(point.total)} ریال`}
                ></div>
                <span className="text-[10px] text-[#7a6b4f]">
                  {new Intl.DateTimeFormat('fa-IR', { month: 'numeric', day: '2-digit' }).format(
                    new Date(point.date),
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-[#7a6b4f]">داده‌ای برای نمایش روند فروش وجود ندارد.</p>
      )}
    </div>
  )
}
