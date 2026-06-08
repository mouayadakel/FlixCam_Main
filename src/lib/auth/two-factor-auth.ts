/**
 * Shared TOTP / backup-code validation for admin 2FA at login.
 */

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export async function validateUserTwoFactorToken(
  userId: string,
  token: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
    },
  })

  if (!user?.twoFactorEnabled) return true

  const trimmed = token.trim()
  if (!trimmed) return false

  try {
    const otplib = await import('otplib')
    if (user.twoFactorSecret) {
      const result = await otplib.verify({ token: trimmed, secret: user.twoFactorSecret })
      if (result.valid) return true
    }
  } catch {
    return false
  }

  const backupCodes = (user.twoFactorBackupCodes as string[] | null) ?? []
  for (let i = 0; i < backupCodes.length; i++) {
    const match = await bcrypt.compare(trimmed, backupCodes[i])
    if (match) {
      const updated = [...backupCodes]
      updated.splice(i, 1)
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: updated },
      })
      return true
    }
  }

  return false
}

export const STAFF_ROLES_REQUIRING_2FA = new Set([
  'ADMIN',
  'WAREHOUSE_MANAGER',
  'TECHNICIAN',
  'SALES_MANAGER',
  'ACCOUNTANT',
  'CUSTOMER_SERVICE',
  'MARKETING_MANAGER',
  'RISK_MANAGER',
  'APPROVAL_AGENT',
  'AUDITOR',
  'AI_OPERATOR',
])
