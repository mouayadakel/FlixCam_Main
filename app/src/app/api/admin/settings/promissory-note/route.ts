/**
 * GET/PATCH /api/admin/settings/promissory-note – PN enable/disable for equipment & studio
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const KEY = 'settings.promissory_note'

const DEFAULTS = {
  pn_enabled_for_equipment: false,
  pn_enabled_for_studio: false,
  letter_template: '',
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

    let data = { ...DEFAULTS }
    if (row?.value) {
      try {
        data = { ...DEFAULTS, ...JSON.parse(row.value) }
      } catch {
        // ignore
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('PN settings get error:', e)
    return NextResponse.json({ error: 'Failed to load PN settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.update' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const existing = await prisma.integrationConfig.findFirst({
      where: { key: KEY, deletedAt: null },
      select: { id: true, value: true },
    })

    let current = { ...DEFAULTS }
    if (existing?.value) {
      try {
        current = { ...DEFAULTS, ...JSON.parse(existing.value) }
      } catch {
        // ignore
      }
    }

    const merged = {
      pn_enabled_for_equipment:
        body.pn_enabled_for_equipment !== undefined
          ? Boolean(body.pn_enabled_for_equipment)
          : current.pn_enabled_for_equipment,
      pn_enabled_for_studio:
        body.pn_enabled_for_studio !== undefined
          ? Boolean(body.pn_enabled_for_studio)
          : current.pn_enabled_for_studio,
      letter_template:
        body.letter_template !== undefined
          ? String(body.letter_template)
          : (current.letter_template ?? ''),
    }
    const value = JSON.stringify(merged)

    if (existing?.id) {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { value, updatedBy: session.user.id },
      })
    } else {
      await prisma.integrationConfig.create({
        data: { key: KEY, value, createdBy: session.user.id },
      })
    }

    return NextResponse.json(JSON.parse(value))
  } catch (e) {
    console.error('PN settings update error:', e)
    return NextResponse.json({ error: 'Failed to update PN settings' }, { status: 500 })
  }
}
