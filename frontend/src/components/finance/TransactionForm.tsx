import React from 'react'
import {
  retroButton,
  retroHeading,
  retroInput,
} from '../retroTheme'
import Alert from '../Alert'
import { PaymentFormState, PersonOption, PaymentMethod } from '../../modules/FinanceModule'
import { formatNumberFa, isoToJalali } from '../../utils/num'
import { parseJalaliInput } from '../../utils/date'

interface TransactionFormProps {
  form: PaymentFormState
  onFormChange: (field: keyof PaymentFormState, value: string) => void
  onDueDateChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  creating: boolean
  error: string | null
  success: string | null
  persons: PersonOption[]
  peopleLoading: boolean
  openInvoices: any[]
  invoicesLoading: boolean
  paymentMethods: PaymentMethod[]
}

export default function TransactionForm({
  form,
  onFormChange,
  onDueDateChange,
  onSubmit,
  onClose,
  creating,
  error,
  success,
  persons,
  peopleLoading,
  openInvoices,
  invoicesLoading,
  paymentMethods,
}: TransactionFormProps) {
  return (
    <section className="p-4 bg-gray-100 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className={retroHeading}>فرم ثبت تراکنش</p>
          <h3 className="text-lg font-semibold mt-2">
            {form.direction === 'in' ? 'ثبت دریافت نقدی' : 'ثبت پرداخت نقدی'}
          </h3>
        </div>
        <button
          className={retroButton}
          onClick={onClose}
        >
          بستن فرم
        </button>
      </header>
      <form className="space-y-4" onSubmit={onSubmit}>
        <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>طرف حساب *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={form.party_name}
                  onChange={e => onFormChange('party_name', e.target.value)}
                  placeholder="نام طرف حساب"
                  required
                  list="payment-persons"
                />
                <datalist id="payment-persons">
                  {persons.map(person => (
                    <option key={person.id} value={person.name}>
                      {person.kind ? `${person.name} (${person.kind})` : person.name}
                    </option>
                  ))}
                </datalist>
                {peopleLoading && (
                  <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری طرف‌های حساب...</p>
                )}
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>مبلغ *</label>
                <input
                  className={`${retroInput} w-full`}
                  value={form.amount}
                  onChange={e => onFormChange('amount', e.target.value)}
                  placeholder="مثلاً 1500000"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>روش پرداخت</label>
                <select
                  value={form.method}
                  onChange={e => onFormChange('method', e.target.value)}
                  className={`${retroInput} w-full`}
                >
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map(m => (
                      <option key={m.id} value={m.key}>{m.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="cash">نقدی</option>
                      <option value="bank">بانکی</option>
                      <option value="pos">دستگاه کارت‌خوان</option>
                      <option value="cheque">چک</option>
                      <option value="other">سایر</option>
                    </>
                  )}
                </select>
              </div>
              {(() => {
                const sel = paymentMethods.find(m => m.key === form.method)
                const showDue = sel ? sel.is_cheque : form.method === 'cheque'
                return (
                  <div className="space-y-2">
                    <label className={retroHeading}>تاریخ سررسید (جلالی)</label>
                    <input
                      type="text"
                      placeholder="مثلاً 1404/09/10 یا 09/10"
                      value={form.due_date_jalali || ''}
                      onChange={e => onDueDateChange(e.target.value)}
                      className={`${retroInput} w-full ${showDue ? '' : 'opacity-50'}`}
                      disabled={!showDue}
                    />
                    {form.due_date && (
                      <p className={`text-[10px] ${retroMuted}`}>ISO: {form.due_date}</p>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={retroHeading}>شماره مرجع</label>
                <input
                  className={`${retroInput} w-full`}
                  value={form.reference}
                  onChange={e => onFormChange('reference', e.target.value)}
                  placeholder="شماره سند، چک یا رسید"
                />
              </div>
              <div className="space-y-2">
                <label className={retroHeading}>نوع تراکنش</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${retroButton} ${
                      form.direction === 'in' ? '' : 'opacity-50'
                    }`}
                    onClick={() => onFormChange('direction', 'in')}
                  >
                    دریافت
                  </button>
                  <button
                    type="button"
                    className={`${retroButton} ${
                      form.direction === 'out' ? '' : 'opacity-50'
                    }`}
                    onClick={() => onFormChange('direction', 'out')}
                  >
                    پرداخت
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>توضیحات</label>
              <textarea
                className={`${retroInput} w-full h-24`}
                value={form.note}
                onChange={e => onFormChange('note', e.target.value)}
                placeholder="جزئیات یا توضیح تکمیلی"
              />
            </div>

            <div className="space-y-2">
              <label className={retroHeading}>فاکتور مرتبط (اختیاری)</label>
              <select
                value={form.invoice_id || ''}
                onChange={e => onFormChange('invoice_id', e.target.value)}
                className={`${retroInput} w-full`}
              >
                <option value="">-- انتخاب نکن --</option>
                {openInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_type === 'sale' ? '📤 فروش' : inv.invoice_type === 'purchase' ? '📥 خرید' : '📋'}
                    {' '}
                    {inv.invoice_number} ({inv.party_name}) - {inv.total ? `${formatNumberFa(inv.total)} ریال` : '---'}
                  </option>
                ))}
              </select>
              {invoicesLoading && (
                <p className="text-[10px] text-[#7a6b4f] mt-1">در حال بارگذاری فاکتورها...</p>
              )}
            </div>

            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <div className="flex flex-wrap gap-3">
              <button className={`${retroButton} !bg-[#1f2e3b]`} disabled={creating} type="submit">
                {creating ? 'در حال ثبت...' : 'ثبت تراکنش'}
              </button>
              <button
                type="button"
                className={`${retroButton} !bg-[#5b4a2f]`}
                onClick={() => onFormChange('amount', '')}
                disabled={creating}
              >
                پاک‌سازی فرم
              </button>
            </div>
          </form>
      </form>
    </section>
  )
}
