/**
 * GET – get single business recipient by id
 * PATCH – update business recipient
 * DELETE – delete business recipient
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { updateBusinessRecipientSchema } from '@/lib/validators/business-recipient.validator'

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const recipient = await prisma.businessRecipient.findUnique({
      where: { id },
    })
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    return NextResponse.json({ recipient: mapRecipientToResponse(recipient) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = updateBusinessRecipientSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.arabicName !== undefined) updateData.arabicName = parsed.arabicName
    if (parsed.englishName !== undefined) updateData.englishName = parsed.englishName
    if (parsed.role !== undefined) updateData.role = parsed.role
    if (parsed.department !== undefined) updateData.department = parsed.department
    if (parsed.jobTitle !== undefined) updateData.jobTitle = parsed.jobTitle
    if (parsed.phone !== undefined) updateData.phone = parsed.phone
    if (parsed.phoneVerified !== undefined) updateData.phoneVerified = parsed.phoneVerified
    if (parsed.alternatePhone !== undefined) updateData.alternatePhone = parsed.alternatePhone
    if (parsed.email !== undefined) updateData.email = parsed.email
    if (parsed.emailVerified !== undefined) updateData.emailVerified = parsed.emailVerified
    if (parsed.alternateEmail !== undefined) updateData.alternateEmail = parsed.alternateEmail
    if (parsed.whatsappNumber !== undefined) updateData.whatsappNumber = parsed.whatsappNumber
    if (parsed.whatsappVerified !== undefined) updateData.whatsappVerified = parsed.whatsappVerified
    if (parsed.whatsappBusiness !== undefined) updateData.whatsappBusiness = parsed.whatsappBusiness
    if (parsed.preferredChannel !== undefined) updateData.preferredChannel = parsed.preferredChannel
    if (parsed.preferredLanguage !== undefined) updateData.preferredLanguage = parsed.preferredLanguage
    if (parsed.timezone !== undefined) updateData.timezone = parsed.timezone
    if (parsed.receiveTriggers !== undefined) updateData.receiveTriggers = parsed.receiveTriggers
    if (parsed.excludeTriggers !== undefined) updateData.excludeTriggers = parsed.excludeTriggers
    if (parsed.dndEnabled !== undefined) updateData.dndEnabled = parsed.dndEnabled
    if (parsed.dndStart !== undefined) updateData.dndStart = parsed.dndStart
    if (parsed.dndEnd !== undefined) updateData.dndEnd = parsed.dndEnd
    if (parsed.dndDays !== undefined) updateData.dndDays = parsed.dndDays
    if (parsed.priority !== undefined) updateData.priority = parsed.priority
    if (parsed.receiveUrgent !== undefined) updateData.receiveUrgent = parsed.receiveUrgent
    if (parsed.receiveLate !== undefined) updateData.receiveLate = parsed.receiveLate
    if (parsed.receiveDamage !== undefined) updateData.receiveDamage = parsed.receiveDamage
    if (parsed.digestEnabled !== undefined) updateData.digestEnabled = parsed.digestEnabled
    if (parsed.digestFrequency !== undefined) updateData.digestFrequency = parsed.digestFrequency
    if (parsed.digestTime !== undefined) updateData.digestTime = parsed.digestTime
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive
    if (parsed.isPrimary !== undefined) updateData.isPrimary = parsed.isPrimary
    if (parsed.isBackup !== undefined) updateData.isBackup = parsed.isBackup
    if (parsed.backupFor !== undefined) updateData.backupFor = parsed.backupFor
    updateData.updatedBy = session.user.id

    const recipient = await prisma.businessRecipient.update({
      where: { id },
      data: updateData as never,
    })

    return NextResponse.json({ recipient: mapRecipientToResponse(recipient) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    await prisma.businessRecipient.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
