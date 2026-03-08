/**
 * GET  – full footer tree (requires settings.read)
 * PUT  – update general settings (enabled, layout, colors) (requires settings.update)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerGeneralSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

const adminFooterInclude = {
  brand: true,
  contacts: { orderBy: { order: 'asc' as const } },
  socialLinks: { orderBy: { order: 'asc' as const } },
  columns: {
    orderBy: { order: 'asc' as const },
    include: {
      links: { orderBy: { order: 'asc' as const } },
    },
  },
  legal: {
    include: {
      links: { orderBy: { order: 'asc' as const } },
    },
  },
  newsletter: true,
} as const

export async function GET() {
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

    const footer = await prisma.footerSettings.findFirst({
      include: adminFooterInclude,
    })
    return NextResponse.json(footer)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/admin/cms/footer]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden - settings.update required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = footerGeneralSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    let footer = await prisma.footerSettings.findFirst()
    if (!footer) {
      footer = await prisma.footerSettings.create({
        data: {
          enabled: parsed.data.enabled ?? true,
          layout: parsed.data.layout ?? 'default',
          backgroundColor: parsed.data.backgroundColor ?? '#1a1a1a',
          textColor: parsed.data.textColor ?? '#ffffff',
          linkColor: parsed.data.linkColor ?? '#10b981',
          linkHoverColor: parsed.data.linkHoverColor ?? '#34d399',
          socialHoverEffect: parsed.data.socialHoverEffect ?? 'lift',
          socialHoverColor: parsed.data.socialHoverColor ?? undefined,
        },
      })
    } else {
      const updateData: Record<string, unknown> = {}
      if (parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled
      if (parsed.data.layout !== undefined) updateData.layout = parsed.data.layout
      if (parsed.data.backgroundColor !== undefined) updateData.backgroundColor = parsed.data.backgroundColor
      if (parsed.data.textColor !== undefined) updateData.textColor = parsed.data.textColor
      if (parsed.data.linkColor !== undefined) updateData.linkColor = parsed.data.linkColor
      if (parsed.data.linkHoverColor !== undefined) updateData.linkHoverColor = parsed.data.linkHoverColor
      if (parsed.data.socialHoverEffect !== undefined) updateData.socialHoverEffect = parsed.data.socialHoverEffect
      if (parsed.data.socialHoverColor !== undefined) updateData.socialHoverColor = parsed.data.socialHoverColor
      footer = await prisma.footerSettings.update({
        where: { id: footer.id },
        data: updateData,
      })
    }

    const full = await prisma.footerSettings.findUnique({
      where: { id: footer.id },
      include: adminFooterInclude,
    })
    return NextResponse.json(full)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
