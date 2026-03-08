/**
 * Unit tests for promissory-note.service
 */

import {
  getPromissoryNoteById,
  listPromissoryNotesForAdmin,
  enforcePromissoryNote,
  fulfillPromissoryNote,
  getBookingPreviewForPn,
  createBookingPromissoryNote,
  createPromissoryNoteManually,
} from '../promissory-note.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    promissoryNote: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: { findFirst: jest.fn(), findMany: jest.fn() },
    user: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn() },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
  },
}))

jest.mock('@/lib/settings/company-settings', () => ({
  getCompanySettings: jest.fn().mockResolvedValue({
    creditorName: 'Test Co',
    creditorCommercialReg: 'CR123',
    creditorTaxNumber: 'VAT123',
    creditorAddress: 'Address',
    creditorBankAccount: 'ACC',
    creditorIban: 'SA123',
    managerName: 'Manager',
    managerTitle: 'CEO',
    managerLetterTemplate: null,
  }),
}))

const mockGetPromissoryNoteSettings = jest.fn().mockResolvedValue({ letter_template: '' })
jest.mock('@/lib/settings/promissory-note-settings', () => ({
  getPromissoryNoteSettings: (...args: unknown[]) => mockGetPromissoryNoteSettings(...args),
}))

jest.mock('number-to-arabic-words/dist/index-node.js', () => ({
  toArabicWord: () => {
    throw new Error('toArabicWord failed')
  },
}))


const mockExistsSync = jest.fn().mockReturnValue(true)
const mockMkdirSync = jest.fn()
const mockWriteFileSync = jest.fn()
jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}))

const mockGeneratePromissoryNotePdf = jest.fn().mockResolvedValue(Buffer.from('pdf'))
jest.mock('../pdf/promissory-note-pdf', () => ({
  generatePromissoryNotePdf: (...args: unknown[]) => mockGeneratePromissoryNotePdf(...args),
}))

const mockPromissoryNoteFindFirst = prisma.promissoryNote.findFirst as jest.Mock
const mockPromissoryNoteFindMany = prisma.promissoryNote.findMany as jest.Mock
const mockPromissoryNoteCount = prisma.promissoryNote.count as jest.Mock
const mockPromissoryNoteCreate = prisma.promissoryNote.create as jest.Mock
const mockPromissoryNoteUpdate = prisma.promissoryNote.update as jest.Mock
const mockPromissoryNoteUpdateMany = prisma.promissoryNote.updateMany as jest.Mock
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock

describe('promissory-note.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGeneratePromissoryNotePdf.mockResolvedValue(Buffer.from('pdf'))
    mockExistsSync.mockReturnValue(true)
  })

  describe('getPromissoryNoteById', () => {
    it('returns note when found', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-001',
        amountSar: 1000,
        status: 'PENDING',
        invoiceNumber: 'INV-1',
        bookingId: 'bk1',
        pdfUrl: null,
        signedAt: null,
        debtorName: 'Client Name',
      })
      const result = await getPromissoryNoteById('pn1')
      expect(result.id).toBe('pn1')
      expect(result.noteNumber).toBe('PN-001')
      expect(result.amountSar).toBe(1000)
      expect(result.debtorName).toBe('Client Name')
    })

    it('throws when not found', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      await expect(getPromissoryNoteById('missing')).rejects.toThrow('سند الأمر غير موجود')
    })
  })

  describe('listPromissoryNotesForAdmin', () => {
    it('returns paginated list with booking numbers', async () => {
      mockPromissoryNoteFindMany.mockResolvedValue([
        {
          id: 'pn1',
          noteNumber: 'PN-2026-00001',
          debtorName: 'Client A',
          amountSar: 5000,
          status: 'SIGNED',
          invoiceNumber: 'INV-BK1',
          bookingId: 'bk1',
          signedAt: new Date(),
          expectedReturnDate: new Date(),
          dueDate: new Date(),
        },
      ])
      mockPromissoryNoteCount.mockResolvedValue(1)
      mockBookingFindMany.mockResolvedValue([{ id: 'bk1', bookingNumber: 'BK-001' }])

      const result = await listPromissoryNotesForAdmin({ limit: 50, offset: 0 })
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.data[0].bookingNumber).toBe('BK-001')
      expect(result.data[0].amountSar).toBe(5000)
    })

    it('filters by status when provided', async () => {
      mockPromissoryNoteFindMany.mockResolvedValue([])
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockBookingFindMany.mockResolvedValue([])
      await listPromissoryNotesForAdmin({ status: 'SIGNED', limit: 50, offset: 0 })
      expect(mockPromissoryNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'SIGNED' }) })
      )
    })

    it('applies search when provided', async () => {
      mockPromissoryNoteFindMany.mockResolvedValue([])
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockBookingFindMany.mockResolvedValue([])
      await listPromissoryNotesForAdmin({ search: 'PN-001', limit: 50, offset: 0 })
      expect(mockPromissoryNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { noteNumber: { contains: 'PN-001' } },
              { debtorName: { contains: 'PN-001' } },
              { invoiceNumber: { contains: 'PN-001' } },
            ]),
          }),
        })
      )
    })
  })

  describe('enforcePromissoryNote', () => {
    it('updates status to ENFORCED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({
        id: 'pn1',
        status: 'SIGNED',
      })
      mockPromissoryNoteUpdate.mockResolvedValue({})
      await enforcePromissoryNote('pn1', 'user_1', 'Late return')
      expect(mockPromissoryNoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pn1' },
          data: expect.objectContaining({ status: 'ENFORCED', enforcedReason: 'Late return' }),
        })
      )
    })

    it('throws when note not found', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      await expect(enforcePromissoryNote('missing', 'user_1')).rejects.toThrow('سند الأمر غير موجود')
    })

    it('throws when already ENFORCED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'ENFORCED' })
      await expect(enforcePromissoryNote('pn1', 'user_1')).rejects.toThrow('السند مُنفّذ مسبقاً')
    })

    it('throws when FULFILLED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'FULFILLED' })
      await expect(enforcePromissoryNote('pn1', 'user_1')).rejects.toThrow('السند مُستوفى ولا يمكن تنفيذه')
    })

    it('throws when CANCELLED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'CANCELLED' })
      await expect(enforcePromissoryNote('pn1', 'user_1')).rejects.toThrow('السند ملغي')
    })
  })

  describe('fulfillPromissoryNote', () => {
    it('updates status to FULFILLED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'SIGNED' })
      mockPromissoryNoteUpdate.mockResolvedValue({})
      await fulfillPromissoryNote('pn1')
      expect(mockPromissoryNoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pn1' },
          data: expect.objectContaining({ status: 'FULFILLED' }),
        })
      )
    })

    it('throws when note not found', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      await expect(fulfillPromissoryNote('missing')).rejects.toThrow('سند الأمر غير موجود')
    })

    it('throws when already FULFILLED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'FULFILLED' })
      await expect(fulfillPromissoryNote('pn1')).rejects.toThrow('السند مُستوفى مسبقاً')
    })

    it('throws when ENFORCED', async () => {
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'pn1', status: 'ENFORCED' })
      await expect(fulfillPromissoryNote('pn1')).rejects.toThrow('السند مُنفّذ ولا يمكن استيفاؤه')
    })
  })

  describe('getBookingPreviewForPn', () => {
    it('returns preview when booking found and user is customer', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'user_1',
        endDate: new Date('2026-03-15'),
        totalAmount: 1000,
        customer: { name: 'Client', phone: '0501234567', email: 'a@b.com' },
        equipment: [
          {
            quantity: 1,
            equipment: {
              nameEn: 'Camera',
              model: 'FX6',
              purchasePrice: 5000,
              dailyPrice: 100,
            },
          },
        ],
      })
      const result = await getBookingPreviewForPn('bk1', 'user_1')
      expect(result.bookingId).toBe('bk1')
      expect(result.bookingNumber).toBe('BK-001')
      expect(result.debtorName).toBe('Client')
      expect(result.amountSar).toBe(5000)
    })

    it('throws when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(getBookingPreviewForPn('missing', 'user_1')).rejects.toThrow('الحجز غير موجود')
    })

    it('throws when user is not customer', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        customerId: 'other_user',
        equipment: [],
      })
      await expect(getBookingPreviewForPn('bk1', 'user_1')).rejects.toThrow('غير مصرح')
    })

    it('uses fallback when equipment empty', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'user_1',
        endDate: new Date('2026-03-15'),
        totalAmount: 8000,
        customer: { name: 'Client', phone: '', email: '' },
        equipment: [],
      })
      const result = await getBookingPreviewForPn('bk1', 'user_1')
      expect(result.amountSar).toBe(80000)
      expect(result.equipmentItems).toEqual([
        { name: 'حجز', purchaseValue: 8000, quantity: 1 },
      ])
    })
  })

  describe('createBookingPromissoryNote', () => {
    const validInput = {
      bookingId: 'bk1',
      termsAccepted: true as const,
      damagePolicyAccepted: true as const,
      lateFeesAccepted: true as const,
      signatureData: 'data:image/png;base64,abc',
    }

    it('creates note and returns id, noteNumber, pdfUrl', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'user_1',
        status: 'PAYMENT_PENDING',
        endDate: new Date('2026-03-15'),
        totalAmount: 1000,
        customer: { name: 'Client', phone: '0501234567', email: 'a@b.com' },
        equipment: [
          {
            quantity: 1,
            equipment: {
              nameEn: 'Camera',
              model: 'FX6',
              purchasePrice: 5000,
              dailyPrice: 100,
            },
          },
        ],
      })
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      mockPromissoryNoteUpdate.mockResolvedValue({})

      const result = await createBookingPromissoryNote(validInput, 'user_1', {
        ip: '1.2.3.4',
        device: 'Chrome',
      })
      expect(result.id).toBe('pn1')
      expect(result.noteNumber).toBe('PN-2026-00001')
      expect(result.pdfUrl).toBe('/api/promissory-notes/pn1/pdf')
      expect(mockGeneratePromissoryNotePdf).toHaveBeenCalledWith('pn1')
      expect(mockWriteFileSync).toHaveBeenCalled()
    })

    it('throws when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        createBookingPromissoryNote(validInput, 'user_1', {})
      ).rejects.toThrow('الحجز غير موجود')
    })

    it('throws when user is not customer', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        customerId: 'other_user',
        status: 'PAYMENT_PENDING',
        equipment: [],
      })
      await expect(
        createBookingPromissoryNote(validInput, 'user_1', {})
      ).rejects.toThrow('غير مصرح')
    })

    it('throws when booking status is not PAYMENT_PENDING', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        customerId: 'user_1',
        status: 'CONFIRMED',
        equipment: [],
      })
      await expect(
        createBookingPromissoryNote(validInput, 'user_1', {})
      ).rejects.toThrow('الحجز غير جاهز للدفع')
    })

    it('throws when existing note for booking', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        customerId: 'user_1',
        status: 'PAYMENT_PENDING',
        equipment: [],
      })
      mockPromissoryNoteFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        createBookingPromissoryNote(validInput, 'user_1', {})
      ).rejects.toThrow('يوجد سند أمر مرتبط بهذا الحجز')
    })

    it('uses fallback when equipment empty', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'user_1',
        status: 'PAYMENT_PENDING',
        endDate: new Date('2026-03-15'),
        totalAmount: 5000,
        customer: { name: 'Client', phone: '', email: '' },
        equipment: [],
      })
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      mockPromissoryNoteUpdate.mockResolvedValue({})

      const result = await createBookingPromissoryNote(validInput, 'user_1', {})
      expect(result.id).toBe('pn1')
      expect(mockPromissoryNoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipmentItems: expect.arrayContaining([
              expect.objectContaining({ name: 'حجز', purchaseValue: 5000, quantity: 1 }),
            ]),
          }),
        })
      )
    })

    it('creates dir when not exists', async () => {
      mockExistsSync.mockReturnValue(false)
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'user_1',
        status: 'PAYMENT_PENDING',
        endDate: new Date('2026-03-15'),
        totalAmount: 1000,
        customer: { name: 'Client', phone: '', email: '' },
        equipment: [
          {
            quantity: 1,
            equipment: { nameEn: 'Cam', purchasePrice: 1000, dailyPrice: 50 },
          },
        ],
      })
      mockPromissoryNoteFindFirst.mockResolvedValue(null)
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      mockPromissoryNoteUpdate.mockResolvedValue({})

      await createBookingPromissoryNote(validInput, 'user_1', {})
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('promissory-notes'),
        { recursive: true }
      )
    })
  })

  describe('createPromissoryNoteManually', () => {
    it('creates note without booking', async () => {
      mockUserFindFirst.mockResolvedValue({
        id: 'u1',
        name: 'Debtor',
        email: 'd@e.com',
        phone: '0501111111',
      })
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })

      const result = await createPromissoryNoteManually(
        {
          debtorId: 'u1',
          amountSar: 10000,
          letterType: 'pdf',
          letterPdfUrl: 'https://example.com/letter.pdf',
        },
        'admin_1'
      )
      expect(result.id).toBe('pn1')
      expect(result.noteNumber).toBe('PN-2026-00001')
    })

    it('throws when company creditorName empty', async () => {
      const { getCompanySettings } = await import('@/lib/settings/company-settings')
      ;(getCompanySettings as jest.Mock).mockResolvedValueOnce({ creditorName: '' })
      mockUserFindFirst.mockResolvedValue({ id: 'u1', name: 'D', email: '', phone: '' })
      await expect(
        createPromissoryNoteManually(
          { debtorId: 'u1', amountSar: 1000, letterType: 'pdf' },
          'admin_1'
        )
      ).rejects.toThrow('بيانات الشركة غير مكتملة')
    })

    it('throws when debtor not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        createPromissoryNoteManually(
          { debtorId: 'missing', amountSar: 1000, letterType: 'pdf' },
          'admin_1'
        )
      ).rejects.toThrow('العميل غير موجود')
    })

    it('throws when amount missing for non-booking', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'u1', name: 'D', email: '', phone: '' })
      await expect(
        createPromissoryNoteManually(
          { debtorId: 'u1', letterType: 'pdf' },
          'admin_1'
        )
      ).rejects.toThrow('المبلغ مطلوب عند عدم ربط الحجز')
    })

    it('creates with booking when bookingId provided', async () => {
      mockUserFindFirst.mockResolvedValue({
        id: 'u1',
        name: 'Debtor',
        email: 'd@e.com',
        phone: '0501111111',
      })
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'u1',
        endDate: new Date('2026-03-20'),
        totalAmount: 2000,
        customer: { name: 'Debtor' },
        equipment: [
          {
            quantity: 2,
            equipment: {
              nameEn: 'Lens',
              model: '24-70',
              purchasePrice: 3000,
              dailyPrice: 100,
            },
          },
        ],
      })
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })

      const result = await createPromissoryNoteManually(
        { debtorId: 'u1', bookingId: 'bk1', letterType: 'pdf' },
        'admin_1'
      )
      expect(result.id).toBe('pn1')
    })

    it('throws when booking customer does not match debtor', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'u1', name: 'D', email: '', phone: '' })
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        customerId: 'other_user',
        equipment: [],
      })
      await expect(
        createPromissoryNoteManually(
          { debtorId: 'u1', bookingId: 'bk1', letterType: 'pdf' },
          'admin_1'
        )
      ).rejects.toThrow('العميل المحدد لا يطابق عميل الحجز')
    })

    it('uses fallback when booking has empty equipment', async () => {
      mockUserFindFirst.mockResolvedValue({
        id: 'u1',
        name: 'Debtor',
        email: 'd@e.com',
        phone: '0501111111',
      })
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-001',
        customerId: 'u1',
        endDate: new Date('2026-03-20'),
        totalAmount: 3000,
        customer: { name: 'Debtor' },
        equipment: [],
      })
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      const result = await createPromissoryNoteManually(
        { debtorId: 'u1', bookingId: 'bk1', letterType: 'pdf' },
        'admin_1'
      )
      expect(result.id).toBe('pn1')
      expect(mockPromissoryNoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipmentItems: expect.arrayContaining([
              expect.objectContaining({ name: 'حجز', quantity: 1 }),
            ]),
          }),
        })
      )
    })

    it('generates letterContent from template when letterType generated and no content', async () => {
      mockGetPromissoryNoteSettings.mockResolvedValueOnce({
        letter_template: 'Dear {{client_name}}, order {{order_number}}',
      })
      mockUserFindFirst.mockResolvedValue({
        id: 'u1',
        name: 'John',
        email: 'j@e.com',
        phone: '0501111111',
      })
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      const result = await createPromissoryNoteManually(
        {
          debtorId: 'u1',
          amountSar: 2000,
          equipmentItems: [{ name: 'Item', purchaseValue: 2000, quantity: 1 }],
          letterType: 'generated',
        },
        'admin_1'
      )
      expect(result.id).toBe('pn1')
      expect(mockGetPromissoryNoteSettings).toHaveBeenCalled()
    })

    it('generates PDF when letterType is generated and letterContent provided', async () => {
      mockUserFindFirst.mockResolvedValue({
        id: 'u1',
        name: 'Debtor',
        email: 'd@e.com',
        phone: '0501111111',
      })
      mockPromissoryNoteCount.mockResolvedValue(0)
      mockPromissoryNoteCreate.mockResolvedValue({
        id: 'pn1',
        noteNumber: 'PN-2026-00001',
      })
      mockPromissoryNoteUpdate.mockResolvedValue({})

      await createPromissoryNoteManually(
        {
          debtorId: 'u1',
          amountSar: 5000,
          letterType: 'generated',
          letterContent: 'Dear Client, ...',
        },
        'admin_1'
      )
      expect(mockGeneratePromissoryNotePdf).toHaveBeenCalledWith('pn1')
      expect(mockWriteFileSync).toHaveBeenCalled()
    })
  })
})
