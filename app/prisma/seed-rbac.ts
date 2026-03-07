/**
 * @file seed-rbac.ts
 * @description RBAC seed: PermissionCategory, Permission, Role, RolePermission, RoleConflict, MenuItem, MenuItemPermission
 * @module prisma/seed-rbac
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PERMISSION_CATEGORIES = [
  { name: 'booking', nameAr: 'الحجوزات', sortOrder: 1 },
  { name: 'equipment', nameAr: 'المعدات', sortOrder: 2 },
  { name: 'payment', nameAr: 'المدفوعات', sortOrder: 3 },
  { name: 'client', nameAr: 'العملاء', sortOrder: 4 },
  { name: 'invoice', nameAr: 'الفواتير', sortOrder: 5 },
  { name: 'contract', nameAr: 'العقود', sortOrder: 6 },
  { name: 'quote', nameAr: 'عروض الأسعار', sortOrder: 7 },
  { name: 'maintenance', nameAr: 'الصيانة', sortOrder: 8 },
  { name: 'warehouse', nameAr: 'المستودع', sortOrder: 9 },
  { name: 'delivery', nameAr: 'التوصيل', sortOrder: 10 },
  { name: 'approval', nameAr: 'الموافقات', sortOrder: 11 },
  { name: 'audit', nameAr: 'السجلات', sortOrder: 12 },
  { name: 'dashboard', nameAr: 'لوحة التحكم', sortOrder: 13 },
  { name: 'seo', nameAr: 'تحسين محركات البحث', sortOrder: 14 },
  { name: 'category', nameAr: 'الفئات', sortOrder: 15 },
  { name: 'brand', nameAr: 'العلامات التجارية', sortOrder: 16 },
  { name: 'studio', nameAr: 'الاستوديوهات', sortOrder: 17 },
  { name: 'kit', nameAr: 'الحزم', sortOrder: 18 },
  { name: 'pricing', nameAr: 'التسعير', sortOrder: 19 },
  { name: 'import', nameAr: 'الاستيراد', sortOrder: 20 },
  { name: 'reports', nameAr: 'التقارير', sortOrder: 21 },
  { name: 'marketing', nameAr: 'التسويق', sortOrder: 22 },
  { name: 'coupon', nameAr: 'الكوبونات', sortOrder: 23 },
  { name: 'settings', nameAr: 'الإعدادات', sortOrder: 24 },
  { name: 'user', nameAr: 'المستخدمين', sortOrder: 25 },
  { name: 'system', nameAr: 'النظام', sortOrder: 26 },
  { name: 'ai', nameAr: 'الذكاء الاصطناعي', sortOrder: 27 },
  { name: 'vendor', nameAr: 'الموردون', sortOrder: 28 },
]

const PERMISSIONS: Array<{
  name: string
  description?: string
  categoryName: string
  sortOrder: number
}> = [
  // booking
  { name: 'booking.create', categoryName: 'booking', sortOrder: 1 },
  { name: 'booking.read', categoryName: 'booking', sortOrder: 2 },
  { name: 'booking.update', categoryName: 'booking', sortOrder: 3 },
  { name: 'booking.delete', categoryName: 'booking', sortOrder: 4 },
  { name: 'booking.cancel', categoryName: 'booking', sortOrder: 5 },
  { name: 'booking.transition', categoryName: 'booking', sortOrder: 6 },
  // equipment
  { name: 'equipment.create', categoryName: 'equipment', sortOrder: 1 },
  { name: 'equipment.read', categoryName: 'equipment', sortOrder: 2 },
  { name: 'equipment.update', categoryName: 'equipment', sortOrder: 3 },
  { name: 'equipment.delete', categoryName: 'equipment', sortOrder: 4 },
  { name: 'equipment.checkout', categoryName: 'equipment', sortOrder: 5 },
  { name: 'equipment.checkin', categoryName: 'equipment', sortOrder: 6 },
  { name: 'equipment.update_pricing', categoryName: 'equipment', sortOrder: 7 },
  { name: 'equipment.update_metadata', categoryName: 'equipment', sortOrder: 8 },
  // payment
  { name: 'payment.create', categoryName: 'payment', sortOrder: 1 },
  { name: 'payment.read', categoryName: 'payment', sortOrder: 2 },
  { name: 'payment.refund', categoryName: 'payment', sortOrder: 3 },
  { name: 'payment.verify', categoryName: 'payment', sortOrder: 4 },
  { name: 'payment.mark_paid', categoryName: 'payment', sortOrder: 5 },
  // client
  { name: 'client.create', categoryName: 'client', sortOrder: 1 },
  { name: 'client.read', categoryName: 'client', sortOrder: 2 },
  { name: 'client.update', categoryName: 'client', sortOrder: 3 },
  { name: 'client.delete', categoryName: 'client', sortOrder: 4 },
  { name: 'client.blacklist', categoryName: 'client', sortOrder: 5 },
  // invoice
  { name: 'invoice.create', categoryName: 'invoice', sortOrder: 1 },
  { name: 'invoice.read', categoryName: 'invoice', sortOrder: 2 },
  { name: 'invoice.update', categoryName: 'invoice', sortOrder: 3 },
  { name: 'invoice.delete', categoryName: 'invoice', sortOrder: 4 },
  { name: 'invoice.mark_paid', categoryName: 'invoice', sortOrder: 5 },
  { name: 'invoice.generate_zatca', categoryName: 'invoice', sortOrder: 6 },
  // contract
  { name: 'contract.create', categoryName: 'contract', sortOrder: 1 },
  { name: 'contract.read', categoryName: 'contract', sortOrder: 2 },
  { name: 'contract.update', categoryName: 'contract', sortOrder: 3 },
  { name: 'contract.sign', categoryName: 'contract', sortOrder: 4 },
  { name: 'contract.delete', categoryName: 'contract', sortOrder: 5 },
  // quote
  { name: 'quote.create', categoryName: 'quote', sortOrder: 1 },
  { name: 'quote.read', categoryName: 'quote', sortOrder: 2 },
  { name: 'quote.update', categoryName: 'quote', sortOrder: 3 },
  { name: 'quote.convert', categoryName: 'quote', sortOrder: 4 },
  { name: 'quote.delete', categoryName: 'quote', sortOrder: 5 },
  // maintenance
  { name: 'maintenance.create', categoryName: 'maintenance', sortOrder: 1 },
  { name: 'maintenance.read', categoryName: 'maintenance', sortOrder: 2 },
  { name: 'maintenance.update', categoryName: 'maintenance', sortOrder: 3 },
  { name: 'maintenance.complete', categoryName: 'maintenance', sortOrder: 4 },
  { name: 'maintenance.delete', categoryName: 'maintenance', sortOrder: 5 },
  // warehouse
  { name: 'warehouse.read', categoryName: 'warehouse', sortOrder: 1 },
  { name: 'warehouse.check_in', categoryName: 'warehouse', sortOrder: 2 },
  { name: 'warehouse.check_out', categoryName: 'warehouse', sortOrder: 3 },
  { name: 'warehouse.inventory', categoryName: 'warehouse', sortOrder: 4 },
  { name: 'warehouse.manage', categoryName: 'warehouse', sortOrder: 5 },
  // delivery
  { name: 'delivery.read', categoryName: 'delivery', sortOrder: 1 },
  { name: 'delivery.assign', categoryName: 'delivery', sortOrder: 2 },
  { name: 'delivery.update_status', categoryName: 'delivery', sortOrder: 3 },
  { name: 'delivery.complete', categoryName: 'delivery', sortOrder: 4 },
  { name: 'delivery.manage', categoryName: 'delivery', sortOrder: 5 },
  // approval
  { name: 'approval.read', categoryName: 'approval', sortOrder: 1 },
  { name: 'approval.approve', categoryName: 'approval', sortOrder: 2 },
  { name: 'approval.reject', categoryName: 'approval', sortOrder: 3 },
  { name: 'approval.delegate', categoryName: 'approval', sortOrder: 4 },
  // audit
  { name: 'audit.read', categoryName: 'audit', sortOrder: 1 },
  { name: 'audit.export', categoryName: 'audit', sortOrder: 2 },
  { name: 'audit.search', categoryName: 'audit', sortOrder: 3 },
  // dashboard
  { name: 'dashboard.read', categoryName: 'dashboard', sortOrder: 1 },
  { name: 'dashboard.analytics', categoryName: 'dashboard', sortOrder: 2 },
  { name: 'dashboard.customize', categoryName: 'dashboard', sortOrder: 3 },
  { name: 'dashboard.export', categoryName: 'dashboard', sortOrder: 4 },
  // seo
  { name: 'seo.edit_meta_titles', categoryName: 'seo', sortOrder: 1 },
  { name: 'seo.edit_meta_descriptions', categoryName: 'seo', sortOrder: 2 },
  { name: 'seo.edit_slugs', categoryName: 'seo', sortOrder: 3 },
  { name: 'seo.edit_alt_text', categoryName: 'seo', sortOrder: 4 },
  { name: 'seo.edit_schema_markup', categoryName: 'seo', sortOrder: 5 },
  { name: 'seo.read_reports', categoryName: 'seo', sortOrder: 6 },
  { name: 'seo.manage_redirects', categoryName: 'seo', sortOrder: 7 },
  // category
  { name: 'category.create', categoryName: 'category', sortOrder: 1 },
  { name: 'category.read', categoryName: 'category', sortOrder: 2 },
  { name: 'category.update', categoryName: 'category', sortOrder: 3 },
  { name: 'category.delete', categoryName: 'category', sortOrder: 4 },
  // vendor (multi-vendor marketplace)
  { name: 'vendor.read', categoryName: 'vendor', sortOrder: 1 },
  { name: 'vendor.create', categoryName: 'vendor', sortOrder: 2 },
  { name: 'vendor.update', categoryName: 'vendor', sortOrder: 3 },
  { name: 'vendor.approve', categoryName: 'vendor', sortOrder: 4 },
  { name: 'vendor.suspend', categoryName: 'vendor', sortOrder: 5 },
  { name: 'vendor.manage_payouts', categoryName: 'vendor', sortOrder: 6 },
  { name: 'vendor.toggle_visibility', categoryName: 'vendor', sortOrder: 7 },
  // brand
  { name: 'brand.create', categoryName: 'brand', sortOrder: 1 },
  { name: 'brand.read', categoryName: 'brand', sortOrder: 2 },
  { name: 'brand.update', categoryName: 'brand', sortOrder: 3 },
  { name: 'brand.delete', categoryName: 'brand', sortOrder: 4 },
  // studio
  { name: 'studio.create', categoryName: 'studio', sortOrder: 1 },
  { name: 'studio.read', categoryName: 'studio', sortOrder: 2 },
  { name: 'studio.update', categoryName: 'studio', sortOrder: 3 },
  { name: 'studio.delete', categoryName: 'studio', sortOrder: 4 },
  { name: 'studio.manage_blackouts', categoryName: 'studio', sortOrder: 5 },
  // kit
  { name: 'kit.create', categoryName: 'kit', sortOrder: 1 },
  { name: 'kit.read', categoryName: 'kit', sortOrder: 2 },
  { name: 'kit.update', categoryName: 'kit', sortOrder: 3 },
  { name: 'kit.delete', categoryName: 'kit', sortOrder: 4 },
  // pricing
  { name: 'pricing.create', categoryName: 'pricing', sortOrder: 1 },
  { name: 'pricing.read', categoryName: 'pricing', sortOrder: 2 },
  { name: 'pricing.update', categoryName: 'pricing', sortOrder: 3 },
  { name: 'pricing.delete', categoryName: 'pricing', sortOrder: 4 },
  // import
  { name: 'import.create', categoryName: 'import', sortOrder: 1 },
  { name: 'import.read', categoryName: 'import', sortOrder: 2 },
  // reports
  { name: 'reports.read', categoryName: 'reports', sortOrder: 1 },
  { name: 'reports.export', categoryName: 'reports', sortOrder: 2 },
  { name: 'reports.read_financial', categoryName: 'reports', sortOrder: 3 },
  { name: 'reports.read_warehouse', categoryName: 'reports', sortOrder: 4 },
  // marketing
  { name: 'marketing.create', categoryName: 'marketing', sortOrder: 1 },
  { name: 'marketing.read', categoryName: 'marketing', sortOrder: 2 },
  { name: 'marketing.update', categoryName: 'marketing', sortOrder: 3 },
  { name: 'marketing.send', categoryName: 'marketing', sortOrder: 4 },
  { name: 'marketing.delete', categoryName: 'marketing', sortOrder: 5 },
  // coupon
  { name: 'coupon.create', categoryName: 'coupon', sortOrder: 1 },
  { name: 'coupon.read', categoryName: 'coupon', sortOrder: 2 },
  { name: 'coupon.update', categoryName: 'coupon', sortOrder: 3 },
  { name: 'coupon.delete', categoryName: 'coupon', sortOrder: 4 },
  // settings
  { name: 'settings.read', categoryName: 'settings', sortOrder: 1 },
  { name: 'settings.update', categoryName: 'settings', sortOrder: 2 },
  { name: 'settings.manage_users', categoryName: 'settings', sortOrder: 3 },
  { name: 'settings.manage_roles', categoryName: 'settings', sortOrder: 4 },
  // user
  { name: 'user.create', categoryName: 'user', sortOrder: 1 },
  { name: 'user.read', categoryName: 'user', sortOrder: 2 },
  { name: 'user.update', categoryName: 'user', sortOrder: 3 },
  { name: 'user.delete', categoryName: 'user', sortOrder: 4 },
  { name: 'user.assign_role', categoryName: 'user', sortOrder: 5 },
  // system
  { name: 'system.read_only_mode', categoryName: 'system', sortOrder: 1 },
  { name: 'system.health_check', categoryName: 'system', sortOrder: 2 },
  { name: 'system.clear_cache', categoryName: 'system', sortOrder: 3 },
  { name: 'system.view_logs', categoryName: 'system', sortOrder: 4 },
  // ai
  { name: 'ai.use', categoryName: 'ai', sortOrder: 1 },
  { name: 'ai.risk_assessment', categoryName: 'ai', sortOrder: 2 },
  { name: 'ai.kit_builder', categoryName: 'ai', sortOrder: 3 },
  { name: 'ai.pricing', categoryName: 'ai', sortOrder: 4 },
  { name: 'ai.demand_forecast', categoryName: 'ai', sortOrder: 5 },
  { name: 'ai.chatbot', categoryName: 'ai', sortOrder: 6 },
  // wildcards (for role assignment)
  { name: '*', categoryName: 'system', sortOrder: 0, description: 'All permissions' },
  {
    name: 'booking.*',
    categoryName: 'booking',
    sortOrder: 0,
    description: 'All booking permissions',
  },
  {
    name: 'equipment.*',
    categoryName: 'equipment',
    sortOrder: 0,
    description: 'All equipment permissions',
  },
  { name: 'client.*', categoryName: 'client', sortOrder: 0, description: 'All client permissions' },
  {
    name: 'invoice.*',
    categoryName: 'invoice',
    sortOrder: 0,
    description: 'All invoice permissions',
  },
  {
    name: 'payment.*',
    categoryName: 'payment',
    sortOrder: 0,
    description: 'All payment permissions',
  },
  {
    name: 'contract.*',
    categoryName: 'contract',
    sortOrder: 0,
    description: 'All contract permissions',
  },
  { name: 'quote.*', categoryName: 'quote', sortOrder: 0, description: 'All quote permissions' },
  {
    name: 'reports.*',
    categoryName: 'reports',
    sortOrder: 0,
    description: 'All report permissions',
  },
  {
    name: 'warehouse.*',
    categoryName: 'warehouse',
    sortOrder: 0,
    description: 'All warehouse permissions',
  },
  {
    name: 'maintenance.*',
    categoryName: 'maintenance',
    sortOrder: 0,
    description: 'All maintenance permissions',
  },
  {
    name: 'delivery.*',
    categoryName: 'delivery',
    sortOrder: 0,
    description: 'All delivery permissions',
  },
  {
    name: 'category.*',
    categoryName: 'category',
    sortOrder: 0,
    description: 'All category permissions',
  },
  { name: 'brand.*', categoryName: 'brand', sortOrder: 0, description: 'All brand permissions' },
  { name: 'ai.*', categoryName: 'ai', sortOrder: 0, description: 'All AI permissions' },
  {
    name: 'marketing.*',
    categoryName: 'marketing',
    sortOrder: 0,
    description: 'All marketing permissions',
  },
  { name: 'coupon.*', categoryName: 'coupon', sortOrder: 0, description: 'All coupon permissions' },
  {
    name: 'approval.*',
    categoryName: 'approval',
    sortOrder: 0,
    description: 'All approval permissions',
  },
  { name: 'vendor.*', categoryName: 'vendor', sortOrder: 0, description: 'All vendor permissions' },
]

const SYSTEM_ROLES = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    displayNameAr: 'مدير النظام',
    description: 'Full system access',
    isSystem: true,
    color: '#dc2626',
    permissions: ['*'],
  },
  {
    name: 'admin',
    displayName: 'Admin',
    displayNameAr: 'مدير',
    description: 'Administrative access',
    isSystem: true,
    color: '#2563eb',
    permissions: [
      'booking.*',
      'equipment.*',
      'client.*',
      'invoice.*',
      'payment.*',
      'contract.*',
      'quote.*',
      'reports.*',
      'vendor.*',
      'user.read',
      'user.create',
      'user.update',
      'settings.read',
      'settings.update',
      'warehouse.read',
      'maintenance.read',
      'delivery.read',
      'approval.read',
      'dashboard.read',
    ],
  },
  {
    name: 'finance',
    displayName: 'Finance',
    displayNameAr: 'مالية',
    description: 'Finance and invoicing',
    isSystem: true,
    color: '#059669',
    permissions: [
      'invoice.*',
      'payment.*',
      'reports.read_financial',
      'booking.read',
      'client.read',
      'dashboard.read',
    ],
  },
  {
    name: 'data_entry',
    displayName: 'Data Entry',
    displayNameAr: 'إدخال البيانات',
    description: 'Equipment catalog and SEO',
    isSystem: true,
    color: '#7c3aed',
    permissions: [
      'equipment.create',
      'equipment.read',
      'equipment.update_metadata',
      'category.*',
      'brand.*',
      'seo.edit_meta_titles',
      'seo.edit_meta_descriptions',
      'seo.edit_slugs',
      'seo.edit_alt_text',
      'studio.read',
    ],
  },
  {
    name: 'warehouse_manager',
    displayName: 'Warehouse Manager',
    displayNameAr: 'مدير المستودع',
    description: 'Warehouse and equipment operations',
    isSystem: true,
    color: '#d97706',
    permissions: [
      'equipment.*',
      'warehouse.*',
      'maintenance.*',
      'delivery.read',
      'delivery.assign',
      'booking.read',
      'booking.update',
      'reports.read_warehouse',
    ],
  },
  {
    name: 'delivery',
    displayName: 'Delivery',
    displayNameAr: 'التوصيل',
    description: 'Delivery driver',
    isSystem: true,
    color: '#0891b2',
    permissions: [
      'delivery.read',
      'delivery.update_status',
      'delivery.complete',
      'booking.read',
      'equipment.read',
      'client.read',
      'warehouse.check_out',
    ],
  },
  {
    name: 'technician',
    displayName: 'Technician',
    displayNameAr: 'فني',
    description: 'Maintenance technician',
    isSystem: true,
    color: '#65a30d',
    permissions: ['equipment.read', 'maintenance.*', 'warehouse.read', 'booking.read'],
  },
]

const CUSTOM_ROLES: Array<{
  name: string
  displayName: string
  displayNameAr: string
  description?: string
  permissions: string[]
}> = [
  {
    name: 'sales_manager',
    displayName: 'Sales Manager',
    displayNameAr: 'مدير المبيعات',
    permissions: [
      'quote.*',
      'booking.*',
      'client.read',
      'client.update',
      'invoice.read',
      'dashboard.read',
    ],
  },
  {
    name: 'customer_service',
    displayName: 'Customer Service',
    displayNameAr: 'خدمة العملاء',
    permissions: [
      'booking.read',
      'booking.update',
      'client.read',
      'client.update',
      'quote.read',
      'invoice.read',
    ],
  },
  {
    name: 'marketing_manager',
    displayName: 'Marketing Manager',
    displayNameAr: 'مدير التسويق',
    permissions: ['marketing.*', 'coupon.*', 'client.read', 'reports.read', 'dashboard.read'],
  },
  {
    name: 'risk_manager',
    displayName: 'Risk Manager',
    displayNameAr: 'مدير المخاطر',
    permissions: [
      'approval.*',
      'client.read',
      'booking.read',
      'payment.read',
      'ai.risk_assessment',
    ],
  },
  {
    name: 'approval_agent',
    displayName: 'Approval Agent',
    displayNameAr: 'وكيل الموافقات',
    permissions: [
      'approval.read',
      'approval.approve',
      'approval.reject',
      'booking.read',
      'client.read',
    ],
  },
  {
    name: 'auditor',
    displayName: 'Auditor',
    displayNameAr: 'مراجع حسابات',
    permissions: [
      'audit.read',
      'audit.export',
      'reports.read',
      'booking.read',
      'invoice.read',
      'payment.read',
    ],
  },
  {
    name: 'ai_operator',
    displayName: 'AI Operator',
    displayNameAr: 'مشغل الذكاء الاصطناعي',
    permissions: ['ai.*', 'equipment.read', 'category.read', 'dashboard.read'],
  },
]

const ROLE_CONFLICTS: Array<{ roleA: string; roleB: string; reason: string }> = [
  {
    roleA: 'finance',
    roleB: 'data_entry',
    reason: 'Separation of duties: Finance and Data Entry cannot be combined',
  },
  {
    roleA: 'warehouse_manager',
    roleB: 'finance',
    reason: 'Separation of duties: Warehouse and Finance',
  },
  {
    roleA: 'data_entry',
    roleB: 'admin',
    reason: 'Data Entry is a restricted role; Admin includes broader access',
  },
]

const MENU_ITEMS: Array<{
  name: string
  label: string
  labelAr: string
  icon?: string
  href?: string
  parentName?: string
  sortOrder: number
  permissions: string[]
}> = [
  {
    name: 'command_center',
    label: 'Command Center',
    labelAr: 'مركز القيادة',
    sortOrder: 1,
    permissions: [],
  },
  {
    name: 'dashboard',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    href: '/admin/dashboard',
    parentName: 'command_center',
    sortOrder: 1,
    permissions: ['dashboard.read'],
  },
  {
    name: 'action_center',
    label: 'Action Center',
    labelAr: 'مركز الإجراءات',
    href: '/admin/action-center',
    parentName: 'command_center',
    sortOrder: 2,
    permissions: ['dashboard.read'],
  },
  {
    name: 'approvals',
    label: 'Approvals',
    labelAr: 'الموافقات',
    href: '/admin/approvals',
    parentName: 'command_center',
    sortOrder: 3,
    permissions: ['approval.read'],
  },
  {
    name: 'live_ops',
    label: 'Live Operations',
    labelAr: 'العمليات الحية',
    href: '/admin/live-ops',
    parentName: 'command_center',
    sortOrder: 4,
    permissions: ['dashboard.read'],
  },
  {
    name: 'booking_engine',
    label: 'Booking Engine',
    labelAr: 'محرك الحجوزات',
    sortOrder: 2,
    permissions: [],
  },
  {
    name: 'quotes',
    label: 'Quotes',
    labelAr: 'عروض الأسعار',
    href: '/admin/quotes',
    parentName: 'booking_engine',
    sortOrder: 1,
    permissions: ['quote.read'],
  },
  {
    name: 'bookings',
    label: 'Bookings',
    labelAr: 'الحجوزات',
    href: '/admin/bookings',
    parentName: 'booking_engine',
    sortOrder: 2,
    permissions: ['booking.read'],
  },
  {
    name: 'recurring_bookings',
    label: 'Recurring Bookings',
    labelAr: 'الحجوزات المتكررة',
    href: '/admin/recurring-bookings',
    parentName: 'booking_engine',
    sortOrder: 3,
    permissions: ['booking.read'],
  },
  {
    name: 'calendar',
    label: 'Calendar',
    labelAr: 'التقويم',
    href: '/admin/calendar',
    parentName: 'booking_engine',
    sortOrder: 4,
    permissions: ['booking.read'],
  },
  {
    name: 'smart_sales',
    label: 'Smart Sales Tools',
    labelAr: 'أدوات البيع الذكية',
    sortOrder: 3,
    permissions: [],
  },
  {
    name: 'ai_features',
    label: 'AI Features',
    labelAr: 'ميزات الذكاء الاصطناعي',
    href: '/admin/ai',
    parentName: 'smart_sales',
    sortOrder: 1,
    permissions: ['ai.use'],
  },
  {
    name: 'kit_builder',
    label: 'Kit Builder',
    labelAr: 'منشئ الحزم',
    href: '/admin/kit-builder',
    parentName: 'smart_sales',
    sortOrder: 2,
    permissions: ['kit.read', 'ai.kit_builder'],
  },
  {
    name: 'dynamic_pricing',
    label: 'Dynamic Pricing',
    labelAr: 'التسعير الديناميكي',
    href: '/admin/dynamic-pricing',
    parentName: 'smart_sales',
    sortOrder: 3,
    permissions: ['pricing.read', 'ai.pricing'],
  },
  {
    name: 'inventory_assets',
    label: 'Inventory & Assets',
    labelAr: 'المخزون والأصول',
    sortOrder: 4,
    permissions: [],
  },
  {
    name: 'equipment',
    label: 'Equipment',
    labelAr: 'المعدات',
    href: '/admin/inventory/equipment',
    parentName: 'inventory_assets',
    sortOrder: 1,
    permissions: ['equipment.read'],
  },
  {
    name: 'kits',
    label: 'Kits & Bundles',
    labelAr: 'الحزم (المجموعات)',
    href: '/admin/inventory/kits',
    parentName: 'inventory_assets',
    sortOrder: 2,
    permissions: ['kit.read'],
  },
  {
    name: 'categories',
    label: 'Categories',
    labelAr: 'الفئات',
    href: '/admin/inventory/categories',
    parentName: 'inventory_assets',
    sortOrder: 3,
    permissions: ['category.read'],
  },
  {
    name: 'brands',
    label: 'Brands',
    labelAr: 'العلامات التجارية',
    href: '/admin/inventory/brands',
    parentName: 'inventory_assets',
    sortOrder: 4,
    permissions: ['brand.read'],
  },
  {
    name: 'studios',
    label: 'Studios',
    labelAr: 'الاستوديوهات',
    href: '/admin/studios',
    parentName: 'inventory_assets',
    sortOrder: 5,
    permissions: ['studio.read'],
  },
  {
    name: 'import',
    label: 'Import',
    labelAr: 'الاستيراد',
    href: '/admin/inventory/import',
    parentName: 'inventory_assets',
    sortOrder: 6,
    permissions: ['import.read'],
  },
  {
    name: 'field_ops',
    label: 'Field Operations',
    labelAr: 'العمليات الميدانية',
    sortOrder: 5,
    permissions: [],
  },
  {
    name: 'warehouse',
    label: 'Warehouse',
    labelAr: 'المستودع',
    href: '/admin/ops/warehouse',
    parentName: 'field_ops',
    sortOrder: 1,
    permissions: ['warehouse.read'],
  },
  {
    name: 'delivery',
    label: 'Delivery',
    labelAr: 'التوصيل',
    href: '/admin/ops/delivery',
    parentName: 'field_ops',
    sortOrder: 2,
    permissions: ['delivery.read'],
  },
  {
    name: 'technicians',
    label: 'Technicians',
    labelAr: 'الفنيون',
    href: '/admin/technicians',
    parentName: 'field_ops',
    sortOrder: 3,
    permissions: ['user.read'],
  },
  {
    name: 'maintenance',
    label: 'Maintenance',
    labelAr: 'الصيانة',
    href: '/admin/maintenance',
    parentName: 'field_ops',
    sortOrder: 4,
    permissions: ['maintenance.read'],
  },
  {
    name: 'damage_claims',
    label: 'Damage Claims',
    labelAr: 'مطالبات الأضرار',
    href: '/admin/damage-claims',
    parentName: 'field_ops',
    sortOrder: 5,
    permissions: ['booking.read'],
  },
  {
    name: 'finance_legal',
    label: 'Finance & Legal',
    labelAr: 'المالية والقانونية',
    sortOrder: 6,
    permissions: [],
  },
  {
    name: 'invoices',
    label: 'Invoices',
    labelAr: 'الفواتير',
    href: '/admin/invoices',
    parentName: 'finance_legal',
    sortOrder: 1,
    permissions: ['invoice.read'],
  },
  {
    name: 'payments',
    label: 'Payments',
    labelAr: 'المدفوعات',
    href: '/admin/payments',
    parentName: 'finance_legal',
    sortOrder: 2,
    permissions: ['payment.read'],
  },
  {
    name: 'contracts',
    label: 'Contracts',
    labelAr: 'العقود',
    href: '/admin/contracts',
    parentName: 'finance_legal',
    sortOrder: 3,
    permissions: ['contract.read'],
  },
  {
    name: 'financial_reports',
    label: 'Financial Reports',
    labelAr: 'التقارير المالية',
    href: '/admin/finance/reports',
    parentName: 'finance_legal',
    sortOrder: 4,
    permissions: ['reports.read_financial'],
  },
  {
    name: 'analytics',
    label: 'Analytics & Utilization',
    labelAr: 'التحليلات والإشغال',
    href: '/admin/analytics',
    parentName: 'finance_legal',
    sortOrder: 5,
    permissions: ['dashboard.analytics'],
  },
  {
    name: 'crm_marketing',
    label: 'CRM & Marketing',
    labelAr: 'العملاء والتسويق',
    sortOrder: 7,
    permissions: [],
  },
  {
    name: 'clients',
    label: 'Clients',
    labelAr: 'العملاء',
    href: '/admin/clients',
    parentName: 'crm_marketing',
    sortOrder: 1,
    permissions: ['client.read'],
  },
  {
    name: 'reviews',
    label: 'Reviews',
    labelAr: 'التقييمات',
    href: '/admin/reviews',
    parentName: 'crm_marketing',
    sortOrder: 2,
    permissions: ['client.read'],
  },
  {
    name: 'customer_segments',
    label: 'Customer Segments',
    labelAr: 'شرائح العملاء',
    href: '/admin/settings/customer-segments',
    parentName: 'crm_marketing',
    sortOrder: 3,
    permissions: ['client.read'],
  },
  {
    name: 'coupons',
    label: 'Coupons',
    labelAr: 'الكوبونات',
    href: '/admin/coupons',
    parentName: 'crm_marketing',
    sortOrder: 4,
    permissions: ['coupon.read'],
  },
  {
    name: 'marketing',
    label: 'Marketing',
    labelAr: 'التسويق',
    href: '/admin/marketing',
    parentName: 'crm_marketing',
    sortOrder: 5,
    permissions: ['marketing.read'],
  },
  {
    name: 'settings_section',
    label: 'Settings',
    labelAr: 'الإعدادات',
    sortOrder: 8,
    permissions: [],
  },
  {
    name: 'general_settings',
    label: 'General Settings',
    labelAr: 'الإعدادات العامة',
    href: '/admin/settings',
    parentName: 'settings_section',
    sortOrder: 1,
    permissions: ['settings.read'],
  },
  {
    name: 'notification_templates',
    label: 'Notification Templates',
    labelAr: 'قوالب الإشعارات',
    href: '/admin/settings/notification-templates',
    parentName: 'settings_section',
    sortOrder: 2,
    permissions: ['settings.read'],
  },
  {
    name: 'integrations',
    label: 'Integrations',
    labelAr: 'التكاملات',
    href: '/admin/settings/integrations',
    parentName: 'settings_section',
    sortOrder: 3,
    permissions: ['settings.read'],
  },
  {
    name: 'features',
    label: 'Features',
    labelAr: 'الميزات',
    href: '/admin/settings/features',
    parentName: 'settings_section',
    sortOrder: 4,
    permissions: ['settings.update'],
  },
  {
    name: 'roles',
    label: 'Roles',
    labelAr: 'الأدوار',
    href: '/admin/settings/roles',
    parentName: 'settings_section',
    sortOrder: 5,
    permissions: ['settings.manage_roles'],
  },
  {
    name: 'ai_control',
    label: 'AI Control',
    labelAr: 'التحكم بالذكاء الاصطناعي',
    href: '/admin/settings/ai-control',
    parentName: 'settings_section',
    sortOrder: 6,
    permissions: ['settings.update'],
  },
]

async function main() {
  console.log('🌱 Starting RBAC seed...')

  // 1. Permission categories
  const categoryMap = new Map<string, string>()
  for (const cat of PERMISSION_CATEGORIES) {
    const created = await prisma.permissionCategory.upsert({
      where: { name: cat.name },
      update: { nameAr: cat.nameAr, sortOrder: cat.sortOrder },
      create: { name: cat.name, nameAr: cat.nameAr, sortOrder: cat.sortOrder },
    })
    categoryMap.set(cat.name, created.id)
  }
  console.log(`✅ Created ${PERMISSION_CATEGORIES.length} permission categories`)

  // 2. Permissions
  const permissionMap = new Map<string, string>()
  for (const p of PERMISSIONS) {
    const categoryId = categoryMap.get(p.categoryName) ?? null
    const created = await prisma.permission.upsert({
      where: { name: p.name },
      update: { categoryId, description: p.description, sortOrder: p.sortOrder, isSystem: true },
      create: {
        name: p.name,
        description: p.description,
        categoryId,
        sortOrder: p.sortOrder,
        isSystem: true,
      },
    })
    permissionMap.set(p.name, created.id)
  }
  console.log(`✅ Created ${PERMISSIONS.length} permissions`)

  // 3. Roles (system + custom)
  const roleMap = new Map<string, string>()
  for (const r of [...SYSTEM_ROLES, ...CUSTOM_ROLES]) {
    const desc = 'description' in r ? r.description : undefined
    const isSystem = 'isSystem' in r ? (r as { isSystem: boolean }).isSystem : false
    const color = 'color' in r ? (r as { color?: string }).color : undefined
    const created = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        displayName: r.displayName,
        displayNameAr: r.displayNameAr ?? undefined,
        description: desc,
        isSystem,
        color,
      },
      create: {
        name: r.name,
        displayName: r.displayName,
        displayNameAr: r.displayNameAr,
        description: desc,
        isSystem,
        color,
      },
    })
    roleMap.set(r.name, created.id)
  }
  console.log(`✅ Created ${SYSTEM_ROLES.length + CUSTOM_ROLES.length} roles`)

  // 4. Role permissions
  for (const r of [...SYSTEM_ROLES, ...CUSTOM_ROLES]) {
    const roleId = roleMap.get(r.name)!
    for (const permName of r.permissions) {
      const permId = permissionMap.get(permName)
      if (!permId) {
        console.warn(`Permission ${permName} not found for role ${r.name}`)
        continue
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId: permId },
        },
        update: {},
        create: { roleId, permissionId: permId },
      })
    }
  }
  console.log('✅ Created role-permission assignments')

  // 5. Role conflicts (order roleA < roleB by name for unique constraint)
  for (const c of ROLE_CONFLICTS) {
    const roleAId = roleMap.get(c.roleA)
    const roleBId = roleMap.get(c.roleB)
    if (!roleAId || !roleBId) continue
    const [roleA, roleB] = c.roleA < c.roleB ? [c.roleA, c.roleB] : [c.roleB, c.roleA]
    const [idA, idB] = [roleMap.get(roleA)!, roleMap.get(roleB)!]
    await prisma.roleConflict.upsert({
      where: {
        roleAId_roleBId: { roleAId: idA, roleBId: idB },
      },
      update: { reason: c.reason },
      create: { roleAId: idA, roleBId: idB, reason: c.reason },
    })
  }
  console.log(`✅ Created ${ROLE_CONFLICTS.length} role conflicts`)

  // 6. Menu items
  const menuItemMap = new Map<string, string>()
  for (const m of MENU_ITEMS) {
    const parentId = m.parentName ? (menuItemMap.get(m.parentName) ?? null) : null
    const created = await prisma.menuItem.upsert({
      where: { name: m.name },
      update: {
        label: m.label,
        labelAr: m.labelAr,
        href: m.href ?? null,
        parentId,
        sortOrder: m.sortOrder,
        icon: m.icon ?? null,
      },
      create: {
        name: m.name,
        label: m.label,
        labelAr: m.labelAr,
        href: m.href,
        parentId,
        sortOrder: m.sortOrder,
        icon: m.icon,
      },
    })
    menuItemMap.set(m.name, created.id)
  }
  console.log(`✅ Created ${MENU_ITEMS.length} menu items`)

  // 7. Menu item permissions
  for (const m of MENU_ITEMS) {
    if (m.permissions.length === 0) continue
    const menuItemId = menuItemMap.get(m.name)!
    for (const permName of m.permissions) {
      const permId = permissionMap.get(permName)
      if (!permId) continue
      await prisma.menuItemPermission.upsert({
        where: {
          menuItemId_permissionId: { menuItemId, permissionId: permId },
        },
        update: {},
        create: { menuItemId, permissionId: permId },
      })
    }
  }
  console.log('✅ Created menu item permissions')

  console.log('✅ RBAC seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
