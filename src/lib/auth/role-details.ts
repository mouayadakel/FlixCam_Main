/**
 * @file role-details.ts
 * @description Predefined role metadata and permissions (single source of truth for API and UI)
 * @module lib/auth
 */

import { PERMISSIONS } from '@/lib/auth/permissions'

export const ROLE_DETAILS: Record<string, { name: string; description: string; permissions: string[] }> = {
  ADMIN: {
    name: 'Admin',
    description: 'Full operational access',
    permissions: Object.values(PERMISSIONS).filter((p) =>
      !['system.read_only_mode', 'system.clear_cache', 'system.view_logs', 'user.delete'].includes(p)
    ),
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    description: 'Manage sales, bookings, quotes, clients',
    permissions: [
      'booking.create', 'booking.read', 'booking.update', 'booking.delete', 'booking.cancel', 'booking.transition',
      'quote.create', 'quote.view', 'quote.update', 'quote.convert', 'quote.delete',
      'client.create', 'client.view', 'client.update', 'client.delete',
      'contract.create', 'contract.view', 'contract.update', 'contract.sign',
      'invoice.view', 'invoice.create', 'payment.view', 'payment.create',
      'equipment.read', 'reports.view', 'reports.export',
      'dashboard.view', 'dashboard.analytics',
      'ai.use', 'ai.risk_assessment', 'ai.kit_builder', 'ai.pricing', 'ai.demand_forecast', 'ai.chatbot',
      'kit.view', 'pricing.view', 'studio.view',
    ],
  },
  ACCOUNTANT: {
    name: 'Accountant',
    description: 'Financial operations and reporting',
    permissions: [
      'invoice.create', 'invoice.view', 'invoice.update', 'invoice.delete', 'invoice.mark_paid', 'invoice.generate_zatca',
      'payment.create', 'payment.read', 'payment.view', 'payment.refund', 'payment.verify', 'payment.mark_paid',
      'booking.read', 'booking.update', 'client.view', 'contract.view', 'quote.view',
      'reports.view', 'reports.export', 'dashboard.view', 'dashboard.analytics',
      'audit.view', 'audit.export',
    ],
  },
  WAREHOUSE_MANAGER: {
    name: 'Warehouse Manager',
    description: 'Equipment and inventory management',
    permissions: [
      'equipment.create', 'equipment.read', 'equipment.update', 'equipment.delete', 'equipment.checkout', 'equipment.checkin',
      'warehouse.view', 'warehouse.check_in', 'warehouse.check_out', 'warehouse.inventory',
      'maintenance.create', 'maintenance.view', 'maintenance.update', 'maintenance.complete', 'maintenance.delete',
      'booking.read', 'booking.update', 'delivery.view', 'delivery.assign',
      'category.view', 'brand.view', 'studio.view', 'dashboard.view',
      'import.create', 'import.view',
    ],
  },
  TECHNICIAN: {
    name: 'Technician',
    description: 'Equipment maintenance and inspection',
    permissions: [
      'equipment.read', 'equipment.update',
      'maintenance.create', 'maintenance.view', 'maintenance.update', 'maintenance.complete',
      'warehouse.view', 'dashboard.view',
    ],
  },
  CUSTOMER_SERVICE: {
    name: 'Customer Service',
    description: 'Customer support and basic operations',
    permissions: [
      'booking.create', 'booking.read', 'booking.update',
      'quote.create', 'quote.view', 'quote.update',
      'client.create', 'client.view', 'client.update',
      'contract.view', 'contract.create', 'invoice.view', 'payment.view',
      'equipment.read', 'dashboard.view', 'ai.chatbot', 'ai.use',
    ],
  },
  MARKETING_MANAGER: {
    name: 'Marketing Manager',
    description: 'Marketing campaigns and analytics',
    permissions: [
      'marketing.create', 'marketing.view', 'marketing.update', 'marketing.send', 'marketing.delete',
      'coupon.create', 'coupon.view', 'coupon.update', 'coupon.delete',
      'client.view', 'booking.read', 'reports.view', 'reports.export',
      'dashboard.view', 'dashboard.analytics', 'ai.demand_forecast',
    ],
  },
  RISK_MANAGER: {
    name: 'Risk Manager',
    description: 'Risk assessment and approvals',
    permissions: [
      'approval.view', 'approval.approve', 'approval.reject', 'approval.delegate',
      'booking.read', 'booking.transition', 'client.view', 'client.blacklist',
      'payment.view', 'payment.verify', 'ai.risk_assessment',
      'audit.view', 'audit.search', 'dashboard.view', 'dashboard.analytics', 'reports.view',
    ],
  },
  APPROVAL_AGENT: {
    name: 'Approval Agent',
    description: 'Process approval requests',
    permissions: [
      'approval.view', 'approval.approve', 'approval.reject', 'approval.delegate',
      'booking.read', 'payment.view', 'invoice.view', 'client.view', 'dashboard.view',
    ],
  },
  AUDITOR: {
    name: 'Auditor',
    description: 'Read-only access for auditing',
    permissions: [
      'booking.read', 'equipment.read', 'payment.view', 'client.view',
      'invoice.view', 'contract.view', 'quote.view', 'maintenance.view',
      'coupon.view', 'marketing.view', 'audit.view', 'audit.export', 'audit.search',
      'reports.view', 'reports.export', 'dashboard.view', 'dashboard.analytics',
      'studio.view', 'category.view', 'brand.view',
    ],
  },
  AI_OPERATOR: {
    name: 'AI Operator',
    description: 'AI features and automation',
    permissions: [
      'ai.use', 'ai.risk_assessment', 'ai.kit_builder', 'ai.pricing', 'ai.demand_forecast', 'ai.chatbot',
      'kit.create', 'kit.view', 'kit.update', 'kit.delete',
      'pricing.create', 'pricing.view', 'pricing.update', 'pricing.delete',
      'booking.read', 'equipment.read', 'client.view', 'reports.view',
      'dashboard.view', 'dashboard.analytics',
    ],
  },
  DATA_ENTRY: {
    name: 'Data Entry',
    description: 'Basic data entry access',
    permissions: [
      'booking.create', 'booking.read', 'payment.read',
      'invoice.view', 'contract.view', 'contract.sign',
    ],
  },
}

export function getRoleDetails(roleId: string): { name: string; description: string; permissions: string[] } | null {
  return ROLE_DETAILS[roleId] ?? null
}
