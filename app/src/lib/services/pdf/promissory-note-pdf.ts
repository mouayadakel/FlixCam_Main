/**
 * Generate Promissory Note (سند أمر) PDF
 */

import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/db/prisma'

const MARGIN = 20
const PAGE_WIDTH = 210

function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

export async function generatePromissoryNotePdf(noteId: string): Promise<Buffer> {
  const note = await prisma.promissoryNote.findFirst({
    where: { id: noteId },
    include: { debtor: true, booking: true },
  })

  if (!note) throw new Error('سند الأمر غير موجود')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let y = MARGIN
  const maxW = PAGE_WIDTH - MARGIN * 2

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('سند لأمر - Promissory Note', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`رقم السند: ${note.noteNumber}`, MARGIN, y)
  doc.text(`التاريخ: ${note.issueDate.toLocaleDateString('ar-SA')}`, PAGE_WIDTH - MARGIN - 50, y)
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('المستفيد (الشركة)', MARGIN, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(note.creditorName, MARGIN, y)
  y += 5
  if (note.creditorCommercialReg) doc.text(`السجل التجاري: ${note.creditorCommercialReg}`, MARGIN, y), (y += 5)
  if (note.creditorTaxNumber) doc.text(`الرقم الضريبي: ${note.creditorTaxNumber}`, MARGIN, y), (y += 5)
  if (note.creditorAddress) doc.text(note.creditorAddress, MARGIN, y), (y += 5)
  y += 4

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('المدين (العميل)', MARGIN, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`الاسم: ${note.debtorName}`, MARGIN, y)
  y += 5
  doc.text(`الهاتف: ${note.debtorPhone}`, MARGIN, y)
  y += 5
  doc.text(`البريد: ${note.debtorEmail}`, MARGIN, y)
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('المبلغ', MARGIN, y)
  y += 6
  doc.setFontSize(14)
  doc.text(`${Number(note.amountSar).toLocaleString('ar-SA')} ريال سعودي`, MARGIN, y)
  y += 6
  doc.setFontSize(9)
  const wordsLines = splitText(doc, note.amountInWords, maxW)
  for (const line of wordsLines) {
    doc.text(line, MARGIN, y)
    y += 5
  }
  y += 4

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`الفاتورة: ${note.invoiceNumber || '—'}`, MARGIN, y)
  y += 6

  const items = (note.equipmentItems as { name: string; purchaseValue: number; quantity: number }[]) || []
  if (items.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('المعدات المستأجرة:', MARGIN, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    for (const it of items) {
      doc.text(
        `- ${it.name}: ${(it.purchaseValue * it.quantity).toLocaleString('ar-SA')} ريال`,
        MARGIN + 3,
        y
      )
      y += 5
    }
    y += 2
  }

  if (note.expectedReturnDate) {
    doc.text(`تاريخ الإرجاع المتوقع: ${note.expectedReturnDate.toLocaleDateString('ar-SA')}`, MARGIN, y)
    y += 5
  }
  if (note.dueDate) {
    doc.text(`تاريخ الاستحقاق: ${note.dueDate.toLocaleDateString('ar-SA')}`, MARGIN, y)
    y += 6
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('شروط سند الأمر:', MARGIN, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const bodyText = note.letterContent?.trim()
    ? note.letterContent
    : [
        '1. هذا السند مستحق الأداء لدى الاطلاع أو في تاريخ الاستحقاق.',
        '2. يحق للمستفيد تفعيل السند في حالة التلف أو الفقدان أو التأخر في الإرجاع.',
        '3. المبلغ يمثل قيمة الشراء الكاملة للمعدات المستأجرة.',
        '4. خاضع لأنظمة المملكة العربية السعودية.',
      ].join('\n')
  const bodyLines = splitText(doc, bodyText, maxW - 5)
  for (const line of bodyLines) {
    doc.text(line, MARGIN + 3, y)
    y += 5
  }
  y += 6

  if (note.signatureData) {
    try {
      const imgData = note.signatureData
      if (imgData.startsWith('data:image')) {
        doc.addImage(imgData, 'PNG', MARGIN, y, 50, 25)
      }
      y += 30
    } catch {
      doc.text('التوقيع: [مرفق]', MARGIN, y)
      y += 8
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `وقّع في: ${note.signedAt?.toLocaleString('ar-SA') || '—'} | IP: ${note.signatureIp || '—'}`,
    MARGIN,
    y
  )

  return Buffer.from(doc.output('arraybuffer'))
}
