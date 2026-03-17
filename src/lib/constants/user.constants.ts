/**
 * Shared constants for admin user management
 */

export const USER_STATUS_LABELS: Record<
  string,
  { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  ACTIVE: { ar: 'نشط', variant: 'default' },
  LOCKED: { ar: 'معلق', variant: 'destructive' },
  PENDING: { ar: 'قيد الانتظار', variant: 'secondary' },
  DEACTIVATED: { ar: 'معطل', variant: 'secondary' },
}

export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'LOCKED', label: 'معلق' },
  { value: 'PENDING', label: 'قيد الانتظار' },
] as const

export const ROLES: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'مدير' },
  { value: 'SALES_MANAGER', label: 'مدير المبيعات' },
  { value: 'ACCOUNTANT', label: 'محاسب' },
  { value: 'WAREHOUSE_MANAGER', label: 'مدير المستودع' },
  { value: 'TECHNICIAN', label: 'فني' },
  { value: 'CUSTOMER_SERVICE', label: 'خدمة العملاء' },
  { value: 'MARKETING_MANAGER', label: 'مدير التسويق' },
  { value: 'RISK_MANAGER', label: 'مدير المخاطر' },
  { value: 'APPROVAL_AGENT', label: 'موافق' },
  { value: 'AUDITOR', label: 'مدقق' },
  { value: 'AI_OPERATOR', label: 'مشغل الذكاء الاصطناعي' },
  { value: 'DATA_ENTRY', label: 'إدخال البيانات' },
  { value: 'CUSTOMER', label: 'عميل' },
]
