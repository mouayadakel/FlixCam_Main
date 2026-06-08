import { Decimal } from '@prisma/client/runtime/library'

export type PaymentGatewaySlug = 'moyasar' | 'tap' | 'MOYASAR' | 'TAP'

function normalizeGateway(gateway: string): 'moyasar' | 'tap' {
  const normalized = gateway.toLowerCase()
  if (normalized === 'moyasar' || normalized === 'tap') return normalized
  throw new Error(`Unknown gateway: ${gateway}`)
}

export function toGatewayAmount(amountSar: Decimal | number | string, gateway: string): number {
  const amount = new Decimal(amountSar)
  switch (normalizeGateway(gateway)) {
    case 'moyasar':
      return amount.times(100).toDecimalPlaces(0).toNumber()
    case 'tap':
      return amount.toDecimalPlaces(2).toNumber()
  }
}

export function fromGatewayAmount(amount: number | string, gateway: string): Decimal {
  const value = new Decimal(amount)
  switch (normalizeGateway(gateway)) {
    case 'moyasar':
      return value.dividedBy(100).toDecimalPlaces(2)
    case 'tap':
      return value.toDecimalPlaces(2)
  }
}

export function toSarDecimal(value: Decimal | number | string | null | undefined): Decimal {
  if (value == null) return new Decimal(0)
  return new Decimal(value).toDecimalPlaces(2)
}
