/**
 * GET/PATCH /api/admin/settings/company – Company (creditor) settings for promissory notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const KEY = 'settings.company'

const DEFAULTS = {
  creditorName: '',
  creditorCommercialReg: '',
  creditorTaxNumber: '',
  creditorAddress: '',
  creditorBankAccount: '',
  creditorIban: '',
  managerName: '',
  managerTitle: '',
  managerLetterTemplate: '',
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
    console.error('Company settings get error:', e)
    return NextResponse.json({ error: 'Failed to load company settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.update' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const value = JSON.stringify({
      creditorName: String(body.creditorName ?? DEFAULTS.creditorName),
      creditorCommercialReg: String(body.creditorCommercialReg ?? DEFAULTS.creditorCommercialReg),
      creditorTaxNumber: String(body.creditorTaxNumber ?? DEFAULTS.creditorTaxNumber),
      creditorAddress: String(body.creditorAddress ?? DEFAULTS.creditorAddress),
      creditorBankAccount: String(body.creditorBankAccount ?? DEFAULTS.creditorBankAccount),
      creditorIban: String(body.creditorIban ?? DEFAULTS.creditorIban),
      managerName: String(body.managerName ?? DEFAULTS.managerName),
      managerTitle: String(body.managerTitle ?? DEFAULTS.managerTitle),
      managerLetterTemplate: String(body.managerLetterTemplate ?? DEFAULTS.managerLetterTemplate),
    })

    const existing = await prisma.integrationConfig.findFirst({
      where: { key: KEY, deletedAt: null },
      select: { id: true },
    })

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

    return NextResponse.json(JSON.parse(value))
  } catch (e) {
    console.error('Company settings update error:', e)
    return NextResponse.json({ error: 'Failed to update company settings' }, { status: 500 })
  }
}
