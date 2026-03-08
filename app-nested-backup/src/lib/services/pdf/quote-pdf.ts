/**
 * @file quote-pdf.ts
 * @description PDF template for quotes. FLIXCAM: light mode, charcoal text, green accent.
 * @module lib/services/pdf
 */

import { jsPDF } from 'jspdf'
import type { Quote, QuoteEquipmentItem } from '@/lib/types/quote.types'
import { theme } from '@/config/theme'

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

export interface QuotePdfOptions {
  locale?: 'ar' | 'en'
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Generate quote PDF buffer
 */
export function generateQuotePdf(quote: Quote, options: QuotePdfOptions = {}): Buffer {
  const { locale = 'en' } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  })

  const margin = 20
  let y = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const [rCharcoal, gCharcoal, bCharcoal] = hexToRgb(theme.colors.textOnLight)
  const [rGreen, gGreen, bGreen] = hexToRgb(theme.invoiceSettings.primaryAccent)

  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(theme.brandName, margin, y)
  y += 5
  if (theme.invoiceSettings.showTagline) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(theme.industry, margin, y)
    y += 6
  }
  y += 4
  doc.setDrawColor(rGreen, gGreen, bGreen)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(locale === 'ar' ? 'عرض سعر' : 'Quote', margin, y)
  y += 12

  doc.setFontSize(10)
  doc.text(`${locale === 'ar' ? 'رقم العرض' : 'Quote No'}: ${quote.quoteNumber}`, margin, y)
  doc.text(
    `${locale === 'ar' ? 'صالح حتى' : 'Valid Until'}: ${formatDate(quote.validUntil, locale)}`,
    pageWidth - margin - 50,
    y
  )
  y += 8

  if (quote.customer) {
    doc.text(locale === 'ar' ? 'العميل' : 'Customer', margin, y)
    y += 5
    doc.text(quote.customer.name ?? quote.customer.email, margin, y)
    y += 5
    if (quote.customer.companyName) {
      doc.text(quote.customer.companyName, margin, y)
      y += 5
    }
    doc.text(quote.customer.email, margin, y)
    y += 5
    if (quote.customer.taxId) {
      doc.text(
        (locale === 'ar' ? 'الرقم الضريبي: ' : 'Tax ID: ') + quote.customer.taxId,
        margin,
        y
      )
      y += 5
    }
    if (quote.customer.billingAddress) {
      doc.text(quote.customer.billingAddress, margin, y)
      y += 5
    }
    y += 8
  }

  doc.text(
    `${locale === 'ar' ? 'الفترة' : 'Period'}: ${formatDate(quote.startDate, locale)} - ${formatDate(quote.endDate, locale)}`,
    margin,
    y
  )
  y += 12

  const items = quote.equipment as QuoteEquipmentItem[]
  if (items && items.length > 0) {
    doc.setFont(undefined as any, 'bold')
    doc.text(locale === 'ar' ? 'المعدات' : 'Equipment', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 8
    for (const eq of items) {
      doc.text(
        `Qty ${eq.quantity} x ${formatAmount(eq.dailyRate, locale)}/day x ${eq.totalDays} days = ${formatAmount(eq.subtotal, locale)}`,
        margin,
        y
      )
      y += 6
    }
    y += 8
  }

  doc.setFont(undefined as any, 'bold')
  doc.text(
    `${locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}: ${formatAmount(quote.subtotal, locale)}`,
    pageWidth - margin - 50,
    y
  )
  y += 6
  if (quote.discount && quote.discount > 0) {
    doc.text(
      `${locale === 'ar' ? 'الخصم' : 'Discount'}: ${formatAmount(quote.discount, locale)}`,
      pageWidth - margin - 50,
      y
    )
    y += 6
  }
  doc.text(
    `${locale === 'ar' ? 'ض.ق.م (15%)' : 'VAT (15%)'}: ${formatAmount(quote.vatAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
  y += 6
  doc.setDrawColor(rGreen, gGreen, bGreen)
  doc.setLineWidth(0.4)
  doc.line(pageWidth - margin - 50, y - 2, pageWidth - margin, y - 2)
  doc.setTextColor(rGreen, gGreen, bGreen)
  doc.text(
    `${locale === 'ar' ? 'الإجمالي' : 'Total'}: ${formatAmount(quote.totalAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
  doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
  if (quote.depositAmount && quote.depositAmount > 0) {
    y += 6
    doc.text(
      `${locale === 'ar' ? 'الوديعة' : 'Deposit'}: ${formatAmount(quote.depositAmount, locale)}`,
      pageWidth - margin - 50,
      y
    )
  }
  doc.setFont('helvetica', 'normal')
  y += 12

  if (quote.notes) {
    doc.setFontSize(9)
    doc.text(locale === 'ar' ? 'ملاحظات' : 'Notes', margin, y)
    y += 5
    doc.text(quote.notes.substring(0, 120), margin, y)
  }

  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
