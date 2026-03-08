/**
 * Promissory Note Service – create, sign, enforce, fulfill
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { getCompanySettings } from '@/lib/settings/company-settings'
import { getPromissoryNoteSettings } from '@/lib/settings/promissory-note-settings'
import { replacePlaceholders } from '@/lib/utils/letter-template.utils'
import { Decimal } from '@prisma/client/runtime/library'
import type { CreateBookingPromissoryNoteInput } from '@/lib/validators/promissory-note.validator'
import { generatePromissoryNotePdf } from './pdf/promissory-note-pdf'
import * as fs from 'fs'
import * as path from 'path'

const FALLBACK_PURCHASE_MULTIPLIER = 10

type PromissoryNoteWhere = Prisma.PromissoryNoteWhereInput

async function generateNoteNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.promissoryNote.count({
    where: {
      noteNumber: { startsWith: `PN-${year}-` },
    },
  })
  const seq = String(count + 1).padStart(5, '0')
  return `PN-${year}-${seq}`
}

function amountToArabicWords(amount: number): string {
  try {
    const { toArabicWord } = require('number-to-arabic-words/dist/index-node.js')
    const intPart = Math.floor(amount)
    const words = toArabicWord(intPart)
    return `${words} ريال سعودي فقط لا غير`
  } catch {
    return `${amount.toLocaleString('ar-SA')} ريال سعودي فقط لا غير`
  }
}

export async function createBookingPromissoryNote(
  input: CreateBookingPromissoryNoteInput,
  userId: string,
  meta: { ip?: string; device?: string }
): Promise<{ id: string; noteNumber: string; pdfUrl: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      equipment: {
        include: {
          equipment: {
            select: {
              id: true,
              nameEn: true,
              model: true,
              purchasePrice: true,
              dailyPrice: true,
            },
          },
        },
      },
    },
  })

  if (!booking) throw new Error('الحجز غير موجود')
  if (booking.customerId !== userId) throw new Error('غير مصرح')
  if (booking.status !== 'PAYMENT_PENDING') throw new Error('الحجز غير جاهز للدفع')

  const existing = await prisma.promissoryNote.findFirst({
    where: { bookingId: input.bookingId, status: { not: 'CANCELLED' } },
  })
  if (existing) throw new Error('يوجد سند أمر مرتبط بهذا الحجز')

  const company = await getCompanySettings()
  if (!company.creditorName?.trim()) throw new Error('بيانات الشركة غير مكتملة. الرجاء إعدادها من لوحة التحكم.')

  const equipmentItems: { name: string; purchaseValue: number; quantity: number }[] = []
  let totalPurchaseValue = 0

  for (const be of booking.equipment) {
    const eq = be.equipment as { nameEn?: string; model?: string; purchasePrice?: unknown; dailyPrice?: unknown }
    const name = (eq?.nameEn || eq?.model || 'معدة') as string
    const purchasePrice = eq?.purchasePrice != null ? Number(eq.purchasePrice) : null
    const dailyPrice = eq?.dailyPrice != null ? Number(eq.dailyPrice) : 0
    const value = purchasePrice ?? dailyPrice * FALLBACK_PURCHASE_MULTIPLIER
    const lineTotal = value * be.quantity
    totalPurchaseValue += lineTotal
    equipmentItems.push({
      name,
      purchaseValue: value,
      quantity: be.quantity,
    })
  }

  if (equipmentItems.length === 0) {
    totalPurchaseValue = Number(booking.totalAmount) * 10
    equipmentItems.push({
      name: 'حجز',
      purchaseValue: Number(booking.totalAmount),
      quantity: 1,
    })
  }

  const amountSar = Number(totalPurchaseValue)
  const amountInWords = amountToArabicWords(amountSar)
  const expectedReturn = booking.endDate
  const dueDate = new Date(expectedReturn)
  dueDate.setDate(dueDate.getDate() + 30)

  const noteNumber = await generateNoteNumber()
  const invoiceNumber = `INV-${booking.bookingNumber}`

  const note = await prisma.promissoryNote.create({
    data: {
      noteNumber,
      noteType: 'BOOKING_SPECIFIC',
      debtorId: userId,
      debtorName: (booking.customer?.name || 'عميل').trim(),
      debtorPhone: (booking.customer?.phone || '').trim() || '—',
      debtorEmail: (booking.customer?.email || '').trim() || '—',
      creditorName: company.creditorName,
      creditorCommercialReg: company.creditorCommercialReg || undefined,
      creditorTaxNumber: company.creditorTaxNumber || undefined,
      creditorAddress: company.creditorAddress || undefined,
      creditorBankAccount: company.creditorBankAccount || undefined,
      creditorIban: company.creditorIban || undefined,
      amountSar: new Decimal(amountSar),
      amountInWords,
      equipmentPurchaseValue: new Decimal(amountSar),
      equipmentItems: equipmentItems as unknown as Prisma.InputJsonValue,
      bookingId: booking.id,
      invoiceNumber,
      expectedReturnDate: expectedReturn,
      dueDate,
      status: 'SIGNED',
      termsAccepted: true,
      damagePolicyAccepted: true,
      lateFeesAccepted: true,
      signatureData: input.signatureData,
      signatureTimestamp: new Date(),
      signatureIp: meta.ip || undefined,
      signatureDevice: meta.device || undefined,
      signedAt: new Date(),
      managerName: company.managerName || undefined,
      managerTitle: company.managerTitle || undefined,
      managerLetterTemplate: company.managerLetterTemplate || undefined,
    },
  })

  const pdfBuffer = await generatePromissoryNotePdf(note.id)
  const dir = path.join(process.cwd(), 'storage', 'promissory-notes')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filename = `PN-${note.noteNumber}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, pdfBuffer)

  const pdfUrl = `/api/promissory-notes/${note.id}/pdf`

  await prisma.promissoryNote.update({
    where: { id: note.id },
    data: { pdfGenerated: true, pdfUrl: filePath, pdfGeneratedAt: new Date() },
  })

  return { id: note.id, noteNumber: note.noteNumber, pdfUrl }
}

export async function listPromissoryNotesForAdmin(options: {
  status?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ data: Array<{
  id: string
  noteNumber: string
  debtorName: string
  amountSar: number
  status: string
  invoiceNumber: string | null
  bookingId: string | null
  bookingNumber: string | null
  signedAt: Date | null
  expectedReturnDate: Date | null
  dueDate: Date | null
}>; total: number }> {
  const { status, search, limit = 50, offset = 0 } = options
  const where: PromissoryNoteWhere = {}
  if (status && status !== 'All') where.status = status
  const searchTerm = search?.trim()
  if (searchTerm) {
    where.OR = [
      { noteNumber: { contains: searchTerm } },
      { debtorName: { contains: searchTerm } },
      { invoiceNumber: { contains: searchTerm } },
    ]
  }
  const [data, total] = await Promise.all([
    prisma.promissoryNote.findMany({
      where,
      select: {
        id: true,
        noteNumber: true,
        debtorName: true,
        amountSar: true,
        status: true,
        invoiceNumber: true,
        bookingId: true,
        signedAt: true,
        expectedReturnDate: true,
        dueDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.promissoryNote.count({ where }),
  ])
  const bookingIds = [...new Set(data.map((d) => d.bookingId).filter(Boolean))] as string[]
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { id: true, bookingNumber: true },
      })
    : []
  const bookingMap = Object.fromEntries(bookings.map((b) => [b.id, b.bookingNumber]))
  return {
    data: data.map((d) => ({
      ...d,
      amountSar: Number(d.amountSar),
      bookingNumber: d.bookingId ? bookingMap[d.bookingId] ?? null : null,
    })),
    total,
  }
}

export async function enforcePromissoryNote(
  id: string,
  userId: string,
  reason?: string
): Promise<void> {
  const note = await prisma.promissoryNote.findFirst({ where: { id } })
  if (!note) throw new Error('سند الأمر غير موجود')
  if (note.status === 'ENFORCED') throw new Error('السند مُنفّذ مسبقاً')
  if (note.status === 'FULFILLED') throw new Error('السند مُستوفى ولا يمكن تنفيذه')
  if (note.status === 'CANCELLED') throw new Error('السند ملغي')
  await prisma.promissoryNote.update({
    where: { id },
    data: {
      status: 'ENFORCED',
      enforcedAt: new Date(),
      enforcedReason: reason ?? undefined,
      updatedAt: new Date(),
    },
  })
}

export interface CreatePromissoryNoteManuallyInput {
  debtorId: string
  bookingId?: string
  amountSar?: number
  equipmentItems?: { name: string; purchaseValue: number; quantity: number }[]
  expectedReturnDate?: string
  letterContent?: string
  letterType: 'generated' | 'pdf'
  letterPdfUrl?: string
}

export async function createPromissoryNoteManually(
  input: CreatePromissoryNoteManuallyInput,
  adminUserId: string
): Promise<{ id: string; noteNumber: string }> {
  const company = await getCompanySettings()
  if (!company.creditorName?.trim()) {
    throw new Error('بيانات الشركة غير مكتملة. الرجاء إعدادها من لوحة التحكم.')
  }

  const debtor = await prisma.user.findFirst({
    where: { id: input.debtorId },
    select: { id: true, name: true, email: true, phone: true },
  })
  if (!debtor) throw new Error('العميل غير موجود')

  let amountSar: number
  let equipmentItems: { name: string; purchaseValue: number; quantity: number }[]
  let expectedReturn: Date
  let dueDate: Date
  let bookingNumber: string | undefined
  let invoiceNumber: string

  if (input.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, deletedAt: null },
      include: {
        customer: { select: { name: true } },
        equipment: {
          include: {
            equipment: {
              select: { nameEn: true, model: true, purchasePrice: true, dailyPrice: true },
            },
          },
        },
      },
    })
    if (!booking) throw new Error('الحجز غير موجود')
    if (booking.customerId !== input.debtorId) {
      throw new Error('العميل المحدد لا يطابق عميل الحجز')
    }

    equipmentItems = []
    let totalPurchaseValue = 0
    for (const be of booking.equipment) {
      const eq = be.equipment as { nameEn?: string; model?: string; purchasePrice?: unknown; dailyPrice?: unknown }
      const name = (eq?.nameEn || eq?.model || 'معدة') as string
      const purchasePrice = eq?.purchasePrice != null ? Number(eq.purchasePrice) : null
      const dailyPrice = eq?.dailyPrice != null ? Number(eq.dailyPrice) : 0
      const value = purchasePrice ?? (dailyPrice as number) * FALLBACK_PURCHASE_MULTIPLIER
      totalPurchaseValue += value * be.quantity
      equipmentItems.push({ name, purchaseValue: value, quantity: be.quantity })
    }
    if (equipmentItems.length === 0) {
      totalPurchaseValue = Number(booking.totalAmount) * 10
      equipmentItems.push({ name: 'حجز', purchaseValue: Number(booking.totalAmount), quantity: 1 })
    }
    amountSar = totalPurchaseValue
    expectedReturn = booking.endDate
    dueDate = new Date(expectedReturn)
    dueDate.setDate(dueDate.getDate() + 30)
    bookingNumber = booking.bookingNumber
    invoiceNumber = `INV-${booking.bookingNumber}`
  } else {
    if (input.amountSar == null || input.amountSar <= 0) {
      throw new Error('المبلغ مطلوب عند عدم ربط الحجز')
    }
    amountSar = input.amountSar
    equipmentItems = input.equipmentItems?.length
      ? input.equipmentItems
      : [{ name: 'حجز', purchaseValue: amountSar, quantity: 1 }]
    const exp = input.expectedReturnDate ? new Date(input.expectedReturnDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    expectedReturn = exp
    dueDate = new Date(exp)
    dueDate.setDate(dueDate.getDate() + 30)
    invoiceNumber = `INV-MAN-${Date.now()}`
  }

  const noteNumber = await generateNoteNumber()
  const amountInWords = amountToArabicWords(amountSar)

  let letterContent = input.letterContent
  if (input.letterType === 'generated' && !letterContent?.trim()) {
    const pnSettings = await getPromissoryNoteSettings()
    const template = (pnSettings as { letter_template?: string }).letter_template || ''
    if (template) {
      const equipmentNames = equipmentItems.map((i) => `${i.name} × ${i.quantity}`).join('، ')
      letterContent = replacePlaceholders(template, {
        client_name: (debtor.name || 'عميل').trim(),
        client_id: debtor.id,
        date: new Date().toLocaleDateString('ar-SA'),
        order_number: noteNumber,
        equipment_name: equipmentNames,
      })
    }
  }

  const note = await prisma.promissoryNote.create({
    data: {
      noteNumber,
      noteType: 'BOOKING_SPECIFIC',
      debtorId: input.debtorId,
      debtorName: (debtor.name || 'عميل').trim(),
      debtorPhone: (debtor.phone || '').trim() || '—',
      debtorEmail: (debtor.email || '').trim() || '—',
      creditorName: company.creditorName,
      creditorCommercialReg: company.creditorCommercialReg || undefined,
      creditorTaxNumber: company.creditorTaxNumber || undefined,
      creditorAddress: company.creditorAddress || undefined,
      amountSar: new Decimal(amountSar),
      amountInWords,
      equipmentPurchaseValue: new Decimal(amountSar),
      equipmentItems: equipmentItems as unknown as Prisma.InputJsonValue,
      bookingId: input.bookingId || null,
      invoiceNumber,
      expectedReturnDate: expectedReturn,
      dueDate,
      status: 'SIGNED',
      termsAccepted: true,
      damagePolicyAccepted: true,
      lateFeesAccepted: true,
      signedAt: new Date(),
      managerName: company.managerName || undefined,
      managerTitle: company.managerTitle || undefined,
      letterContent: letterContent || null,
      letterPdfUrl: input.letterPdfUrl || null,
      letterType: input.letterType,
    },
  })

  if (input.letterType === 'generated' && letterContent?.trim()) {
    const pdfBuffer = await generatePromissoryNotePdf(note.id)
    const dir = path.join(process.cwd(), 'storage', 'promissory-notes')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const filename = `PN-${note.noteNumber}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')
    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, pdfBuffer)
    await prisma.promissoryNote.update({
      where: { id: note.id },
      data: { pdfGenerated: true, pdfUrl: filePath, pdfGeneratedAt: new Date() },
    })
  }

  return { id: note.id, noteNumber: note.noteNumber }
}

export async function fulfillPromissoryNote(id: string): Promise<void> {
  const note = await prisma.promissoryNote.findFirst({ where: { id } })
  if (!note) throw new Error('سند الأمر غير موجود')
  if (note.status === 'FULFILLED') throw new Error('السند مُستوفى مسبقاً')
  if (note.status === 'ENFORCED') throw new Error('السند مُنفّذ ولا يمكن استيفاؤه')
  if (note.status === 'CANCELLED') throw new Error('السند ملغي')
  await prisma.promissoryNote.update({
    where: { id },
    data: {
      status: 'FULFILLED',
      fulfilledAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

export async function getPromissoryNoteById(id: string): Promise<{
  id: string
  noteNumber: string
  amountSar: number
  status: string
  invoiceNumber: string | null
  bookingId: string | null
  pdfUrl: string | null
  signedAt: Date | null
  debtorName: string
}> {
  const note = await prisma.promissoryNote.findFirst({
    where: { id },
    select: {
      id: true,
      noteNumber: true,
      amountSar: true,
      status: true,
      invoiceNumber: true,
      bookingId: true,
      pdfUrl: true,
      signedAt: true,
      debtorName: true,
    },
  })
  if (!note) throw new Error('سند الأمر غير موجود')
  return {
    ...note,
    amountSar: Number(note.amountSar),
  }
}

export async function getBookingPreviewForPn(bookingId: string, userId: string): Promise<{
  bookingId: string
  bookingNumber: string
  invoiceNumber: string
  debtorName: string
  debtorPhone: string
  debtorEmail: string
  amountSar: number
  amountInWords: string
  equipmentItems: { name: string; purchaseValue: number; quantity: number }[]
  expectedReturnDate: string
  dueDate: string
  creditorName: string
  managerLetterTemplate: string
  managerName: string
  managerTitle: string
}> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      equipment: {
        include: {
          equipment: {
            select: {
              nameEn: true,
              model: true,
              purchasePrice: true,
              dailyPrice: true,
            },
          },
        },
      },
    },
  })

  if (!booking) throw new Error('الحجز غير موجود')
  if (booking.customerId !== userId) throw new Error('غير مصرح')

  const company = await getCompanySettings()
  const equipmentItems: { name: string; purchaseValue: number; quantity: number }[] = []
  let totalPurchaseValue = 0

  for (const be of booking.equipment) {
    const eq = be.equipment as { nameEn?: string; model?: string; purchasePrice?: unknown; dailyPrice?: unknown }
    const name = (eq?.nameEn || eq?.model || 'معدة') as string
    const purchasePrice = eq?.purchasePrice != null ? Number(eq.purchasePrice) : null
    const dailyPrice = eq?.dailyPrice != null ? Number(eq.dailyPrice) : 0
    const value = purchasePrice ?? dailyPrice * FALLBACK_PURCHASE_MULTIPLIER
    totalPurchaseValue += value * be.quantity
    equipmentItems.push({ name, purchaseValue: value, quantity: be.quantity })
  }

  if (equipmentItems.length === 0) {
    totalPurchaseValue = Number(booking.totalAmount) * 10
    equipmentItems.push({ name: 'حجز', purchaseValue: Number(booking.totalAmount), quantity: 1 })
  }

  const expectedReturn = booking.endDate
  const dueDate = new Date(expectedReturn)
  dueDate.setDate(dueDate.getDate() + 30)

  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    invoiceNumber: `INV-${booking.bookingNumber}`,
    debtorName: (booking.customer?.name || 'عميل').trim(),
    debtorPhone: (booking.customer?.phone || '').trim() || '—',
    debtorEmail: (booking.customer?.email || '').trim() || '—',
    amountSar: totalPurchaseValue,
    amountInWords: amountToArabicWords(totalPurchaseValue),
    equipmentItems,
    expectedReturnDate: expectedReturn.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    creditorName: company.creditorName,
    managerLetterTemplate: company.managerLetterTemplate,
    managerName: company.managerName,
    managerTitle: company.managerTitle,
  }
}
