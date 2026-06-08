/**
 * GDPR data export and anonymization for portal users.
 */

import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'

export class GdprService {
  static async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        billingAddress: true,
        role: true,
        status: true,
        createdAt: true,
        bookings: {
          where: { deletedAt: null },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            totalAmount: true,
            createdAt: true,
          },
          take: 500,
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            issueDate: true,
          },
          take: 500,
        },
        reviews: {
          select: { id: true, rating: true, comment: true, createdAt: true },
          take: 200,
        },
      },
    })

    if (!user) throw new NotFoundError('User', userId)

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        companyName: user.companyName,
        billingAddress: user.billingAddress,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      bookings: user.bookings,
      invoices: user.invoices,
      reviews: user.reviews,
    }
  }

  static async anonymizeUser(userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    })

    if (!user) throw new NotFoundError('User', userId)
    if (user.role !== 'CUSTOMER') {
      throw new ValidationError('Only customer accounts can be self-deleted via portal')
    }

    const anonEmail = `deleted-${userId.slice(0, 8)}@anon.flixcam.local`

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        name: 'Deleted User',
        phone: null,
        companyName: null,
        billingAddress: null,
        passwordHash: '',
        status: 'LOCKED',
        deletedAt: new Date(),
        isBlacklisted: false,
        blacklistReason: null,
        blacklistedAt: null,
        blacklistedBy: null,
      },
    })
  }
}
