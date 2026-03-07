/**
 * Cart session cookie for guest users (Phase 3.1).
 */

export const CART_SESSION_COOKIE = 'cart_session_id'

export function getCartSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|; )${CART_SESSION_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setCartSessionCookie(sessionId: string): string {
  const maxAge = 24 * 60 * 60 * 7 // 7 days
  return `${CART_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`
}
