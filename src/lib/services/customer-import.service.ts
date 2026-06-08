/**
 * Customer import from Excel/CSV rows.
 */

import { prisma } from '@/lib/db/prisma'
import { UserRole, UserStatus } from '@prisma/client'
import { hashPassword } from '@/lib/auth/auth-helpers'
import { ValidationError } from '@/lib/errors'
import { randomBytes } from 'crypto'

export interface CustomerImportRow {
  rowNumber: number
  name?: string
  email: string
  phone?: string
  company?: string
}

export interface CustomerImportResult {
  created: number
  skipped: number
  errors: Array<{ rowNumber: number; message: string }>
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = row[key]
    if (direct != null && String(direct).trim()) return String(direct).trim()
    const lower = key.toLowerCase()
    for (const [k, v] of Object.entries(row)) {
      if (k.trim().toLowerCase() === lower && v != null && String(v).trim()) {
        return String(v).trim()
      }
    }
  }
  return ''
}

export function mapSpreadsheetRow(row: Record<string, unknown>, rowNumber: number): CustomerImportRow | null {
  const email = pickField(row, ['email', 'Email', 'e-mail', 'البريد'])
  if (!email) return null
  return {
    rowNumber,
    email,
    name: pickField(row, ['name', 'Name', 'full name', 'الاسم']) || undefined,
    phone: pickField(row, ['phone', 'Phone', 'mobile', 'الجوال']) || undefined,
    company: pickField(row, ['company', 'Company', 'companyName', 'الشركة']) || undefined,
  }
}

export class CustomerImportService {
  static async importRows(
    rows: CustomerImportRow[],
    userId: string,
    opts?: { updateExisting?: boolean }
  ): Promise<CustomerImportResult> {
    const result: CustomerImportResult = { created: 0, skipped: 0, errors: [] }

    for (const row of rows) {
      try {
        const email = normalizeEmail(row.email)
        if (!email.includes('@')) {
          throw new ValidationError('Invalid email')
        }

        const existing = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        })

        if (existing) {
          if (opts?.updateExisting) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                name: row.name ?? existing.name,
                phone: row.phone ?? existing.phone,
                companyName: row.company ?? existing.companyName,
                updatedBy: userId,
              },
            })
            result.created += 1
          } else {
            result.skipped += 1
          }
          continue
        }

        const tempPassword = randomBytes(16).toString('hex')
        await prisma.user.create({
          data: {
            email,
            name: row.name ?? email.split('@')[0],
            phone: row.phone ?? null,
            companyName: row.company ?? null,
            passwordHash: await hashPassword(tempPassword),
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            phoneVerified: false,
            createdBy: userId,
            updatedBy: userId,
          },
        })
        result.created += 1
      } catch (error) {
        result.errors.push({
          rowNumber: row.rowNumber,
          message: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    return result
  }
}
