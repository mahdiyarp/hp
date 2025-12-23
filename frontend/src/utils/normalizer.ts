// Utility helpers for normalizing Persian/Arabic text, digits, and phone numbers.

const ARABIC_TO_PERSIAN_MAP: Record<string, string> = {
  '\u0643': '\u06A9', // Arabic Kaf -> Persian Kaf
  '\u064A': '\u06CC', // Arabic Yeh -> Persian Yeh
  '\u0626': '\u06CC', // Yeh with hamza above
  '\u0629': '\u0647', // Teh marbuta -> heh
  '\u0624': '\u0648', // Waw with hamza -> waw
  '\u0623': '\u0627', // Alef with hamza -> alef
  '\u0625': '\u0627', // Alef with hamza below -> alef
  '\u0622': '\u0627', // Alef madda -> alef
}

const PERSIAN_DIGITS = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'
const ARABIC_INDIC_DIGITS = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'
const LATIN_DIGITS = '0123456789'

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u0652\u0670]/g
const TATWEEL_AND_ZERO_WIDTH_REGEX = /[\u0640\u200C\u200B\u00AD]/g

export function digitsToLatin(input: string): string {
  let out = ''
  for (const ch of input || '') {
    const persianIdx = PERSIAN_DIGITS.indexOf(ch)
    if (persianIdx >= 0) {
      out += LATIN_DIGITS[persianIdx]
      continue
    }

    const arabicIdx = ARABIC_INDIC_DIGITS.indexOf(ch)
    if (arabicIdx >= 0) {
      out += LATIN_DIGITS[arabicIdx]
      continue
    }

    out += ch
  }
  return out
}

export function digitsToPersian(input: string): string {
  let out = ''
  for (const ch of input || '') {
    const latinIdx = LATIN_DIGITS.indexOf(ch)
    out += latinIdx >= 0 ? PERSIAN_DIGITS[latinIdx] : ch
  }
  return out
}

function replaceArabicLetters(value: string): string {
  return value.replace(/[\u0622\u0623\u0624\u0625\u0626\u0629\u0643\u064A]/g, (c) => {
    return ARABIC_TO_PERSIAN_MAP[c] ?? c
  })
}

function removeDiacritics(value: string): string {
  return value.replace(ARABIC_DIACRITICS_REGEX, '')
}

function removeTatweelAndZwnj(value: string): string {
  return value.replace(TATWEEL_AND_ZERO_WIDTH_REGEX, '')
}

export function normalizeLetters(value: string): string {
  let out = value
  out = replaceArabicLetters(out)
  out = removeDiacritics(out)
  out = removeTatweelAndZwnj(out)
  return out
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeForSearch(input: string): string {
  if (!input) return ''
  let out = digitsToLatin(input)
  out = normalizeLetters(out)
  out = normalizeWhitespace(out)
  out = out.toLowerCase()
  return out
}

export function equalsNormalized(a: string, b: string): boolean {
  return normalizeForSearch(a) === normalizeForSearch(b)
}

export function containsNormalized(haystack: string, needle: string): boolean {
  const normalizedHay = normalizeForSearch(haystack)
  const normalizedNeedle = normalizeForSearch(needle)
  return normalizedHay.includes(normalizedNeedle)
}

export function normalizePhone(input: string): string | null {
  if (!input) return null

  let digits = digitsToLatin(String(input)).trim()
  digits = digits.replace(/[^0-9+]/g, '')

  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.startsWith('98') && digits.length >= 12 && digits[2] === '9') {
    digits = '0' + digits.slice(2)
  }

  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '0' + digits
  }

  if (digits.length === 12 && digits.startsWith('98') && digits[2] === '9') {
    digits = '0' + digits.slice(2)
  }

  if (digits.length === 11 && digits.startsWith('09')) {
    return digits
  }

  return digits.length >= 7 ? digits : null
}

export function samePhone(a: string, b: string): boolean {
  const normalizedA = normalizePhone(a)
  const normalizedB = normalizePhone(b)
  if (!normalizedA || !normalizedB) return false
  return normalizedA === normalizedB
}

export default {
  digitsToLatin,
  digitsToPersian,
  normalizeLetters,
  normalizeWhitespace,
  normalizeForSearch,
  equalsNormalized,
  containsNormalized,
  normalizePhone,
  samePhone,
}
