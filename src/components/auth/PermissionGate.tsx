/**
 * @file PermissionGate.tsx
 * @description Permission gate component for feature-level access control
 * @module components/auth
 */

'use client'

import { useEffect, useState } from 'react'
import { Permission } from '@/lib/auth/permissions'

interface PermissionGateProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null,
  showFallback = false 
}: PermissionGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    checkPermission()
  }, [permission])

  const checkPermission = async () => {
    try {
      const response = await fetch('/api/user/permissions')
      if (!response.ok) {
        setHasAccess(false)
        return
      }

      const data = await response.json()
      const permissions = data.permissions || []
      setHasAccess(permissions.includes(permission))
    } catch (error) {
      console.error('Error checking permission:', error)
      setHasAccess(false)
    }
  }

  // While loading, show nothing or fallback based on showFallback
  if (hasAccess === null) {
    return showFallback ? <>{fallback}</> : null
  }

  // If no access, show fallback or nothing
  if (!hasAccess) {
    return <>{fallback}</>
  }

  // Has access, show children
  return <>{children}</>
}
