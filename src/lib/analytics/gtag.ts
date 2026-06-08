export function getGaMeasurementId(): string {
  if (typeof window === 'undefined') return ''
  return (window as unknown as { __GA_ID__?: string }).__GA_ID__ || ''
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __GA_ID__?: string
  }
}

export function gtagEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
  extra?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
      ...extra,
    })
  }
}

export function gtagPageView(url: string, measurementId: string): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function' && measurementId) {
    window.gtag('config', measurementId, { page_path: url })
  }
}
