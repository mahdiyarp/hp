import React, { useEffect, useState } from 'react'
import { parseJalaliInput } from '../utils/date'
import { getAccessToken } from '../services/auth'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroPanelPadded,
  retroMuted,
} from './retroTheme'

interface FinancialContext {
  current_financial_year: {
    id: number
    name: string
    start_date: string | null
    end_date: string | null
    is_closed: boolean
  }
  current_jalali: {
    year: number
    month: number
    day: number
    formatted: string
  }
  auto_created: boolean
}

interface DateSuggestions {
  today: string
  month_start: string
  quarter_start: string
  year_start: string | null
  year_end: string | null
  year_start_iso?: string | null
  year_end_iso?: string | null
}

interface SmartDatePickerProps {
  onDateSelected?: (isoDate: string, jalaliDate: string) => void
  disabled?: boolean
}

export default function SmartDatePicker({ onDateSelected, disabled = false }: SmartDatePickerProps) {
  const [context, setContext] = useState<FinancialContext | null>(null)
  const [suggestions, setSuggestions] = useState<DateSuggestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')

  useEffect(() => {
    fetchFinancialContext()
  }, [])

  const fetchFinancialContext = async () => {
    try {
      const token = getAccessToken()
      const response = await fetch('/api/financial/auto-context', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial context')
      }
      
      const data = await response.json()
      setContext(data.context)
      setSuggestions(data.date_suggestions)
      
      // Auto-select today by default
      const todaySuggestion = data.date_suggestions?.today
      if (todaySuggestion) {
        const parsed = parseJalaliInput(todaySuggestion)
        if (parsed) {
          setSelectedDate(parsed.jalali)
          onDateSelected?.(parsed.iso, parsed.jalali)
        } else {
          setSelectedDate(todaySuggestion)
        }
      }
      
    } catch (error) {
      console.error('Error fetching financial context:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string | null) => {
    if (!suggestion) return
    const parsed = parseJalaliInput(suggestion)
    if (parsed) {
      setSelectedDate(parsed.jalali)
      onDateSelected?.(parsed.iso, parsed.jalali)
      return
    }
    setSelectedDate(suggestion)
    onDateSelected?.(new Date().toISOString(), suggestion)
  }

  const normalizeSuggestion = (value: string | null) => {
    if (!value) return null
    const parsed = parseJalaliInput(value)
    return parsed?.jalali ?? value
  }

  const suggestionBase =
    'text-right border-2 border-[#c5bca5] bg-[#f6f1df] shadow-[3px_3px_0_#c5bca5] px-4 py-3 text-sm rounded-sm transition-all'
  const suggestionActive =
    'bg-[#154b5f] border-[#0e2f3c] text-[#f6f1df] shadow-[3px_3px_0_#0e2f3c]'
  const suggestionDisabled = 'opacity-40 cursor-not-allowed'
  const suggestionInteractive = 'hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0e2f3c] hover:border-[#0e2f3c]'

  if (loading) {
    return (
      <div className={`${retroPanelPadded} flex items-center justify-center`} dir="rtl">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 border-2 border-dashed border-[#154b5f] rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#154b5f]`}>در حال آماده‌سازی تاریخ هوشمند</p>
        </div>
      </div>
    )
  }

  const renderSuggestion = (value: string | null, label: string) => {
    if (!suggestions) return null
    const normalizedValue = normalizeSuggestion(value)
    const isActive = normalizedValue && selectedDate === normalizedValue
    const classes = [
      suggestionBase,
      isActive ? suggestionActive : '',
      disabled ? suggestionDisabled : suggestionInteractive,
    ]
      .filter(Boolean)
      .join(' ')
    return (
      <button
        key={label}
        disabled={disabled}
        onClick={() => handleSuggestionClick(value)}
        className={classes}
      >
        {label}
      </button>
    )
  }

  const activeIso = selectedDate ? parseJalaliInput(selectedDate)?.iso ?? '' : ''

  return (
    <div className={`${retroPanelPadded} space-y-5`} dir="rtl">
      {context && (
        <div className="border border-[#c5bca5] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
            <div className="space-y-1">
              <p className={retroHeading}>سال مالی فعال</p>
              <h3 className="text-lg font-semibold text-[#1f2e3b]">
                {context.current_financial_year.name}
              </h3>
              <p className={`text-xs ${retroMuted}`}>
                تاریخ امروز: {context.current_jalali.formatted}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={retroBadge}>
                وضعیت: {context.current_financial_year.is_closed ? 'بسته' : 'باز'}
              </span>
              {context.auto_created && <span className={retroBadge}>ایجاد خودکار</span>}
            </div>
          </div>
        </div>
      )}

      {suggestions && (
        <div className="space-y-4">
          <p className={retroHeading}>انتخاب سریع تاریخ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderSuggestion(
              suggestions.today,
              `امروز: ${suggestions.today ?? '-'}`,
            )}
            {renderSuggestion(
              suggestions.month_start,
              `اول ماه: ${suggestions.month_start ?? '-'}`,
            )}
            {renderSuggestion(
              suggestions.quarter_start,
              `شروع فصل: ${suggestions.quarter_start ?? '-'}`,
            )}
            {suggestions.year_start &&
              renderSuggestion(
                suggestions.year_start,
                `آغاز سال مالی: ${suggestions.year_start}`,
              )}
            {suggestions.year_end &&
              renderSuggestion(
                suggestions.year_end,
                `پایان سال مالی: ${suggestions.year_end}`,
              )}
          </div>
          <div className={`text-[11px] ${retroMuted}`}>
            تاریخ‌های پیشنهادی بر اساس تقویم جلالی و سال مالی فعال محاسبه شده‌اند.
          </div>
        </div>
      )}

      {selectedDate && (
        <div className="border border-dashed border-[#c5bca5] px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <span className={retroBadge}>تاریخ انتخابی: {selectedDate}</span>
          {activeIso && <span className={retroBadge}>ISO: {activeIso.slice(0, 10)}</span>}
          {!disabled && suggestions && (
            <button
              className={`${retroButton} px-5 py-2 text-xs`}
              type="button"
              onClick={() => handleSuggestionClick(suggestions.today)}
            >
              بازنشانی به امروز
            </button>
          )}
        </div>
      )}
    </div>
  )
}
