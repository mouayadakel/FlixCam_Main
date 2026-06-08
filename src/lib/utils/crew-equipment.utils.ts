/**
 * Crew catalog helpers: booking mode, profiles, and detection.
 */

export const QUOTE_ONLY_CREW_SKUS = ['CREW-DOP', 'CREW-CAM-OP'] as const

export type CrewBookingMode = 'cart' | 'quote'

export type CrewProfile = {
  nameEn?: string
  nameAr?: string
  bioEn?: string
  bioAr?: string
  experienceYears?: number
  specialties?: string[]
  photoUrl?: string
}

export type CrewEquipmentCustomFields = {
  itemType?: 'crew' | 'equipment'
  bookingMode?: CrewBookingMode
  crewProfile?: CrewProfile
  relatedEquipmentIds?: string[]
  subCategoryId?: string
  nameAr?: string
}

export function parseCrewCustomFields(
  customFields: unknown
): CrewEquipmentCustomFields | null {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return null
  }
  return customFields as CrewEquipmentCustomFields
}

export function isCrewEquipment(
  customFields: unknown,
  categorySlug?: string | null
): boolean {
  const cf = parseCrewCustomFields(customFields)
  return cf?.itemType === 'crew' || categorySlug === 'crew'
}

export function resolveCrewBookingMode(
  customFields: unknown,
  sku?: string | null
): CrewBookingMode {
  if (sku && (QUOTE_ONLY_CREW_SKUS as readonly string[]).includes(sku)) {
    return 'quote'
  }
  const cf = parseCrewCustomFields(customFields)
  if (cf?.bookingMode === 'quote' || cf?.bookingMode === 'cart') {
    return cf.bookingMode
  }
  return 'cart'
}

export function isQuoteOnlyCrew(
  customFields: unknown,
  sku?: string | null,
  categorySlug?: string | null
): boolean {
  if (!isCrewEquipment(customFields, categorySlug)) return false
  return resolveCrewBookingMode(customFields, sku) === 'quote'
}

export function getCrewProfile(customFields: unknown): CrewProfile | null {
  const cf = parseCrewCustomFields(customFields)
  const profile = cf?.crewProfile
  if (!profile || typeof profile !== 'object') return null
  return profile
}

export function getLocalizedCrewProfile(
  customFields: unknown,
  locale: string
): { name: string; bio: string; experienceYears?: number; specialties: string[]; photoUrl?: string } | null {
  const profile = getCrewProfile(customFields)
  if (!profile) return null
  const useAr = locale === 'ar'
  const name = (useAr ? profile.nameAr : profile.nameEn) || profile.nameEn || profile.nameAr || ''
  const bio = (useAr ? profile.bioAr : profile.bioEn) || profile.bioEn || profile.bioAr || ''
  if (!name && !bio) return null
  return {
    name,
    bio,
    experienceYears: profile.experienceYears,
    specialties: profile.specialties ?? [],
    photoUrl: profile.photoUrl,
  }
}
