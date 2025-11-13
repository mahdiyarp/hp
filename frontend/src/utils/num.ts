// Utility to format numbers using Persian (fa) locale
import jalaali from 'jalaali-js'

export function formatNumberFa(n: number | string) {
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) return String(n)
  return new Intl.NumberFormat('fa').format(num)
}

// Format number with Persian digits and space every 3 digits (e.g. ۱۲۳ ۴۵۶ ۷۸۹)
export function formatNumberFaSpaced(n: number | string) {
  const raw = typeof n === 'string' ? n : String(n)
  const digitsOnly = raw.replace(/[^0-9.-]/g, '')
  if (!digitsOnly || isNaN(Number(digitsOnly))) return toPersianDigits(raw)
  const [signPart, intPartRaw, fracPart] = (() => {
    const negative = digitsOnly.startsWith('-')
    const cleaned = negative ? digitsOnly.slice(1) : digitsOnly
    const [intPart, frac] = cleaned.split('.')
    return [negative ? '-' : '', intPart, frac]
  })()
  const grouped = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') // commas
  const withFrac = fracPart ? `${grouped}.${fracPart}` : grouped
  const persian = toPersianDigits(`${signPart}${withFrac}`)
  return persian
}

// Basic Persian number words (limited scale) for currency narration
const units = ['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه']
const teens = ['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده']
const tens = ['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود']
const hundreds = ['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد']
const scales = ['','هزار','میلیون','میلیارد','تریلیون']

function threeDigitToWords(num: number): string {
  if (num === 0) return ''
  const h = Math.floor(num / 100)
  const t = Math.floor((num % 100) / 10)
  const u = num % 10
  const parts: string[] = []
  if (h) parts.push(hundreds[h])
  if (t === 1) {
    parts.push(teens[u])
    return parts.join(' و ')
  }
  if (t) parts.push(tens[t])
  if (u) parts.push(units[u])
  return parts.join(' و ')
}

export function numberToPersianWords(n: number): string {
  if (n === 0) return 'صفر'
  if (n < 0) return `منفی ${numberToPersianWords(Math.abs(n))}`
  const parts: string[] = []
  let scaleIndex = 0
  while (n > 0 && scaleIndex < scales.length) {
    const chunk = n % 1000
    if (chunk) {
      const chunkWords = threeDigitToWords(chunk)
      const scaleWord = scales[scaleIndex]
      parts.unshift([chunkWords, scaleWord].filter(Boolean).join(' '))
    }
    n = Math.floor(n / 1000)
    scaleIndex++
  }
  return parts.join(' و ')
}

export interface CurrencyFormatResult {
  numeric: string // e.g. ۱۲۳ ۴۵۶
  words: string   // e.g. یکصد و بیست و سه هزار و چهارصد و پنجاه و شش
  full: string    // concatenated with unit
}

export function formatCurrencyFa(value: number | string, unit: 'ریال' | 'تومان' = 'ریال', withWords = true): CurrencyFormatResult {
  const num = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : value
  if (Number.isNaN(num)) {
    return { numeric: toPersianDigits(String(value)), words: '', full: toPersianDigits(String(value)) }
  }
  const numeric = formatNumberFaSpaced(num)
  const words = withWords ? numberToPersianWords(Math.trunc(num)) : ''
  const full = [numeric, unit].join(' ') + (withWords ? ` (${words} ${unit})` : '')
  return { numeric, words, full }
}

export function isoToJalali(iso: string) {
  // parse ISO (assumed UTC) and convert to Jalali date + time string
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const gy = d.getUTCFullYear()
  const gm = d.getUTCMonth() + 1
  const gd = d.getUTCDate()
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  // Use Persian numerals via Intl
  const dateStr = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
  const timeStr = `${hh}:${mm}:${ss}`
  return `${new Intl.NumberFormat('fa').format(Number(jy))}/${new Intl.NumberFormat('fa').format(Number(jm))}/${new Intl.NumberFormat('fa').format(Number(jd))} ${timeStr}`
}

export function toPersianDigits(value: string | number) {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  const str = String(value)
  let out = ''
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      out += persian[Number(ch)]
    } else {
      out += ch
    }
  }
  return out
}

// Convenience wrapper for prices (default ریال, include words)
export function formatPrice(value: number | string, unit: 'ریال' | 'تومان' = 'ریال') {
  return formatCurrencyFa(value, unit, true).full
}
