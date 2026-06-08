/**
 * @file logistics-balancing.service.ts
 * @description Analyzes equipment demand vs supply across warehouses and recommends stock shifts.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { startOfDay, addDays } from 'date-fns'

export interface StockShiftRecommendation {
  equipmentId: string
  equipmentName: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  reason: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export class LogisticsBalancingService {
  /**
   * Analyze demand for the next N days and suggest stock movements.
   */
  static async getRecommendations(daysOut: number = 7): Promise<StockShiftRecommendation[]> {
    const horizon = addDays(startOfDay(new Date()), daysOut)
    
    // 1. Get all upcoming bookings with warehouse assignments
    const bookings = await (prisma as any).booking.findMany({
      where: {
        startDate: { lte: horizon, gte: new Date() },
        status: { in: ['CONFIRMED', 'PAID'] },
        warehouseId: { not: null }
      },
      include: {
        equipment: {
          include: { equipment: true }
        }
      }
    })

    // 2. Aggregate demand per equipment per warehouse
    const demand: Record<string, Record<string, number>> = {} // equipmentId -> warehouseId -> count
    
    for (const b of bookings) {
      if (!b.warehouseId) continue
      for (const item of b.equipment) {
        const eqId = item.equipmentId
        if (!demand[eqId]) demand[eqId] = {}
        demand[eqId][b.warehouseId] = (demand[eqId][b.warehouseId] || 0) + item.quantity
      }
    }

    // 3. Get current stock levels
    const stocks = await (prisma as any).equipmentStock.findMany({
      include: { equipment: true, warehouse: true }
    })

    const supply: Record<string, Record<string, number>> = {} // equipmentId -> warehouseId -> quantity
    for (const s of stocks) {
      if (!supply[s.equipmentId]) supply[s.equipmentId] = {}
      supply[s.equipmentId][s.warehouseId] = s.quantity
    }

    const recommendations: StockShiftRecommendation[] = []

    // 4. Identify shortages and find surplus elsewhere
    for (const eqId in demand) {
      for (const targetWhId in demand[eqId]) {
        const required = demand[eqId][targetWhId]
        const available = supply[eqId]?.[targetWhId] || 0

        if (available < required) {
          const shortage = required - available
          
          // Look for surplus in other warehouses
          for (const sourceWhId in supply[eqId]) {
            if (sourceWhId === targetWhId) continue
            
            const surplus = supply[eqId][sourceWhId] - (demand[eqId]?.[sourceWhId] || 0)
            if (surplus > 0) {
              const shiftQty = Math.min(shortage, surplus)
              recommendations.push({
                equipmentId: eqId,
                equipmentName: stocks.find((s: (typeof stocks)[number]) => s.equipmentId === eqId)
                  ?.equipment.model || 'Unknown Gear',
                fromWarehouseId: sourceWhId,
                toWarehouseId: targetWhId,
                quantity: shiftQty,
                reason: `نقص متوقع في ${stocks.find((s: (typeof stocks)[number]) => s.warehouseId === targetWhId)?.warehouse.name}`,
                priority: shortage > 5 ? 'HIGH' : 'MEDIUM'
              })
            }
          }
        }
      }
    }

    return recommendations
  }

  /**
   * Execute a stock shift between warehouses
   */
  static async executeShift(
    equipmentId: string,
    fromWhId: string,
    toWhId: string,
    quantity: number
  ) {
    return prisma.$transaction(async (tx) => {
      // Decrement from source
      await (tx as any).equipmentStock.update({
        where: { equipmentId_warehouseId: { equipmentId, warehouseId: fromWhId } },
        data: { quantity: { decrement: quantity } }
      })

      // Increment at destination
      await (tx as any).equipmentStock.upsert({
        where: { equipmentId_warehouseId: { equipmentId, warehouseId: toWhId } },
        update: { quantity: { increment: quantity } },
        create: { equipmentId, warehouseId: toWhId, quantity }
      })
    })
  }
}
