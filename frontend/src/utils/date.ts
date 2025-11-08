import jalaali from 'jalaali-js'

// Persian month names (short)
export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

export function currentJalaliYear(): number {
  const now = new Date()
  const gY = now.getUTCFullYear()
  const gM = now.getUTCMonth() + 1
  const gD = now.getUTCDate()
  const { jy } = jalaali.toJalaali(gY, gM, gD)
  return jy
}

function toISOUtcFromJalali(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd)
  // construct UTC date at midnight and return ISO string
  const dt = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0))
  return dt.toISOString()
}

export function normalizeJalaliDigits(input: string): string {
  // replace Arabic-Indic and Eastern Arabic digits with ASCII
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  let out = ''
  for (const ch of input) {
    const p = persianDigits.indexOf(ch)
    if (p >= 0) { out += String(p); continue }
    const a = arabicDigits.indexOf(ch)
    if (a >= 0) { out += String(a); continue }
    out += ch
  }
  return out
}

export type ParseResult = { iso: string; jalali: string } | null

export function parseJalaliInput(raw: string): ParseResult {
  if (!raw) return null
  const s = normalizeJalaliDigits(raw.trim())
  // split by non-digit
  const parts = s.split(/[^0-9]+/).filter(Boolean)
  const nowJy = currentJalaliYear()

  let jy: number | null = null
  let jm: number | null = null
  let jd: number | null = null

  if (parts.length >= 3) {
    // Heuristic: if any part has length 4 -> year
    const idxYear = parts.findIndex(p => p.length === 4)
    if (idxYear === 0) {
      jy = Number(parts[0])
      jm = Number(parts[1])
      jd = Number(parts[2])
    } else if (idxYear === 2) {
      // maybe day/month/year
      jd = Number(parts[0])
      jm = Number(parts[1])
      jy = Number(parts[2])
    } else {
      // default to year/month/day
      jy = Number(parts[0])
      jm = Number(parts[1])
      jd = Number(parts[2])
    }
  } else if (parts.length === 2) {
    // interpret as month/day with current Jalali year
    jy = nowJy
    jm = Number(parts[0])
    jd = Number(parts[1])
  } else if (parts.length === 1) {
    // single number: maybe YYYYMMDD or DD
    const p = parts[0]
    if (p.length === 8) {
      jy = Number(p.slice(0, 4))
      jm = Number(p.slice(4, 6))
      jd = Number(p.slice(6, 8))
    } else if (p.length === 4) {
      // ambiguous: treat as yyyy
      jy = Number(p)
      jm = 1
      jd = 1
    } else {
      // treat as day in current month/year
      jy = nowJy
      const { jm: curm } = jalaali.toJalaali(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, new Date().getUTCDate())
      jm = curm
      jd = Number(p)
    }
  }

  if (jy == null || jm == null || jd == null) return null
  // basic validation
  if (jm < 1 || jm > 12) return null
  if (jd < 1 || jd > 31) return null

  try {
    const iso = toISOUtcFromJalali(jy, jm, jd)
    const jalali = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
    return { iso, jalali }
  } catch (e) {
    return null
  }
}
