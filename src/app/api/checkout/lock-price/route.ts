/**
 * POST /api/checkout/lock-price – Lock cart price.
 * TTL configurable via SiteSetting key "checkout_lock_ttl_minutes" (default 120).
 * Returns lockedUntil and lockTtlMinutes for frontend countdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { unifiedPricing, type PricingItem } from '@/lib/services/unified-pricing.service'
import { computeAddonsTotals } from '@/lib/pricing/checkout-addons'

const DEFAULT_LOCK_TTL_MINUTES = 15

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  const customerId = session?.user?.id ?? null

  const setting = await prisma.integrationConfig.findFirst({
    where: { key: 'settings.checkout', deletedAt: null },
    select: { value: true },
  })
  let configuredTtl: number | null = null
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value) as { price_lock_ttl_minutes?: unknown }
      const raw = Number(parsed.price_lock_ttl_minutes)
      configuredTtl = Number.isFinite(raw) ? raw : null
    } catch {
      configuredTtl = null
    }
  }
  const lockTtlMinutes = Math.max(
    1,
    Math.min(480, configuredTtl || DEFAULT_LOCK_TTL_MINUTES)
  )

  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  const cart = await CartService.getOrCreateCart(customerId, sessionId)
  if (cart.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const pricingItems: PricingItem[] = []
  for (const item of cart.items) {
    const base = {
      quantity: item.quantity,
      startDate: item.startDate,
      endDate: item.endDate,
    }
    if (item.itemType === 'EQUIPMENT' && item.equipmentId) {
      pricingItems.push({ ...base, type: 'EQUIPMENT', entityId: item.equipmentId })
      continue
    }
    if (item.itemType === 'STUDIO' && item.studioId) {
      pricingItems.push({ ...base, type: 'STUDIO', entityId: item.studioId })
      continue
    }
    if (item.itemType === 'PACKAGE' && item.packageId) {
      pricingItems.push({ ...base, type: 'PACKAGE', entityId: item.packageId })
      continue
    }
    if (item.itemType === 'KIT' && item.kitId) {
      pricingItems.push({ ...base, type: 'KIT', entityId: item.kitId })
    }
  }

  // 1) Price base cart line items first (equipment/studio/kit/package)
  const basePricing = await unifiedPricing.calculate({
    items: pricingItems,
    couponCode: cart.couponCode,
    customerId: customerId ?? undefined,
  })

  // 2) Apply persisted checkout add-ons (technician, accessories, delivery fee, insurance)
  const addonsTotals = computeAddonsTotals(cart.addons, Number(basePricing.subtotal))
  const addonsPricingItems: PricingItem[] = []
  if (addonsTotals.technicianFeeSar > 0) {
    addonsPricingItems.push({
      type: 'DELIVERY',
      entityId: 'TECHNICIAN',
      quantity: 1,
      overridePrice: addonsTotals.technicianFeeSar,
    })
  }
  if (addonsTotals.accessoriesFeeSar > 0) {
    addonsPricingItems.push({
      type: 'DELIVERY',
      entityId: 'ACCESSORIES',
      quantity: 1,
      overridePrice: addonsTotals.accessoriesFeeSar,
    })
  }
  if (addonsTotals.deliveryFeeSar > 0) {
    addonsPricingItems.push({
      type: 'DELIVERY',
      entityId: 'DELIVERY_FEE',
      quantity: 1,
      overridePrice: addonsTotals.deliveryFeeSar,
    })
  }
  if (addonsTotals.insuranceFeeSar > 0) {
    addonsPricingItems.push({
      type: 'DELIVERY',
      entityId: 'INSURANCE',
      quantity: 1,
      overridePrice: addonsTotals.insuranceFeeSar,
    })
  }

  const pricing = addonsPricingItems.length
    ? await unifiedPricing.calculate({
        items: [...pricingItems, ...addonsPricingItems],
        couponCode: cart.couponCode,
        customerId: customerId ?? undefined,
      })
    : basePricing

  const lockedUntil = new Date(Date.now() + lockTtlMinutes * 60 * 1000)
  await prisma.priceLock.upsert({
    where: { cartId: cart.id },
    create: {
      cartId: cart.id,
      lockedPricing: JSON.parse(JSON.stringify(pricing)),
      subtotal: pricing.subtotal,
      vatAmount: pricing.vatAmount,
      totalAmount: pricing.totalAmount,
      depositAmount: pricing.depositAmount,
      expiresAt: lockedUntil,
    },
    update: {
      lockedPricing: JSON.parse(JSON.stringify(pricing)),
      subtotal: pricing.subtotal,
      vatAmount: pricing.vatAmount,
      totalAmount: pricing.totalAmount,
      depositAmount: pricing.depositAmount,
      expiresAt: lockedUntil,
    },
  })

  return NextResponse.json({
    locked: true,
    lockedAt: new Date().toISOString(),
    lockedUntil: lockedUntil.toISOString(),
    lockTtlMinutes,
    cartId: cart.id,
    pricing: JSON.parse(JSON.stringify(pricing)),
  })
}
