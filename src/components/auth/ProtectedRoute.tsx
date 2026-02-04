/**
 * @file ProtectedRoute.tsx
 * @description Protected route component for permission-based access control
 * @module components/auth
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Permission } from '@/lib/auth/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ProtectedRouteProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ permission, children, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPermission()
  }, [permission])

  const checkPermission = async () => {
    try {
      const response = await fetch('/api/user/permissions')
      if (!response.ok) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      const data = await response.json()
      const permissions = data.permissions || []
      setHasAccess(permissions.includes(permission))
    } catch (error) {
      console.error('Error checking permission:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          You don&apos;t have permission to access this page. The required permission is: <code className="bg-muted px-2 py-1 rounded">{permission}</code>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button asChild>
            <Link href="/admin/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
