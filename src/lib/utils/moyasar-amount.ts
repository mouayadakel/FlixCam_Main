/**
 * @file moyasar-amount.ts
 * @description SAR ↔ Moyasar API `amount` (integer halalah / halala).
 * @see https://docs.moyasar.com — for SAR, `amount` is in **halalahs** (smallest unit), not riyal major units.
 *
 * **Common mistake:** sending `15` meaning “15 SAR”. Moyasar treats `15` as **15 halalahs** ≈ 0.15 SAR.
 * Always use {@link sarToMoyasarHalalah} so `15 SAR` → `1500`.
 */

/**
 * Converts a total in **SAR (major units)** to Moyasar’s `amount` in **halalahs**.
 *
 * Moyasar expects amount in halalahs (smallest unit). 1 SAR = 100 halalahs — `Math.trunc(amountSar * 100)`.
 */
export function sarToMoyasarHalalah(amountSar: number): number {
  if (!Number.isFinite(amountSar) || amountSar < 0) {
    return 0
  }
  return Math.trunc(amountSar * 100)
}

/**
 * Coerces an unknown amount into integer halalah for Moyasar requests.
 * Throws the requested explicit error when the upstream total is empty/zero/invalid.
 */
export function coerceMoyasarAmountHalalah(amount: unknown): number {
  const parsed =
    typeof amount === 'string' && amount.trim() !== '' ? Number.parseFloat(amount.trim()) : Number(amount)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid payment amount: ${String(amount)}`)
  }

  const normalized = Math.trunc(parsed)
  if (!normalized || normalized <= 0) {
    throw new Error(`Invalid payment amount: ${String(amount)}`)
  }

  return normalized
}

/**
 * Pre-flight: Moyasar `amount` must be a **positive integer** halalah (never a string, never riyal major units).
 * Call this immediately before any Moyasar request that sends `amount`.
 */
export function assertValidMoyasarAmountHalalah(amount: unknown, context = 'Moyasar'): void {
  const n =
    typeof amount === 'string' && /^\d+$/.test(amount.trim()) ? Number(amount) : amount
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(
      `${context}: Invalid Moyasar amount: ${String(amount)}. Must be a positive integer in halalahs.`
    )
  }
}

/**
 * Checkout / card charge: reject sub-1-SAR amounts and non-integers before calling Moyasar.
 * (1.00 SAR = 100 halalah minimum.)
 */
export function assertMoyasarCheckoutChargeHalalah(amount: unknown, context = 'Moyasar checkout'): void {
  const n =
    typeof amount === 'string' && /^\d+$/.test(amount.trim()) ? Number(amount) : amount
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 100) {
    throw new Error(
      `${context}: Charge amount must be at least 100 halalah (1.00 SAR), got: ${String(amount)}`
    )
  }
}

/**
 * Converts a Moyasar API `amount` (integer halalah) from webhooks/GET payment to SAR for app storage.
 */
export function moyasarHalalahToSar(halalah: number): number {
  if (!Number.isFinite(halalah) || halalah < 0) {
    return 0
  }
  return Math.round(halalah) / 100
}
