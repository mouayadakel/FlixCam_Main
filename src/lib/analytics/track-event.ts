'use client'

import type { Ga4EcommerceItem } from '@/lib/analytics/ecommerce-data-layer'
import {
  pushGa4EcommerceEvent,
  pushGa4Event,
  pushViewItem,
  SITE_ECOMMERCE_CURRENCY,
  sumGa4ItemsValue,
} from '@/lib/analytics/ecommerce-data-layer'

export type MarketingPixelEventType =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'RemoveFromCart'
  | 'Purchase'
  | 'Lead'
  | 'Search'
  | 'SHARE'

export interface TrackingPayload {
  eventType: MarketingPixelEventType
  pageUrl?: string
  entityType?: 'Equipment' | 'Studio' | 'Blog' | 'Order'
  entityId?: string
  value?: number
  currency?: string
  source?: string
  itemName?: string
  itemBrand?: string
  itemCategory?: string
  itemCategory2?: string
  price?: number
  quantity?: number
  coupon?: string | null
  transactionId?: string
  tax?: number
  shipping?: number
  paymentType?: string
  searchTerm?: string
  /** GA4 line items when known */
  items?: Ga4EcommerceItem[]
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function trackMarketingEvent(payload: TrackingPayload): void {
  try {
    if (typeof window === 'undefined') return

    const currency = payload.currency || SITE_ECOMMERCE_CURRENCY

    const urlParams = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const val = urlParams.get(key)
      if (val) utm[key] = val
    })

    const ua = window.navigator.userAgent
    let device = 'Desktop'
    if (/tablet|ipad|playbook|silk/i.test(ua)) device = 'Tablet'
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua))
      device = 'Mobile'

    let browser = 'Other'
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edge')) browser = 'Edge'

    const metadata = {
      ...utm,
      device,
      browser,
      userAgent: ua.slice(0, 255),
    }

    const sessionId =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('flix_session_id') : undefined

    void fetch('/api/public/marketing-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        pageUrl: payload.pageUrl || window.location.href,
        currency,
        sessionId,
        metadata,
      }),
    }).catch(() => {})

    const wc = window as Window & {
      fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void
      gtag?: (...args: unknown[]) => void
    }

    /** GTM reads `window.dataLayer` — primary ecommerce channel */
    if (payload.eventType === 'ViewContent') {
      const qty = payload.quantity ?? 1
      if (payload.items?.length) {
        pushGa4EcommerceEvent('view_item', {
          currency,
          value: roundMoney(payload.value ?? sumGa4ItemsValue(payload.items)),
          items: payload.items,
        })
      } else if (payload.entityId) {
        pushViewItem(
          {
            item_id: payload.entityId,
            item_name: payload.itemName,
            item_brand: payload.itemBrand,
            item_category: payload.itemCategory ?? payload.entityType,
            item_category2: payload.itemCategory2,
            price: payload.price ?? payload.value,
            quantity: qty,
          },
          payload.value
        )
      }
    } else if (payload.eventType === 'AddToCart') {
      if (payload.items?.length) {
        pushGa4EcommerceEvent('add_to_cart', {
          currency,
          value: roundMoney(payload.value ?? sumGa4ItemsValue(payload.items)),
          items: payload.items,
        })
      } else if (payload.entityId) {
        pushGa4EcommerceEvent('add_to_cart', {
          currency,
          value: roundMoney(payload.value ?? 0),
          items: [
            {
              item_id: payload.entityId,
              quantity: Math.max(1, payload.quantity ?? 1),
              price: roundMoney((payload.value ?? 0) / Math.max(1, payload.quantity ?? 1)),
              item_name: payload.itemName,
              currency,
            },
          ],
        })
      }
    } else if (payload.eventType === 'RemoveFromCart' && payload.items?.length) {
      pushGa4EcommerceEvent('remove_from_cart', {
        currency,
        value: roundMoney(sumGa4ItemsValue(payload.items)),
        items: payload.items,
      })
    } else if (payload.eventType === 'Lead') {
      pushGa4Event('generate_lead', {
        currency,
        value: payload.value,
        ...(payload.entityId ? { engagement_type: payload.entityType } : {}),
      })
    } else if (payload.eventType === 'Search' && payload.searchTerm) {
      pushGa4Event('search', { search_term: payload.searchTerm })
    }

    if (wc.fbq) {
      const skipFbq =
        payload.eventType === 'RemoveFromCart' ||
        payload.eventType === 'Search' ||
        payload.eventType === 'SHARE'
      if (!skipFbq && payload.value !== undefined) {
        wc.fbq('track', payload.eventType, { value: payload.value, currency })
      } else if (!skipFbq) {
        wc.fbq('track', payload.eventType)
      }
    }

    if (wc.gtag && payload.eventType !== 'RemoveFromCart') {
      if (payload.eventType === 'Purchase') {
        wc.gtag('event', 'purchase', {
          transaction_id: payload.transactionId ?? payload.entityId,
          value: payload.value,
          currency,
          tax: payload.tax,
          shipping: payload.shipping,
          items: payload.items,
        })
      } else if (payload.eventType === 'AddToCart') {
        wc.gtag('event', 'add_to_cart', {
          currency,
          value: payload.value,
          items:
            payload.items ?? (payload.entityId ? [{ item_id: payload.entityId }] : []),
        })
      } else if (payload.eventType === 'ViewContent') {
        wc.gtag('event', 'view_item', {
          currency,
          items:
            payload.items ??
            (payload.entityId ? [{ item_id: payload.entityId, item_name: payload.itemName }] : []),
        })
      }
    }
  } catch {
    // non-blocking
  }
}
