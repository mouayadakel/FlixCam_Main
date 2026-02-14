/**
 * @file export.utils.ts
 * @description CSV export utility for list pages
 * @module lib/utils
 */

/**
 * Export an array of objects to CSV and trigger download.
 * @param data - Array of record objects
 * @param filename - Download filename (without extension)
 * @param columns - Column definitions { key: path in object, label: header text }
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; label: string }[]
): void {
  if (data.length === 0) return

  const escape = (val: unknown): string => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = columns.map((c) => escape(c.label)).join(',')
  const rows = data.map((row) =>
    columns.map((c) => {
      const value = c.key.split('.').reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], row)
      return escape(value)
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
