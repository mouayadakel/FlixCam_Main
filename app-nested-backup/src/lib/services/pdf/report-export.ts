/**
 * @file report-export.ts
 * @description PDF and Excel export for reports
 * @module lib/services/pdf
 * @author Engineering Team
 * @created 2026-01-28
 */

import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

export interface ReportExportPdfOptions {
  title: string
  locale?: 'ar' | 'en'
  columns: { key: string; label: string; width?: number }[]
  rows: Record<string, string | number>[]
}

/**
 * Export report data as PDF
 */
export function exportReportAsPdf(options: ReportExportPdfOptions): Buffer {
  const { title, locale = 'en', columns, rows } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  })

  const margin = 20
  let y = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  const colCount = columns.length
  const colWidth = maxWidth / colCount

  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  let x = margin
  for (const col of columns) {
    doc.text(col.label, x + 2, y)
    x += colWidth
  }
  y += 8
  doc.setFont('helvetica', 'normal')

  for (const row of rows) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    x = margin
    for (const col of columns) {
      const value = row[col.key]
      doc.text(String(value ?? ''), x + 2, y)
      x += colWidth
    }
    y += 6
  }

  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

/**
 * Export report data as Excel buffer
 */
export async function exportReportAsExcel(
  title: string,
  columns: { key: string; label: string }[],
  rows: Record<string, string | number>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(title.substring(0, 31), { headerFooter: { firstHeader: '' } })
  const headers = columns.map((c) => c.label)
  worksheet.addRow(headers)
  for (const row of rows) {
    worksheet.addRow(columns.map((c) => row[c.key] ?? ''))
  }
  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
