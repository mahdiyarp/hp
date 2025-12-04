import React from 'react'
import { retroBadge, retroTableHeader } from '../retroTheme'
import { formatNumberFa, isoToJalali } from '../../utils/num'
import { CheckDue } from '../../modules/FinanceModule'

interface ChecksListProps {
  checks: CheckDue[]
}

export default function ChecksList({ checks }: ChecksListProps) {
  return (
    <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
      <thead>
        <tr>
          <th className={retroTableHeader}>شماره</th>
          <th className={retroTableHeader}>طرف حساب</th>
          <th className={retroTableHeader}>مبلغ</th>
          <th className={retroTableHeader}>سررسید</th>
          <th className={retroTableHeader}>وضعیت</th>
        </tr>
      </thead>
      <tbody>
        {checks.map(check => (
          <tr key={check.id} className="border-b border-[#d9cfb6]">
            <td className="px-3 py-2">{check.payment_number ?? `#${check.id}`}</td>
            <td className="px-3 py-2">{check.party_name ?? 'نامشخص'}</td>
            <td className="px-3 py-2 text-left">{formatNumberFa(check.amount)}</td>
            <td className="px-3 py-2 text-left">
              {check.due_date ? isoToJalali(check.due_date) : '-'}
            </td>
            <td className="px-3 py-2">
              <span className={retroBadge}>{check.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
