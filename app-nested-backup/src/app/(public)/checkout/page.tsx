/**
 * Checkout page – redirects to cart with expandCheckout=1 (checkout steps now live on cart page).
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'

export default function CheckoutPage() {
  const { t } = useLocale()
  const router = useRouter()

  useEffect(() => {
    router.replace('/cart?expandCheckout=1')
  }, [router])

  return (
    <main className="container mx-auto px-4 py-12">
      <p className="text-muted-foreground">{t('common.loading')}</p>
    </main>
  )
}
