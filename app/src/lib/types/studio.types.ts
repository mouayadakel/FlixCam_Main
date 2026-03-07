/**
 * Shared types for studio public page
 */

export interface StudioMedia {
  id: string
  url: string
  type: string
  sortOrder: number | null
}

export interface StudioPackage {
  id: string
  name: string
  nameAr: string | null
  nameZh: string | null
  description: string | null
  descriptionAr: string | null
  includes: string | null
  price: number
  originalPrice: number | null
  discountPercent: number | null
  hours: number | null
  recommended: boolean
  badgeText: string | null
  order: number
}

export interface StudioFaq {
  id: string
  questionAr: string
  questionEn: string | null
  questionZh: string | null
  answerAr: string
  answerEn: string | null
  answerZh: string | null
  order: number
}

export interface StudioTestimonial {
  id: string
  name: string
  role: string | null
  text: string
  rating: number
  avatarUrl: string | null
}

export interface StudioAddOn {
  id: string
  name: string
  description: string | null
  price: number
  originalPrice: number | null
  category: string | null
  iconName: string | null
}

export interface StudioPublicData {
  id: string
  name: string
  slug: string
  description: string | null
  capacity: number | null
  hourlyRate: number
  dailyRate: number | null
  setupBuffer: number
  cleaningBuffer: number
  slotDurationMinutes: number
  minHours: number
  vatIncluded: boolean
  bookingDisclaimer: string | null
  areaSqm: number | null
  studioType: string | null
  bestUse: string | null
  availabilityConfidence: string | null
  videoUrl: string | null
  galleryDisclaimer: string | null
  address: string | null
  googleMapsUrl: string | null
  arrivalTimeFromCenter: string | null
  parkingNotes: string | null
  whatsIncluded: string | null
  notIncluded: string | null
  hasElectricity: boolean
  hasAC: boolean
  hasChangingRooms: boolean
  hasWifi: boolean
  rulesText: string | null
  smokingPolicy: string | null
  foodPolicy: string | null
  equipmentCarePolicy: string | null
  cancellationPolicyShort: string | null
  cancellationPolicyLink: string | null
  heroTagline: string | null
  reviewsText: string | null
  whatsappNumber: string | null
  bookingCountDisplay: number | null
  discountPercent: number | null
  discountMessage: string | null
  discountActive: boolean
  media: StudioMedia[]
  packages: StudioPackage[]
  faqs: StudioFaq[]
  addOns: StudioAddOn[]
  testimonials: StudioTestimonial[]
}
