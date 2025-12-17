export function exportToCsv<T extends Record<string, unknown>>(rows: T[], filename: string) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  link.click()
  URL.revokeObjectURL(url)
}
