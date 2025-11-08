// Normalizer module
// - normalize Persian/Arabic letters to common Persian form
// - convert digits Persian/Arabic -> Latin (and helper back)
// - remove tatweel/kashida and zero-width non-joiner (نیم‌فاصله)
// - collapse whitespace, lowercase for Latin
// - phone number normalization to canonical 11-digit Iranian mobile (09...)

const ARABIC_TO_PERSIAN_MAP: Record<string, string> = {
  '\u0643': 'ک', // Arabic Kaf -> Persian Kaf
  '\u064A': 'ی', // Arabic Yeh -> Persian Yeh
  '\u0626': 'ی', // Yeh with hamza above
  '\u0629': 'ه', // Teh marbuta -> heh
  '\u0624': 'و', // Waw with hamza -> waw
  '\u0623': 'ا', // Alef with hamza -> alef
  '\u0625': 'ا', // Alef with hamza below -> alef
  '\u0622': 'ا', // Alef madda -> alef
  '\u06CC': 'ی', // Farsi Yeh (keep)
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const LATIN_DIGITS = '0123456789'

export function digitsToLatin(input: string): string {
  let out = ''
  for (const ch of input) {
    const p = PERSIAN_DIGITS.indexOf(ch)
    if (p >= 0) { out += LATIN_DIGITS[p]; continue }
    const a = ARABIC_INDIC_DIGITS.indexOf(ch)
    if (a >= 0) { out += LATIN_DIGITS[a]; continue }
    out += ch
  }
  return out
}

export function digitsToPersian(input: string): string {
  let out = ''
  for (const ch of input) {
    const idx = LATIN_DIGITS.indexOf(ch)
    if (idx >= 0) { out += PERSIAN_DIGITS[idx]; continue }
    out += ch
  }
  return out
}

function replaceArabicLetters(s: string): string {
  // Replace common Arabic variants with Persian equivalents
  return s.replace(/[\u0622\u0623\u0624\u0625\u0626\u0629\u0643\u064A]/g, (c) => {
    return ARABIC_TO_PERSIAN_MAP[c] || c
  })
}

function removeDiacritics(s: string): string {
  // Arabic diacritics range
  return s.replace(/[\u064B-\u0652\u0670]/g, '')
}

function removeTatweelAndZwnj(s: string): string {
  // Tatweel (kashida) U+0640, ZWNJ U+200C, zero-width space U+200B
  return s.replace(/[\u0640\u200c\u200b\u00AD]/g, '')
}

export function normalizeLetters(s: string): string {
  let out = s
  out = replaceArabicLetters(out)
  out = removeDiacritics(out)
  out = removeTatweelAndZwnj(out)
  return out
}

export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function normalizeForSearch(input: string): string {
  if (!input) return ''
  // convert digits to latin so script-insensitive comparisons work
  let s = digitsToLatin(input)
  s = normalizeLetters(s)
  s = normalizeWhitespace(s)
  // lowercase for latin parts
  s = s.toLowerCase()
  return s
}

export function equalsNormalized(a: string, b: string): boolean {
  return normalizeForSearch(a) === normalizeForSearch(b)
}

export function containsNormalized(hay: string, needle: string): boolean {
  const H = normalizeForSearch(hay)
  const N = normalizeForSearch(needle)
  return H.indexOf(N) !== -1
}

export function normalizePhone(input: string): string | null {
  if (!input) return null
  // 1. normalize digits
  let s = digitsToLatin(input)
  // 2. remove everything except digits and leading +
  s = s.trim()
  // keep leading + for parsing
  const plus = s.startsWith('+')
  s = s.replace(/[^0-9+]/g, '')
  if (plus && s.startsWith('+')) {
    // ok
  }
  // remove leading + if any for easier handling
  if (s.startsWith('+')) s = s.slice(1)
  // handle leading 00 country prefix
  if (s.startsWith('00')) s = s.replace(/^00/, '')

  // Now s is digits only
  // If starts with country code 98 and next is 9 -> convert to 0xxxxxxxxxx
  if (s.startsWith('98') && s.length >= 12 && s[2] === '9') {
    s = '0' + s.slice(2)
  }
  // If starts with 9 and length 10 -> add leading 0
  if (s.length === 10 && s.startsWith('9')) {
    s = '0' + s
  }
  // If starts with country code without leading 0 but shorter lengths
  if (s.length === 12 && s.startsWith('98') && s[2] === '9') {
    s = '0' + s.slice(2)
  }

  // final check: mobile numbers in Iran should be 11 digits and start with 09
  if (s.length === 11 && s.startsWith('09')) return s

  // As fallback, return digits-only string if reasonably long
  if (s.length >= 7) return s
  return null
}

export function samePhone(a: string, b: string): boolean {
  const A = normalizePhone(a)
  const B = normalizePhone(b)
  if (!A || !B) return false
  return A === B
}

export default {
  digitsToLatin,
  digitsToPersian,
  normalizeLetters,
  normalizeForSearch,
  equalsNormalized,
  containsNormalized,
  normalizePhone,
  samePhone,
}
