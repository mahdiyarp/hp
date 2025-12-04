import React from 'react'
import {
  retroButton,
  retroHeading,
  retroInput,
} from '../retroTheme'
import Alert from '../Alert'

interface PersonFormProps {
  form: {
    name: string
    kind: string
    mobile: string
    code: string
    description: string
  }
  onFormChange: (field: keyof PersonFormProps['form'], value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  creating: boolean
  error: string | null
  success: string | null
}

export default function PersonForm({
  form,
  onFormChange,
  onSubmit,
  onClose,
  creating,
  error,
  success,
}: PersonFormProps) {
  return (
    <section className="p-4 bg-gray-100 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className={retroHeading}>فرم ثبت مخاطب</p>
          <h3 className="text-lg font-semibold mt-2">افزودن طرف حساب جدید</h3>
        </div>
        <button
          className={retroButton}
          onClick={onClose}
        >
          بستن فرم
        </button>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={retroHeading}>نام مخاطب *</label>
            <input
              className={`${retroInput} w-full`}
              value={form.name}
              onChange={e => onFormChange('name', e.target.value)}
              placeholder="مانند: شرکت الف"
              required
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>نوع</label>
            <select
              value={form.kind}
              onChange={e => onFormChange('kind', e.target.value)}
              className={`${retroInput} w-full`}
            >
              <option value="customer">مشتری</option>
              <option value="supplier">تأمین‌کننده</option>
              <option value="other">سایر</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={retroHeading}>شماره همراه</label>
            <input
              className={`${retroInput} w-full`}
              value={form.mobile}
              onChange={e => onFormChange('mobile', e.target.value)}
              placeholder="مثلاً 09xxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <label className={retroHeading}>کد طرف حساب</label>
            <input
              className={`${retroInput} w-full`}
              value={form.code}
              onChange={e => onFormChange('code', e.target.value)}
              placeholder="اختیاری"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={retroHeading}>توضیحات</label>
          <textarea
            className={`${retroInput} w-full h-24`}
            value={form.description}
            onChange={e => onFormChange('description', e.target.value)}
            placeholder="یادداشت مرتبط با این مخاطب"
          />
        </div>

        {error && (
          <Alert variant="error">{error}</Alert>
        )}
        {success && (
          <Alert variant="success">{success}</Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <button className={`${retroButton} !bg-[#1f2e3b]`} disabled={creating} type="submit">
            {creating ? 'در حال ثبت...' : 'ثبت مخاطب'}
          </button>
          <button
            type="button"
            className={`${retroButton} !bg-[#5b4a2f]`}
            onClick={() => onFormChange('name', '')}
            disabled={creating}
          >
            پاک‌سازی فرم
          </button>
        </div>
      </form>
    </section>
  )
}
