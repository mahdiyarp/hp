import React from 'react'
import { retroBadge, retroButton, retroTableHeader } from '../retroTheme'
import { formatNumberFa, isoToJalali } from '../../utils/num'
import { Payment } from '../../modules/FinanceModule'

interface PaymentsListProps {
  payments: Payment[]
  onViewInvoice: (payment: Payment) => void
  onViewLedger: (party: string) => void
}

export default function PaymentsList({ payments, onViewInvoice, onViewLedger }: PaymentsListProps) {
  return (
    <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
      <thead>
        <tr>
          <th className={retroTableHeader}>شماره</th>
          <th className={retroTableHeader}>جهت</th>
          <th className={retroTableHeader}>روش</th>
          <th className={retroTableHeader}>طرف حساب</th>
          <th className={retroTableHeader}>مبلغ</th>
          <th className={retroTableHeader}>وضعیت</th>
          <th className={retroTableHeader}>تاریخ</th>
          <th className={retroTableHeader}>لینک</th>
        </tr>
      </thead>
      <tbody>
        {payments.map(pay => (
          <tr key={pay.id} className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">
              {pay.payment_number ?? `#${pay.id}`}
              {(pay as any).tracking_code && (
                <span className="block text-[8px] bg-yellow-100 text-yellow-800 px-1 py-0.5 mt-1 rounded truncate">
                  📍 {(pay as any).tracking_code}
                </span>
              )}
            </td>
            <td className="px-3 py-2">
              <span className={`${retroBadge} ${pay.direction === 'in' ? '!bg-green-700' : '!bg-red-700'}`}>{pay.direction === 'in' ? 'دریافتی' : 'پرداختی'}</span>
            </td>
            <td className="px-3 py-2">{pay.method ?? 'نامشخص'}</td>
            <td className="px-3 py-2">
              {pay.party_name ?? 'نامشخص'}
              {pay.party_name && (
                <button
                  onClick={() => onViewLedger(pay.party_name!)}
                  className="ml-2 text-[10px] underline text-[#1f2e3b] hover:text-[#5b4a2f]"
                >گردش</button>
              )}
            </td>
            <td className="px-3 py-2 text-left">{formatNumberFa(pay.amount)}</td>
            <td className="px-3 py-2">
              <span className={`${retroBadge}`}>{pay.status}</span>
            </td>
            <td className="px-3 py-2 text-left">
              {isoToJalali(pay.server_time)}
              {pay.due_date && (
                <span className="block text-[10px] text-[#7a6b4f] mt-1">
                  سررسید: {isoToJalali(pay.due_date)}
                </span>
              )}
            </td>
            <td className="px-3 py-2 text-left space-x-1">
              {(pay as any).tracking_code && (
                <button
                  onClick={() => window.open(`/trace/${(pay as any).tracking_code}`, '_blank')}
                  className="text-[11px] px-2 py-1 border border-purple-700 bg-purple-100 hover:bg-purple-200 transition"
                >🔍</button>
              )}
              {(pay as any).invoice_id || pay.reference ? (
                <button
                  onClick={() => onViewInvoice(pay)}
                  className="text-[11px] px-2 py-1 border border-[#c5bca5] bg-[#ece5d1] hover:bg-[#e0d6bc] transition"
                >فاکتور</button>
              ) : (
                <span className="text-[10px] text-[#7a6b4f]">---</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
