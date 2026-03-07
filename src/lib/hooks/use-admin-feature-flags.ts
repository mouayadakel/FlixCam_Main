/**
 * @file use-admin-feature-flags.ts
 * @description Hook to fetch admin feature flags and return enabled state by flag name.
 * @module lib/hooks
 */

'use client'

import { useEffect, useState } from 'react'

interface FeatureFlagFromAPI {
  id: string
  name: string
  enabled: boolean
}

export function useAdminFeatureFlags(): {
  flags: Record<string, boolean>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlags = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/feature-flags')
      if (!response.ok) throw new Error('Failed to fetch feature flags')
      const data = await response.json()
      const flagsList: FeatureFlagFromAPI[] = data.flags || []
      const map: Record<string, boolean> = {}
      flagsList.forEach((f) => {
        map[f.name] = f.enabled
      })
      setFlags(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setFlags({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  return { flags, loading, error, refetch: fetchFlags }
}
