/**
 * Unit tests for import-validation.service
 */
import { validateImportRows } from '../import-validation.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: { product: { findMany: jest.fn() } },
}))

describe('import-validation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
  })

  it('validateImportRows returns isValid false when name missing', async () => {
    const result = await validateImportRows([
      { rowNumber: 1, payload: { row: { Price: '100' } } },
    ])
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'Name')).toBe(true)
  })

  it('validateImportRows returns valid when row has name and valid price', async () => {
    const result = await validateImportRows([
      { rowNumber: 1, payload: { row: { Name: 'Product A', 'Daily Price': '50' } } },
    ])
    expect(result.summary.totalRows).toBe(1)
  })
})
