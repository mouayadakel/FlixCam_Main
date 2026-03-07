/**
 * Helpers for image URLs. Use unoptimized for external URLs so Next.js
 * image optimizer doesn't proxy them (avoids 404/MIME issues when upstream fails).
 */

export function isExternalImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host !== 'localhost' && !host.endsWith('.vercel.app') && host !== '127.0.0.1'
  } catch {
    return true
  }
}
