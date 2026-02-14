/**
 * @file route.ts
 * @description API for tax/VAT settings (IntegrationConfig key-value)
 * @module app/api/admin/settings/tax
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const TAX_KEY = 'settings.tax'

const DEFAULT_TAX = {
  vat_rate: 15,
  vat_number: '',
  tax_name: 'VAT',
  is_inclusive: false,
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const row = await prisma.integrationConfig.findFirst({
      where: { key: TAX_KEY, deletedAt: null },
      select: { value: true },
    })

    let data = DEFAULT_TAX
    if (row?.value) {
      try {
        data = { ...DEFAULT_TAX, ...JSON.parse(row.value) }
      } catch {
        // ignore invalid JSON
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Tax settings get error:', e)
    return NextResponse.json({ error: 'Failed to load tax settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const vat_rate = typeof body.vat_rate === 'number' ? body.vat_rate : parseFloat(body.vat_rate)
    const vat_number = typeof body.vat_number === 'string' ? body.vat_number : String(body.vat_number ?? '')
    const tax_name = typeof body.tax_name === 'string' ? body.tax_name : String(body.tax_name ?? 'VAT')
    const is_inclusive = typeof body.is_inclusive === 'boolean' ? body.is_inclusive : Boolean(body.is_inclusive)

    const value = JSON.stringify({
      vat_rate: Number.isNaN(vat_rate) ? 15 : vat_rate,
      vat_number,
      tax_name,
      is_inclusive,
    })

    const existing = await prisma.integrationConfig.findFirst({
      where: { key: TAX_KEY, deletedAt: null },
      select: { id: true },
    })

    if (existing) {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { value, updatedBy: session.user.id },
      })
    } else {
      await prisma.integrationConfig.create({
        data: { key: TAX_KEY, value, createdBy: session.user.id },
      })
    }

    return NextResponse.json({ vat_rate: Number.isNaN(vat_rate) ? 15 : vat_rate, vat_number, tax_name, is_inclusive })
  } catch (e) {
    console.error('Tax settings update error:', e)
    return NextResponse.json({ error: 'Failed to update tax settings' }, { status: 500 })
  }
}
