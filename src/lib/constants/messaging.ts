/**
 * @file messaging.ts
 * @description Shared constants for messaging center (triggers, channels, recipient types, roles)
 * @module lib/constants/messaging
 */

export const CHANNEL_OPTIONS = [
  { value: 'EMAIL', label: { ar: 'البريد الإلكتروني', en: 'Email' } },
  { value: 'SMS', label: { ar: 'الرسائل النصية', en: 'SMS' } },
  { value: 'WHATSAPP', label: { ar: 'واتساب', en: 'WhatsApp' } },
  { value: 'IN_APP', label: { ar: 'إشعار داخل التطبيق', en: 'In-App' } },
] as const

export const RECIPIENT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  CUSTOMER: { ar: 'العميل', en: 'Customer' },
  BUSINESS: { ar: 'إدارة الأعمال', en: 'Business' },
  WAREHOUSE: { ar: 'المستودع', en: 'Warehouse' },
  ALL: { ar: 'الجميع', en: 'All' },
}

export const BUSINESS_RECIPIENT_ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  OWNER: { ar: 'المالك', en: 'Owner' },
  CO_OWNER: { ar: 'شريك', en: 'Co-Owner' },
  GENERAL_MANAGER: { ar: 'المدير العام', en: 'General Manager' },
  OPERATIONS_MANAGER: { ar: 'مدير العمليات', en: 'Operations Manager' },
  WAREHOUSE_MANAGER: { ar: 'مدير المستودع', en: 'Warehouse Manager' },
  INVENTORY_MANAGER: { ar: 'مدير المخزون', en: 'Inventory Manager' },
  CUSTOMER_SUPPORT: { ar: 'خدمة العملاء', en: 'Customer Support' },
  TECHNICAL_SUPPORT: { ar: 'الدعم الفني', en: 'Technical Support' },
  ACCOUNTANT: { ar: 'محاسب', en: 'Accountant' },
  SALES_MANAGER: { ar: 'مدير المبيعات', en: 'Sales Manager' },
  MARKETING_MANAGER: { ar: 'مدير التسويق', en: 'Marketing Manager' },
  LEGAL: { ar: 'قانوني', en: 'Legal' },
  IT_ADMIN: { ar: 'مسؤول تقنية المعلومات', en: 'IT Admin' },
  CUSTOM: { ar: 'دور مخصص', en: 'Custom' },
  SUPPORT: { ar: 'الدعم', en: 'Support' },
}

// NotificationTrigger values for automation rules (grouped by category)
export const NOTIFICATION_TRIGGERS_GROUPED: { group: string; triggers: { value: string; label: { ar: string; en: string } }[] }[] = [
  {
    group: 'الحجز والدفع',
    triggers: [
      { value: 'BOOKING_CREATED', label: { ar: 'تم إنشاء الحجز', en: 'Booking Created' } },
      { value: 'BOOKING_CONFIRMED', label: { ar: 'تم تأكيد الحجز', en: 'Booking Confirmed' } },
      { value: 'BOOKING_CANCELLED', label: { ar: 'تم إلغاء الحجز', en: 'Booking Cancelled' } },
      { value: 'BOOKING_UPDATED', label: { ar: 'تم تعديل الحجز', en: 'Booking Updated' } },
      { value: 'BOOKING_REMINDER', label: { ar: 'تذكير الحجز', en: 'Booking Reminder' } },
      { value: 'BOOKING_EXTENSION', label: { ar: 'تمديد الحجز', en: 'Booking Extension' } },
      { value: 'PAYMENT_RECEIVED', label: { ar: 'تم استلام الدفع', en: 'Payment Received' } },
      { value: 'PAYMENT_FAILED', label: { ar: 'فشل الدفع', en: 'Payment Failed' } },
      { value: 'PAYMENT_PENDING', label: { ar: 'دفع معلق', en: 'Payment Pending' } },
      { value: 'REFUND_PROCESSED', label: { ar: 'تم معالجة الاسترداد', en: 'Refund Processed' } },
      { value: 'DEPOSIT_RELEASED', label: { ar: 'إطلاق العربون', en: 'Deposit Released' } },
    ],
  },
  {
    group: 'الاستلام والإرجاع',
    triggers: [
      { value: 'PICKUP_REMINDER_24H', label: { ar: 'تذكير الاستلام 24 ساعة', en: 'Pickup Reminder 24h' } },
      { value: 'PICKUP_REMINDER_3H', label: { ar: 'تذكير الاستلام 3 ساعات', en: 'Pickup Reminder 3h' } },
      { value: 'RETURN_REMINDER_24H', label: { ar: 'تذكير الإرجاع 24 ساعة', en: 'Return Reminder 24h' } },
      { value: 'RETURN_REMINDER_6H', label: { ar: 'تذكير الإرجاع 6 ساعات', en: 'Return Reminder 6h' } },
      { value: 'RETURN_REMINDER', label: { ar: 'تذكير الإرجاع', en: 'Return Reminder' } },
      { value: 'LATE_RETURN_WARNING', label: { ar: 'تحذير تأخر الإرجاع', en: 'Late Return Warning' } },
      { value: 'RETURN_OVERDUE', label: { ar: 'تأخر الإرجاع', en: 'Return Overdue' } },
      { value: 'EQUIPMENT_READY', label: { ar: 'المعدات جاهزة', en: 'Equipment Ready' } },
      { value: 'DELIVERY_SCHEDULED', label: { ar: 'تم جدولة التوصيل', en: 'Delivery Scheduled' } },
    ],
  },
  {
    group: 'التلف والضرر',
    triggers: [
      { value: 'DAMAGE_CLAIM_FILED', label: { ar: 'تم الإبلاغ عن تلف', en: 'Damage Claim Filed' } },
    ],
  },
  {
    group: 'الحساب والمصادقة',
    triggers: [
      { value: 'WELCOME_CUSTOMER', label: { ar: 'ترحيب بالعميل', en: 'Welcome Customer' } },
      { value: 'OTP_LOGIN', label: { ar: 'تسجيل الدخول بكود OTP', en: 'OTP Login' } },
      { value: 'PASSWORD_RESET', label: { ar: 'إعادة تعيين كلمة المرور', en: 'Password Reset' } },
      { value: 'EMAIL_VERIFICATION', label: { ar: 'التحقق من البريد', en: 'Email Verification' } },
      { value: 'NEW_DEVICE_LOGIN', label: { ar: 'تسجيل دخول من جهاز جديد', en: 'New Device Login' } },
      { value: 'ACCOUNT_CHANGES', label: { ar: 'تغييرات الحساب', en: 'Account Changes' } },
    ],
  },
  {
    group: 'إداري',
    triggers: [
      { value: 'ORDER_RECEIVED_BUSINESS', label: { ar: 'استلام الطلب - الأعمال', en: 'Order Received Business' } },
      { value: 'ORDER_RECEIVED_WAREHOUSE', label: { ar: 'استلام الطلب - المستودع', en: 'Order Received Warehouse' } },
      { value: 'LOW_INVENTORY_ALERT', label: { ar: 'تنبيه مخزون منخفض', en: 'Low Inventory Alert' } },
      { value: 'MAINTENANCE_DUE', label: { ar: 'موعد الصيانة', en: 'Maintenance Due' } },
      { value: 'DAILY_SUMMARY', label: { ar: 'التقرير اليومي', en: 'Daily Summary' } },
      { value: 'INVOICE_SENT', label: { ar: 'تم إرسال الفاتورة', en: 'Invoice Sent' } },
      { value: 'REVIEW_REQUEST', label: { ar: 'طلب تقييم', en: 'Review Request' } },
      { value: 'ABANDONED_CART', label: { ar: 'سلة مهجورة', en: 'Abandoned Cart' } },
    ],
  },
]

export const TIMEZONES = [
  { value: 'Asia/Riyadh', label: { ar: 'الرياض', en: 'Riyadh' } },
  { value: 'UTC', label: { ar: 'UTC', en: 'UTC' } },
]
