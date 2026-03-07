/**
 * Backfill system types — gap reports, job status, quality, photo pipeline, spec inference, alerts.
 * Single source of truth for AI backfill domain types.
 */

// ─── Gap & content health ───────────────────────────────────────────────────

export type GapType = 'description' | 'seo' | 'photos' | 'translations' | 'specs'

export interface ContentGapReport {
  scannedAt: Date
  totalProducts: number
  totalEquipment: number
  byGapType: {
    missingTranslations: number
    missingSeo: number
    missingDescription: number
    missingPhotos: number
    missingSpecs: number
  }
  catalogQualityScore: number
  products: ProductGapSummary[]
}

export interface ProductGapSummary {
  id: string
  name: string
  sku: string
  contentScore: number
  gaps: GapType[]
  imageCount: number
  lastAiRunAt: Date | null
}

// ─── Backfill job & options ──────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface BackfillOptions {
  types: Array<'text' | 'photo' | 'spec'>
  forceReprocess?: boolean
  productIds?: string[]
  minQualityScore?: number
  maxProducts?: number
  dryRun?: boolean
  trigger: 'manual' | 'scheduled' | 'event' | 'import'
  triggeredBy?: string
  /** When true, backfill creates AiContentDraft instead of writing to Product (preview workflow) */
  previewMode?: boolean
}

export interface BackfillJobStatus {
  jobId: string
  status: JobStatus
  progress: number
  processed: number
  total: number
  succeeded: number
  failed: number
  costUsd: number
  eta: number | null
  startedAt: string | null
  completedAt: string | null
}

// ─── Quality breakdown & AI flags ───────────────────────────────────────────

export interface QualityBreakdown {
  photos: number
  descriptions: number
  seo: number
  specs: number
  shortDesc: number
  total: number
}

export interface AIContentFlags {
  fields: string[]
  lastRun: string
  provider: string
  costs: Record<string, number>
  confidence?: Record<string, number>
}

// ─── Photo pipeline ─────────────────────────────────────────────────────────

export type ImageSourceType =
  | 'google_search'
  | 'bhphoto'
  | 'manufacturer'
  | 'pexels'
  | 'dalle'
  | 'manual'
  | 'UPLOAD'
  | 'BRAND_ASSET'
  | 'AI_GENERATED'
  | 'STOCK_PHOTO'
  | 'WEB_SCRAPED'

export interface SourcedImage {
  url: string
  source: ImageSourceType
  relevanceScore?: number
  qualityScore?: number
  width?: number
  height?: number
  approved: boolean
  pendingReview: boolean
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  hash?: string
  attribution?: string
}

export interface PhotoResult {
  status: 'sufficient' | 'filled' | 'partial' | 'failed'
  count?: number
  added?: number
  sources?: ImageSourceType[]
  error?: string
}

// ─── Spec inference ──────────────────────────────────────────────────────────

export interface SpecField {
  value: string
  unit?: string
  confidence: number
  reasoning?: string
}

export interface InferredSpec {
  key: string
  value: string
  confidence: number
  source: 'description' | 'category_norm' | 'brand_known' | 'ai_inference'
  autoSaved: boolean
}

export interface SpecInferenceResult {
  inferred: Record<string, SpecField>
  saved: number
  suggested: number
  discarded: number
  error?: string
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export interface BackfillAlert {
  type:
    | 'quality_drop'
    | 'job_failed'
    | 'budget_exceeded'
    | 'job_completed'
    | 'photos_needed'
    | 'needs_review_digest'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  data?: Record<string, unknown>
  channels: Array<'in_app' | 'email'>
}

// ─── Text backfill & validation ─────────────────────────────────────────────

export interface TextBackfillInput {
  productId: string
  name: string
  nameEn: string
  category: string
  brand?: string
  dailyRate?: number
  specs?: Record<string, string>
  existingAr?: string
  strictMode?: boolean
}

export interface ValidationResult {
  valid: boolean
  issues: string[]
  score: number
  warnings?: string[]
  autoFixable?: boolean
  fixedText?: string
}

export interface GeneratedContent {
  shortDescription?: string
  longDescription?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string | string[]
}

export interface BatchResult {
  succeeded: number
  failed: number
  costUsd: number
  duration: number
  errors?: Array<{ productId: string; error: string }>
}
