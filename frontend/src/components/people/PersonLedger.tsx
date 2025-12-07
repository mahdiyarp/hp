import React from 'react'
import { apiPost } from '../../services/api'
import { retroButton, retroHeading, retroPanelPadded, retroTableHeader } from '../retroTheme'
import { formatNumberFa, isoToJalali } from '../../utils/num'
import * as PeopleModule from '../../modules/PeopleModule'

interface PersonLedgerProps {
  ledgerData: PeopleModule.PersonLedger | null
  onClose: () => void
  onExport: () => void
}

export default function PersonLedger({ ledgerData, onClose, onExport }: PersonLedgerProps) {
  if (!ledgerData) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${retroPanelPadded} max-w-6xl w-full max-h-[90vh] overflow-y-auto space-y-4`}>
        <header className="flex items-center justify-between gap-3 sticky top-0 bg-[#fdf7e6] pb-3 border-b border-[#c5bca5]">
          <div>
            <p className={retroHeading}>گردش حساب</p>
            <h3 className="text-xl font-semibold mt-2">{ledgerData.person.name}</h3>
            <p className="text-xs text-[#7a6b4f] mt-1">
              {ledgerData.person.kind === 'customer' ? 'مشتری' : ledgerData.person.kind === 'supplier' ? 'تأمین‌کننده' : 'سایر'}
              {ledgerData.person.mobile && ` | ${ledgerData.person.mobile}`}
              {ledgerData.person.code && ` | کد: ${ledgerData.person.code}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={onExport}>
              خروجی CSV
            </button>
            <button
              className={`${retroButton} !bg-[#5b4a2f]`}
              onClick={onClose}
            >
              بستن
            </button>
          </div>
        </header>
        <>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>کل بدهکار</p>
                <p className="text-lg font-semibold text-red-700">
                  {formatNumberFa(ledgerData.debit_total)} ریال
                </p>
              </div>
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>کل بستانکار</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatNumberFa(ledgerData.credit_total)} ریال
                </p>
              </div>
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>مانده نهایی</p>
                <p className={`text-lg font-semibold ${ledgerData.net_balance > 0 ? 'text-red-700' : ledgerData.net_balance < 0 ? 'text-green-700' : 'text-[#7a6b4f]'}`}>
                  {ledgerData.net_balance === 0 
                    ? 'تسویه شده'
                    : `${formatNumberFa(Math.abs(ledgerData.net_balance))} ریال ${ledgerData.net_balance > 0 ? '(بده)' : '(بستان)'}`
                  }
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>تاریخ</th>
                    <th className={retroTableHeader}>شرح</th>
                    <th className={retroTableHeader}>بدهکار</th>
                    <th className={retroTableHeader}>بستانکار</th>
                    <th className={retroTableHeader}>مانده</th>
                    <th className={retroTableHeader}>سند</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.entries.map((entry: PeopleModule.LedgerEntry) => (
                    <tr key={entry.id} className="border-b border-[#d9cfb6] hover:bg-[#f6f1df]">
                      <td className="px-3 py-2 text-xs">
                        {new Date(entry.entry_date).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="px-3 py-2">
                        {entry.description}
                        {entry.invoice && (
                          <span className="block text-[10px] text-blue-700 mt-1">
                            فاکتور: {entry.invoice.invoice_number}
                          </span>
                        )}
                        {entry.payment && (
                          <span className="block text-[10px] text-green-700 mt-1">
                            پرداخت: {entry.payment.method}
                            {entry.payment.reference && ` - ${entry.payment.reference}`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left font-mono">
                        {entry.debit_account === 'AccountsReceivable' ? (
                          <span className="text-red-700">{formatNumberFa(entry.amount)}</span>
                        ) : (
                          <span className="text-[#7a6b4f]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left font-mono">
                        {entry.credit_account === 'AccountsReceivable' ? (
                          <span className="text-green-700">{formatNumberFa(entry.amount)}</span>
                        ) : (
                          <span className="text-[#7a6b4f]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left font-mono font-semibold">
                        <span className={entry.running_balance > 0 ? 'text-red-700' : entry.running_balance < 0 ? 'text-green-700' : 'text-[#7a6b4f]'}>
                          {formatNumberFa(Math.abs(entry.running_balance))}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {entry.invoice && (
                          <button 
                            className="text-blue-700 underline hover:text-blue-900"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const resp = await apiPost<{ token: string; download_url: string; expires_at?: string }>(
                                  `/api/exports/invoice/${entry.invoice!.id}?format=pdf`
                                )
                                if (resp && resp.download_url) {
                                  window.open(resp.download_url, '_blank')
                                }
                              } catch (err) {
                                console.error('Failed to export invoice', err)
                                alert('صدور فایل فاکتور ممکن نشد')
                              }
                            }}
                          >
                            مشاهده فاکتور
                          </button>
                        )}
                        {entry.payment && !entry.invoice && (
                          <span className="text-green-700">رسید پرداخت</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </>

      </div>
    </div>
  )
}
