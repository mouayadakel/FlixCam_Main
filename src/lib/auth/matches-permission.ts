/**
 * @file matches-permission.ts
 * @description Pure wildcard matching for permissions - safe for client bundle (no prisma/cache)
 * @module lib/auth
 */

/**
 * Check if a granted permission matches a required permission (with wildcard support)
 */
export function matchesPermission(granted: string, required: string): boolean {
  if (granted === '*') return true
  if (granted === required) return true
  const parts = granted.split('.')
  const [gResource, gAction] = parts
  const [rResource] = required.split('.')
  if (gResource === rResource && gAction === '*') return true
  return false
}
