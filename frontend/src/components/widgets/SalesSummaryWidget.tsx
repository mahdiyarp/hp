import React from 'react'
import { retroHeading, retroPanelPadded } from '../retroTheme'
import { formatNumberFa } from '../../utils/num'

interface SalesSummaryWidgetProps {
  summary: {
    invoices: {
      today: number
      '7days': number
      month: number
    }
  } | null
}

export default function SalesSummaryWidget({ summary }: SalesSummaryWidgetProps) {
  if (!summary) {
    return (
      <div className={retroPanelPadded}>
        <p className={retroHeading}>خلاصه فروش</p>
        <p className="text-xs text-[#7a6b4f]">اطلاعات خلاصه در دسترس نیست.</p>
      </div>
    )
  }

  return (
    <div className={retroPanelPadded}>
      <p className={retroHeading}>خلاصه فروش</p>
      <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm mt-2">
        <thead>
          <tr>
            <th className="px-3 py-2 text-right border-b border-[#d9cfb6]">شاخص</th>
            <th className="px-3 py-2 text-left border-b border-[#d9cfb6]">مقدار</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">فاکتورهای امروز</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(summary.invoices.today)}</td>
          </tr>
          <tr className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">فاکتورهای ۷ روز اخیر</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(summary.invoices['7days'])}</td>
          </tr>
          <tr>
            <td className="px-3 py-2">فاکتورهای ماه جاری</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(summary.invoices.month)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
