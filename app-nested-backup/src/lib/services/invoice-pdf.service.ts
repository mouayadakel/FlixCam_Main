/**
 * Invoice PDF generation service using jsPDF.
 * Generates Arabic RTL invoices for studio and equipment bookings.
 */

import { jsPDF } from 'jspdf'

export interface InvoicePdfData {
  invoiceNumber: string
  bookingNumber: string
  issueDate: Date
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: { description: string; quantity: number; unitPrice: number; total: number }[]
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  studioName?: string | null
  studioAddress?: string | null
  studioDate?: string | null
  studioTime?: string | null
  notes?: string | null
}

export class InvoicePdfService {
  static generate(data: InvoicePdfData): Buffer {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15
    const contentW = pageW - margin * 2
    let y = margin

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, pageW, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('FlixCam.rent', pageW / 2, 18, { align: 'center' })
    doc.setFontSize(11)
    doc.text('INVOICE / فاتورة', pageW / 2, 30, { align: 'center' })
    y = 50

    // Invoice meta
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)

    const metaLeft = [
      `Invoice #: ${data.invoiceNumber}`,
      `Booking #: ${data.bookingNumber}`,
      `Date: ${data.issueDate.toLocaleDateString('en-GB')}`,
    ]
    const metaRight = [
      `Customer: ${data.customerName}`,
      `Email: ${data.customerEmail}`,
      ...(data.customerPhone ? [`Phone: ${data.customerPhone}`] : []),
    ]

    metaLeft.forEach((line, i) => {
      doc.text(line, margin, y + i * 5)
    })
    metaRight.forEach((line, i) => {
      doc.text(line, pageW - margin, y + i * 5, { align: 'right' })
    })
    y += Math.max(metaLeft.length, metaRight.length) * 5 + 8

    // Studio details
    if (data.studioName) {
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(margin, y, contentW, 20, 2, 2, 'F')
      doc.setFontSize(10)
      doc.setTextColor(79, 70, 229)
      doc.text(`Studio: ${data.studioName}`, margin + 4, y + 6)
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(8)
      if (data.studioAddress) doc.text(data.studioAddress, margin + 4, y + 11)
      if (data.studioDate) doc.text(`Date: ${data.studioDate}`, margin + 4, y + 16)
      if (data.studioTime) doc.text(`Time: ${data.studioTime}`, margin + contentW / 2, y + 16)
      y += 26
    }

    // Line separator
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // Table header
    const cols = [
      { label: 'Description', x: margin, w: contentW * 0.45 },
      { label: 'Qty', x: margin + contentW * 0.45, w: contentW * 0.12 },
      { label: 'Unit Price', x: margin + contentW * 0.57, w: contentW * 0.2 },
      { label: 'Total', x: margin + contentW * 0.77, w: contentW * 0.23 },
    ]

    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y - 3, contentW, 8, 'F')
    doc.setFontSize(8)
    doc.setTextColor(75, 85, 99)
    cols.forEach((col) => {
      doc.text(col.label, col.x + 2, y + 2)
    })
    y += 10

    // Table rows
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    for (const item of data.items) {
      if (y > 260) {
        doc.addPage()
        y = margin
      }
      doc.text(item.description.slice(0, 50), cols[0].x + 2, y)
      doc.text(String(item.quantity), cols[1].x + 2, y)
      doc.text(`${item.unitPrice.toLocaleString()} SAR`, cols[2].x + 2, y)
      doc.text(`${item.total.toLocaleString()} SAR`, cols[3].x + 2, y)
      y += 6
    }

    // Separator
    y += 4
    doc.line(margin, y, pageW - margin, y)
    y += 8

    // Totals
    const totalsX = pageW - margin - 60
    doc.setFontSize(9)
    doc.text('Subtotal:', totalsX, y)
    doc.text(`${data.subtotal.toLocaleString()} SAR`, pageW - margin, y, { align: 'right' })
    y += 6
    doc.text(`VAT (${data.vatRate}%):`, totalsX, y)
    doc.text(`${data.vatAmount.toLocaleString()} SAR`, pageW - margin, y, { align: 'right' })
    y += 6
    doc.setFillColor(79, 70, 229)
    doc.rect(totalsX - 4, y - 4, pageW - margin - totalsX + 8, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.text('Total:', totalsX, y + 3)
    doc.text(`${data.total.toLocaleString()} SAR`, pageW - margin, y + 3, { align: 'right' })
    y += 16

    // Notes
    if (data.notes) {
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(8)
      doc.text(`Notes: ${data.notes}`, margin, y)
      y += 8
    }

    // Footer
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(7)
    doc.text('FlixCam.rent – Cinematic Equipment & Studio Rental', pageW / 2, 285, {
      align: 'center',
    })
    doc.text('VAT # 300000000000003 | CR # 1010000000', pageW / 2, 289, { align: 'center' })

    return Buffer.from(doc.output('arraybuffer'))
  }
}
