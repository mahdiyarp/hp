import React, { useMemo } from 'react'
import { retroHeading, retroPanelPadded, retroButton, retroTableHeader } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'
import { StockValuation } from '../../modules/ReportsModule'

interface StockValuationReportProps {
  stock: StockValuation[]
  onExport: () => void
}

export default function StockValuationReport({ stock, onExport }: StockValuationReportProps) {
  const stockTotals = useMemo(() => {
    const count = stock.length
    const totalValue = stock.reduce((acc, item) => acc + (item.total_value || 0), 0)
    return { count, totalValue }
  }, [stock])

  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <p className={retroHeading}>Stock Valuation</p>
          <h3 className="text-lg font-semibold mt-2">ارزش موجودی</h3>
          <p className="text-xs text-[#7a6b4f] mt-2">
            تعداد کالا: {formatNumberFa(stockTotals.count)} | ارزش کل:{' '}
            {formatNumberFa(stockTotals.totalValue)} ریال
          </p>
        </div>
        <button className={retroButton} onClick={onExport} disabled={stock.length === 0}>
          خروجی CSV
        </button>
      </header>
      {stock.length > 0 ? (
        <table className="w-full border border-[var(--retro-border)] bg-[var(--retro-panel-bg)] text-sm">
          <thead>
            <tr>
              <th className={retroTableHeader}>کالا</th>
              <th className={retroTableHeader}>موجودی</th>
              <th className={retroTableHeader}>قیمت واحد</th>
              <th className={retroTableHeader}>ارزش کل</th>
            </tr>
          </thead>
          <tbody>
            {stock.slice(0, 12).map(item => (
              <tr key={item.product_id} className="border-b border-[#d9cfb6]">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-left">{formatNumberFa(item.inventory)}</td>
                <td className="px-3 py-2 text-left">
                  {item.unit_price ? formatNumberFa(item.unit_price) : 'نامشخص'}
                </td>
                <td className="px-3 py-2 text-left">
                  {formatNumberFa(item.total_value)} ریال
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-[#7a6b4f]">اطلاعات ارزش موجودی در دسترس نیست.</p>
      )}
    </section>
  )
}
