import React, { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { retroHeading, retroPanelPadded, retroButton } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'
// Use a local data interface to avoid circular type imports
type PnLReportData = {
  sales: number
  purchases: number
  gross_profit: number
}

interface PnLReportProps {
  pnl: PnLReportData | null
  onExport: () => void
}

export default function PnLReport({ pnl, onExport }: PnLReportProps) {
  const pnlChartData = useMemo(() => {
    if (!pnl) return null
    return {
      labels: ['فروش', 'خرید', 'سود ناخالص'],
      datasets: [
        {
          label: 'ریال',
          data: [pnl.sales, pnl.purchases, pnl.gross_profit],
          backgroundColor: ['#4f6f52', '#c35c5c', '#1f2e3b'],
          borderWidth: 0,
        },
      ],
    }
  }, [pnl])

  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className={retroHeading}>P&L Report</p>
          <h2 className="text-2xl font-semibold mt-2">گزارش سود و زیان</h2>
        </div>
        <button className={retroButton} onClick={onExport} disabled={!pnl}>
          خروجی CSV
        </button>
      </header>

      {pnl ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>فروش</p>
            <p className="text-lg font-semibold">{formatNumberFa(pnl.sales)} ریال</p>
          </div>
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>خرید</p>
            <p className="text-lg font-semibold">{formatNumberFa(pnl.purchases)} ریال</p>
          </div>
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>سود ناخالص</p>
            <p className="text-lg font-semibold">{formatNumberFa(pnl.gross_profit)} ریال</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#7a6b4f]">گزارش سود و زیان بارگذاری نشد.</p>
      )}

      {pnlChartData && (
        <div className="bg-white border border-[#d9cfb6] rounded-sm p-3">
          <Bar
            data={pnlChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true, position: 'top' as const } },
            }}
            height={220}
          />
        </div>
      )}
    </section>
  )
}
