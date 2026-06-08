import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

const approveSchema = z.object({
  key: z.string().min(1).max(300),
  locale: z.string().min(2).max(10),
  translation: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await request.json().catch(() => null)
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    await prisma.translation.upsert({
      where: {
        entityType_entityId_field_language: {
          entityType: 'ui_messages',
          entityId: 'global',
          field: parsed.data.key,
          language: parsed.data.locale,
        },
      },
      create: {
        entityType: 'ui_messages',
        entityId: 'global',
        field: parsed.data.key,
        language: parsed.data.locale,
        value: parsed.data.translation,
        createdBy: userId,
      },
      update: {
        value: parsed.data.translation,
        updatedBy: userId,
        deletedAt: null,
        deletedBy: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to approve translation:', error)
    return NextResponse.json({ error: 'Failed to approve translation' }, { status: 500 })
  }
}
