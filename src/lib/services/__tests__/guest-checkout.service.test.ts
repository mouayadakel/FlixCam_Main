/**
 * Unit tests for guest-checkout.service
 */

import { GuestCheckoutService, validateGuestContact } from '../guest-checkout.service'
import { ValidationError } from '@/lib/errors'

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
const mockUpdate = prisma.user.update as jest.Mock

describe('guest-checkout.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateGuestContact', () => {
    it('normalizes Saudi phone and validates email', () => {
      const result = validateGuestContact({
        name: 'Ali Ahmed',
        email: 'Ali@Example.com',
        phone: '0512345678',
      })
      expect(result.email).toBe('ali@example.com')
      expect(result.phone).toBe('966512345678')
    })

    it('throws for invalid email', () => {
      expect(() =>
        validateGuestContact({ name: 'Ali', email: 'bad', phone: '0512345678' })
      ).toThrow(ValidationError)
    })
  })

  describe('resolveOrCreateCustomer', () => {
    it('returns existing user by email', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'u1', name: 'Ali', phone: '966512345678' })

      const result = await GuestCheckoutService.resolveOrCreateCustomer({
        name: 'Ali Ahmed',
        email: 'ali@example.com',
        phone: '0512345678',
      })

      expect(result).toEqual({ userId: 'u1', isNewGuest: false })
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a new guest customer when email is new', async () => {
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockCreate.mockResolvedValue({ id: 'u-new' })

      const result = await GuestCheckoutService.resolveOrCreateCustomer({
        name: 'Sara Guest',
        email: 'sara@example.com',
        phone: '0598765432',
      })

      expect(result).toEqual({ userId: 'u-new', isNewGuest: true })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'sara@example.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          }),
        })
      )
    })
  })
})
