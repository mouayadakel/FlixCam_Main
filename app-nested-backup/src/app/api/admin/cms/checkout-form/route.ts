/**
 * GET  – list all sections + fields (optional ?step=1|2|3)
 * POST – create section or field
 * PUT  – update section or field
 * DELETE – delete section or field (blocked if isSystem)
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import {
  createSectionSchema,
  updateSectionSchema,
  createFieldSchema,
  updateFieldSchema,
} from '@/lib/validators/checkout-form.validator'

export const dynamic = 'force-dynamic'

async function requireSettingsUpdate(session: { user: { id: string } }) {
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
    return NextResponse.json(
      { error: 'Forbidden - settings.update required' },
      { status: 403 }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json(
        { error: 'Forbidden - settings.read required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const stepParam = searchParams.get('step')
    const step = stepParam ? parseInt(stepParam, 10) : null

    const whereSection: { deletedAt: null; step?: number } = { deletedAt: null }
    if (step !== null && !Number.isNaN(step) && step >= 1 && step <= 3) {
      whereSection.step = step
    }

    const sections = await prisma.checkoutFormSection.findMany({
      where: whereSection,
      orderBy: [{ step: 'asc' }, { sortOrder: 'asc' }],
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const code = error && typeof (error as { code?: string }).code === 'string' ? (error as { code: string }).code : undefined
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/admin/cms/checkout-form]', error)
    }
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const forbidden = await requireSettingsUpdate(session)
  if (forbidden) return forbidden

  let body: { type: string; [key: string]: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.type === 'section') {
    const parsed = createSectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const section = await prisma.checkoutFormSection.create({
      data: parsed.data,
    })
    return NextResponse.json(section)
  }

  if (body.type === 'field') {
    const parsed = createFieldSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const existing = await prisma.checkoutFormField.findUnique({
      where: { fieldKey: parsed.data.fieldKey },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Field with key "${parsed.data.fieldKey}" already exists` },
        { status: 409 }
      )
    }
    const field = await prisma.checkoutFormField.create({
      data: {
        ...parsed.data,
        metadata: parsed.data.metadata == null ? undefined : (parsed.data.metadata as Prisma.InputJsonValue),
      },
    })
    return NextResponse.json(field)
  }

  return NextResponse.json(
    { error: 'Body must include type: "section" or "field"' },
    { status: 400 }
  )
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const forbidden = await requireSettingsUpdate(session)
  if (forbidden) return forbidden

  let body: { type: string; id: string; [key: string]: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.type === 'section') {
    const { id, ...rest } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const parsed = updateSectionSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const existing = await prisma.checkoutFormSection.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }
    const section = await prisma.checkoutFormSection.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(section)
  }

  if (body.type === 'field') {
    const { id, ...rest } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const parsed = updateFieldSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const existing = await prisma.checkoutFormField.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }
    const data = { ...parsed.data } as Record<string, unknown>
    if (data.sectionId !== undefined) delete data.sectionId
    if (data.metadata != null) (data as { metadata?: Prisma.InputJsonValue }).metadata = data.metadata as Prisma.InputJsonValue
    const field = await prisma.checkoutFormField.update({
      where: { id },
      data: data as Prisma.CheckoutFormFieldUpdateInput,
    })
    return NextResponse.json(field)
  }

  return NextResponse.json(
    { error: 'Body must include type: "section" or "field" and id' },
    { status: 400 }
  )
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const forbidden = await requireSettingsUpdate(session)
  if (forbidden) return forbidden

  let body: { type: string; id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.type === 'section') {
    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const existing = await prisma.checkoutFormSection.findUnique({
      where: { id },
      include: { fields: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System sections cannot be deleted' },
        { status: 403 }
      )
    }
    await prisma.checkoutFormSection.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  if (body.type === 'field') {
    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const existing = await prisma.checkoutFormField.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System fields cannot be deleted' },
        { status: 403 }
      )
    }
    await prisma.checkoutFormField.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    { error: 'Body must include type: "section" or "field" and id' },
    { status: 400 }
  )
}
