/**
 * Unit tests for studio-testimonial.service
 */

import { StudioTestimonialService } from '../studio-testimonial.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    studioTestimonial: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  },
}))

const mockFindMany = prisma.studioTestimonial.findMany as jest.Mock
const mockCreate = prisma.studioTestimonial.create as jest.Mock
const mockUpdate = prisma.studioTestimonial.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

describe('StudioTestimonialService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('list', () => {
    it('returns testimonials ordered by order', async () => {
      mockFindMany.mockResolvedValue([{ id: 't1', name: 'A', text: 'Great', order: 0 }])
      const result = await StudioTestimonialService.list('studio_1')
      expect(result).toHaveLength(1)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studioId: 'studio_1', deletedAt: null }, orderBy: { order: 'asc' } })
      )
    })
  })

  describe('create', () => {
    it('creates with defaults for optional fields', async () => {
      mockCreate.mockResolvedValue({ id: 't1', name: 'John', text: 'Great studio', rating: 5 })
      const result = await StudioTestimonialService.create(
        'studio_1',
        { name: 'John', text: 'Great studio' },
        'user_1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studioId: 'studio_1',
            name: 'John',
            text: 'Great studio',
            rating: 5,
            order: 0,
            isActive: true,
            createdBy: 'user_1',
          }),
        })
      )
      expect(result.rating).toBe(5)
    })
  })

  describe('update', () => {
    it('updates only provided fields', async () => {
      mockUpdate.mockResolvedValue({ id: 't1', text: 'Updated' })
      await StudioTestimonialService.update('t1', { text: 'Updated' }, 'user_1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: expect.objectContaining({ text: 'Updated', updatedBy: 'user_1' }) })
      )
    })
  })

  describe('delete', () => {
    it('soft-deletes with deletedBy', async () => {
      mockUpdate.mockResolvedValue({})
      await StudioTestimonialService.delete('t1', 'user_1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 'user_1' }),
        })
      )
    })
  })

  describe('reorder', () => {
    it('updates order for each id', async () => {
      mockUpdate.mockResolvedValue({})
      mockTransaction.mockImplementation((ops) => Promise.all(ops))
      await StudioTestimonialService.reorder(['t1', 't2'], 'user_1')
      expect(mockUpdate).toHaveBeenCalledTimes(2)
    })
  })
})
