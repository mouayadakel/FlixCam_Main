'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

interface PersonalizationContextType {
  campaign?: string | null
  source?: string | null
  medium?: string | null
  content?: string | null
  isPersonalized: boolean
  sessionId?: string | null
}

const PersonalizationContext = createContext<PersonalizationContextType>({
  isPersonalized: false,
  sessionId: null
})

export const usePersonalization = () => useContext(PersonalizationContext)

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const [config, setConfig] = useState<PersonalizationContextType>({
    isPersonalized: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // ── Referral Click Capture (Fix 1) ──
    const refCode = searchParams.get('ref')
    if (refCode) {
      let sessionId = sessionStorage.getItem('flix_session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('flix_session_id', sessionId)
      }
      // Only track once per session per code
      const tracked = sessionStorage.getItem(`flix_ref_tracked_${refCode}`)
      if (!tracked) {
        fetch('/api/admin/marketing/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refCode, sessionId, url: window.location.href })
        }).catch(() => {})
        sessionStorage.setItem(`flix_ref_tracked_${refCode}`, '1')
      }
    }

    // ── UTM Personalization ──
    const utm_campaign = searchParams.get('utm_campaign')
    const utm_source = searchParams.get('utm_source')
    const utm_medium = searchParams.get('utm_medium')
    const utm_content = searchParams.get('utm_content')

    if (utm_campaign || utm_source || utm_medium || utm_content) {
      const newConfig = {
        campaign: utm_campaign,
        source: utm_source,
        medium: utm_medium,
        content: utm_content,
        isPersonalized: true
      }
      setConfig(newConfig)
      sessionStorage.setItem('flix_personalization', JSON.stringify(newConfig))
    }

    const sId = typeof window !== 'undefined' ? sessionStorage.getItem('flix_session_id') : null
    if (sId) {
      setConfig(prev => ({ ...prev, sessionId: sId }))
    }
  }, [searchParams])

  return (
    <PersonalizationContext.Provider value={config}>
      {children}
    </PersonalizationContext.Provider>
  )
}
