/**
 * ═══════════════════════════════════════════
 * SERVICE: studio.service
 * ═══════════════════════════════════════════
 * METHODS: create, getById, update, ...
 * DEPENDENCIES: prisma.studio, hasPermission
 * ═══════════════════════════════════════════
 */

import { StudioService } from '../studio.service'
import { prisma } from '@/lib/db/prisma'
import { ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    studio: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    media: { updateMany: jest.fn().mockResolvedValue({}) },
    studioAddOn: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({}) },
    booking: { findFirst: jest.fn(), findMany: jest.fn() },
    studioBlackoutDate: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true), PERMISSIONS: { CMS_STUDIO_READ: 'cms.studio.read', CMS_STUDIO_UPDATE: 'cms.studio.update' } }))
jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/cache', () => ({ cacheDelete: jest.fn().mockResolvedValue(undefined) }))

const mockFindFirst = prisma.studio.findFirst as jest.Mock
const mockFindMany = prisma.studio.findMany as jest.Mock
const mockCreate = prisma.studio.create as jest.Mock
const mockUpdate = prisma.studio.update as jest.Mock
const mockCount = prisma.studio.count as jest.Mock
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockBlackoutFindFirst = prisma.studioBlackoutDate.findFirst as jest.Mock
const mockBlackoutCreate = prisma.studioBlackoutDate.create as jest.Mock
const mockBlackoutUpdate = prisma.studioBlackoutDate.update as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const validInput = {
  name: 'Main Studio',
  slug: 'main-studio',
  hourlyRate: 500,
}

const sampleStudio = {
  id: 'std_01',
  name: 'Main Studio',
  slug: 'main-studio',
  setupBuffer: 30,
  cleaningBuffer: 30,
  resetTime: 15,
  deletedAt: null,
  isActive: true,
}

describe('StudioService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
    mockFindFirst.mockResolvedValue(null)
    mockFindMany.mockResolvedValue([])
    mockCreate.mockResolvedValue({ id: 'std_01HX4K2M8P', ...validInput })
    mockUpdate.mockResolvedValue(sampleStudio)
    mockCount.mockResolvedValue(0)
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingFindMany.mockResolvedValue([])
    mockBlackoutFindFirst.mockResolvedValue(null)
    mockBlackoutCreate.mockResolvedValue({ id: 'bd_01' })
    mockBlackoutUpdate.mockResolvedValue({})
  })

  describe('create', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(StudioService.create(validInput, 'usr_01HX4K2M8P')).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when slug already exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(StudioService.create(validInput, 'usr_01HX4K2M8P')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when setupBuffer is negative', async () => {
      await expect(
        StudioService.create({ ...validInput, setupBuffer: -1 }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when cleaningBuffer is negative', async () => {
      await expect(
        StudioService.create({ ...validInput, cleaningBuffer: -1 }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when resetTime is negative', async () => {
      await expect(
        StudioService.create({ ...validInput, resetTime: -1 }, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ValidationError)
    })

    it('creates studio when input is valid', async () => {
      const createdStudio = { id: 'std_01HX4K2M8P', ...validInput }
      mockCreate.mockResolvedValue(createdStudio)
      mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(createdStudio)
      const result = await StudioService.create(validInput, 'usr_01HX4K2M8P')
      expect(result).toMatchObject({ id: 'std_01HX4K2M8P' })
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('links media and creates add-ons when provided', async () => {
      const createdStudio = { id: 'std_01', ...validInput }
      mockCreate.mockResolvedValue(createdStudio)
      mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(createdStudio)
      const mediaUpdateMany = prisma.media.updateMany as jest.Mock
      const addOnCreate = prisma.studioAddOn.create as jest.Mock
      addOnCreate.mockResolvedValue({ id: 'addon_1' })
      await StudioService.create(
        { ...validInput, mediaIds: ['med_1'], addOns: [{ name: 'Add-on', price: 50 }] },
        'usr_01'
      )
      expect(mediaUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['med_1'] } } })
      )
      expect(addOnCreate).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.update('std_01', { name: 'Updated' }, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioService.update('missing', { name: 'Updated' }, 'usr_01')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when new slug already exists', async () => {
      mockFindFirst.mockResolvedValueOnce(sampleStudio).mockResolvedValueOnce({ id: 'other' })
      await expect(
        StudioService.update('std_01', { slug: 'taken-slug' }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })

    it('updates studio when input is valid', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockUpdate.mockResolvedValue({ ...sampleStudio, name: 'Updated' })
      const result = await StudioService.update('std_01', { name: 'Updated' }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('updates media and add-ons when provided', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockUpdate.mockResolvedValue(sampleStudio)
      const mediaUpdateMany = prisma.media.updateMany as jest.Mock
      const addOnUpdateMany = prisma.studioAddOn.updateMany as jest.Mock
      const addOnCreate = prisma.studioAddOn.create as jest.Mock
      addOnCreate.mockResolvedValue({ id: 'addon_1' })
      await StudioService.update('std_01', { mediaIds: ['med_1'], addOns: [{ name: 'New Add-on', price: 100 }] }, 'usr_01')
      expect(mediaUpdateMany).toHaveBeenCalledTimes(2)
      expect(addOnUpdateMany).toHaveBeenCalled()
      expect(addOnCreate).toHaveBeenCalled()
    })

    it('throws ValidationError when setupBuffer is negative on update', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.update('std_01', { setupBuffer: -1 }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when cleaningBuffer is negative on update', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.update('std_01', { cleaningBuffer: -1 }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when resetTime is negative on update', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.update('std_01', { resetTime: -1 }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(StudioService.getById('std_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(StudioService.getById('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('returns studio when found', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      const result = await StudioService.getById('std_01', 'usr_01')
      expect(result).toMatchObject(sampleStudio)
    })
  })

  describe('getByIdForCms', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(StudioService.getByIdForCms('std_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('returns studio for CMS when found', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      const result = await StudioService.getByIdForCms('std_01', 'usr_01')
      expect(result).toMatchObject(sampleStudio)
    })
  })

  describe('updateCms', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.updateCms('std_01', { name: 'Updated' }, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioService.updateCms('missing', { name: 'Updated' }, 'usr_01')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates studio CMS fields', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockUpdate.mockResolvedValue({ ...sampleStudio, name: 'Updated' })
      const result = await StudioService.updateCms('std_01', { name: 'Updated', description: 'Desc' }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('updates all CMS fields including galleryDisclaimer, dailyRate, etc', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockUpdate.mockResolvedValue(sampleStudio)
      await StudioService.updateCms(
        'std_01',
        {
          galleryDisclaimer: 'Disclaimer',
          parkingNotes: 'Parking info',
          slotDurationMinutes: 60,
          dailyRate: 5000,
          equipmentCarePolicy: 'Policy',
          cancellationPolicyShort: 'Short',
          cancellationPolicyLink: 'https://example.com',
          bookingCountDisplay: 100,
        },
        'usr_01'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            galleryDisclaimer: 'Disclaimer',
            parkingNotes: 'Parking info',
            slotDurationMinutes: 60,
            equipmentCarePolicy: 'Policy',
            cancellationPolicyShort: 'Short',
            cancellationPolicyLink: 'https://example.com',
            bookingCountDisplay: 100,
          }),
        })
      )
    })

    it('sets dailyRate to null when passed null', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockUpdate.mockResolvedValue(sampleStudio)
      await StudioService.updateCms('std_01', { dailyRate: null }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyRate: null,
          }),
        })
      )
    })
  })

  describe('getBySlugPublic', () => {
    it('returns studio by slug without auth', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      const result = await StudioService.getBySlugPublic('main-studio')
      expect(result).toMatchObject(sampleStudio)
    })

    it('returns null when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await StudioService.getBySlugPublic('missing')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(StudioService.list('usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('returns studios with total', async () => {
      mockFindMany.mockResolvedValue([sampleStudio])
      mockCount.mockResolvedValue(1)
      const result = await StudioService.list('usr_01')
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('filters by isActive and search', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await StudioService.list('usr_01', { isActive: true, search: 'main' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(StudioService.delete('std_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(StudioService.delete('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when studio has active bookings', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBookingFindFirst.mockResolvedValue({ id: 'bkg_1' })
      await expect(StudioService.delete('std_01', 'usr_01')).rejects.toThrow(ValidationError)
    })

    it('soft deletes studio when no active bookings', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBookingFindFirst.mockResolvedValue(null)
      await StudioService.delete('std_01', 'usr_01')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'std_01' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
        })
      )
    })
  })

  describe('checkAvailability', () => {
    it('returns available false when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await StudioService.checkAvailability({
        studioId: 'missing',
        startTime: new Date('2025-02-01T10:00:00'),
        endTime: new Date('2025-02-01T12:00:00'),
      })
      expect(result.available).toBe(false)
    })

    it('returns available false when blackout conflicts', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBlackoutFindFirst.mockResolvedValue({ startDate: new Date(), endDate: new Date(), reason: 'Holiday' })
      const result = await StudioService.checkAvailability({
        studioId: 'std_01',
        startTime: new Date('2025-02-01T10:00:00'),
        endTime: new Date('2025-02-01T12:00:00'),
      })
      expect(result.available).toBe(false)
      expect(result.conflicts).toHaveLength(1)
    })

    it('returns available false when overlapping bookings exist', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBlackoutFindFirst.mockResolvedValue(null)
      mockBookingFindMany.mockResolvedValue([{ id: 'b1', bookingNumber: 'B001', studioStartTime: new Date(), studioEndTime: new Date(), status: 'CONFIRMED' }])
      const result = await StudioService.checkAvailability({
        studioId: 'std_01',
        startTime: new Date('2025-02-01T10:00:00'),
        endTime: new Date('2025-02-01T12:00:00'),
      })
      expect(result.available).toBe(false)
      expect(result.conflicts).toHaveLength(1)
    })

    it('returns available true when no conflicts', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBlackoutFindFirst.mockResolvedValue(null)
      mockBookingFindMany.mockResolvedValue([])
      const result = await StudioService.checkAvailability({
        studioId: 'std_01',
        startTime: new Date('2025-02-01T10:00:00'),
        endTime: new Date('2025-02-01T12:00:00'),
      })
      expect(result.available).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })
  })

  describe('addBlackoutDate', () => {
    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioService.addBlackoutDate(
          'missing',
          { startDate: new Date('2025-02-01'), endDate: new Date('2025-02-05') },
          'usr_01'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.addBlackoutDate(
          'std_01',
          { startDate: new Date('2025-02-01'), endDate: new Date('2025-02-05') },
          'usr_01'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when endDate <= startDate', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      await expect(
        StudioService.addBlackoutDate(
          'std_01',
          { startDate: new Date('2025-02-05'), endDate: new Date('2025-02-01') },
          'usr_01'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when blackout conflicts with booking', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBookingFindFirst.mockResolvedValue({ id: 'b1' })
      await expect(
        StudioService.addBlackoutDate(
          'std_01',
          { startDate: new Date('2025-02-01'), endDate: new Date('2025-02-05') },
          'usr_01'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('creates blackout date when valid', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      mockBookingFindFirst.mockResolvedValue(null)
      mockBlackoutCreate.mockResolvedValue({ id: 'bd_01', studioId: 'std_01' })
      const result = await StudioService.addBlackoutDate(
        'std_01',
        { startDate: new Date('2025-02-01'), endDate: new Date('2025-02-05'), reason: 'Maintenance' },
        'usr_01'
      )
      expect(mockBlackoutCreate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('removeBlackoutDate', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockBlackoutFindFirst.mockResolvedValue({ id: 'bd_01', studioId: 'std_01' })
      await expect(StudioService.removeBlackoutDate('bd_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when blackout not found', async () => {
      mockBlackoutFindFirst.mockResolvedValue(null)
      await expect(StudioService.removeBlackoutDate('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('soft deletes blackout date', async () => {
      mockBlackoutFindFirst.mockResolvedValue({ id: 'bd_01', studioId: 'std_01' })
      await StudioService.removeBlackoutDate('bd_01', 'usr_01')
      expect(mockBlackoutUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bd_01' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('calculateBookingDuration', () => {
    it('throws NotFoundError when studio not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioService.calculateBookingDuration(
          'missing',
          new Date('2025-02-01T10:00:00'),
          new Date('2025-02-01T12:00:00')
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('returns duration in hours including buffers', async () => {
      mockFindFirst.mockResolvedValue(sampleStudio)
      const result = await StudioService.calculateBookingDuration(
        'std_01',
        new Date('2025-02-01T10:00:00'),
        new Date('2025-02-01T12:00:00')
      )
      expect(result).toBeGreaterThan(2)
    })
  })
})
