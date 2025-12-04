import React, { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { retroHeading, retroPanelPadded, retroButton, retroBadge } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'
// Local data interface to avoid circular type imports
type CashReportData = {
  balance: number
}

interface CashReportProps {
  cashAll: CashReportData | null
  cashMethods: Record<string, number>
  onExport: () => void
}

export default function CashReport({ cashAll, cashMethods, onExport }: CashReportProps) {
  const cashChartData = useMemo(() => {
    const entries = Object.entries(cashMethods)
    if (entries.length === 0) return null
    return {
      labels: entries.map(([method]) => method),
      datasets: [
        {
          label: 'تراز',
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map((_, idx) =>
            ['#154b5f', '#d7caa4', '#f4a259', '#8fb339', '#6c4a4a'][idx % 5],
          ),
          borderWidth: 0,
        },
      ],
    }
  }, [cashMethods])

  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <p className={retroHeading}>Cash Position</p>
          <h3 className="text-lg font-semibold mt-2">تراز نقدی</h3>
        </div>
        <div className="flex gap-2">
          <button className={retroButton} onClick={onExport} disabled={!cashAll}>
            خروجی CSV
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
          <p className={retroHeading}>کل منابع نقدی</p>
          <p className="text-lg font-semibold">
            {formatNumberFa(cashAll?.balance ?? 0)} ریال
          </p>
        </div>
        <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
          <p className={retroHeading}>روش‌های اصلی</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(cashMethods).map(([method, balance]) => (
              <span key={method} className={retroBadge}>
                {method} : {formatNumberFa(balance ?? 0)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {cashChartData && (
        <div className="max-w-xl mx-auto">
          <Doughnut
            data={cashChartData}
            options={{
              plugins: {
                legend: { position: 'bottom' as const, labels: { usePointStyle: true } },
              },
            }}
          />
        </div>
      )}
    </section>
  )
}
