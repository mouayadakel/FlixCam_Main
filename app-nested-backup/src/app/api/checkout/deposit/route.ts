/**
 * GET /api/checkout/deposit – Deposit amount for current cart (PricingService.calculateDeposit).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { PricingService } from '@/lib/services/pricing.service'
import { getCartSessionId } from '@/lib/cart-session'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
    const cart = await CartService.getOrCreateCart(session.user.id, sessionId)
    if (!cart.items.length) {
      return NextResponse.json({ depositAmount: 0 })
    }

    const equipment: { equipmentId: string; quantity: number }[] = []
    for (const item of cart.items) {
      if (item.itemType === 'EQUIPMENT' && item.equipmentId) {
        equipment.push({ equipmentId: item.equipmentId, quantity: item.quantity })
      } else if ((item.itemType === 'KIT' || item.itemType === 'PACKAGE') && item.kitId) {
        const kitItems = await prisma.kitEquipment.findMany({
          where: { kitId: item.kitId },
        })
        for (const ki of kitItems) {
          const existing = equipment.find((e) => e.equipmentId === ki.equipmentId)
          if (existing) existing.quantity += ki.quantity * item.quantity
          else equipment.push({ equipmentId: ki.equipmentId, quantity: ki.quantity * item.quantity })
        }
      }
    }

    const depositAmount = equipment.length ? await PricingService.calculateDeposit(equipment) : 0

    return NextResponse.json({ depositAmount })
  } catch (error) {
    return handleApiError(error)
  }
}
