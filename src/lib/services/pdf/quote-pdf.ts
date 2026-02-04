/**
 * @file quote-pdf.ts
 * @description PDF template for quotes
 * @module lib/services/pdf
 * @author Engineering Team
 * @created 2026-01-28
 */

import { jsPDF } from 'jspdf'
import type { Quote, QuoteEquipmentItem } from '@/lib/types/quote.types'

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

  doc.setFontSize(18)
  doc.text(locale === 'ar' ? 'عرض سعر' : 'Quote', margin, y)
  y += 12

  doc.setFontSize(10)
  doc.text(
    `${locale === 'ar' ? 'رقم العرض' : 'Quote No'}: ${quote.quoteNumber}`,
    margin,
    y
  )
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
  doc.text(
    `${locale === 'ar' ? 'الإجمالي' : 'Total'}: ${formatAmount(quote.totalAmount, locale)}`,
    pageWidth - margin - 50,
    y
  )
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
