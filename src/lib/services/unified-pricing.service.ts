import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/prisma'
import { calculateVAT, getVATRate } from '@/lib/vat'
import { calculateRentalDays } from '@/lib/pricing/rental-days'

export type PricingItemType = 'EQUIPMENT' | 'STUDIO' | 'PACKAGE' | 'KIT' | 'ADDON' | 'DELIVERY'

export interface PricingInput {
  items: PricingItem[]
  couponCode?: string | null
  customerId?: string | null
}

export interface PricingItem {
  type: PricingItemType
  entityId: string
  quantity: number
  startDate?: Date | string | null
  endDate?: Date | string | null
  overridePrice?: Decimal | number | string | null
}

export interface ComputedLineItem {
  type: PricingItemType
  entityId: string
  description: string
  quantity: Decimal
  unitPrice: Decimal
  rentalDays?: number
  discountPct: Decimal
  discountAmt: Decimal
  vatRate: Decimal
  vatAmount: Decimal
  lineTotal: Decimal
  lineTotalWithVat: Decimal
  startDate?: Date
  endDate?: Date
  hasImplicitDiscount?: boolean
}

export interface PricingResult {
  lineItems: ComputedLineItem[]
  subtotal: Decimal
  couponDiscount: Decimal
  totalDiscount: Decimal
  vatRate: Decimal
  vatAmount: Decimal
  depositAmount: Decimal
  totalAmount: Decimal
  currency: 'SAR'
}

function asDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined
  return value instanceof Date ? value : new Date(value)
}

function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2)
}

function descriptionFromEquipment(equipment: { sku: string; model: string | null; nameEn: string | null }) {
  return [equipment.sku, equipment.model ?? equipment.nameEn].filter(Boolean).join(' - ')
}

export class UnifiedPricingService {
  async calculate(input: PricingInput): Promise<PricingResult> {
    const vatRate = await getVATRate()
    const lineItems: ComputedLineItem[] = []

    for (const item of input.items) {
      lineItems.push(await this.computeItem(item, vatRate))
    }

    const subtotal = roundMoney(lineItems.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0)))
    const couponDiscount = input.couponCode
      ? await this.applyCoupon(input.couponCode, subtotal, lineItems)
      : new Decimal(0)
    const afterDiscount = subtotal.minus(couponDiscount)
    const taxableAmount = afterDiscount.gt(0) ? afterDiscount : new Decimal(0)
    const vatAmount = calculateVAT(taxableAmount, vatRate)
    const depositAmount = await this.calculateDeposit(input.items)
    const totalAmount = roundMoney(taxableAmount.plus(vatAmount))

    return {
      lineItems,
      subtotal,
      couponDiscount,
      totalDiscount: couponDiscount,
      vatRate,
      vatAmount,
      depositAmount,
      totalAmount,
      currency: 'SAR',
    }
  }

  calculateRentalDays(start: Date, end: Date): number {
    return calculateRentalDays(start, end)
  }

  private async computeItem(item: PricingItem, vatRate: Decimal): Promise<ComputedLineItem> {
    const startDate = asDate(item.startDate)
    const endDate = asDate(item.endDate)
    const quantity = new Decimal(Math.max(1, item.quantity || 1))
    let unitPrice = new Decimal(0)
    let lineTotal = new Decimal(0)
    let description: string = item.type
    let rentalDays: number | undefined
    let hasImplicitDiscount = false

    if (item.type === 'EQUIPMENT') {
      const equipment = await prisma.equipment.findFirstOrThrow({
        where: { id: item.entityId, deletedAt: null },
        select: {
          sku: true,
          model: true,
          nameEn: true,
          dailyPrice: true,
          weeklyPrice: true,
          monthlyPrice: true,
        },
      })
      const priced = this.priceEquipment(equipment, startDate, endDate)
      rentalDays = priced.days
      unitPrice = priced.unitPrice
      lineTotal = priced.total.times(quantity)
      description = descriptionFromEquipment(equipment)
      hasImplicitDiscount = priced.hasDiscount
    } else if (item.type === 'STUDIO') {
      const studio = await prisma.studio.findFirstOrThrow({
        where: { id: item.entityId, deletedAt: null },
        select: { name: true, nameEn: true, hourlyRate: true, dailyRate: true },
      })
      const hours = startDate && endDate ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 3_600_000)) : 1
      unitPrice = new Decimal(studio.hourlyRate ?? studio.dailyRate ?? 0)
      lineTotal = unitPrice.times(hours).times(quantity)
      rentalDays = hours >= 24 ? Math.ceil(hours / 24) : undefined
      description = studio.nameEn || studio.name
    } else if (item.type === 'PACKAGE') {
      const pkg = await prisma.studioPackage.findFirstOrThrow({
        where: { id: item.entityId, deletedAt: null },
        select: { name: true, nameAr: true, price: true, hours: true },
      })
      unitPrice = new Decimal(pkg.price)
      lineTotal = unitPrice.times(quantity)
      description = pkg.nameAr || pkg.name
      rentalDays = pkg.hours ?? undefined
      hasImplicitDiscount = true // Packages are inherently discounted
    } else if (item.type === 'ADDON') {
      const addon = await prisma.studioAddOn.findFirstOrThrow({
        where: { id: item.entityId, deletedAt: null },
        select: { name: true, price: true },
      })
      unitPrice = new Decimal(addon.price)
      lineTotal = unitPrice.times(quantity)
      description = addon.name
    } else if (item.type === 'KIT') {
      const kit = await prisma.kit.findFirstOrThrow({
        where: { id: item.entityId, deletedAt: null },
        include: {
          items: {
            include: {
              equipment: {
                select: { dailyPrice: true, weeklyPrice: true, monthlyPrice: true, purchasePrice: true },
              },
            },
          },
        },
      })
      const days = startDate && endDate ? this.calculateRentalDays(startDate, endDate) : 1
      const kitTotal = kit.items.reduce((sum, kitItem) => {
        const priced = this.priceEquipment(kitItem.equipment, startDate, endDate)
        return sum.plus(priced.total.times(kitItem.quantity))
      }, new Decimal(0))
      const discountPct = new Decimal(kit.discountPercent ?? 0)
      const discountedTotal = discountPct.gt(0)
        ? kitTotal.minus(kitTotal.times(discountPct).dividedBy(100))
        : kitTotal
      unitPrice = roundMoney(discountedTotal)
      lineTotal = unitPrice.times(quantity)
      rentalDays = days
      description = kit.name
      hasImplicitDiscount = true // Kits are inherently discounted
    } else if (item.type === 'DELIVERY') {
      unitPrice = new Decimal(item.overridePrice ?? 0)
      lineTotal = unitPrice.times(quantity)
      description =
        item.entityId === 'TECHNICIAN'
          ? 'Technician'
          : item.entityId === 'INSURANCE'
            ? 'Insurance'
            : item.entityId === 'ACCESSORIES'
              ? 'Accessories'
              : item.entityId === 'DELIVERY_FEE'
                ? 'Delivery fee'
                : 'Delivery'
    } else {
      unitPrice = new Decimal(item.overridePrice ?? 0)
      lineTotal = unitPrice.times(quantity)
      description = 'Delivery'
    }

    if (item.overridePrice != null) {
      unitPrice = new Decimal(item.overridePrice)
      const multiplier = rentalDays && item.type === 'EQUIPMENT' ? new Decimal(rentalDays).times(quantity) : quantity
      lineTotal = unitPrice.times(multiplier)
    }

    const roundedLineTotal = roundMoney(lineTotal)
    const vatAmount = calculateVAT(roundedLineTotal, vatRate)

    return {
      type: item.type,
      entityId: item.entityId,
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      rentalDays,
      discountPct: new Decimal(0),
      discountAmt: new Decimal(0),
      vatRate,
      vatAmount,
      lineTotal: roundedLineTotal,
      lineTotalWithVat: roundedLineTotal.plus(vatAmount),
      startDate,
      endDate,
      hasImplicitDiscount,
    }
  }

  private priceEquipment(
    equipment: {
      dailyPrice: Decimal
      weeklyPrice: Decimal | null
      monthlyPrice: Decimal | null
    },
    startDate?: Date,
    endDate?: Date
  ): { days: number; unitPrice: Decimal; total: Decimal; hasDiscount: boolean } {
    const days = startDate && endDate ? this.calculateRentalDays(startDate, endDate) : 1
    const daily = new Decimal(equipment.dailyPrice)
    const options: Array<{ days: number; unitPrice: Decimal; total: Decimal; hasDiscount: boolean }> = [
      { days, unitPrice: daily, total: daily.times(days), hasDiscount: false },
    ]

    if (equipment.weeklyPrice && days >= 7) {
      const weekly = new Decimal(equipment.weeklyPrice)
      const weeks = Math.floor(days / 7)
      const remainingDays = days % 7
      options.push({
        days,
        unitPrice: weekly.dividedBy(7),
        total: weekly.times(weeks).plus(daily.times(remainingDays)),
        hasDiscount: true,
      })
    }

    if (equipment.monthlyPrice && days >= 30) {
      const monthly = new Decimal(equipment.monthlyPrice)
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      options.push({
        days,
        unitPrice: monthly.dividedBy(30),
        total: monthly.times(months).plus(daily.times(remainingDays)),
        hasDiscount: true,
      })
    }

    return options.reduce((best, option) => (option.total.lt(best.total) ? option : best), options[0])
  }

  private async calculateDeposit(items: PricingItem[]): Promise<Decimal> {
    let total = new Decimal(0)
    for (const item of items) {
      if (item.type === 'EQUIPMENT') {
        const equipment = await prisma.equipment.findFirst({
          where: { id: item.entityId, deletedAt: null },
          select: { purchasePrice: true },
        })
        total = total.plus(new Decimal(equipment?.purchasePrice ?? 0).times(Math.max(1, item.quantity || 1)))
      } else if (item.type === 'KIT') {
        const kit = await prisma.kit.findFirst({
          where: { id: item.entityId, deletedAt: null },
          include: { items: { include: { equipment: { select: { purchasePrice: true } } } } },
        })
        for (const kitItem of kit?.items ?? []) {
          total = total.plus(
            new Decimal(kitItem.equipment.purchasePrice ?? 0).times(kitItem.quantity).times(Math.max(1, item.quantity || 1))
          )
        }
      }
    }
    return roundMoney(total)
  }

  private async applyCoupon(
    code: string,
    subtotal: Decimal,
    lineItems: ComputedLineItem[]
  ): Promise<Decimal> {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        status: 'ACTIVE',
        deletedAt: null,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    })
    if (!coupon) return new Decimal(0)
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return new Decimal(0)

    const equipmentIds = new Set(lineItems.filter((line) => line.type === 'EQUIPMENT').map((line) => line.entityId))
    const applicableEquipmentIds = Array.isArray(coupon.applicableEquipmentIds)
      ? (coupon.applicableEquipmentIds as string[])
      : null
    if (applicableEquipmentIds?.length && !applicableEquipmentIds.some((id) => equipmentIds.has(id))) {
      return new Decimal(0)
    }

    let applicableSubtotal = subtotal
    if ((coupon as any).canCombineWithOtherOffers === false) {
      const nonDiscountedItems = lineItems.filter((line) => !line.hasImplicitDiscount)
      applicableSubtotal = roundMoney(
        nonDiscountedItems.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0))
      )
      if (applicableSubtotal.lte(0)) {
        return new Decimal(0)
      }
    }

    const rawDiscount =
      coupon.type === 'PERCENT'
        ? applicableSubtotal.times(new Decimal(coupon.discountPercentage ?? 0)).dividedBy(100)
        : new Decimal(coupon.discountValue ?? 0)
    const capped = coupon.maximumDiscount
      ? Decimal.min(rawDiscount, new Decimal(coupon.maximumDiscount))
      : rawDiscount
    return roundMoney(Decimal.min(capped, applicableSubtotal))
  }
}

export const unifiedPricing = new UnifiedPricingService()
