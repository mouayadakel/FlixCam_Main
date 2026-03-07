/**
 * @file invoice-pdf.ts
 * @description PDF template for invoices with ZATCA compliance support.
 * FLIXCAM brand: light mode (white bg), charcoal text, green accent for borders/totals.
 * @module lib/services/pdf
 */

import { jsPDF } from 'jspdf'
import { toDataURL } from 'qrcode'
import type { Invoice, InvoiceItem } from '@/lib/types/invoice.types'
import { theme } from '@/config/theme'

const VAT_RATE = 0.15
const COMPANY_NAME = theme.brandName
const COMPANY_VAT = ''
const COMPANY_ADDRESS = ''
const PRIMARY_ACCENT = theme.invoiceSettings.primaryAccent
const TEXT_CHARCOAL = theme.colors.textOnLight
const SHOW_TAGLINE = theme.invoiceSettings.showTagline
const TAGLINE = theme.industry

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

export interface InvoicePdfOptions {
  locale?: 'ar' | 'en'
  includeZatcaQr?: boolean
  qrPayload?: string
}

/**
 * Format number for display (e.g. 1234.56 -> 1,234.56)
 */
function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format date for display
 */
function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Generate invoice PDF buffer using jsPDF
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  options: InvoicePdfOptions = {}
): Promise<Buffer> {
  const { locale = 'en', includeZatcaQr = false, qrPayload } = options
  const isRtl = locale === 'ar'

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20
  const [rCharcoal, gCharcoal, bCharcoal] = hexToRgb(TEXT_CHARCOAL)
  const [rGreen, gGreen, bGreen] = hexToRgb(PRIMARY_ACCENT)

  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)

  // Header - Company (light mode: white bg implied, charcoal text)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(COMPANY_NAME, margin, y)
  y += 6
  if (SHOW_TAGLINE && TAGLINE) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(TAGLINE, margin, y)
    y += 6
  }
  doc.setFontSize(10)
  doc.text(COMPANY_ADDRESS || 'Saudi Arabia', margin, y)
  if (COMPANY_VAT) {
    y += 5
    doc.text(`VAT: ${COMPANY_VAT}`, margin, y)
  }
  y += 8

  // Accent line under header
  doc.setDrawColor(rGreen, gGreen, bGreen)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(locale === 'ar' ? 'فاتورة' : 'INVOICE', margin, y)
  y += 10

  // Invoice number & dates
  doc.setFontSize(10)
  doc.text(
    `${locale === 'ar' ? 'رقم الفاتورة' : 'Invoice No'}: ${invoice.invoiceNumber}`,
    margin,
    y
  )
  doc.text(
    `${locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}: ${formatDate(invoice.issueDate, locale)}`,
    pageWidth - margin - 60,
    y
  )
  y += 6
  doc.text(
    `${locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}: ${formatDate(invoice.dueDate, locale)}`,
    pageWidth - margin - 60,
    y
  )
  y += 10

  // Customer (Bill To) – name, email, optional company, tax ID, billing address
  if (invoice.customer) {
    doc.setFontSize(11)
    doc.text(locale === 'ar' ? 'العميل' : 'Bill To', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.text(invoice.customer.name || invoice.customer.email, margin, y)
    y += 5
    if (invoice.customer.companyName) {
      doc.text(invoice.customer.companyName, margin, y)
      y += 5
    }
    doc.text(invoice.customer.email, margin, y)
    y += 5
    if (invoice.customer.taxId) {
      doc.text(
        (locale === 'ar' ? 'الرقم الضريبي: ' : 'Tax ID: ') + invoice.customer.taxId,
        margin,
        y
      )
      y += 5
    }
    if (invoice.customer.billingAddress) {
      doc.text(invoice.customer.billingAddress, margin, y)
      y += 5
    }
    y += 8
  }

  const hasDays = (invoice.items as InvoiceItem[]).some((i) => i.days != null && i.days > 1)
  const colWidths = hasDays
    ? [18, 14, 58, 22, 22, 22, 22]
    : [25, 70, 20, 25, 25, 25]
  const headers = hasDays
    ? locale === 'ar'
      ? ['الكمية', 'الأيام', 'الوصف', 'السعر/يوم', 'الإجمالي', 'ض.ق.م', 'المجموع']
      : ['Qty', 'Days', 'Description', 'Price/day', 'Total', 'VAT', 'Amount']
    : locale === 'ar'
      ? ['الكمية', 'الوصف', 'السعر', 'الإجمالي', 'ض.ق.م', 'المجموع']
      : ['Qty', 'Description', 'Price', 'Total', 'VAT', 'Amount']

  let colX = margin
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX + 2, y)
    colX += colWidths[i]
  }
  y += 4
  doc.setDrawColor(rGreen, gGreen, bGreen)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')

  const items = invoice.items as InvoiceItem[]
  for (const item of items) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    colX = margin
    doc.text(String(item.quantity), colX + 4, y)
    colX += colWidths[0]
    if (hasDays) {
      doc.text(item.days != null ? String(item.days) : '—', colX + 2, y)
      colX += colWidths[1]
    }
    doc.text(item.description.substring(0, hasDays ? 36 : 40), colX + 2, y)
    colX += colWidths[hasDays ? 2 : 1]
    doc.text(formatAmount(item.unitPrice ?? 0, locale), colX + 2, y)
    colX += colWidths[hasDays ? 3 : 2]
    doc.text(formatAmount(item.total ?? 0, locale), colX + 2, y)
    colX += colWidths[hasDays ? 4 : 3]
    const vatAmount = item.vatAmount ?? (item.total ?? 0) * VAT_RATE
    doc.text(formatAmount(vatAmount, locale), colX + 2, y)
    colX += colWidths[hasDays ? 5 : 4]
    doc.text(formatAmount((item.total ?? 0) + vatAmount, locale), colX + 2, y)
    y += 6
  }

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
  doc.text(
    `${locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}: ${formatAmount(invoice.subtotal, locale)}`,
    pageWidth - margin - 50,
    y
  )
  y += 6
  if (invoice.discount && invoice.discount > 0) {
    doc.text(
      `${locale === 'ar' ? 'الخصم' : 'Discount'}: ${formatAmount(invoice.discount, locale)}`,
      pageWidth - margin - 50,
      y
    )
    y += 6
  }
  doc.text(
    `${locale === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT (15%)'}: ${formatAmount(invoice.vatAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
  y += 6
  doc.setDrawColor(rGreen, gGreen, bGreen)
  doc.setLineWidth(0.4)
  doc.line(pageWidth - margin - 50, y - 2, pageWidth - margin, y - 2)
  doc.setTextColor(rGreen, gGreen, bGreen)
  doc.text(
    `${locale === 'ar' ? 'الإجمالي' : 'Total'}: ${formatAmount(invoice.totalAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
  doc.setFont('helvetica', 'normal')
  y += 12

  if (invoice.notes) {
    doc.setFontSize(9)
    doc.text(locale === 'ar' ? 'ملاحظات' : 'Notes', margin, y)
    y += 5
    doc.text(invoice.notes.substring(0, 100), margin, y)
    y += 10
  }

  if (includeZatcaQr && qrPayload) {
    try {
      const qrDataUrl = await toDataURL(qrPayload, { width: 80, margin: 1 })
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 35, y - 35, 30, 30)
    } catch {
      // QR optional
    }
  }

  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
