/**
 * @file route.ts
 * @description API for checkout settings (IntegrationConfig)
 * @module app/api/admin/settings/checkout
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const CHECKOUT_KEY = 'settings.checkout'

const DEFAULTS = {
  price_lock_ttl_minutes: 15,
  cancellation_window_hours: 48,
  min_deposit_percent: 20,
  max_rental_days: 365,
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const row = await prisma.integrationConfig.findFirst({
      where: { key: CHECKOUT_KEY, deletedAt: null },
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
    console.error('Checkout settings get error:', e)
    return NextResponse.json({ error: 'Failed to load checkout settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const price_lock_ttl_minutes =
      typeof body.price_lock_ttl_minutes === 'number'
        ? body.price_lock_ttl_minutes
        : parseInt(body.price_lock_ttl_minutes, 10)
    const cancellation_window_hours =
      typeof body.cancellation_window_hours === 'number'
        ? body.cancellation_window_hours
        : parseInt(body.cancellation_window_hours, 10)
    const min_deposit_percent =
      typeof body.min_deposit_percent === 'number'
        ? body.min_deposit_percent
        : parseInt(body.min_deposit_percent, 10)
    const max_rental_days =
      typeof body.max_rental_days === 'number'
        ? body.max_rental_days
        : parseInt(body.max_rental_days, 10)

    const value = JSON.stringify({
      price_lock_ttl_minutes: Number.isNaN(price_lock_ttl_minutes)
        ? DEFAULTS.price_lock_ttl_minutes
        : price_lock_ttl_minutes,
      cancellation_window_hours: Number.isNaN(cancellation_window_hours)
        ? DEFAULTS.cancellation_window_hours
        : cancellation_window_hours,
      min_deposit_percent: Number.isNaN(min_deposit_percent)
        ? DEFAULTS.min_deposit_percent
        : min_deposit_percent,
      max_rental_days: Number.isNaN(max_rental_days) ? DEFAULTS.max_rental_days : max_rental_days,
    })

    const existing = await prisma.integrationConfig.findFirst({
      where: { key: CHECKOUT_KEY, deletedAt: null },
      select: { id: true },
    })

    if (existing) {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { value, updatedBy: session.user.id },
      })
    } else {
      await prisma.integrationConfig.create({
        data: { key: CHECKOUT_KEY, value, createdBy: session.user.id },
      })
    }

    return NextResponse.json(JSON.parse(value))
  } catch (e) {
    console.error('Checkout settings update error:', e)
    return NextResponse.json({ error: 'Failed to update checkout settings' }, { status: 500 })
  }
}
