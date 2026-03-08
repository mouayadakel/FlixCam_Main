/**
 * Unit tests for faq.service
 * PATHS: getPublicFaq (cache hit, cache miss); getAll; getById; create; update; reorder; delete
 */

import { FaqService } from '../faq.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    faqItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}))

jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDelete: jest.fn(),
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

const mockFindMany = prisma.faqItem.findMany as jest.Mock
const mockFindFirst = prisma.faqItem.findFirst as jest.Mock
const mockCreate = prisma.faqItem.create as jest.Mock
const mockUpdate = prisma.faqItem.update as jest.Mock
const mockUpdateMany = prisma.faqItem.updateMany as jest.Mock
const mockAggregate = prisma.faqItem.aggregate as jest.Mock
const cacheGet = require('@/lib/cache').cacheGet as jest.Mock
const cacheSet = require('@/lib/cache').cacheSet as jest.Mock
const cacheDelete = require('@/lib/cache').cacheDelete as jest.Mock

const baseFaq = {
  id: 'f1',
  questionAr: 'سؤال',
  questionEn: 'Question',
  questionZh: null,
  answerAr: 'جواب',
  answerEn: 'Answer',
  answerZh: null,
  order: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe('FaqService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cacheGet.mockResolvedValue(null)
    cacheSet.mockResolvedValue(undefined)
    cacheDelete.mockResolvedValue(undefined)
  })

  describe('getPublicFaq', () => {
    it('returns cached result when cache hit', async () => {
      const cached = [{ id: 'f1', questionAr: 'x', questionEn: 'x', answerAr: 'x', answerEn: 'x', order: 0 }]
      cacheGet.mockResolvedValue(cached)
      const result = await FaqService.getPublicFaq()
      expect(result).toEqual(cached)
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('fetches from DB and caches when cache miss', async () => {
      mockFindMany.mockResolvedValue([baseFaq])
      const result = await FaqService.getPublicFaq()
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 'f1', questionAr: 'سؤال', questionEn: 'Question' })
      expect(cacheSet).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAll', () => {
    it('returns all FAQ items ordered by order', async () => {
      mockFindMany.mockResolvedValue([baseFaq])
      const result = await FaqService.getAll()
      expect(result).toHaveLength(1)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null }, orderBy: { order: 'asc' } })
      )
    })
  })

  describe('getById', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(FaqService.getById('missing')).rejects.toThrow(NotFoundError)
    })

    it('returns item when found', async () => {
      mockFindFirst.mockResolvedValue(baseFaq)
      const result = await FaqService.getById('f1')
      expect(result).toMatchObject({ id: 'f1', questionEn: 'Question' })
    })
  })

  describe('create', () => {
    it('creates and invalidates cache', async () => {
      mockAggregate.mockResolvedValue({ _max: { order: 0 } })
      mockCreate.mockResolvedValue(baseFaq)
      mockFindFirst.mockResolvedValue(baseFaq)
      const input = {
        questionAr: 'سؤال',
        questionEn: 'Question',
        answerAr: 'جواب',
        answerEn: 'Answer',
        isActive: true,
        order: 1,
      }
      const result = await FaqService.create(input)
      expect(result).toMatchObject({ id: 'f1' })
      expect(cacheDelete).toHaveBeenCalled()
    })

    it('succeeds when cache invalidation throws', async () => {
      mockAggregate.mockResolvedValue({ _max: { order: 0 } })
      mockCreate.mockResolvedValue(baseFaq)
      mockFindFirst.mockResolvedValue(baseFaq)
      cacheDelete.mockRejectedValueOnce(new Error('cache unavailable'))
      const result = await FaqService.create({
        questionAr: 'سؤال',
        questionEn: 'Question',
        answerAr: 'جواب',
        answerEn: 'Answer',
        isActive: true,
        order: 1,
      })
      expect(result).toMatchObject({ id: 'f1' })
    })
  })

  describe('update', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(FaqService.update('missing', { questionEn: 'x' })).rejects.toThrow(NotFoundError)
    })

    it('updates and invalidates cache', async () => {
      mockFindFirst
        .mockResolvedValueOnce(baseFaq)
        .mockResolvedValueOnce({ ...baseFaq, questionEn: 'Updated' })
      mockUpdate.mockResolvedValue({})
      const result = await FaqService.update('f1', { questionEn: 'Updated' })
      expect(result).toMatchObject({ questionEn: 'Updated' })
      expect(cacheDelete).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(FaqService.delete('missing')).rejects.toThrow(NotFoundError)
    })

    it('soft-deletes and invalidates cache', async () => {
      mockFindFirst.mockResolvedValue(baseFaq)
      mockUpdate.mockResolvedValue({})
      await FaqService.delete('f1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('reorder', () => {
    it('reorders FAQ items and invalidates cache', async () => {
      const reordered = [{ ...baseFaq, id: 'f2', order: 1 }, { ...baseFaq, id: 'f1', order: 0 }]
      mockFindMany.mockResolvedValue(reordered)
      const result = await FaqService.reorder({ faqIds: ['f2', 'f1'] })
      expect(result).toHaveLength(2)
      expect(cacheDelete).toHaveBeenCalled()
    })
  })
})
