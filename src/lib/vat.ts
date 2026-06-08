import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/prisma'

let cachedVatRate: Decimal | null = null
let cachedAt = 0

const VAT_CACHE_MS = 5 * 60 * 1000
const DEFAULT_VAT_RATE = new Decimal('0.15')

export async function getVATRate(): Promise<Decimal> {
  if (cachedVatRate && Date.now() - cachedAt < VAT_CACHE_MS) {
    return cachedVatRate
  }

  const settings = await prisma.companySettings.findFirst({
    select: { vatRate: true },
  })

  cachedVatRate = settings?.vatRate ? new Decimal(settings.vatRate) : DEFAULT_VAT_RATE
  cachedAt = Date.now()
  return cachedVatRate
}

export function calculateVAT(amount: Decimal | number | string, rate: Decimal): Decimal {
  return new Decimal(amount).times(rate).toDecimalPlaces(2)
}

export function calculateVATInclusive(
  amountWithVAT: Decimal | number | string,
  rate: Decimal
): { net: Decimal; vat: Decimal } {
  const gross = new Decimal(amountWithVAT)
  const net = gross.dividedBy(rate.plus(1)).toDecimalPlaces(2)
  return { net, vat: gross.minus(net).toDecimalPlaces(2) }
}

export function formatVATRate(rate: Decimal): string {
  return `${rate.times(100).toDecimalPlaces(2).toString()}%`
}
