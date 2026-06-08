/**
 * Unit tests for customer-import.service
 */

import { CustomerImportService, mapSpreadsheetRow } from '../customer-import.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/auth-helpers', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed'),
}))

import { prisma } from '@/lib/db/prisma'

const mockFindFirst = prisma.user.findFirst as jest.Mock
const mockCreate = prisma.user.create as jest.Mock

describe('customer-import.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('mapSpreadsheetRow reads email column', () => {
    const row = mapSpreadsheetRow({ Email: 'a@b.com', Name: 'Ali' }, 2)
    expect(row?.email).toBe('a@b.com')
    expect(row?.name).toBe('Ali')
  })

  it('importRows creates new customers', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'u1' })

    const result = await CustomerImportService.importRows(
      [{ rowNumber: 2, email: 'new@test.com', name: 'New' }],
      'admin1'
    )

    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('importRows skips duplicate emails by default', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing' })

    const result = await CustomerImportService.importRows(
      [{ rowNumber: 2, email: 'dup@test.com' }],
      'admin1'
    )

    expect(result.skipped).toBe(1)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
