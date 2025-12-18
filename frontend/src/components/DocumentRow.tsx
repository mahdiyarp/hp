import React from 'react'
import { isoToJalali, formatCurrencyFa, toPersianDigits } from '../utils/num'
import { retroBadge, retroButton, retroTableHeader } from './retroTheme'

interface BaseProps {
  id: number
  number: string | null
  party_name: string | null
  total: number | null
  status: string
  server_time: string | null
  client_time: string | null
  tracking_code?: string | null
}

interface InvoiceRowProps extends BaseProps {
  kind: 'invoice'
  mode: string
  invoice_type: string
  titleMap: Record<string, string>
  onView: (id: number) => void
}

interface SaleOrderRowProps extends BaseProps {
  kind: 'saleOrder'
  invoice_id?: number | null
  onFinalize?: (id: number) => void
  onViewInvoice?: (invoiceId: number) => void
  onExport?: (id: number, format: 'csv' | 'pdf' | 'xlsx') => void
}

type DocumentRowProps = InvoiceRowProps | SaleOrderRowProps

export function DocumentTableHeader({ type }: { type: 'invoice' | 'saleOrder' }) {
  if (type === 'invoice') {
    return (
      <tr>
        <th className={retroTableHeader}>شماره</th>
        <th className={retroTableHeader}>نوع</th>
        <th className={retroTableHeader}>طرف حساب</th>
        <th className={retroTableHeader}>مبلغ</th>
        <th className={retroTableHeader}>وضعیت</th>
        <th className={retroTableHeader}>زمان‌ها</th>
        <th className={retroTableHeader}>عملیات</th>
      </tr>
    )
  }
  return (
    <tr>
      <th className={retroTableHeader}>شماره</th>
      <th className={retroTableHeader}>طرف حساب</th>
      <th className={retroTableHeader}>مبلغ</th>
      <th className={retroTableHeader}>وضعیت</th>
      <th className={retroTableHeader}>زمان‌ها</th>
      <th className={retroTableHeader}>عملیات</th>
    </tr>
  )
}

export default function DocumentRow(props: DocumentRowProps) {
  const { id, number, party_name, total, status, server_time, client_time, tracking_code } = props

  if (props.kind === 'invoice') {
    const { invoice_type, mode, titleMap, onView } = props
    return (
      <tr key={id} className="border-b border-[#d9cfb6]">
        <td className="px-3 py-2">
          {toPersianDigits(number || `#${id}`)}
          <span className="block text-[10px] text-[#7a6b4f] mt-1">حالت: {mode}</span>
          {tracking_code && (
            <span className="block text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 mt-1 rounded w-fit">
              📍 {tracking_code}
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <span
            className={
              invoice_type === 'sale'
                ? 'text-green-700 font-semibold'
                : invoice_type === 'purchase'
                  ? 'text-[var(--retro-heading-text)] font-semibold'
                  : 'text-gray-600 italic'
            }
          >
            {titleMap[invoice_type] || invoice_type}
          </span>
        </td>
        <td className="px-3 py-2">{party_name ?? 'نامشخص'}</td>
        <td className="px-3 py-2 text-left">
          {formatCurrencyFa(total || 0, 'ریال', false).numeric}{' '}
          <span className="text-xs">ریال</span>
        </td>
        <td className="px-3 py-2">
          <span className={retroBadge}>{status}</span>
        </td>
        <td className="px-3 py-2 text-left space-y-1">
          <p>سرور: {server_time ? isoToJalali(server_time) : '-'}</p>
          <p className="text-[11px] text-[#7a6b4f]">
            کلاینت: {client_time ? isoToJalali(client_time) : '---'}
          </p>
        </td>
        <td className="px-3 py-2 text-left">
          <button className={`${retroButton} text-[11px]`} onClick={() => onView(id)}>
            مشاهده
          </button>
        </td>
      </tr>
    )
  }

  const { onFinalize, onViewInvoice, invoice_id, onExport } = props
  return (
    <tr key={id} className="border-b border-[#d9cfb6]">
      <td className="px-3 py-2">
        {toPersianDigits(number || `#${id}`)}
        {tracking_code && (
          <span className="block text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 mt-1 rounded w-fit">
            📍 {tracking_code}
          </span>
        )}
      </td>
      <td className="px-3 py-2">{party_name || 'نامشخص'}</td>
      <td className="px-3 py-2 text-left">
        {formatCurrencyFa(total || 0, 'ریال', false).numeric} <span className="text-xs">ریال</span>
      </td>
      <td className="px-3 py-2">
        <span className={retroBadge}>{status}</span>
      </td>
      <td className="px-3 py-2 text-left space-y-1">
        <p>سرور: {server_time ? isoToJalali(server_time) : '-'}</p>
        <p className="text-[11px] text-[#7a6b4f]">
          کلاینت: {client_time ? isoToJalali(client_time) : '---'}
        </p>
      </td>
      <td className="px-3 py-2 text-left space-y-1">
        {status === 'draft' && onFinalize && (
          <button className={`${retroButton} text-[11px] w-full`} onClick={() => onFinalize(id)}>
            قطعی سازی
          </button>
        )}
        {invoice_id && onViewInvoice && (
          <button
            className={`${retroButton} text-[11px] w-full`}
            onClick={() => onViewInvoice(invoice_id)}
          >
            مشاهده فاکتور
          </button>
        )}
        {onExport && (
          <div className="flex flex-col gap-1">
            <button
              className={`${retroButton} text-[11px] w-full`}
              onClick={() => onExport(id, 'csv')}
            >
              خروجی CSV
            </button>
            <button
              className={`${retroButton} text-[11px] w-full`}
              onClick={() => onExport(id, 'pdf')}
            >
              خروجی PDF
            </button>
            <button
              className={`${retroButton} text-[11px] w-full`}
              onClick={() => onExport(id, 'xlsx')}
            >
              خروجی Excel
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
