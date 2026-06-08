/**
 * Centralized status label maps (Arabic + English + badge variant).
 */

export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface StatusLabelEntry {
  value: string
  labelAr: string
  labelEn: string
  variant: StatusBadgeVariant
}

export const BOOKING_STATUS_LABELS: Record<string, StatusLabelEntry> = {
  DRAFT: { value: 'DRAFT', labelAr: 'مسودة', labelEn: 'Draft', variant: 'outline' },
  RISK_CHECK: { value: 'RISK_CHECK', labelAr: 'فحص المخاطر', labelEn: 'Risk check', variant: 'outline' },
  PAYMENT_PENDING: {
    value: 'PAYMENT_PENDING',
    labelAr: 'انتظار الدفع',
    labelEn: 'Payment pending',
    variant: 'secondary',
  },
  CONFIRMED: { value: 'CONFIRMED', labelAr: 'مؤكد', labelEn: 'Confirmed', variant: 'default' },
  ACTIVE: { value: 'ACTIVE', labelAr: 'نشط', labelEn: 'Active', variant: 'default' },
  RETURNED: { value: 'RETURNED', labelAr: 'مرتجع', labelEn: 'Returned', variant: 'secondary' },
  CLOSED: { value: 'CLOSED', labelAr: 'مغلق', labelEn: 'Closed', variant: 'outline' },
  CANCELLED: { value: 'CANCELLED', labelAr: 'ملغي', labelEn: 'Cancelled', variant: 'destructive' },
}

export const PAYMENT_STATUS_LABELS: Record<string, StatusLabelEntry> = {
  PENDING: { value: 'PENDING', labelAr: 'قيد الدفع', labelEn: 'Pending', variant: 'outline' },
  PROCESSING: { value: 'PROCESSING', labelAr: 'قيد المعالجة', labelEn: 'Processing', variant: 'secondary' },
  SUCCESS: { value: 'SUCCESS', labelAr: 'مدفوع', labelEn: 'Paid', variant: 'default' },
  FAILED: { value: 'FAILED', labelAr: 'فشل', labelEn: 'Failed', variant: 'destructive' },
  REFUNDED: { value: 'REFUNDED', labelAr: 'مسترد', labelEn: 'Refunded', variant: 'secondary' },
  PARTIALLY_REFUNDED: {
    value: 'PARTIALLY_REFUNDED',
    labelAr: 'استرداد جزئي',
    labelEn: 'Partially refunded',
    variant: 'secondary',
  },
  AMOUNT_MISMATCH: {
    value: 'AMOUNT_MISMATCH',
    labelAr: 'عدم تطابق المبلغ',
    labelEn: 'Amount mismatch',
    variant: 'destructive',
  },
}

export const INVOICE_STATUS_LABELS: Record<string, StatusLabelEntry> = {
  DRAFT: { value: 'DRAFT', labelAr: 'مسودة', labelEn: 'Draft', variant: 'outline' },
  SENT: { value: 'SENT', labelAr: 'مرسلة', labelEn: 'Sent', variant: 'secondary' },
  PAID: { value: 'PAID', labelAr: 'مدفوعة', labelEn: 'Paid', variant: 'default' },
  OVERDUE: { value: 'OVERDUE', labelAr: 'متأخرة', labelEn: 'Overdue', variant: 'destructive' },
  CANCELLED: { value: 'CANCELLED', labelAr: 'ملغاة', labelEn: 'Cancelled', variant: 'destructive' },
  PARTIALLY_PAID: {
    value: 'PARTIALLY_PAID',
    labelAr: 'مدفوعة جزئياً',
    labelEn: 'Partially paid',
    variant: 'secondary',
  },
}

export const CLIENT_STATUS_LABELS: Record<string, StatusLabelEntry> = {
  active: { value: 'active', labelAr: 'نشط', labelEn: 'Active', variant: 'default' },
  suspended: { value: 'suspended', labelAr: 'معلق', labelEn: 'Suspended', variant: 'destructive' },
  inactive: { value: 'inactive', labelAr: 'غير نشط', labelEn: 'Inactive', variant: 'secondary' },
}

export function getStatusLabel(
  map: Record<string, StatusLabelEntry>,
  value: string,
  locale: 'ar' | 'en' = 'ar'
): string {
  const entry = map[value] ?? map[value.toUpperCase()]
  if (!entry) return value
  return locale === 'ar' ? entry.labelAr : entry.labelEn
}

export function getStatusVariant(
  map: Record<string, StatusLabelEntry>,
  value: string
): StatusBadgeVariant {
  const entry = map[value] ?? map[value.toUpperCase()]
  return entry?.variant ?? 'outline'
}

/** Booking statuses shown in portal filters (excludes internal states). */
/** Tailwind classes for admin list badges (booking status). */
export const BOOKING_STATUS_ADMIN_STYLES: Record<string, { color: string; bgColor: string }> = {
  DRAFT: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  RISK_CHECK: { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  PAYMENT_PENDING: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  ACTIVE: { color: 'text-green-600', bgColor: 'bg-green-100' },
  CONFIRMED: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  RETURNED: { color: 'text-purple-600', bgColor: 'bg-purple-100' },
  CLOSED: { color: 'text-slate-600', bgColor: 'bg-slate-100' },
  CANCELLED: { color: 'text-red-600', bgColor: 'bg-red-100' },
  OVERDUE: { color: 'text-red-600', bgColor: 'bg-red-100' },
}

export const PORTAL_BOOKING_FILTER_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'ACTIVE',
  'RETURNED',
  'CLOSED',
  'CANCELLED',
] as const
