/**
 * @file pricing.service.ts
 * @description Pricing service with weekend logic, 15% VAT, and deposit calculation
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { EquipmentService } from './equipment.service'
import { StudioService } from './studio.service'

export interface PricingQuoteInput {
  equipment: Array<{
    equipmentId: string
    quantity: number
  }>
  startDate: Date
  endDate: Date
  studioId?: string
  studioStartTime?: Date
  studioEndTime?: Date
}

export interface PricingQuote {
  equipmentSubtotal: number
  studioSubtotal: number
  subtotal: number
  vatAmount: number
  vatRate: number
  depositAmount: number
  totalAmount: number
  breakdown: {
    equipment: Array<{
      equipmentId: string
      sku: string
      quantity: number
      dailyRate: number
      weeklyRate?: number
      monthlyRate?: number
      days: number
      amount: number
    }>
    studio?: {
      studioId: string
      hours: number
      hourlyRate: number
      amount: number
    }
  }
}

export class PricingService {
  // VAT rate: 15%
  private static readonly VAT_RATE = 0.15

  /**
   * Calculate number of rental days (weekend logic: Fri-Mon = 1 day)
   */
  static calculateRentalDays(startDate: Date, endDate: Date): number {
    let days = 0
    const current = new Date(startDate)

    while (current < endDate) {
      const dayOfWeek = current.getDay() // 0 = Sunday, 5 = Friday, 6 = Saturday

      // Weekend logic: Friday to Monday counts as 1 day
      if (dayOfWeek === 5) {
        // Friday - check if next day is Saturday
        const nextDay = new Date(current)
        nextDay.setDate(nextDay.getDate() + 1)
        if (nextDay.getDay() === 6 && nextDay < endDate) {
          // Skip to Monday
          current.setDate(current.getDate() + 3)
          days += 1
          continue
        }
      }

      days += 1
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  /**
   * Calculate equipment pricing
   */
  static async calculateEquipmentPricing(
    equipmentId: string,
    quantity: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    dailyRate: number
    weeklyRate?: number
    monthlyRate?: number
    days: number
    amount: number
  }> {
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!equipment) {
      throw new Error(`Equipment ${equipmentId} not found`)
    }

    const days = this.calculateRentalDays(startDate, endDate)
    const dailyRate = Number(equipment.dailyPrice)
    const weeklyRate = equipment.weeklyPrice ? Number(equipment.weeklyPrice) : undefined
    const monthlyRate = equipment.monthlyPrice ? Number(equipment.monthlyPrice) : undefined

    let amount = 0

    // Calculate based on best rate (monthly > weekly > daily)
    if (monthlyRate && days >= 30) {
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      amount = months * monthlyRate + remainingDays * dailyRate
    } else if (weeklyRate && days >= 7) {
      const weeks = Math.floor(days / 7)
      const remainingDays = days % 7
      amount = weeks * weeklyRate + remainingDays * dailyRate
    } else {
      amount = days * dailyRate
    }

    return {
      dailyRate,
      weeklyRate,
      monthlyRate,
      days,
      amount: amount * quantity,
    }
  }

  /**
   * Calculate studio pricing
   */
  static async calculateStudioPricing(
    studioId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    hours: number
    hourlyRate: number
    amount: number
  }> {
    const hours = await StudioService.calculateBookingDuration(
      studioId,
      startTime,
      endTime
    )

    const studio = await prisma.studio.findFirst({
      where: {
        id: studioId,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!studio) {
      throw new Error(`Studio ${studioId} not found`)
    }

    const hourlyRate = Number(studio.hourlyRate)
    const amount = hours * hourlyRate

    return {
      hours,
      hourlyRate,
      amount,
    }
  }

  /**
   * Calculate deposit based on equipment value
   * Formula: 30% of equipment value, minimum 1000 SAR, maximum 50000 SAR
   */
  static async calculateDeposit(
    equipment: Array<{
      equipmentId: string
      quantity: number
    }>
  ): Promise<number> {
    let totalEquipmentValue = 0

    for (const eq of equipment) {
      const equipmentItem = await prisma.equipment.findFirst({
        where: {
          id: eq.equipmentId,
          deletedAt: null,
        },
      })

      if (equipmentItem) {
        // Use daily price as base value (could be improved with actual equipment value)
        const equipmentValue = Number(equipmentItem.dailyPrice) * 10 // Estimate: 10 days worth
        totalEquipmentValue += equipmentValue * eq.quantity
      }
    }

    // 30% of equipment value
    let deposit = totalEquipmentValue * 0.3

    // Minimum 1000 SAR
    deposit = Math.max(deposit, 1000)

    // Maximum 50000 SAR
    deposit = Math.min(deposit, 50000)

    return Math.round(deposit * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Calculate VAT (15%)
   */
  static calculateVAT(subtotal: number): number {
    return Math.round(subtotal * this.VAT_RATE * 100) / 100
  }

  /**
   * Generate pricing quote
   */
  static async generateQuote(input: PricingQuoteInput): Promise<PricingQuote> {
    // Calculate equipment pricing
    const equipmentBreakdown = await Promise.all(
      input.equipment.map(async (eq) => {
        const pricing = await this.calculateEquipmentPricing(
          eq.equipmentId,
          eq.quantity,
          input.startDate,
          input.endDate
        )

        const equipment = await prisma.equipment.findFirst({
          where: { id: eq.equipmentId },
          select: { sku: true },
        })

        return {
          equipmentId: eq.equipmentId,
          sku: equipment?.sku || '',
          quantity: eq.quantity,
          ...pricing,
        }
      })
    )

    const equipmentSubtotal = equipmentBreakdown.reduce(
      (sum, item) => sum + item.amount,
      0
    )

    // Calculate studio pricing if provided
    let studioSubtotal = 0
    let studioBreakdown: PricingQuote['breakdown']['studio'] | undefined

    if (input.studioId && input.studioStartTime && input.studioEndTime) {
      const studioPricing = await this.calculateStudioPricing(
        input.studioId,
        input.studioStartTime,
        input.studioEndTime
      )

      studioSubtotal = studioPricing.amount

      studioBreakdown = {
        studioId: input.studioId,
        hours: studioPricing.hours,
        hourlyRate: studioPricing.hourlyRate,
        amount: studioPricing.amount,
      }
    }

    // Calculate subtotal
    const subtotal = equipmentSubtotal + studioSubtotal

    // Calculate VAT (15%)
    const vatAmount = this.calculateVAT(subtotal)

    // Calculate deposit
    const depositAmount = await this.calculateDeposit(input.equipment)

    // Calculate total (subtotal + VAT, deposit is separate)
    const totalAmount = subtotal + vatAmount

    return {
      equipmentSubtotal,
      studioSubtotal,
      subtotal,
      vatAmount,
      vatRate: this.VAT_RATE,
      depositAmount,
      totalAmount,
      breakdown: {
        equipment: equipmentBreakdown,
        studio: studioBreakdown,
      },
    }
  }

  /**
   * Apply bundle discount (Phase 2 - studio + equipment)
   * For now, returns 0 (no discount)
   */
  static calculateBundleDiscount(
    equipmentSubtotal: number,
    studioSubtotal: number
  ): number {
    // Phase 2: Implement bundle discount logic
    // For now, return 0
    return 0
  }
}
