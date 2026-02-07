/**
 * @file use-permissions.ts
 * @description Preload user permissions, local checks with wildcard support
 * @module hooks
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

'use client'

import { useState, useEffect } from 'react'
import { matchesPermission } from '@/lib/auth/matches-permission'

/**
 * Preloads all user permissions on mount via GET /api/user/permissions.
 * All permission checks are local lookups (no API call per check).
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/permissions')
      .then((res) => res.json())
      .then((data) => {
        setPermissions(Array.isArray(data.permissions) ? data.permissions : [])
      })
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false))
  }, [])

  const hasPermission = (required?: string): boolean => {
    if (!required) return true
    if (loading) return true
    if (permissions.length === 0) return true
    return permissions.some((p) => matchesPermission(p, required))
  }

  return { permissions, loading, hasPermission }
}
