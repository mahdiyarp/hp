import React from 'react'
import { retroHeading, retroPanelPadded } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'

interface FinancialSummaryWidgetProps {
  summary: {
    receipts_today: number
    payments_today: number
    net_today: number
    cash_balances: Record<string, number>
  } | null
}

export default function FinancialSummaryWidget({ summary }: FinancialSummaryWidgetProps) {
  if (!summary) {
    return (
      <div className={retroPanelPadded}>
        <p className={retroHeading}>خلاصه مالی</p>
        <p className="text-xs text-[#7a6b4f]">اطلاعات خلاصه در دسترس نیست.</p>
      </div>
    )
  }

  return (
    <div className={retroPanelPadded}>
      <p className={retroHeading}>خلاصه مالی</p>
      <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm mt-2">
        <thead>
          <tr>
            <th className="px-3 py-2 text-right border-b border-[#d9cfb6]">شاخص</th>
            <th className="px-3 py-2 text-left border-b border-[#d9cfb6]">مقدار</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">دریافتی‌های امروز</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(summary.receipts_today)} ریال</td>
          </tr>
          <tr className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">پرداخت‌های امروز</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(summary.payments_today)} ریال</td>
          </tr>
          <tr>
            <td className="px-3 py-2 font-semibold text-[#1f2e3b]">خالص جریان نقدی</td>
            <td className="px-3 py-2 text-left font-semibold">
              {formatNumberFa(summary.net_today)} ریال
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-4 text-xs">
        <p className={`${retroHeading} mb-1`}>Cash Balances</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(summary.cash_balances).map(([method, value]) => (
            <div
              key={method}
              className="border border-[#bfb69f] bg-[#f6f1df] px-3 py-2 shadow-inner"
            >
              <p className={`${retroHeading} text-[10px] leading-relaxed`}>{method}</p>
              <p className="text-sm font-semibold">{formatNumberFa(value)} ریال</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
