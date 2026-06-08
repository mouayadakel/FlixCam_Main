/**
 * @file slug.utils.ts
 * @description Centralized utilities for generating and ensuring uniqueness of slugs.
 */

import { prisma } from '@/lib/db/prisma'

/**
 * Slugify text for URLs (lowercase alphanumeric with hyphens).
 * Supports English alphanumeric characters.
 * @param text The text to slugify.
 * @returns A URL-safe slug.
 */
export function generateSlug(text: string): string {
  if (!text) return 'untitled'
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Keep alphanumeric, space, hyphen
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Collapse consecutive hyphens
    .replace(/^-|-$/g, '')        // Trim hyphens from start/end
    .slice(0, 120)                // Limit length
    .trim() || 'untitled'
}

const MAX_SLUG_ATTEMPTS = 100

/**
 * Ensures a slug is unique in the Equipment table.
 * If a collision occurs, appends a numeric suffix.
 * @param tx Prisma transaction or client.
 * @param baseSlug The initial slug to check.
 * @param excludeId Optional ID to exclude from uniqueness check (for updates).
 * @returns A unique slug.
 */
export async function ensureUniqueEquipmentSlug(
  tx: any,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug
  let attempt = 0

  while (attempt < MAX_SLUG_ATTEMPTS) {
     const where: any = { slug, deletedAt: null }
     if (excludeId) where.id = { not: excludeId }
     
     const existing = await tx.equipment.findFirst({
       where,
       select: { id: true },
     })

     if (!existing) return slug

     attempt++
     slug = `${baseSlug}-${attempt}`
  }

  // Final fallback with timestamp if 100 attempts fail
  return `${baseSlug}-${Date.now().toString(36)}`
}
