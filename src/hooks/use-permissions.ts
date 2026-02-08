/**
 * @file use-permissions.ts
 * @description Preload user permissions, local checks with wildcard support
 * @module hooks
 * @see RBAC_IMPLEMENTATION_PLAN.md
 *
 * SECURITY: Fail-closed - when API fails or returns empty, hasPermission returns false.
 * Super admin (has '*' permission) bypasses all checks.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { matchesPermission } from '@/lib/auth/matches-permission'

/**
 * Preloads all user permissions on mount via GET /api/user/permissions.
 * All permission checks are local lookups (no API call per check).
 * Fail-closed: empty/failed API = no access (unless isSuperAdmin).
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function loadPermissions() {
      try {
        const response = await fetch('/api/user/permissions')
        if (!response.ok) throw new Error('Failed to load permissions')

        const data = await response.json()
        const perms = Array.isArray(data.permissions) ? data.permissions : []
        setPermissions(perms)
        setIsSuperAdmin(Boolean(data.isSuperAdmin ?? perms.includes('*')))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load permissions'))
        setPermissions([])
        setIsSuperAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    loadPermissions()
  }, [])

  const hasPermission = useCallback(
    (required?: string): boolean => {
      if (!required) return true
      if (loading) return false
      if (error) return false
      if (isSuperAdmin) return true
      if (permissions.length === 0) return false
      return permissions.some((p) => matchesPermission(p, required))
    },
    [permissions, loading, error, isSuperAdmin]
  )

  return { permissions, loading, error, hasPermission, isSuperAdmin }
}
