export const TECHNICIAN_HOURLY_RATE_SAR = 150
export const INSURANCE_PERCENT = 5

export type PersistedCheckoutAddons = {
  technician?: boolean
  technicianHours?: number
  insuranceTier?: 'full' | string
  accessories?: Array<{ id: string; name: string; price: number; quantity: number }>
  deliveryFee?: number
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function clampMoney(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

export function normalizePersistedAddons(raw: unknown): PersistedCheckoutAddons {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>

  const technician = r.technician === true
  const technicianHours = technician ? clampInt(r.technicianHours, 1, 8) : undefined

  const insuranceTier = typeof r.insuranceTier === 'string' ? r.insuranceTier : undefined
  const deliveryFee = clampMoney(r.deliveryFee)

  const accessoriesRaw = Array.isArray(r.accessories) ? r.accessories : []
  const accessories = accessoriesRaw
    .map((a) => (a && typeof a === 'object' ? (a as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((a) => ({
      id: String(a!.id ?? ''),
      name: String(a!.name ?? ''),
      price: clampMoney(a!.price),
      quantity: clampInt(a!.quantity, 1, 99),
    }))
    .filter((a) => a.id && a.quantity > 0 && a.price >= 0)

  return {
    technician,
    technicianHours,
    insuranceTier,
    accessories: accessories.length ? accessories : undefined,
    deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
  }
}

export function computeAddonsTotals(
  addonsRaw: unknown,
  baseSubtotalSar: number
): {
  technicianFeeSar: number
  accessoriesFeeSar: number
  deliveryFeeSar: number
  insuranceFeeSar: number
  addonsSubtotalSar: number
} {
  const addons = normalizePersistedAddons(addonsRaw)

  const technicianFeeSar =
    addons.technician === true
      ? TECHNICIAN_HOURLY_RATE_SAR * clampInt(addons.technicianHours, 1, 8)
      : 0

  const accessoriesFeeSar = (addons.accessories ?? []).reduce(
    (sum, a) => sum + clampMoney(a.price) * clampInt(a.quantity, 1, 99),
    0
  )

  const deliveryFeeSar = clampMoney(addons.deliveryFee)

  const insuranceFeeSar =
    addons.insuranceTier != null
      ? Math.round(Math.max(0, baseSubtotalSar) * (INSURANCE_PERCENT / 100) * 100) / 100
      : 0

  const addonsSubtotalSar =
    Math.round((technicianFeeSar + accessoriesFeeSar + deliveryFeeSar + insuranceFeeSar) * 100) /
    100

  return {
    technicianFeeSar,
    accessoriesFeeSar,
    deliveryFeeSar,
    insuranceFeeSar,
    addonsSubtotalSar,
  }
}

