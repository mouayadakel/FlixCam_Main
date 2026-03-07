/**
 * Blog preview URL utilities.
 */

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

/**
 * Generate preview URL for a draft/scheduled post.
 * Requires BLOG_PREVIEW_TOKEN to be set in env.
 */
export function getBlogPreviewUrl(slug: string): string | null {
  const token = process.env.BLOG_PREVIEW_TOKEN
  if (!token) return null
  return `${BASE_URL}/blog/${slug}?preview=true&token=${encodeURIComponent(token)}`
}
