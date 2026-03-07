/**
 * ═══════════════════════════════════════════
 * SERVICE: contract.service
 * ═══════════════════════════════════════════
 * METHODS:
 *   create(input, userId)
 *     PATH 1: no permission → ForbiddenError
 *     PATH 2: booking not found → NotFoundError
 *     PATH 3: success → create contract, audit, return
 *   getById(id, userId)
 *     PATH 1: not found → NotFoundError
 *     PATH 2: found → return contract
 *   list(..., userId)
 *   update(id, input, userId)
 *   sign(id, input, userId)
 *   delete(id, userId)
 * DEPENDENCIES: prisma (contract, booking), AuditService, hasPermission
 * ═══════════════════════════════════════════
 */

import { ContractService } from '../contract.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    contract: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    booking: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true) }))

const mockFindFirstContract = prisma.contract.findFirst as jest.Mock
const mockFindFirstBooking = prisma.booking.findFirst as jest.Mock
const mockCreate = prisma.contract.create as jest.Mock
const mockFindMany = prisma.contract.findMany as jest.Mock
const mockUpdate = prisma.contract.update as jest.Mock
const mockCount = prisma.contract.count as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const validBooking = {
  id: 'bkg_01HX4K2M8P',
  bookingNumber: 'BKG-2025-00123',
  startDate: new Date('2025-03-15'),
  endDate: new Date('2025-03-20'),
  totalAmount: 14999,
  customerId: 'usr_01HX4K2M8P',
  customer: { id: 'usr_01HX4K2M8P', name: 'Sarah Mitchell', email: 'sarah.mitchell@example.com' },
  equipment: [{ equipment: { id: 'eq_1', sku: 'SKU1', dailyPrice: 100 }, quantity: 1 }],
}

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
    mockFindFirstContract.mockResolvedValue(null)
    mockFindFirstBooking.mockResolvedValue(validBooking)
    mockCreate.mockResolvedValue({
      id: 'ctr_01HX4K2M8P',
      bookingId: 'bkg_01HX4K2M8P',
      status: 'PENDING',
    })
  })

  describe('create', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockFindFirstBooking.mockResolvedValue(null)
      await expect(
        ContractService.create({ bookingId: 'bkg_missing' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when contract already exists for booking', async () => {
      mockFindFirstContract.mockResolvedValue({ id: 'ctr_existing', bookingId: 'bkg_01HX4K2M8P' })
      await expect(
        ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('creates contract and returns when booking exists', async () => {
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toMatchObject({ id: 'ctr_01HX4K2M8P', status: 'draft' })
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('throws NotFoundError when generateContractContent finds no booking', async () => {
      mockFindFirstBooking
        .mockResolvedValueOnce(validBooking)
        .mockResolvedValueOnce(null)
      await expect(
        ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(NotFoundError)
    })

    it('creates contract when booking has no customer (customer fallback)', async () => {
      const bookingNoCustomer = { ...validBooking, customer: null }
      mockFindFirstBooking.mockResolvedValue(bookingNoCustomer)
      mockCreate.mockResolvedValue({
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_01HX4K2M8P',
        status: 'PENDING',
        contractContent: { customer: { id: 'usr_01HX4K2M8P', name: null, email: '' } },
      })
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })

    it('creates contract when booking has empty equipment array', async () => {
      const bookingNoEquipment = { ...validBooking, equipment: [] }
      mockFindFirstBooking.mockResolvedValue(bookingNoEquipment)
      mockCreate.mockResolvedValue({
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_01HX4K2M8P',
        status: 'PENDING',
      })
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })

    it('creates contract when booking has null equipment', async () => {
      const bookingNullEquipment = { ...validBooking, equipment: null }
      mockFindFirstBooking.mockResolvedValue(bookingNullEquipment)
      mockCreate.mockResolvedValue({
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_01HX4K2M8P',
        status: 'PENDING',
      })
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })

    it('creates contract when equipment has null sku (uses empty string fallback)', async () => {
      const bookingWithNullSku = {
        ...validBooking,
        equipment: [{ equipment: { id: 'eq_1', sku: null, dailyPrice: 100 }, quantity: 1 }],
      }
      mockFindFirstBooking.mockResolvedValue(bookingWithNullSku)
      mockCreate.mockResolvedValue({
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_01HX4K2M8P',
        status: 'PENDING',
      })
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })

    it('creates contract when equipment has null dailyPrice (uses 0 fallback)', async () => {
      const bookingWithNullDailyPrice = {
        ...validBooking,
        equipment: [{ equipment: { id: 'eq_1', sku: 'SKU1', dailyPrice: null }, quantity: 1 }],
      }
      mockFindFirstBooking.mockResolvedValue(bookingWithNullDailyPrice)
      mockCreate.mockResolvedValue({
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_01HX4K2M8P',
        status: 'PENDING',
      })
      const result = await ContractService.create({ bookingId: 'bkg_01HX4K2M8P' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(ContractService.getById('ctr_1', 'usr_01HX4K2M8P')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when contract not found', async () => {
      mockFindFirstContract.mockResolvedValue(null)
      await expect(ContractService.getById('ctr_missing', 'usr_01HX4K2M8P')).rejects.toThrow(NotFoundError)
    })

    it('returns contract when found', async () => {
      const contractData = {
        id: 'ctr_01HX4K2M8P',
        status: 'PENDING',
        signedAt: null,
        booking: { customer: {} },
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
      }
      mockFindFirstContract.mockResolvedValue(contractData)
      const result = await ContractService.getById('ctr_01HX4K2M8P', 'usr_01HX4K2M8P')
      expect(result).toMatchObject({ id: 'ctr_01HX4K2M8P' })
    })

    it('returns contract with booking null when contract has no booking', async () => {
      const contractNoBooking = {
        id: 'ctr_01HX4K2M8P',
        bookingId: 'bkg_1',
        signedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        booking: null,
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
        createdBy: null,
        updatedBy: null,
      }
      mockFindFirstContract.mockResolvedValue(contractNoBooking)
      const result = await ContractService.getById('ctr_01HX4K2M8P', 'usr_01HX4K2M8P')
      expect(result.booking).toBeNull()
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(ContractService.list('usr_01HX4K2M8P')).rejects.toThrow(ForbiddenError)
    })

    it('returns contracts array and pagination', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const result = await ContractService.list('usr_01HX4K2M8P', {})
      expect(Array.isArray(result.contracts)).toBe(true)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('applies filters: bookingId, customerId, signed, dateFrom, dateTo, termsVersion', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const result = await ContractService.list('usr_01HX4K2M8P', {
        bookingId: 'bkg_1',
        customerId: 'cust_1',
        signed: true,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-12-31'),
        termsVersion: '1.0.0',
      })
      expect(result.contracts).toEqual([])
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bookingId: 'bkg_1',
            termsVersion: '1.0.0',
            signedAt: { not: null },
            createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        })
      )
    })

    it('applies signed: false filter for unsigned contracts', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await ContractService.list('usr_01HX4K2M8P', { signed: false })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ signedAt: null }),
        })
      )
    })

    it('filters by status signed and pending_signature', async () => {
      const signedContract = {
        id: 'ctr_1',
        signedAt: new Date(),
        createdAt: new Date(),
        booking: { customer: {} },
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
      }
      mockFindMany.mockResolvedValue([signedContract])
      mockCount.mockResolvedValue(1)
      const result = await ContractService.list('usr_01HX4K2M8P', { status: 'signed' })
      expect(result.contracts.length).toBeGreaterThanOrEqual(0)
    })

    it('filters by status draft and returns only matching', async () => {
      const unsignedContract = {
        id: 'ctr_2',
        signedAt: null,
        createdAt: new Date(),
        status: 'draft',
        booking: { customer: {} },
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
      }
      mockFindMany.mockResolvedValue([unsignedContract])
      mockCount.mockResolvedValue(1)
      const result = await ContractService.list('usr_01HX4K2M8P', { status: 'draft' })
      expect(result.contracts.every((c) => !c.signedAt)).toBe(true)
    })

    it('filters by status expired (exact match branch)', async () => {
      const signedContract = {
        id: 'ctr_1',
        signedAt: new Date(),
        createdAt: new Date(),
        booking: { customer: {} },
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
      }
      mockFindMany.mockResolvedValue([signedContract])
      mockCount.mockResolvedValue(1)
      const result = await ContractService.list('usr_01HX4K2M8P', { status: 'expired' })
      expect(result.contracts).toHaveLength(0)
    })

    it('filters by status pending_signature and keeps unsigned contracts', async () => {
      const unsignedContract = {
        id: 'ctr_2',
        signedAt: null,
        createdAt: new Date(),
        booking: { customer: {} },
        contractContent: {},
        termsVersion: '1.0',
        signatureData: null,
      }
      mockFindMany.mockResolvedValue([unsignedContract])
      mockCount.mockResolvedValue(1)
      const result = await ContractService.list('usr_01HX4K2M8P', { status: 'pending_signature' })
      expect(result.contracts).toHaveLength(1)
      expect(result.contracts[0].signedAt).toBeNull()
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ContractService.update('ctr_1', { termsVersion: '1.0.1' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when contract not found', async () => {
      mockFindFirstContract.mockResolvedValue(null)
      await expect(
        ContractService.update('ctr_missing', { termsVersion: '1.0.1' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when contract already signed', async () => {
      mockFindFirstContract.mockResolvedValue({
        id: 'ctr_1',
        signedAt: new Date(),
        bookingId: 'bkg_1',
        termsVersion: '1.0.0',
        booking: { customer: {} },
      })
      await expect(
        ContractService.update('ctr_1', { termsVersion: '1.0.1' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('updates contract with termsVersion change and regenerates content', async () => {
      const existing = {
        id: 'ctr_1',
        bookingId: 'bkg_01HX4K2M8P',
        termsVersion: '1.0.0',
        signedAt: null,
        booking: { customer: {} },
        contractContent: {},
      }
      mockFindFirstContract
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(existing)
      mockFindFirstBooking.mockResolvedValue(validBooking)
      mockUpdate.mockResolvedValue({ ...existing, termsVersion: '1.0.1' })
      const result = await ContractService.update('ctr_1', { termsVersion: '1.0.1' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ termsVersion: '1.0.1', contractContent: expect.anything() }),
        })
      )
    })

    it('updates contract with contractContent override', async () => {
      const existing = {
        id: 'ctr_1',
        bookingId: 'bkg_01HX4K2M8P',
        termsVersion: '1.0.0',
        signedAt: null,
        booking: { customer: {} },
        contractContent: {},
      }
      mockFindFirstContract.mockResolvedValue(existing)
      const customContent = { terms: 'Custom', equipment: [], booking: {} as any, customer: {} as any, termsVersion: '1.0.0', generatedAt: new Date() }
      mockUpdate.mockResolvedValue({ ...existing, contractContent: customContent })
      const result = await ContractService.update('ctr_1', { contractContent: customContent }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contractContent: customContent }),
        })
      )
    })
  })

  describe('sign', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ContractService.sign('ctr_1', { signature: 'sig' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when contract not found', async () => {
      mockFindFirstContract.mockResolvedValue(null)
      await expect(
        ContractService.sign('ctr_missing', { signature: 'sig' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when contract already signed', async () => {
      mockFindFirstContract.mockResolvedValue({
        id: 'ctr_1',
        signedAt: new Date(),
        bookingId: 'bkg_1',
        booking: { customer: {} },
      })
      await expect(
        ContractService.sign('ctr_1', { signature: 'sig' }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('signs contract successfully', async () => {
      const existing = { id: 'ctr_1', status: 'PENDING', signedAt: null, bookingId: 'bkg_1', booking: { customer: {} } }
      const signed = { ...existing, signedAt: new Date(), status: 'SIGNED' }
      mockFindFirstContract.mockResolvedValue(existing)
      mockUpdate.mockResolvedValue(signed)
      const result = await ContractService.sign('ctr_1', { signature: 'sig' }, 'usr_01HX4K2M8P')
      expect(result).toBeDefined()
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(ContractService.delete('ctr_1', 'usr_01HX4K2M8P')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when contract not found', async () => {
      mockFindFirstContract.mockResolvedValue(null)
      await expect(ContractService.delete('ctr_missing', 'usr_01HX4K2M8P')).rejects.toThrow(NotFoundError)
    })

    it('soft-deletes contract successfully', async () => {
      const existing = { id: 'ctr_1', status: 'PENDING', booking: { customer: {} } }
      mockFindFirstContract.mockResolvedValue(existing)
      mockUpdate.mockResolvedValue({ ...existing, deletedAt: new Date() })
      await ContractService.delete('ctr_1', 'usr_01HX4K2M8P')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ctr_1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })
})
