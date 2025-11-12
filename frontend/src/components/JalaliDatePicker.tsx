import React, { useEffect, useMemo, useState } from 'react'
import { parseJalaliInput, PERSIAN_MONTHS, currentJalaliYear } from '../utils/date'
import {
  retroBadge,
  retroHeading,
  retroInput,
  retroLabel,
  retroPanelPadded,
  retroButton,
  retroMuted,
} from './retroTheme'

type Props = {
  valueIso?: string | null
  onChange?: (isoUtc: string | null) => void
}

export default function JalaliDatePicker({ valueIso = null, onChange }: Props) {
  const curYear = currentJalaliYear()
  const years = useMemo(() => {
    const arr = []
    for (let y = curYear - 5; y <= curYear + 5; y++) arr.push(y)
    return arr
  }, [curYear])

  // controlled by ISO value externally or internal
  const [manual, setManual] = useState('')
  const [selectedIso, setSelectedIso] = useState<string | null>(valueIso || null)
  const [selectedJalali, setSelectedJalali] = useState<string | null>(null)

  useEffect(() => {
    if (valueIso) {
      setSelectedIso(valueIso)
      // convert to jalali string for display
      // parseJalaliInput is one-way; to show jalali for ISO, reuse backend logic in utils/num isoToJalali
    }
  }, [valueIso])

  function applyParseResult(res: ReturnType<typeof parseJalaliInput> ) {
    if (!res) {
      setSelectedIso(null)
      setSelectedJalali(null)
      onChange?.(null)
      return
    }
    setSelectedIso(res.iso)
    setSelectedJalali(res.jalali)
    onChange?.(res.iso)
  }

  function onManualSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const res = parseJalaliInput(manual)
    applyParseResult(res)
  }

  // quick pick handlers for dropdown
  const [y, setY] = useState<number>(curYear)
  const [m, setM] = useState<number>(new Date().getUTCMonth() + 1)
  const [d, setD] = useState<number>(new Date().getUTCDate())

  useEffect(() => {
    // update iso when dropdown changes
    try {
      const res = parseJalaliInput(`${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}`)
      applyParseResult(res)
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, m, d])

  return (
    <div className={`${retroPanelPadded} space-y-5`} dir="rtl">
      <header className="space-y-2">
        <p className={retroHeading}>انتخابگر تاریخ جلالی</p>
        <p className={`text-xs ${retroMuted}`}>
          تاریخ دلخواه خود را به‌صورت دستی وارد کنید یا از گزینه‌های سریع سال، ماه و روز استفاده نمایید.
          خروجی به‌صورت استاندارد ISO برای ثبت در سیستم آماده می‌شود.
        </p>
      </header>

      <form onSubmit={onManualSubmit} className="space-y-3">
        <div>
          <label className={retroLabel}>ورودی دستی تاریخ</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              className={`${retroInput} flex-1`}
              placeholder="مثال: 10/08 یا 1404/10/08"
            />
            <button className={`${retroButton} sm:w-32`} type="submit">
              اعمال
            </button>
          </div>
          <p className={`mt-2 text-[11px] ${retroMuted}`}>
            ماه و روز تک‌رقمی را نیز می‌توانید با جداکننده «/» وارد کنید؛ سیستم به‌طور خودکار کامل می‌کند.
          </p>
        </div>
      </form>

      <div className="space-y-3">
        <label className={retroLabel}>انتخاب سریع (سال / ماه / روز)</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <span className={`${retroHeading} text-[11px]`}>سال</span>
            <select value={y} onChange={e => setY(Number(e.target.value))} className={`${retroInput} w-full`}>
              {years.map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <span className={`${retroHeading} text-[11px]`}>ماه</span>
            <select value={m} onChange={e => setM(Number(e.target.value))} className={`${retroInput} w-full`}>
              {PERSIAN_MONTHS.map((mn, i) => (
                <option key={mn} value={i + 1}>
                  {`${String(i + 1).padStart(2, '0')} - ${mn}`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <span className={`${retroHeading} text-[11px]`}>روز</span>
            <input
              value={d}
              onChange={e => setD(Number(e.target.value))}
              type="number"
              min={1}
              max={31}
              className={`${retroInput} w-full`}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-[#c5bca5] pt-4 space-y-3">
        <p className={retroHeading}>خروجی انتخاب شده</p>
        <div className="flex flex-wrap gap-2">
          <span className={retroBadge}>تاریخ جلالی: {selectedJalali ?? '-'}</span>
          <span className={retroBadge}>ISO UTC: {selectedIso ?? '-'}</span>
        </div>
      </div>
    </div>
  )
}
