/**
 * @file contract-pdf.ts
 * @description PDF template for rental contracts. FLIXCAM: light mode, charcoal text, green accent.
 * @module lib/services/pdf
 */

import { jsPDF } from 'jspdf'
import type { Contract, ContractContent } from '@/lib/types/contract.types'
import { theme } from '@/config/theme'

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

export interface ContractPdfOptions {
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
 * Generate contract PDF buffer
 */
export function generateContractPdf(contract: Contract, options: ContractPdfOptions = {}): Buffer {
  const { locale = 'en' } = options
  const content = contract.contractContent as ContractContent

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
  doc.text(locale === 'ar' ? 'عقد إيجار معدات' : 'Equipment Rental Contract', margin, y)
  y += 12

  doc.setFontSize(10)
  doc.text(
    `${locale === 'ar' ? 'رقم العقد / الحجز' : 'Contract / Booking No'}: ${content.booking?.bookingNumber ?? contract.bookingId}`,
    margin,
    y
  )
  y += 6
  doc.text(
    `${locale === 'ar' ? 'الإصدار' : 'Terms Version'}: ${content.termsVersion ?? contract.termsVersion}`,
    margin,
    y
  )
  y += 6
  doc.text(
    `${locale === 'ar' ? 'التاريخ' : 'Date'}: ${content.generatedAt ? formatDate(content.generatedAt, locale) : formatDate(new Date(), locale)}`,
    margin,
    y
  )
  y += 12

  if (content.customer) {
    doc.setFont('helvetica', 'bold')
    doc.text(locale === 'ar' ? 'العميل' : 'Customer', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(content.customer.name ?? content.customer.email, margin, y)
    y += 8
  }

  if (content.booking) {
    doc.setFont('helvetica', 'bold')
    doc.text(locale === 'ar' ? 'فترة الإيجار' : 'Rental Period', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(
      `${formatDate(content.booking.startDate, locale)} - ${formatDate(content.booking.endDate, locale)}`,
      margin,
      y
    )
    y += 6
    doc.setDrawColor(rGreen, gGreen, bGreen)
    doc.setLineWidth(0.3)
    doc.line(margin, y - 2, margin + 60, y - 2)
    doc.setTextColor(rGreen, gGreen, bGreen)
    doc.text(
      `${locale === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}: ${formatAmount(content.booking.totalAmount, locale)}`,
      margin,
      y
    )
    doc.setTextColor(rCharcoal, gCharcoal, bCharcoal)
    y += 10
  }

  if (content.equipment && content.equipment.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text(locale === 'ar' ? 'المعدات' : 'Equipment', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 8
    for (const eq of content.equipment) {
      if (y > 260) {
        doc.addPage()
        y = 20
      }
      doc.text(
        `${eq.name ?? eq.sku} - ${eq.quantity} x ${formatAmount(eq.dailyPrice ?? 0, locale)}/day`,
        margin,
        y
      )
      y += 6
    }
    y += 8
  }

  if (content.terms) {
    doc.setFont('helvetica', 'bold')
    doc.text(locale === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 8
    const termsLines = doc.splitTextToSize(content.terms, maxWidth)
    for (const line of termsLines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(line, margin, y)
      y += 5
    }
    y += 10
  }

  if (contract.signedAt) {
    doc.setFontSize(9)
    doc.text(
      `${locale === 'ar' ? 'تم التوقيع في' : 'Signed at'}: ${formatDate(contract.signedAt, locale)}`,
      margin,
      y
    )
  }

  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
