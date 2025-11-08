import React, { useEffect, useMemo, useState } from 'react'
import { parseJalaliInput, PERSIAN_MONTHS, currentJalaliYear } from '../utils/date'

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
    <div className="p-4 border rounded">
      <form onSubmit={onManualSubmit} className="mb-3">
        <label className="block text-sm mb-1">ورودی دستی تاریخ (مثال: 10/8 یا 1404/10/08)</label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={e => setManual(e.target.value)}
            className="flex-1 border px-2 py-1 rounded"
            placeholder="مثال: 10/8 یا 1404/10/08"
          />
          <button className="px-3 bg-green-600 text-white rounded" type="submit">اعمال</button>
        </div>
      </form>

      <div className="mb-3">
        <label className="block text-sm mb-1">انتخاب سریع (سال/ماه/روز)</label>
        <div className="flex gap-2">
          <select value={y} onChange={e => setY(Number(e.target.value))} className="border px-2 py-1 rounded">
            {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
          <select value={m} onChange={e => setM(Number(e.target.value))} className="border px-2 py-1 rounded">
            {PERSIAN_MONTHS.map((mn, i) => (
              <option key={i} value={i+1}>{`${String(i+1).padStart(2,'0')} - ${mn}`}</option>
            ))}
          </select>
          <input value={d} onChange={e => setD(Number(e.target.value))} type="number" min={1} max={31} className="w-20 border px-2 py-1 rounded" />
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-600">انتخاب شده (جلالی): {selectedJalali ?? '-'}</div>
        <div className="text-sm text-gray-600">خروجی ISO-UTC: {selectedIso ?? '-'}</div>
      </div>
    </div>
  )
}
