/**
 * @file ai-dashboard.utils.ts
 * @description Shared utilities for the AI Dashboard tabs — eliminates code duplication
 * @module app/admin/(routes)/ai-dashboard/_utils
 */

import type { GapType } from '@/lib/services/content-health.service'

/**
 * Labels for content gap types (used in Overview, Content Health tabs)
 * Keys cover both API formats: 'missingTranslations' (summary) and 'translations' (products)
 */
export const GAP_LABELS: Record<string, string> = {
  missingTranslations: 'ترجمات',
  missingSeo: 'SEO',
  missingDescription: 'وصف',
  missingPhotos: 'صور',
  missingSpecs: 'مواصفات',
  translations: 'ترجمات',
  seo: 'SEO',
  description: 'وصف',
  photos: 'صور',
  specs: 'مواصفات',
}

/**
 * Subset used in Content Health tab where only GapType keys are needed
 */
export const GAP_LABELS_DETAILED: Record<GapType, string> = {
  translations: 'ترجمات ناقصة',
  seo: 'SEO ناقص',
  description: 'وصف ناقص',
  photos: 'صور أقل من 4',
  specs: 'مواصفات ناقصة',
}

export const GAP_COLORS = ['#1F87E8', '#E8A31F', '#E84A1F', '#1FE87E', '#9B1FE8']

/**
 * Quality goal localStorage key
 */
export const QUALITY_TARGET_STORAGE_KEY = 'flixcam_ai_quality_target'

/**
 * Format ISO date string to Arabic relative time ("منذ 5 دقيقة")
 */
export function getRelativeTime(iso: string): string {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'منذ لحظات'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${Math.floor(hours / 24)} يوم`
}

/**
 * Quality milestone badge based on average score
 */
export function getMilestone(score: number): {
  emoji: string
  label: string
  next?: string
  nextAt?: number
} {
  if (score >= 90) return { emoji: '🥇', label: 'ممتاز' }
  if (score >= 75) return { emoji: '🥈', label: 'جيد', next: 'ممتاز', nextAt: 90 }
  if (score >= 60) return { emoji: '🥉', label: 'مبتدئ', next: 'جيد', nextAt: 75 }
  return { emoji: '📈', label: 'يحتاج تحسين', next: 'مبتدئ', nextAt: 60 }
}

/**
 * Send browser notification when an AI job completes.
 * Requests permission on first call; always safe to call (no-ops when API missing).
 */
export async function notifyJobComplete(processed: number): Promise<void> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission === 'granted') {
    new Notification('FlixCam AI', {
      body: `تم الانتهاء من ملء ${processed} منتج بنجاح ✓`,
      icon: '/favicon.ico',
    })
  }
}

/**
 * Job progress state shape (shared between Overview and Content Health tabs)
 */
export interface JobProgress {
  status: string
  progress: number
  processed: number
  total: number
  errors?: number
}

/**
 * Poll a backfill job until done/failed. Returns cleanup function.
 */
export function pollJobProgress(
  jobId: string,
  onProgress: (progress: JobProgress) => void,
  onComplete: (status: 'done' | 'failed', processed: number) => void,
  intervalMs = 2000
): () => void {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/admin/ai/backfill?jobId=${jobId}`)
      if (!res.ok) return
      const data = await res.json()
      onProgress({
        status: data.status,
        progress: data.progress ?? 0,
        processed: data.processed ?? 0,
        total: data.total ?? 0,
        errors: data.errors ?? 0,
      })
      if (data.status === 'done' || data.status === 'failed') {
        clearInterval(interval)
        onComplete(data.status as 'done' | 'failed', data.processed ?? 0)
      }
    } catch {
      /* network error — retry on next tick */
    }
  }, intervalMs)
  return () => clearInterval(interval)
}

/**
 * Analytics job type labels (Arabic)
 */
export const JOB_TYPE_LABELS: Record<string, string> = {
  backfill: 'ملء محتوى',
  FULL_BACKFILL: 'ملء محتوى',
  TEXT_BACKFILL: 'ملء نصوص',
  PHOTO_BACKFILL: 'صور',
  SPEC_BACKFILL: 'مواصفات',
  photos: 'صور',
  specs: 'مواصفات',
  chatbot: 'دردشة',
}

/**
 * Analytics job status labels (Arabic)
 */
export const JOB_STATUS_LABELS: Record<string, string> = {
  done: 'منتهية',
  COMPLETED: 'منتهية',
  failed: 'فشل',
  FAILED: 'فشل',
  running: 'جارية',
  RUNNING: 'جارية',
  pending: 'قيد الانتظار',
  PENDING: 'قيد الانتظار',
}

/**
 * Normalize job status to UI-friendly values
 */
export function normalizeJobStatus(s: string): 'done' | 'failed' | 'running' | 'pending' {
  if (['done', 'COMPLETED'].includes(s)) return 'done'
  if (['failed', 'FAILED'].includes(s)) return 'failed'
  if (['running', 'RUNNING'].includes(s)) return 'running'
  return 'pending'
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export jobs data to CSV (client-side, supports Arabic via BOM)
 */
export function exportJobsToCSV(
  jobs: Array<{
    id?: string
    startedAt: string
    type: string
    status: string
    processed: number
    total?: number
    totalItems?: number
    errors?: number
    failed?: number
    costUsd: number | null
    createdAt?: string
  }>
): void {
  const bom = '\uFEFF'
  const rows = [
    ['التاريخ', 'النوع', 'الحالة', 'المُعالَج', 'الإجمالي', 'الأخطاء', 'التكلفة (USD)'].map(
      escapeCSV
    ),
    ...jobs.map((j) => [
      escapeCSV(j.startedAt ?? j.createdAt ?? ''),
      escapeCSV(JOB_TYPE_LABELS[j.type] ?? j.type),
      escapeCSV(JOB_STATUS_LABELS[j.status] ?? j.status),
      escapeCSV(j.processed),
      escapeCSV(j.total ?? j.totalItems ?? 0),
      escapeCSV(j.errors ?? j.failed ?? 0),
      escapeCSV(j.costUsd != null ? Number(j.costUsd).toFixed(4) : '0'),
    ]),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-jobs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Safe localStorage reader with SSR guard
 */
export function readLocalStorage(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  return localStorage.getItem(key) ?? fallback
}

/**
 * Safe localStorage writer with SSR guard
 */
export function writeLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, value)
}

export interface QualityReportPDFData {
  totalProducts: number
  avgQualityScore: number
  distribution: { excellent: number; good: number; fair: number; poor: number }
  gaps: Record<string, number>
  scannedAt?: string
  products?: Array<{ id: string; name: string; score: number; gap?: string }>
}

/**
 * Generate and download a quality report PDF (client-side, uses jspdf).
 */
export async function exportQualityReportPDF(data: QualityReportPDFData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 20

  doc.setFontSize(18)
  doc.text('FlixCam AI Quality Report', 14, y)
  y += 12

  doc.setFontSize(11)
  doc.text(`Total products: ${data.totalProducts}`, 14, y)
  y += 7
  doc.text(`Average quality score: ${data.avgQualityScore}%`, 14, y)
  y += 7
  if (data.scannedAt) {
    doc.text(`Scanned at: ${data.scannedAt}`, 14, y)
    y += 10
  }

  doc.text('Distribution: Excellent / Good / Fair / Poor', 14, y)
  y += 6
  doc.text(
    `${data.distribution.excellent} / ${data.distribution.good} / ${data.distribution.fair} / ${data.distribution.poor}`,
    14,
    y
  )
  y += 12

  if (data.products && data.products.length > 0) {
    doc.text('Lowest-scoring products (sample):', 14, y)
    y += 8
    data.products.slice(0, 15).forEach((p, i) => {
      if (y > 270) return
      doc.setFontSize(9)
      doc.text(`${i + 1}. ${p.name.slice(0, 40)} - ${p.score}%`, 18, y)
      y += 5
    })
  }

  doc.save(`quality-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
