/**
 * @file middleware.ts
 * @description Next.js middleware for route protection and RBAC.
 * Uses getToken (Edge-safe) instead of auth() to avoid pulling Node-only deps (winston, ioredis) into Edge.
 * @module middleware
 */

import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { enforceReadOnly } from '@/lib/middleware/read-only-edge'

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 7,
  admin: 6,
  staff: 5,
  warehouse: 4,
  driver: 3,
  technician: 3,
  client: 1,
}

/**
 * Check if user role has access to a route
 */
function hasRoleAccess(userRole: string | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false
  return requiredRoles.includes(userRole)
}

/**
 * Check if user role has minimum level
 */
function hasMinimumRole(userRole: string | undefined, minimumRole: string): boolean {
  if (!userRole) return false
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0
  return userLevel >= minimumLevel
}

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token'

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: process.env.NODE_ENV === 'production',
  })
  const session = token
    ? { user: { id: token.id, email: token.email ?? '', name: token.name ?? undefined, role: token.role } }
    : null

  // Enforce read-only mode for write operations
  if (pathname.startsWith('/api')) {
    const readOnlyResponse = await enforceReadOnly(req)
    if (readOnlyResponse) {
      return readOnlyResponse
    }
  }

  // Public routes - no authentication required (Phase 1.2: public website)
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/privacy',
    '/terms',
    '/equipment',
    '/studios',
    '/packages',
    '/build-your-kit',
    '/cart',
    '/checkout',
    '/booking',
    '/support',
    '/how-it-works',
    '/policies',
    '/payment',
  ]
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  // Home page is public
  if (pathname === '/') {
    return NextResponse.next()
  }

  // API routes - check authentication
  if (pathname.startsWith('/api')) {
    // Public API routes (Phase 3: guest cart + public catalog)
    const publicApiRoutes = ['/api/auth', '/api/health', '/api/cart', '/api/public']
    if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Protected API routes require authentication
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Admin routes - require admin roles
  if (pathname.startsWith('/admin')) {
    // Not authenticated - redirect to login
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const userRole = session.user?.role?.toLowerCase()

    // Settings routes - allow super_admin and admin
    if (pathname.startsWith('/admin/settings')) {
      if (!hasRoleAccess(userRole, ['super_admin', 'admin'])) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
    }

    // Super admin routes
    if (pathname.startsWith('/admin/super')) {
      if (!hasRoleAccess(userRole, ['super_admin'])) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
    }

    // Admin routes - require admin, staff, or super_admin
    if (!hasRoleAccess(userRole, ['super_admin', 'admin', 'staff', 'warehouse', 'driver', 'technician'])) {
      // Client users should be redirected to portal
      if (userRole === 'client') {
        return NextResponse.redirect(new URL('/portal/dashboard', req.url))
      }
      // Unauthorized - redirect to 403
      return NextResponse.redirect(new URL('/403', req.url))
    }
  }

  // Portal routes - require authentication (any role)
  if (pathname.startsWith('/portal')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Vendor dashboard - require authentication
  if (pathname.startsWith('/vendor')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Dashboard routes - require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals.
     * Excluding _next entirely avoids middleware running on chunks/css (prevents HTML responses for assets).
     */
    '/((?!_next|favicon.ico|robots.txt|sitemap|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
