/**
 * @file fetch-page-text.ts
 * @description Fetch a URL and extract readable text from HTML for AI processing.
 * @module lib/utils
 */

const FETCH_TIMEOUT_MS = 15_000
const MAX_TEXT_LENGTH = 22_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; FlixCamBot/1.0; +https://flixcam.rent)'

/**
 * Strip HTML to plain text: remove script/style, replace block tags with newline, collapse spaces.
 */
function htmlToText(html: string): string {
  let s = html
  // Remove script and style and their content
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  // Block elements -> newline
  const block =
    /<\/?(?:div|p|br|tr|li|h[1-6]|table|thead|tbody|section|article|main|header|footer|nav|aside)[^>]*>/gi
  s = s.replace(block, '\n')
  // All other tags -> space
  s = s.replace(/<[^>]+>/g, ' ')
  // Decode common entities
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  // Collapse whitespace and trim lines
  s = s
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .trim()
  return s
}

export interface FetchPageTextResult {
  success: true
  text: string
} | {
  success: false
  error: string
}

/**
 * Fetch a URL and return extracted plain text for spec extraction.
 * Respects timeout and length limit; does not follow redirects beyond browser default.
 */
export async function fetchPageText(url: string): Promise<FetchPageTextResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { success: false, error: 'Invalid URL' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { success: false, error: 'Only http and https URLs are allowed' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { success: false, error: 'URL did not return HTML' }
    }

    const html = await res.text()
    const text = htmlToText(html)
    const truncated =
      text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) + '\n[... truncated]' : text
    return { success: true, text: truncated }
  } catch (e) {
    clearTimeout(timeoutId)
    const message = e instanceof Error ? e.message : 'Fetch failed'
    return { success: false, error: message }
  }
}
