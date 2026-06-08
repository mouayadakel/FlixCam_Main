/**
 * GA4-compatible ecommerce payloads for Google Tag Manager (dataLayer).
 * @see docs/analytics/flixcam-ecommerce-data-layer.json
 */

import type { CartItem } from '@/lib/stores/cart.store'
import { hasMarketingMeasurementConsent } from '@/lib/analytics/consent-storage'

export const SITE_ECOMMERCE_CURRENCY = 'SAR'

export interface Ga4EcommerceItem {
  item_id?: string
  item_name?: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  price?: number
  quantity?: number
  index?: number
  currency?: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

function ensureDataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null
  if (!hasMarketingMeasurementConsent()) return null
  window.dataLayer = window.dataLayer || []
  return window.dataLayer
}

/** Low-level push; use sparingly outside this module */
export function pushRawDataLayer(payload: Record<string, unknown>): void {
  const dl = ensureDataLayer()
  if (!dl) return
  dl.push(payload)
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Clear previous ecommerce merge state, then emit a GA4-style ecommerce hit.
 */
export function pushGa4EcommerceEvent(
  eventName: string,
  ecommercePayload: Record<string, unknown>,
  extras?: Record<string, unknown>
): void {
  const dl = ensureDataLayer()
  if (!dl) return
  dl.push({ ecommerce: null })
  dl.push({
    event: eventName,
    ecommerce: ecommercePayload,
    ...(extras || {}),
  })
}

/** Non‑ecommerce GA4 recommendation (e.g. generate_lead) */
export function pushGa4Event(eventName: string, params?: Record<string, unknown>): void {
  const dl = ensureDataLayer()
  if (!dl) return
  dl.push({
    event: eventName,
    ...(params || {}),
  })
}

export function cartLineToGa4Item(item: CartItem, index: number): Ga4EcommerceItem {
  const itemId =
    [item.equipmentId, item.studioId, item.kitId, item.packageId].find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    ) || item.id

  const itemName =
    [item.equipmentName, item.studioName, item.kitName].find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    ) || item.itemType

  let category = item.categoryName ?? item.itemType
  if (item.itemType === 'STUDIO') category = item.categoryName || 'Studio'

  const unitPrice =
    item.quantity > 0 ? item.subtotal / item.quantity : (item.dailyRate ?? item.subtotal ?? 0)

  return {
    item_id: itemId,
    item_name: itemName,
    item_category: category,
    price: roundMoney(Number(unitPrice) || 0),
    quantity: Math.max(1, item.quantity),
    index,
    currency: SITE_ECOMMERCE_CURRENCY,
  }
}

export function cartLinesToGa4Items(lines: CartItem[]): Ga4EcommerceItem[] {
  return lines.map((line, i) => cartLineToGa4Item(line, i))
}

export function sumGa4ItemsValue(items: Ga4EcommerceItem[]): number {
  return items.reduce((sum, row) => {
    const qty = Math.max(1, row.quantity ?? 1)
    return sum + (row.price ?? 0) * qty
  }, 0)
}

export function pushViewCart(cartLines: CartItem[], valueExVat: number): void {
  const items = cartLinesToGa4Items(cartLines)
  pushGa4EcommerceEvent('view_cart', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(valueExVat),
    items,
  })
}

export function pushBeginCheckout(
  cartLines: CartItem[],
  valueExVat: number,
  coupon?: string | null
): void {
  const items = cartLinesToGa4Items(cartLines)
  pushGa4EcommerceEvent('begin_checkout', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(valueExVat),
    coupon: coupon ?? undefined,
    items,
  })
}

export function pushAddShippingInfo(params: {
  cartLines: CartItem[]
  valueExVat: number
  shippingTier?: string | null
}): void {
  const items = cartLinesToGa4Items(params.cartLines)
  pushGa4EcommerceEvent('add_shipping_info', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(params.valueExVat),
    shipping_tier: params.shippingTier ?? undefined,
    items,
  })
}

export function pushAddPaymentInfo(params: {
  cartLines: CartItem[]
  valueExVat: number
  paymentType: string
  coupon?: string | null
}): void {
  const items = cartLinesToGa4Items(params.cartLines)
  pushGa4EcommerceEvent('add_payment_info', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(params.valueExVat),
    payment_type: params.paymentType,
    coupon: params.coupon ?? undefined,
    items,
  })
}

export function pushAddToCart(lines: CartItem[], valueFallback?: number): void {
  const items = cartLinesToGa4Items(lines)
  const value = valueFallback ?? sumGa4ItemsValue(items)
  pushGa4EcommerceEvent('add_to_cart', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(value),
    items,
  })
}

export function pushRemoveFromCart(lines: CartItem[]): void {
  const items = cartLinesToGa4Items(lines)
  pushGa4EcommerceEvent('remove_from_cart', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(sumGa4ItemsValue(items)),
    items,
  })
}

export function pushViewItem(item: Ga4EcommerceItem, value?: number): void {
  const price = item.price ?? value ?? 0
  pushGa4EcommerceEvent('view_item', {
    currency: SITE_ECOMMERCE_CURRENCY,
    value: roundMoney(price * Math.max(1, item.quantity ?? 1)),
    items: [{ ...item, currency: SITE_ECOMMERCE_CURRENCY }],
  })
}

export interface BookingConfirmationAnalyticsShape {
  id: string
  bookingNumber: string
  totalAmount: number
  vatAmount?: number | null
  couponCode?: string | null
  paymentSummary?: { grandTotalSar: number; vatSar: number } | null
  equipment?: Array<{
    quantity: number
    equipment?: {
      id: string
      name?: string | null
      model?: string | null
      sku?: string | null
      category?: { name?: string | null } | null
      brand?: { name?: string | null } | null
      dailyPrice?: unknown | null
    } | null
  }> | null
  studio?: { id: string; name?: string | null } | null
}

function equipmentDisplayName(eq: NonNullable<BookingConfirmationAnalyticsShape['equipment']>[number]): string {
  const e = eq?.equipment
  if (!e) return 'equipment'
  return [e.model, e.sku, e.name].find((x) => typeof x === 'string' && x.trim().length > 0) || 'equipment'
}

/** Build GA4 purchase from booking REST payload (+ optional payment breakdown). */
export function pushPurchaseFromBooking(booking: BookingConfirmationAnalyticsShape): void {
  const transactionId = booking.bookingNumber || booking.id
  const grandTotal =
    booking.paymentSummary?.grandTotalSar ??
    roundMoney(Number(booking.totalAmount ?? 0) + Number(booking.vatAmount ?? 0))
  const tax = booking.paymentSummary?.vatSar ?? Number(booking.vatAmount ?? 0)

  const rows: Ga4EcommerceItem[] = []

  booking.equipment?.forEach((row) => {
    if (!row?.equipment?.id) return
    const name = equipmentDisplayName(row)
    rows.push({
      item_id: row.equipment.id,
      item_name: name,
      item_brand: row.equipment.brand?.name ?? undefined,
      item_category: row.equipment.category?.name ?? 'Equipment',
      quantity: Math.max(1, row.quantity),
      index: rows.length,
      currency: SITE_ECOMMERCE_CURRENCY,
      price:
        typeof row.equipment.dailyPrice === 'number' || typeof row.equipment.dailyPrice === 'string'
          ? roundMoney(Number(row.equipment.dailyPrice))
          : undefined,
    })
  })

  if (booking.studio?.id) {
    rows.unshift({
      item_id: booking.studio.id,
      item_name: booking.studio.name || 'studio',
      item_category: 'Studio',
      quantity: 1,
      index: 0,
      currency: SITE_ECOMMERCE_CURRENCY,
    })
    rows.forEach((r, i) => {
      r.index = i
    })
  }

  const n = rows.length || 1
  const share = grandTotal / n
  rows.forEach((r) => {
    if (r.price == null || r.price === 0) {
      r.price = roundMoney(share / Math.max(1, r.quantity ?? 1))
    }
  })

  pushGa4EcommerceEvent('purchase', {
    transaction_id: transactionId,
    currency: SITE_ECOMMERCE_CURRENCY,
    tax: roundMoney(Number(tax) || 0),
    coupon: booking.couponCode ?? undefined,
    shipping: 0,
    value: roundMoney(Number(grandTotal) || 0),
    items: rows.length ? rows : [{ item_id: transactionId, item_name: 'booking', quantity: 1, price: grandTotal, currency: SITE_ECOMMERCE_CURRENCY }],
  })
}
