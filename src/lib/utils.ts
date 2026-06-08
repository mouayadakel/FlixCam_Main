import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Slugify text for URLs (lowercase alphanumeric with hyphens).
 * Matches slug regex: /^[a-z0-9-]+$/
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'untitled'
}

/**
 * LLM responses often return SEO keyword lists as JSON arrays; the equipment form stores a single comma-separated string.
 */
export function stringifySeoKeywords(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean).join(', ')
  }
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}
