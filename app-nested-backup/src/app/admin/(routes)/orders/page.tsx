/**
 * Orders concept removed (Option A). Redirect to Bookings.
 * @see docs/WEBSITE_AND_CONTROL_PANEL_DEEP_DIVE.md
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrdersRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/bookings')
  }, [router])
  return null
}
