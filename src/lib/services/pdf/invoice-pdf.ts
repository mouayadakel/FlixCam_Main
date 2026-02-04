/**
 * @file invoice-pdf.ts
 * @description PDF template for invoices with ZATCA compliance support
 * @module lib/services/pdf
 * @author Engineering Team
 * @created 2026-01-28
 */

import { jsPDF } from 'jspdf'
import { toDataURL } from 'qrcode'
import type { Invoice, InvoiceItem } from '@/lib/types/invoice.types'

const VAT_RATE = 0.15
const COMPANY_NAME = 'FlixCam.rent'
const COMPANY_VAT = ''
const COMPANY_ADDRESS = ''

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

  // Header - Company
  doc.setFontSize(18)
  doc.text(COMPANY_NAME || 'FlixCam.rent', margin, y)
  y += 8
  doc.setFontSize(10)
  doc.text(COMPANY_ADDRESS || 'Saudi Arabia', margin, y)
  if (COMPANY_VAT) {
    y += 5
    doc.text(`VAT: ${COMPANY_VAT}`, margin, y)
  }
  y += 12

  // Title
  doc.setFontSize(16)
  doc.text(locale === 'ar' ? 'فاتورة' : 'INVOICE', margin, y)
  y += 10

  // Invoice number & dates
  doc.setFontSize(10)
  doc.text(`${locale === 'ar' ? 'رقم الفاتورة' : 'Invoice No'}: ${invoice.invoiceNumber}`, margin, y)
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

  // Customer
  if (invoice.customer) {
    doc.setFontSize(11)
    doc.text(locale === 'ar' ? 'العميل' : 'Bill To', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.text(invoice.customer.name || invoice.customer.email, margin, y)
    y += 5
    doc.text(invoice.customer.email, margin, y)
    y += 8
  }

  // Items table
  const colWidths = isRtl ? [25, 70, 20, 25, 25, 25] : [25, 70, 20, 25, 25, 25]
  const headers = locale === 'ar'
    ? ['الكمية', 'الوصف', 'السعر', 'الإجمالي', 'ض.ق.م', 'المجموع']
    : ['Qty', 'Description', 'Price', 'Total', 'VAT', 'Amount']

  let colX = margin
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX + 2, y)
    colX += colWidths[i]
  }
  y += 8
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
    doc.text(item.description.substring(0, 40), colX + 2, y)
    colX += colWidths[1]
    doc.text(formatAmount(item.unitPrice, locale), colX + 2, y)
    colX += colWidths[2]
    doc.text(formatAmount(item.total, locale), colX + 2, y)
    colX += colWidths[3]
    const vatAmount = item.vatAmount ?? item.total * VAT_RATE
    doc.text(formatAmount(vatAmount, locale), colX + 2, y)
    colX += colWidths[4]
    doc.text(formatAmount(item.total + vatAmount, locale), colX + 2, y)
    y += 6
  }

  y += 8
  doc.setFont('helvetica', 'bold')
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
  doc.text(
    `${locale === 'ar' ? 'الإجمالي' : 'Total'}: ${formatAmount(invoice.totalAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
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
