const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function digitsToLatin(s: string): string {
  let out = ''
  for (const ch of s || '') {
    const pi = PERSIAN_DIGITS.indexOf(ch)
    if (pi >= 0) {
      out += String(pi)
      continue
    }
    const ai = ARABIC_INDIC_DIGITS.indexOf(ch)
    if (ai >= 0) {
      out += String(ai)
      continue
    }
    out += ch
  }
  return out
}

export function normalizeIranMobile(input: string): string | null {
  if (!input) return null
  let s = digitsToLatin(String(input)).trim().replace(/\s|\-/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('00')) s = s.slice(2)
  if (s.startsWith('98')) s = '0' + s.slice(2)
  if (s.startsWith('9') && s.length === 10) s = '0' + s
  if (s.length === 11 && s.startsWith('0') && /^\d+$/.test(s)) return s
  return null
}
