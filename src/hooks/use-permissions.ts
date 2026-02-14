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
        const data = await response.json()

        if (!response.ok) {
          setError(new Error(data.reason === 'SERVER_ERROR' ? 'فشل تحميل الصلاحيات' : 'Failed to load permissions'))
          setPermissions([])
          setIsSuperAdmin(false)
          setLoading(false)
          return
        }

        if (data.ok === false) {
          setPermissions(Array.isArray(data.permissions) ? data.permissions : [])
          setIsSuperAdmin(Boolean(data.isSuperAdmin))
          setError(data.reason === 'SERVER_ERROR' ? new Error('فشل تحميل الصلاحيات') : null)
          setLoading(false)
          return
        }

        if (data.ok !== true) {
          setPermissions([])
          setIsSuperAdmin(false)
          setError(null)
          setLoading(false)
          return
        }

        const perms = Array.isArray(data.permissions) ? data.permissions : []
        setPermissions(perms)
        setIsSuperAdmin(Boolean(data.isSuperAdmin ?? perms.includes('*')))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('فشل تحميل الصلاحيات'))
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
