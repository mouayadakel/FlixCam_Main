/**
 * @file route.ts
 * @description API for related equipment combo message and discount % (IntegrationConfig)
 * @module app/api/admin/settings/related-equipment-combo
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const KEY_MESSAGE = 'settings.related_equipment_combo_message'
const KEY_DISCOUNT = 'settings.related_equipment_combo_discount_percent'

const DEFAULT_MESSAGE =
  'لقد اخترنا لك إضافات ترفع من كفاءة معداتك بناءً على اختيارات خبراء ومستخدمين آخرين.\n[ أضفها الآن واحصل على خصم الـ Combo الخاص بك ]'
const DEFAULT_DISCOUNT = 10

function parseDiscount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (Number.isNaN(n) || n < 0 || n > 100) return DEFAULT_DISCOUNT
  return Math.round(n * 100) / 100
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [msgRow, discountRow] = await Promise.all([
      prisma.integrationConfig.findFirst({
        where: { key: KEY_MESSAGE, deletedAt: null },
        select: { value: true },
      }),
      prisma.integrationConfig.findFirst({
        where: { key: KEY_DISCOUNT, deletedAt: null },
        select: { value: true },
      }),
    ])

    const message = msgRow?.value != null && msgRow.value !== '' ? msgRow.value : DEFAULT_MESSAGE
    const discountPercent =
      discountRow?.value != null ? parseDiscount(discountRow.value) : DEFAULT_DISCOUNT

    return NextResponse.json({ message, discountPercent })
  } catch (e) {
    console.error('Related equipment combo GET error:', e)
    return NextResponse.json({ error: 'Failed to load setting' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await request.json()) as { message?: string; discountPercent?: number }
    const message =
      typeof body.message === 'string' ? body.message.trim() || DEFAULT_MESSAGE : undefined
    const discountPercent =
      body.discountPercent !== undefined ? parseDiscount(body.discountPercent) : undefined

    const updates: Promise<unknown>[] = []

    if (message !== undefined) {
      const existing = await prisma.integrationConfig.findFirst({
        where: { key: KEY_MESSAGE, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        updates.push(
          prisma.integrationConfig.update({
            where: { id: existing.id },
            data: { value: message, updatedBy: session.user.id },
          })
        )
      } else {
        updates.push(
          prisma.integrationConfig.create({
            data: { key: KEY_MESSAGE, value: message, createdBy: session.user.id },
          })
        )
      }
    }

    if (discountPercent !== undefined) {
      const existing = await prisma.integrationConfig.findFirst({
        where: { key: KEY_DISCOUNT, deletedAt: null },
        select: { id: true },
      })
      const value = String(discountPercent)
      if (existing) {
        updates.push(
          prisma.integrationConfig.update({
            where: { id: existing.id },
            data: { value, updatedBy: session.user.id },
          })
        )
      } else {
        updates.push(
          prisma.integrationConfig.create({
            data: { key: KEY_DISCOUNT, value, createdBy: session.user.id },
          })
        )
      }
    }

    await Promise.all(updates)

    const [msgRow, discountRow] = await Promise.all([
      prisma.integrationConfig.findFirst({
        where: { key: KEY_MESSAGE, deletedAt: null },
        select: { value: true },
      }),
      prisma.integrationConfig.findFirst({
        where: { key: KEY_DISCOUNT, deletedAt: null },
        select: { value: true },
      }),
    ])

    const outMessage = msgRow?.value != null && msgRow.value !== '' ? msgRow.value : DEFAULT_MESSAGE
    const outDiscount =
      discountRow?.value != null ? parseDiscount(discountRow.value) : DEFAULT_DISCOUNT

    return NextResponse.json({ message: outMessage, discountPercent: outDiscount })
  } catch (e) {
    console.error('Related equipment combo PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
