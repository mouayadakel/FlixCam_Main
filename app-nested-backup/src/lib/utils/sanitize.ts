/**
 * Shared HTML sanitization utility.
 * Server-side: uses sanitize-html (Node.js).
 * Client-side: uses DOMPurify (browser).
 */

import sanitizeHtmlLib from 'sanitize-html'

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'strong', 'em', 'u', 'br',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'span', 'div', 'blockquote', 'a', 'img',
  'pre', 'code', 'hr', 'sub', 'sup', 'mark',
]

const ALLOWED_ATTRS: Record<string, string[]> = {
  '*': ['class', 'style', 'dir', 'lang'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan', 'align'],
  th: ['colspan', 'rowspan', 'align'],
}

/**
 * Sanitize HTML content server-side using sanitize-html.
 * Safe for use in both Server Components and API routes.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''

  return sanitizeHtmlLib(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  })
}

/**
 * Sanitize contract HTML with a more restrictive allowlist.
 * Contracts should not contain links, images, or scripts.
 */
export function sanitizeContractHtml(dirty: string): string {
  if (!dirty) return ''

  return sanitizeHtmlLib(dirty, {
    allowedTags: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'strong', 'em', 'u', 'br',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'span', 'div', 'blockquote',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'align', 'dir'],
    },
    disallowedTagsMode: 'discard',
  })
}
