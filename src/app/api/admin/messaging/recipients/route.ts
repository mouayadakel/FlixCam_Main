/**
 * GET – list business recipients (with optional filters)
 * POST – create business recipient
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { createBusinessRecipientSchema } from '@/lib/validators/business-recipient.validator'
import type { Prisma } from '@prisma/client'

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}

function mapRecipientToResponse(r: {
  id: string
  name: string
  arabicName: string | null
  englishName: string | null
  role: string
  department: string | null
  jobTitle: string | null
  phone: string | null
  phoneVerified: boolean
  alternatePhone: string | null
  email: string | null
  emailVerified: boolean
  alternateEmail: string | null
  whatsappNumber: string | null
  whatsappVerified: boolean
  whatsappBusiness: boolean
  preferredChannel: string | null
  preferredLanguage: string
  timezone: string
  receiveTriggers: unknown
  excludeTriggers: unknown
  dndEnabled: boolean
  dndStart: string | null
  dndEnd: string | null
  dndDays: unknown
  priority: number
  receiveUrgent: boolean
  receiveLate: boolean
  receiveDamage: boolean
  digestEnabled: boolean
  digestFrequency: string | null
  digestTime: string | null
  isActive: boolean
  isPrimary: boolean
  isBackup: boolean
  backupFor: string | null
  messagesReceived: number
  lastReceived: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: r.id,
    name: r.name,
    arabicName: r.arabicName,
    englishName: r.englishName,
    role: r.role,
    department: r.department,
    jobTitle: r.jobTitle,
    phone: r.phone,
    phoneVerified: r.phoneVerified,
    alternatePhone: r.alternatePhone,
    email: r.email,
    emailVerified: r.emailVerified,
    alternateEmail: r.alternateEmail,
    whatsappNumber: r.whatsappNumber,
    whatsappVerified: r.whatsappVerified,
    whatsappBusiness: r.whatsappBusiness,
    preferredChannel: r.preferredChannel,
    preferredLanguage: r.preferredLanguage,
    timezone: r.timezone,
    receiveTriggers: r.receiveTriggers as string[] | null,
    excludeTriggers: r.excludeTriggers as string[] | null,
    dndEnabled: r.dndEnabled,
    dndStart: r.dndStart,
    dndEnd: r.dndEnd,
    dndDays: r.dndDays as string[] | null,
    priority: r.priority,
    receiveUrgent: r.receiveUrgent,
    receiveLate: r.receiveLate,
    receiveDamage: r.receiveDamage,
    digestEnabled: r.digestEnabled,
    digestFrequency: r.digestFrequency,
    digestTime: r.digestTime,
    isActive: r.isActive,
    isPrimary: r.isPrimary,
    isBackup: r.isBackup,
    backupFor: r.backupFor,
    messagesReceived: r.messagesReceived,
    lastReceived: r.lastReceived?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')
    const isPrimary = searchParams.get('isPrimary')
    const department = searchParams.get('department')

    const where: Prisma.BusinessRecipientWhereInput = {}
    if (role) where.role = role as never
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (isPrimary !== null && isPrimary !== undefined && isPrimary !== '') {
      where.isPrimary = isPrimary === 'true'
    }
    if (department) where.department = department

    const recipients = await prisma.businessRecipient.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      recipients: recipients.map(mapRecipientToResponse),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createBusinessRecipientSchema.parse(body)

    const recipient = await prisma.businessRecipient.create({
      data: {
        name: parsed.name,
        arabicName: parsed.arabicName ?? undefined,
        englishName: parsed.englishName ?? undefined,
        role: parsed.role as never,
        department: parsed.department ?? undefined,
        jobTitle: parsed.jobTitle ?? undefined,
        phone: parsed.phone ?? undefined,
        phoneVerified: parsed.phoneVerified ?? false,
        alternatePhone: parsed.alternatePhone ?? undefined,
        email: parsed.email ?? undefined,
        emailVerified: parsed.emailVerified ?? false,
        alternateEmail: parsed.alternateEmail ?? undefined,
        whatsappNumber: parsed.whatsappNumber ?? undefined,
        whatsappVerified: parsed.whatsappVerified ?? false,
        whatsappBusiness: parsed.whatsappBusiness ?? false,
        preferredChannel: (parsed.preferredChannel ?? undefined) as never,
        preferredLanguage: parsed.preferredLanguage ?? 'ar',
        timezone: parsed.timezone ?? 'Asia/Riyadh',
        receiveTriggers: (parsed.receiveTriggers ?? undefined) as never,
        excludeTriggers: (parsed.excludeTriggers ?? undefined) as never,
        dndEnabled: parsed.dndEnabled ?? false,
        dndStart: parsed.dndStart ?? undefined,
        dndEnd: parsed.dndEnd ?? undefined,
        dndDays: (parsed.dndDays ?? undefined) as never,
        priority: parsed.priority ?? 5,
        receiveUrgent: parsed.receiveUrgent ?? true,
        receiveLate: parsed.receiveLate ?? true,
        receiveDamage: parsed.receiveDamage ?? true,
        digestEnabled: parsed.digestEnabled ?? false,
        digestFrequency: (parsed.digestFrequency ?? undefined) as never,
        digestTime: parsed.digestTime ?? undefined,
        isActive: parsed.isActive ?? true,
        isPrimary: parsed.isPrimary ?? false,
        isBackup: parsed.isBackup ?? false,
        backupFor: parsed.backupFor ?? undefined,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      recipient: mapRecipientToResponse(recipient),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
