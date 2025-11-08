// Utility to format numbers using Persian (fa) locale
import jalaali from 'jalaali-js'

export function formatNumberFa(n: number | string) {
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) return String(n)
  return new Intl.NumberFormat('fa').format(num)
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
