/**
 * Unit tests for quote.policy
 */

import { QuotePolicy } from '@/lib/policies/quote.policy'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { prisma } = require('@/lib/db/prisma')
const { hasPermission } = require('@/lib/auth/permissions')

describe('QuotePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canCreate', () => {
    it('returns allowed when user has quote.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await QuotePolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await QuotePolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canView', () => {
    it('returns allowed when user has quote.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await QuotePolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed when user has permission and quoteId provided', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await QuotePolicy.canView('user_1', 'quote_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await QuotePolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasQuotePermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (QuotePolicy as any)['hasQuotePermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed false when quote not found', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      prisma.booking.findFirst.mockResolvedValue(null)
      const result = await QuotePolicy.canUpdate('user_1', 'quote_1')
      expect(result.allowed).toBe(false)
    })
    it('returns allowed true when quote is DRAFT', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      prisma.booking.findFirst.mockResolvedValue({ status: 'DRAFT' })
      const result = await QuotePolicy.canUpdate('user_1', 'quote_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when quote not DRAFT', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      prisma.booking.findFirst.mockResolvedValue({ status: 'CONFIRMED' })
      const result = await QuotePolicy.canUpdate('user_1', 'quote_1')
      expect(result.allowed).toBe(false)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await QuotePolicy.canUpdate('user_1', 'quote_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canConvert', () => {
    it('returns allowed when user has quote.convert', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await QuotePolicy.canConvert('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await QuotePolicy.canConvert('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has quote.delete', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await QuotePolicy.canDelete('user_1', 'quote_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await QuotePolicy.canDelete('user_1', 'quote_1')
      expect(result.allowed).toBe(false)
    })
  })
})
