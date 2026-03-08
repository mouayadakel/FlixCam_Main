/**
 * @file route.ts
 * @description API for featured equipment display count on homepage (IntegrationConfig)
 * @module app/api/admin/settings/featured-display-count
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const KEY = 'settings.featured_equipment_display_count'
const DEFAULT_COUNT = 8
const ALLOWED = [4, 6, 8, 12]

function parseCount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (Number.isNaN(n) || !ALLOWED.includes(n)) return DEFAULT_COUNT
  return n
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const row = await prisma.integrationConfig.findFirst({
      where: { key: KEY, deletedAt: null },
      select: { value: true },
    })

    const count = row?.value != null ? parseCount(row.value) : DEFAULT_COUNT
    return NextResponse.json({ count })
  } catch (e) {
    console.error('Featured display count GET error:', e)
    return NextResponse.json({ error: 'Failed to load setting' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const count = parseCount(body.count)

    const existing = await prisma.integrationConfig.findFirst({
      where: { key: KEY, deletedAt: null },
      select: { id: true },
    })

    const value = String(count)
    if (existing) {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { value, updatedBy: session.user.id },
      })
    } else {
      await prisma.integrationConfig.create({
        data: { key: KEY, value, createdBy: session.user.id },
      })
    }

    return NextResponse.json({ count })
  } catch (e) {
    console.error('Featured display count PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
