/**
 * Payment page (Phase 3.5). Creates session and redirects to TAP or confirmation.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { useCartStore } from '@/lib/stores/cart.store'
import { Loader2 } from 'lucide-react'

export default function PaymentPage() {
  const { t } = useLocale()
  const router = useRouter()
  const details = useCheckoutStore((s) => s.details)
  const items = useCartStore((s) => s.items)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!details || items.length === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function run() {
      try {
        const res = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkoutDetails: {
              name: details.name,
              email: details.email,
              phone: details.phone,
            },
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Failed to create payment session')
          setLoading(false)
          return
        }
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
          return
        }
        setError('No redirect URL')
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong')
          setLoading(false)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [details, items.length])

  if (!details || items.length === 0) {
    return (
      <main className="container mx-auto max-w-lg py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">الدفع</h1>
        <p className="text-muted-foreground mb-6">
          يرجى إكمال الطلب من صفحة السلة والتحقق.
        </p>
        <Button asChild>
          <Link href="/checkout">{t('common.back')}</Link>
        </Button>
      </main>
    )
  }

  if (loading && !error) {
    return (
      <main className="container mx-auto max-w-lg py-16 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">جاري التوجيه للدفع...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-lg py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">خطأ</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href="/checkout">{t('common.back')}</Link>
        </Button>
      </main>
    )
  }

  return null
}
