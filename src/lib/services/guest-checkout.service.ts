/**
 * Guest checkout – find or create a CUSTOMER user from contact details at payment time.
 */

import { randomBytes } from 'crypto'
import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/auth-helpers'
import { ValidationError } from '@/lib/errors'

export interface GuestContactInput {
  name: string
  email: string
  phone: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizePhone(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('5')) return `966${digits}`
  if (digits.length === 10 && digits.startsWith('05')) return `966${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('966')) return digits
  return digits
}

export function validateGuestContact(input: GuestContactInput): GuestContactInput {
  const name = input.name?.trim() ?? ''
  const email = normalizeEmail(input.email ?? '')
  const phone = normalizePhone(input.phone ?? '')

  if (name.length < 2) {
    throw new ValidationError('Guest name is required')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Valid guest email is required')
  }
  if (!/^966[0-9]{9}$/.test(phone)) {
    throw new ValidationError('Valid Saudi phone number is required')
  }

  return { name, email, phone }
}

export class GuestCheckoutService {
  /**
   * Resolve an existing customer by email or create a guest account (no login credentials issued).
   */
  static async resolveOrCreateCustomer(
    input: GuestContactInput
  ): Promise<{ userId: string; isNewGuest: boolean }> {
    const contact = validateGuestContact(input)

    const existing = await prisma.user.findFirst({
      where: { email: contact.email, deletedAt: null },
      select: { id: true, name: true, phone: true },
    })

    if (existing) {
      const updates: { name?: string; phone?: string; status?: UserStatus } = {}
      if (!existing.name?.trim()) updates.name = contact.name
      if (!existing.phone?.trim()) {
        const phoneTaken = await prisma.user.findFirst({
          where: { phone: contact.phone, deletedAt: null, id: { not: existing.id } },
          select: { id: true },
        })
        if (!phoneTaken) updates.phone = contact.phone
      }
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: existing.id }, data: updates })
      }
      return { userId: existing.id, isNewGuest: false }
    }

    const phoneTaken = await prisma.user.findFirst({
      where: { phone: contact.phone, deletedAt: null },
      select: { id: true },
    })
    if (phoneTaken) {
      throw new ValidationError('This phone number is already registered to another account')
    }

    const passwordHash = await hashPassword(randomBytes(32).toString('hex'))
    const user = await prisma.user.create({
      data: {
        email: contact.email,
        passwordHash,
        name: contact.name,
        phone: contact.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    })

    return { userId: user.id, isNewGuest: true }
  }
}
