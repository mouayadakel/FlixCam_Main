/**
 * Studio FAQ service tests
 */
import { StudioFaqService } from '../studio-faq.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    studioFaq: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    studio: { findFirst: jest.fn() },
  },
}))
jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/cache', () => ({ cacheDelete: jest.fn().mockResolvedValue(undefined) }))

const mockFindMany = prisma.studioFaq.findMany as jest.Mock
const mockFindFirst = prisma.studioFaq.findFirst as jest.Mock
const mockCreate = prisma.studioFaq.create as jest.Mock
const mockCount = prisma.studioFaq.count as jest.Mock

describe('StudioFaqService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCount.mockResolvedValue(0)
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'faq_01', studioId: 'std_01' })
  })

  describe('listByStudio', () => {
    it('returns FAQs for studio', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await StudioFaqService.listByStudio('std_01')
      expect(result).toEqual([])
    })
  })

  describe('create', () => {
    it('throws when max FAQs reached', async () => {
      mockCount.mockResolvedValue(9)
      await expect(
        StudioFaqService.create('std_01', { questionAr: 'س', answerAr: 'ج', questionEn: 'Q', answerEn: 'A', isActive: true, order: 0 }, 'usr_01')
      ).rejects.toThrow('Maximum 9 FAQs per studio')
    })

    it('creates FAQ when under limit', async () => {
      const result = await StudioFaqService.create('std_01', { questionAr: 'س', answerAr: 'ج', questionEn: 'Q', answerEn: 'A', isActive: true, order: 0 }, 'usr_01')
      expect(result).toMatchObject({ id: 'faq_01' })
    })
  })

  describe('update', () => {
    it('throws NotFoundError when FAQ not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioFaqService.update('faq_missing', { questionAr: 'س', answerAr: 'ج', questionEn: 'Q' }, 'usr_01')
      ).rejects.toThrow(NotFoundError)
    })
  })
})
