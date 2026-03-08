/**
 * Unit tests for import-recommendations.service
 */
import { getRecommendations } from '../import-recommendations.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    productTranslation: { findMany: jest.fn() },
    brand: { findMany: jest.fn() },
    importJob: { findFirst: jest.fn() },
  },
}))

const mockCount = prisma.product.count as jest.Mock
const mockFindMany = prisma.product.findMany as jest.Mock
const mockGroupBy = prisma.product.groupBy as jest.Mock
const mockImportFindFirst = prisma.importJob.findFirst as jest.Mock

describe('import-recommendations.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCount.mockResolvedValue(10)
    mockFindMany.mockResolvedValue([])
    mockGroupBy.mockResolvedValue([])
    ;(prisma.productTranslation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.brand.findMany as jest.Mock).mockResolvedValue([])
    mockImportFindFirst.mockResolvedValue(null)
    ;(prisma.importJob.findFirst as jest.Mock).mockResolvedValue(null)
  })

  it('getRecommendations returns array', async () => {
    const result = await getRecommendations()
    expect(Array.isArray(result)).toBe(true)
  })
})
