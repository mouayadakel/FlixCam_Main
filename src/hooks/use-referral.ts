'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export function useReferral() {
  const { data: session } = useSession()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user/referral')
        .then(res => res.json())
        .then(data => {
          if (data.code) {
            setReferralCode(data.code)
          }
        })
        .catch(console.error)
    }
  }, [session?.user?.id])

  const getReferralUrl = (baseUrl: string) => {
    if (!referralCode) return baseUrl
    const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : undefined)
    url.searchParams.set('ref', referralCode)
    return url.toString()
  }

  return {
    referralCode,
    getReferralUrl
  }
}
